import { getData } from './data';
import type {
  Address, CountryGroup, CurrencyCode, ExchangeRate, FulfilmentMethod, Order,
  Payment, PriceTier, StoreSettings,
} from './types';
import { findCountryGroup, tierForCountry } from './pricing';

// ---------------------------------------------------------------------------
// Checkout.
//
// The rule this file exists to enforce: THE CLIENT PROPOSES, THE SERVER
// DISPOSES. Everything the browser sends is a request, not a fact. The price
// tier, the amounts and the promised date are all recomputed before an order
// is written.
//
// In demo mode "the server" is the mock adapter in the same tab, which makes
// the guarantee theatrical rather than real. The same code paths run against
// Supabase, where create_order() recomputes every figure from the database and
// derives the tier from the delivery country — see supabase/schema.sql.
// ---------------------------------------------------------------------------

/**
 * The tier a customer actually gets, from where the parcel is going.
 *
 * Collection from the shop is always local: they are standing in Addis.
 */
export function resolveTier(
  fulfilment: FulfilmentMethod,
  address?: Address,
): PriceTier {
  if (fulfilment === 'pickup') return 'local';
  return tierForCountry(address?.countryCode);
}

/**
 * When the customer is told their garment will be ready.
 *
 * Production days come from the design; delivery days from where it is going.
 * Quoted generously on purpose: the refund promise is measured against this
 * date, so optimism here is expensive.
 */
export function promisedDate(
  maxProductionDays: number,
  group: CountryGroup | null,
  fulfilment: FulfilmentMethod,
  from = new Date(),
): Date {
  const deliveryDays = fulfilment === 'pickup' ? 0 : group?.deliveryDaysMax ?? 14;
  const total = maxProductionDays + deliveryDays;

  // Working days, not calendar days — the workshop does not weave on Sundays.
  const date = new Date(from);
  let added = 0;
  while (added < total) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added += 1;
  }
  return date;
}

export function formatPromisedDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

/**
 * The rate to freeze onto the order.
 *
 * Captured at placement so a customer who orders on Monday and whose
 * measurements take a week to verify still pays Monday's price.
 */
export function rateToLock(currency: CurrencyCode, rates: ExchangeRate[]): number {
  if (currency === 'USD' || currency === 'ETB') return 1;
  return rates.find((r) => r.currency === currency)?.rateFromUsd ?? 1;
}

export interface PlaceOrderInput {
  customerId: string;
  email: string;
  phone: string;
  currency: CurrencyCode;
  fulfilment: FulfilmentMethod;
  address?: Address;
  lines: {
    designId: string;
    quantity: number;
    chosenChoiceIds: string[];
    specialRequest?: string;
    measurementSetId: string;
  }[];
  maxProductionDays: number;
  countryGroups: CountryGroup[];
  rates: ExchangeRate[];
}

export type PlaceOrderResult =
  | { ok: true; order: Order; payment: Payment }
  | { ok: false; message: string };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const tier = resolveTier(input.fulfilment, input.address);
  const group = input.address
    ? findCountryGroup(input.address.countryCode, input.countryGroups)
    : null;

  const due = promisedDate(input.maxProductionDays, group, input.fulfilment);

  try {
    const data = await getData();
    const { order, payment } = await data.createOrder({
      customerId: input.customerId,
      email: input.email,
      phone: input.phone,
      currency: input.currency,
      // Recomputed here, deliberately ignoring anything the caller believed.
      tier,
      lockedRateFromUsd: rateToLock(input.currency, input.rates),
      fulfilment: input.fulfilment,
      shippingAddress: input.address,
      items: input.lines,
      promisedDate: due.toISOString().slice(0, 10),
    });
    return { ok: true, order, payment };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      message: err instanceof Error && err.message
        ? err.message
        : 'We could not place the order. Nothing has been charged. Please try again.',
    };
  }
}

/**
 * Whether the customer must be warned that they will be charged in a different
 * currency from the one they are looking at.
 *
 * Saying nothing here is what produces chargebacks from people who felt misled.
 */
export function chargeNotice(
  displayCurrency: CurrencyCode,
  settings: StoreSettings | null,
): { needed: boolean; chargeCurrency: CurrencyCode } {
  const allowed = settings?.chargeCurrencies ?? ['ETB', 'USD'];
  if (allowed.includes(displayCurrency)) {
    return { needed: false, chargeCurrency: displayCurrency };
  }
  return {
    needed: true,
    chargeCurrency: allowed.includes('USD') ? 'USD' : allowed[0] ?? 'USD',
  };
}
