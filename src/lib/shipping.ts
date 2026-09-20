import type { Address, CurrencyCode, ShippingRate, ShippingZone } from './types';

// ---------------------------------------------------------------------------
// Shipping.
//
// The shop has no courier account yet and hasn't chosen an international
// carrier. Live rate APIs (DHL, FedEx, Aramex) all require a commercial
// account with negotiated rates before they issue credentials, and Ethiopian
// Postal Service publishes no API at all. So rates are flat per zone and
// edited by the owner in the admin.
//
// This is deliberately behind an interface. When a carrier is chosen and
// credentials exist, write one more ShippingRateProvider, register it, and
// checkout does not change.
// ---------------------------------------------------------------------------

export interface ShippingQuote {
  rateId: string;
  label: string;
  amount: number;
  currency: CurrencyCode;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  /** Shown to the customer when the quote is an estimate rather than a booking. */
  note?: string;
}

export interface ShippingRateProvider {
  readonly id: string;
  quote(input: {
    address: Address;
    itemCount: number;
    currency: CurrencyCode;
    zones: ShippingZone[];
    rates: ShippingRate[];
  }): Promise<ShippingQuote[]>;
}

/**
 * Addis gets its own zone because local delivery there is a different
 * business from posting to Bahir Dar. It is matched by the pseudo-code
 * 'ET-AA' on the zone, tested before the plain country match.
 */
export function findZoneForAddress(address: Address, zones: ShippingZone[]): ShippingZone | null {
  const country = address.countryCode.trim().toUpperCase();
  const city = address.city.trim().toLowerCase();
  const isAddis =
    country === 'ET' && (city.includes('addis') || city.includes('አዲስ'));

  if (isAddis) {
    const addisZone = zones.find((z) => z.countries.includes('ET-AA'));
    if (addisZone) return addisZone;
  }

  const exact = zones.find((z) => z.countries.includes(country));
  if (exact) return exact;

  // '*' is the catch-all zone, so a customer in an unlisted country still
  // gets a checkout they can complete rather than a dead end.
  return zones.find((z) => z.countries.includes('*')) ?? null;
}

/** Flat rate per zone, plus a surcharge for each item beyond the first. */
export class FlatRateProvider implements ShippingRateProvider {
  readonly id = 'flat';

  async quote({
    address,
    itemCount,
    currency,
    zones,
    rates,
  }: {
    address: Address;
    itemCount: number;
    currency: CurrencyCode;
    zones: ShippingZone[];
    rates: ShippingRate[];
  }): Promise<ShippingQuote[]> {
    const zone = findZoneForAddress(address, zones);
    if (!zone) return [];

    const extras = Math.max(0, itemCount - 1);

    return rates
      .filter((r) => r.zoneId === zone.id && r.currency === currency)
      .map((r) => ({
        rateId: r.id,
        label: r.name,
        amount: r.baseAmount + extras * r.perExtraItemAmount,
        currency: r.currency,
        estimatedDaysMin: r.estimatedDaysMin,
        estimatedDaysMax: r.estimatedDaysMax,
      }));
  }
}

const providers = new Map<string, ShippingRateProvider>();
providers.set('flat', new FlatRateProvider());

export function registerShippingProvider(provider: ShippingRateProvider): void {
  providers.set(provider.id, provider);
}

export function getShippingProvider(id = 'flat'): ShippingRateProvider {
  const provider = providers.get(id);
  if (!provider) throw new Error(`Unknown shipping provider: ${id}`);
  return provider;
}

export function formatDeliveryEstimate(min: number, max: number): string {
  if (min === max) return `${min} working day${min === 1 ? '' : 's'}`;
  return `${min}–${max} working days`;
}
