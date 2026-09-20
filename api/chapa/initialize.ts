import { createClient } from '@supabase/supabase-js';
import {
  initializeTransaction, splitName, toMajorUnits,
} from '../_lib/chapa';

// ---------------------------------------------------------------------------
// POST /api/chapa/initialize
//
// Starts a payment. The browser sends only an order reference and the email it
// used; this function looks the order up with the service role key and charges
// what the DATABASE says the total is.
//
// That is the whole point of the indirection. If the amount came from the
// request body, a customer could pay $1 for a $450 kemis by editing it.
// ---------------------------------------------------------------------------

const DECIMALS: Record<string, number> = {
  KWD: 3, OMR: 3, BHD: 3,
};

interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const chapaSecret = process.env.CHAPA_SECRET_KEY;
  const siteUrl = process.env.VITE_SITE_URL ?? '';

  if (!supabaseUrl || !serviceKey || !chapaSecret) {
    // Deliberately vague to the customer, specific in the log. An error
    // message is not the place to advertise which secret is missing.
    console.error('initialize: missing environment configuration');
    res.status(500).json({
      message: 'Payments are not configured yet. Please contact the shop.',
    });
    return;
  }

  const body = (req.body ?? {}) as { orderReference?: string; email?: string };
  if (!body.orderReference || !body.email) {
    res.status(400).json({ message: 'Missing order reference or email.' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Both values must match. The reference alone is not an authenticator.
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, payments(*)')
    .eq('reference', body.orderReference.trim().toUpperCase())
    .eq('email', body.email.trim().toLowerCase())
    .maybeSingle();

  if (error || !order) {
    res.status(404).json({ message: 'We could not find that order.' });
    return;
  }

  if (order.status !== 'pending_payment') {
    // Already paid. Say so rather than charging a second time.
    res.status(409).json({
      message: 'This order has already been paid. Nothing further is owed.',
    });
    return;
  }

  const payments = (order.payments ?? []) as { tx_ref: string; status: string }[];
  const pending = payments.find((p) => p.status === 'pending');
  if (!pending) {
    res.status(409).json({ message: 'There is no payment awaiting completion for this order.' });
    return;
  }

  const address = order.shipping_address as { fullName?: string };
  const { firstName, lastName } = splitName(address?.fullName ?? 'Customer');
  const decimals = DECIMALS[order.currency as string] ?? 2;

  const result = await initializeTransaction(
    {
      // Straight from the database row, never from the request.
      amount: toMajorUnits(order.total_amount as number, decimals),
      currency: order.currency as string,
      email: order.email as string,
      firstName,
      lastName,
      txRef: pending.tx_ref,
      callbackUrl: `${siteUrl}/api/chapa/webhook`,
      returnUrl: `${siteUrl}/#/order/${order.reference}?email=${encodeURIComponent(order.email as string)}`,
      description: `Order ${order.reference}`,
    },
    chapaSecret,
  );

  if (!result.ok) {
    console.error('initialize: chapa rejected', result.message);
    res.status(502).json({
      message: 'The payment provider could not start this payment. Nothing has been charged.',
    });
    return;
  }

  res.status(200).json({ checkoutUrl: result.checkoutUrl });
}
