import type { CurrencyCode, PriceTier, ProductPrice } from './types';

// ---------------------------------------------------------------------------
// Pricing and the tier rule.
//
// The shop charges diaspora customers more than local customers for the same
// garment. That is a deliberate business decision, which makes it a target:
// if the price depended on anything the browser said, a VPN would be enough
// to defeat it.
//
// So the rule is narrow and stated once, here:
//
//     The price tier is a function of the SHIPPING DESTINATION COUNTRY.
//
// Not the IP address. Not a query string. Not a value in localStorage. IP
// geolocation is used in exactly one place — guessing which currency to show
// a first-time visitor — and that guess never touches money.
//
// Checkout recomputes the tier server-side from the saved shipping address
// before charging. A client that lies gets corrected, not obeyed.
// ---------------------------------------------------------------------------

export const LOCAL_COUNTRY = 'ET';

export function tierForCountry(countryCode: string | undefined | null): PriceTier {
  if (!countryCode) return 'international';
  return countryCode.trim().toUpperCase() === LOCAL_COUNTRY ? 'local' : 'international';
}

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** Most currencies use 2; the Gulf trio use 3 and ETB displays as 2. */
  decimals: number;
  /** Rough guide shown in the admin when entering prices. Never used to convert. */
  region: string;
}

/**
 * Every currency the shop can display and charge in. Prices are entered by
 * hand per currency — there is no exchange-rate conversion anywhere in this
 * codebase, by explicit decision. That means no rate feed to break, no stale
 * cache, and prices that read like prices ($145, not $137.42).
 *
 * The cost is data entry: 20 products x 12 currencies x 2 tiers is a lot of
 * boxes. The admin mitigates it with a "suggest from ETB" helper that fills
 * a starting number the owner can then round — a convenience in the UI, not
 * a conversion in the data.
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', decimals: 2, region: 'Ethiopia' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, region: 'USA' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, region: 'Europe' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, region: 'UK' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, region: 'Canada' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, region: 'Australia' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2, region: 'UAE' },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', decimals: 2, region: 'Saudi Arabia' },
  QAR: { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', decimals: 2, region: 'Qatar' },
  KWD: { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', decimals: 3, region: 'Kuwait' },
  OMR: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', decimals: 3, region: 'Oman' },
  BHD: { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', decimals: 3, region: 'Bahrain' },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/** Country -> the currency a visitor from there most likely wants to see. */
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  ET: 'ETB',
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'AUD',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  OM: 'OMR',
  BH: 'BHD',
};

const EURO_COUNTRIES = [
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR',
  'SE', 'NO', 'DK', 'CH', 'PL', 'CZ',
];

/**
 * A display hint only. Getting this wrong costs a visitor one click on the
 * currency switcher; it can never cost the shop money, because the amount
 * charged is recomputed from the shipping address at checkout.
 */
export function guessCurrencyForCountry(countryCode?: string): CurrencyCode {
  if (!countryCode) return 'USD';
  const cc = countryCode.trim().toUpperCase();
  if (COUNTRY_CURRENCY[cc]) return COUNTRY_CURRENCY[cc];
  if (EURO_COUNTRIES.includes(cc)) return 'EUR';
  return 'USD';
}

/**
 * Find the price for a product in a currency and tier.
 *
 * Falls back to the international price if a local one is missing, never the
 * other way round — a missing local price must not hand a diaspora customer
 * the cheaper number by accident. Returns null when nothing is set at all, and
 * callers treat that as "not purchasable in this currency" rather than free.
 */
export function findPrice(
  prices: ProductPrice[],
  productId: string,
  currency: CurrencyCode,
  tier: PriceTier,
): number | null {
  const exact = prices.find(
    (p) => p.productId === productId && p.currency === currency && p.tier === tier,
  );
  if (exact) return exact.amount;

  if (tier === 'local') {
    const intl = prices.find(
      (p) => p.productId === productId && p.currency === currency && p.tier === 'international',
    );
    if (intl) return intl.amount;
  }
  return null;
}

/** Minor units -> display string, e.g. 14500 USD -> "$145.00". */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  const meta = CURRENCIES[currency];
  const value = amount / 10 ** meta.decimals;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  // Symbol-before for western currencies, code-after reads better for the Gulf.
  return ['ETB', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD'].includes(currency)
    ? `${formatted} ${meta.symbol}`
    : `${meta.symbol}${formatted}`;
}

/** Display string -> minor units. Used by admin price entry. */
export function parseMoney(input: string, currency: CurrencyCode): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 10 ** CURRENCIES[currency].decimals);
}
