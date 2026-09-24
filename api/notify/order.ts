import { createClient } from '@supabase/supabase-js';
import {
  measurementChangeEmail, notifyOwner, orderConfirmationEmail, orderReadyEmail,
  sendEmail,
} from '../_lib/notify';

// ---------------------------------------------------------------------------
// POST /api/notify/order
//
// Sends the message that goes with an order event.
//
// Called after the fact rather than inside the payment or verification path,
// deliberately: a mail provider being slow or down must never delay taking an
// order or hold up the workshop.
// ---------------------------------------------------------------------------

type Kind = 'confirmation' | 'measurement_change' | 'ready';

interface Req { method?: string; body?: unknown }
interface Res { status(c: number): Res; json(b: unknown): void }

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.VITE_SITE_URL ?? '';

  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ message: 'Not configured' });
    return;
  }

  const body = (req.body ?? {}) as { reference?: string; kind?: Kind };
  if (!body.reference || !body.kind) {
    res.status(400).json({ message: 'Missing reference or kind.' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: order } = await supabase
    .from('orders').select('*, order_items(design_name)')
    .eq('reference', body.reference.trim().toUpperCase()).maybeSingle();

  if (!order) {
    res.status(404).json({ message: 'Order not found.' });
    return;
  }

  const { data: settings } = await supabase
    .from('store_settings').select('shop_address').eq('id', 1).maybeSingle();

  const address = order.shipping_address as { fullName?: string } | null;
  const name = address?.fullName ?? 'there';
  const items = ((order.order_items ?? []) as { design_name: string }[])
    .map((i) => ({ designName: i.design_name }));

  let subject: string;
  let text: string;

  switch (body.kind) {
    case 'confirmation':
      subject = `Your order ${order.reference}`;
      text = orderConfirmationEmail({
        reference: order.reference as string,
        customerName: name,
        items,
        promisedDate: order.promised_date as string,
        siteUrl,
      });
      // The owner wants to know immediately, wherever they are.
      await notifyOwner(
        `<b>New order ${order.reference}</b>\n${items.length} piece(s)\n${order.email}`,
      );
      break;

    case 'measurement_change':
      subject = `Please confirm your measurements — ${order.reference}`;
      text = measurementChangeEmail({
        reference: order.reference as string,
        customerName: name,
        siteUrl,
      });
      break;

    case 'ready':
      subject = `Your order ${order.reference} is ready`;
      text = orderReadyEmail({
        reference: order.reference as string,
        customerName: name,
        pickup: order.fulfilment === 'pickup',
        shopAddress: (settings?.shop_address as string) ?? '',
        siteUrl,
      });
      break;

    default:
      res.status(400).json({ message: 'Unknown notification kind.' });
      return;
  }

  const sent = await sendEmail({ to: order.email as string, subject, text });

  // A failed send is reported but never fails the request: the order is real
  // whether or not the email arrived, and retrying is the caller's choice.
  res.status(200).json({ sent });
}
