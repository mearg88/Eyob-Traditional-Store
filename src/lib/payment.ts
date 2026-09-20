import { getData, isDemoMode } from './data';
import type { MockAdapter } from './data/mock';
import type { Order, Payment } from './types';

// ---------------------------------------------------------------------------
// Starting a payment.
//
// The browser never talks to Chapa's API directly. It calls our own
// serverless function, which holds the secret key and initialises the
// transaction. The browser only ever receives a checkout URL to redirect to.
//
// That indirection is the whole security model: the secret key stays on the
// server, and the amount charged is the amount the server computed, not the
// amount the browser claimed.
// ---------------------------------------------------------------------------

export type StartPaymentResult =
  | { ok: true; redirectUrl?: string }
  | { ok: false; message: string };

export async function startPayment(order: Order, payment: Payment): Promise<StartPaymentResult> {
  // Demo mode: no keys, no network. Mark it paid locally so the whole flow
  // through to the confirmation page can be shown, clearly labelled as
  // simulated everywhere it appears.
  if (isDemoMode) {
    const data = (await getData()) as MockAdapter;
    await data._markPaid(payment.txRef);
    return { ok: true };
  }

  try {
    const response = await fetch('/api/chapa/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Only the reference is sent. The server re-reads the order from the
        // database and charges what IT computed — a tampered body cannot
        // change the amount.
        orderReference: order.reference,
        email: order.email,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      return {
        ok: false,
        message:
          body.message ??
          'We could not reach the payment provider. Nothing has been charged. Please try again in a moment.',
      };
    }

    const body = (await response.json()) as { checkoutUrl?: string };
    if (!body.checkoutUrl) {
      return {
        ok: false,
        message: 'The payment provider did not return a checkout page. Nothing has been charged.',
      };
    }
    return { ok: true, redirectUrl: body.checkoutUrl };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      // Network failure mid-payment is the genuinely dangerous case: the
      // customer does not know whether money moved. Say so plainly and give
      // them the reference to quote.
      message:
        `We lost connection to the payment provider. If money has left your account, quote order ${order.reference} and we will sort it out immediately. Do not pay twice.`,
    };
  }
}
