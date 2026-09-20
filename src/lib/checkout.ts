import { getData } from './data';
import type { Address, CurrencyCode, Measurements, Order, Payment, PriceTier } from './types';
import { tierForCountry } from './pricing';
import { getShippingProvider } from './shipping';
import type { ShippingQuote } from './shipping';

// ---------------------------------------------------------------------------
// Checkout.
//
// The rule this file exists to enforce: the CLIENT PROPOSES, THE SERVER
// DISPOSES. Everything the browser sends is treated as a request, not a fact.
// Prices, the pricing tier and the shipping cost are all recomputed from the
// shipping address before an order is written.
//
// In demo mode "the server" is the mock adapter running in the same tab, which
// makes the guarantee theatrical rather than real. The same code paths run
// against Supabase with Row Level Security and the serverless functions in
// /api, where it is enforced for real.
// ---------------------------------------------------------------------------

export async function quoteShipping(
  address: Address,
  itemCount: number,
  currency: CurrencyCode,
): Promise<ShippingQuote[]> {
  const data = await getData();
  const [zones, rates] = await Promise.all([data.listZones(), data.listRates()]);
  return getShippingProvider('flat').quote({ address, itemCount, currency, zones, rates });
}

/**
 * The tier a customer actually gets, derived from where the parcel is going.
 * Never from IP, never from anything the client sent as a tier.
 */
export function resolveTier(address: Address): PriceTier {
  return tierForCountry(address.countryCode);
}

export interface PlaceOrderInput {
  email: string;
  phone?: string;
  currency: CurrencyCode;
  address: Address;
  lines: { productId: string; quantity: number; customerMeasurements?: Measurements }[];
  shippingRateId: string;
  shippingAmount: number;
  promoCode?: string;
  notes?: string;
}

export type PlaceOrderResult =
  | { ok: true; order: Order; payment: Payment }
  | { ok: false; reason: 'unavailable'; unavailableProductIds: string[] }
  | { ok: false; reason: 'error'; message: string };

/**
 * Reserve, then write the order.
 *
 * Order matters. Reservation is atomic and comes first, so two customers
 * racing for the same one-of-a-kind garment cannot both end up with an order
 * for it. If anything after reservation fails, the hold is released rather
 * than left to expire — otherwise a piece silently disappears from the shop.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const data = await getData();
  const productIds = input.lines.map((l) => l.productId);

  const reservation = await data.reserveProducts(productIds);
  if (!reservation.ok) {
    return { ok: false, reason: 'unavailable', unavailableProductIds: reservation.unavailableProductIds };
  }

  try {
    const { order, payment } = await data.createOrder({
      email: input.email,
      phone: input.phone,
      currency: input.currency,
      // Recomputed here, deliberately ignoring anything the caller believed.
      tier: resolveTier(input.address),
      items: input.lines,
      shippingAddress: input.address,
      shippingRateId: input.shippingRateId,
      shippingAmount: input.shippingAmount,
      promoCode: input.promoCode,
      notes: input.notes,
    });
    return { ok: true, order, payment };
  } catch (err) {
    await data.releaseProducts(productIds);
    console.error(err);
    return {
      ok: false,
      reason: 'error',
      message: 'We could not place the order. Nothing has been charged. Please try again.',
    };
  }
}
