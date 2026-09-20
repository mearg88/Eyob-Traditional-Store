import { createClient } from '@supabase/supabase-js';
import { verifyTransaction, verifyWebhookSignature } from '../_lib/chapa';

// ---------------------------------------------------------------------------
// POST /api/chapa/webhook
//
// The only thing in this system permitted to decide that an order is paid.
//
// The customer's browser being redirected back to a success page proves
// nothing — anyone can visit that URL. Only a signed, server-to-server webhook
// (corroborated by a verify call) moves money in our records.
//
// Failure states handled here, each one deliberately:
//
//   bad signature   -> 401, nothing changes
//   duplicate       -> 200, nothing changes (Chapa retries on non-2xx, so a
//                      duplicate must NOT be an error or it retries forever)
//   unknown tx_ref  -> 200, logged (a retry will not help)
//   failed payment  -> payment marked failed, stock released
//   late arrival    -> handled identically; there is no time limit
// ---------------------------------------------------------------------------

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: string, listener: (chunk?: unknown) => void): void;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

// Vercel parses JSON bodies by default, which would destroy the exact bytes
// the signature is computed over. This opts out.
export const config = { api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk as Buffer)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
  const chapaSecret = process.env.CHAPA_SECRET_KEY;

  if (!supabaseUrl || !serviceKey || !webhookSecret) {
    console.error('webhook: missing environment configuration');
    res.status(500).json({ message: 'Not configured' });
    return;
  }

  const rawBody = await readRawBody(req);

  const verification = verifyWebhookSignature(rawBody, req.headers, webhookSecret);
  if (!verification.valid) {
    // 401 and no detail. An attacker probing this endpoint learns nothing
    // about why their forgery failed.
    console.warn('webhook: rejected —', verification.reason);
    res.status(401).json({ message: 'Invalid signature' });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    console.error('webhook: body was not valid JSON');
    res.status(400).json({ message: 'Invalid payload' });
    return;
  }

  const txRef = (payload.tx_ref ?? payload.trx_ref) as string | undefined;
  const providerReference = (payload.reference ?? payload.ref_id) as string | undefined;
  const eventStatus = String(payload.status ?? '').toLowerCase();

  if (!txRef) {
    console.error('webhook: payload carried no tx_ref');
    res.status(200).json({ received: true });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Idempotency. The unique constraint on (provider, event_id) means a
  // duplicate delivery loses the insert race and is recognised here.
  const eventId = providerReference ?? `${txRef}:${eventStatus}`;
  const { error: dedupeError } = await supabase
    .from('webhook_events')
    .insert({ provider: 'chapa', event_id: eventId, tx_ref: txRef, payload });

  if (dedupeError) {
    if (dedupeError.code === '23505') {
      // Seen this one already. 200 so Chapa stops retrying.
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    console.error('webhook: could not record event', dedupeError.message);
    // Fall through: recording the event is for audit, and failing to record it
    // is not a reason to drop a real payment.
  }

  const succeeded = eventStatus === 'success' || eventStatus === 'successful';

  if (!succeeded) {
    await supabase
      .from('payments')
      .update({
        status: eventStatus === 'failed' ? 'failed' : 'abandoned',
        raw_webhook_payload: payload,
        failure_reason: String(payload.message ?? eventStatus),
      })
      .eq('tx_ref', txRef);

    // Put the garment back on the shelf. With one-of-a-kind stock, a piece
    // left reserved after a failed payment is a piece nobody can buy.
    const { data: payment } = await supabase
      .from('payments').select('order_id').eq('tx_ref', txRef).maybeSingle();

    if (payment) {
      const { data: items } = await supabase
        .from('order_items').select('product_id').eq('order_id', payment.order_id);
      const ids = (items ?? []).map((i) => i.product_id).filter(Boolean) as string[];
      if (ids.length > 0) await supabase.rpc('release_products', { p_product_ids: ids });
    }

    res.status(200).json({ received: true });
    return;
  }

  // Belt and braces: the signature says Chapa sent this, and a verify call
  // says Chapa still agrees the money arrived. Cheap, and it closes the gap if
  // the webhook secret is ever compromised without the API key.
  if (chapaSecret) {
    const check = await verifyTransaction(txRef, chapaSecret);
    if (!check.paid) {
      console.warn('webhook: claimed success but verify disagreed for', txRef);
      res.status(200).json({ received: true, verified: false });
      return;
    }
  }

  const { data: changed, error: markError } = await supabase.rpc('mark_order_paid', {
    p_tx_ref: txRef,
    p_provider_reference: providerReference ?? null,
    p_payload: payload,
  });

  if (markError) {
    console.error('webhook: mark_order_paid failed', markError.message);
    // 500 so Chapa retries. This is the one case where a retry genuinely helps.
    res.status(500).json({ message: 'Could not record payment' });
    return;
  }

  res.status(200).json({ received: true, applied: changed === true });
}
