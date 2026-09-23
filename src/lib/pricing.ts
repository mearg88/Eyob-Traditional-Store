import type {
  CountryGroup, CurrencyCode, DesignPrice, ExchangeRate, PriceTier,
} from './types';

// ---------------------------------------------------------------------------
// Pricing.
//
// THE RULE, stated once and enforced everywhere:
//
//     The price tier is a function of the DELIVERY ADDRESS COUNTRY.
//
// Not the IP address. Not the displayed currency. Not anything the browser
// sends. IP geolocation picks a currency to *show* a first-time visitor and
// never touches money; the customer may change that display freely.
//
// Why this matters here specifically: the international price has delivery
// baked into it, so a diaspora customer buying at the Ethiopian price is a
// guaranteed loss. Without this rule, one VPN and one dropdown would do it.
//
// How a price is built, in order:
//
//   local:         the ETB figure, as typed. Done.
//   international: the USD figure
//                    x country uplift       (covers delivery to that group)
//                    + chosen options
//                    - pickup discount      (if collecting)
//                    x stored exchange rate (margin already applied)
//                    rounded to look like a price
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
  decimals: number;
  /** true when the symbol reads better after the number. */
  symbolAfter: boolean;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', decimals: 2, symbolAfter: true },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, symbolAfter: false },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, symbolAfter: false },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, symbolAfter: false },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, symbolAfter: false },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, symbolAfter: false },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', decimals: 2, symbolAfter: false },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/**
 * Country to display currency.
 *
 * Every EU member maps to EUR, including the non-euro ones — Poles and Swedes
 * are entirely used to seeing EUR prices online, and supporting ten more
 * currency pairs would add failure modes for very little gain.
 */
const EUR_COUNTRIES = [
  // Eurozone
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV',
  'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
  // EU, not eurozone
  'BG', 'CZ', 'DK', 'HU', 'PL', 'RO', 'SE',
  // Not EU, but the same shopping expectations
  'CH', 'NO', 'IS', 'LI',
];

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  ET: 'ETB',
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'AUD',
  IL: 'ILS',
};

/**
 * A display hint only.
 *
 * Getting this wrong costs a visitor one click on the currency switcher. It
 * can never cost the shop money, because the amount charged comes from the
 * delivery address.
 */
export function guessCurrencyForCountry(countryCode?: string | null): CurrencyCode {
  if (!countryCode) return 'USD';
  const cc = countryCode.trim().toUpperCase();
  if (COUNTRY_CURRENCY[cc]) return COUNTRY_CURRENCY[cc];
  if (EUR_COUNTRIES.includes(cc)) return 'EUR';
  return 'USD';
}

export function findCountryGroup(
  countryCode: string,
  groups: CountryGroup[],
): CountryGroup | null {
  const cc = countryCode.trim().toUpperCase();
  return (
    groups.find((g) => g.countries.includes(cc)) ??
    groups.find((g) => g.countries.includes('*')) ??
    null
  );
}

export function findDesignPrice(
  prices: DesignPrice[],
  designId: string,
  tier: PriceTier,
): number | null {
  const row = prices.find((p) => p.designId === designId && p.tier === tier);
  return row ? row.amount : null;
}

/**
 * Round to something that reads like a price rather than a conversion.
 *
 * $145, not $137.42. Customers read an unrounded number as a machine output
 * and it makes a handmade garment feel like a commodity.
 */
export function tidyAmount(amount: number, decimals: number): number {
  const unit = 10 ** decimals;
  const major = amount / unit;
  if (major >= 500) return Math.round(major / 10) * 10 * unit;
  if (major >= 100) return Math.round(major / 5) * 5 * unit;
  if (major >= 20) return Math.round(major) * unit;
  return Math.round(major * 2) / 2 * unit;
}

export interface PriceBreakdown {
  /** Before options and discounts, in the display currency. */
  base: number;
  optionsTotal: number;
  pickupDiscount: number;
  total: number;
  currency: CurrencyCode;
  tier: PriceTier;
  /** The rate used, so it can be frozen onto an order. */
  rateFromUsd: number;
}

export interface PriceInput {
  designId: string;
  prices: DesignPrice[];
  tier: PriceTier;
  /** Null for local orders, which are priced in ETB with no uplift. */
  countryGroup: CountryGroup | null;
  displayCurrency: CurrencyCode;
  rates: ExchangeRate[];
  /** Sum of the chosen options' price effects, in the tier's base currency. */
  optionEffects?: number;
  pickup?: boolean;
  pickupDiscountPercent?: number;
}

/**
 * The single place a price is computed. Everything else calls this.
 *
 * Returns null when no price is set for the tier — callers treat that as "not
 * orderable" rather than as free.
 */
export function computePrice(input: PriceInput): PriceBreakdown | null {
  const {
    designId, prices, tier, countryGroup, displayCurrency, rates,
    optionEffects = 0, pickup = false, pickupDiscountPercent = 0,
  } = input;

  const baseAmount = findDesignPrice(prices, designId, tier);
  if (baseAmount === null) return null;

  // Local orders are in birr, as typed, with no uplift and no conversion.
  if (tier === 'local') {
    const base = baseAmount;
    const options = optionEffects;
    const beforeDiscount = base + options;
    const discount = pickup ? Math.round((beforeDiscount * pickupDiscountPercent) / 100) : 0;
    return {
      base,
      optionsTotal: options,
      pickupDiscount: discount,
      total: Math.max(0, beforeDiscount - discount),
      currency: 'ETB',
      tier,
      rateFromUsd: 1,
    };
  }

  // International: uplift first, in USD, then convert once.
  const uplift = countryGroup ? countryGroup.upliftPercent : 0;
  const usdBase = Math.round(baseAmount * (1 + uplift / 100));
  const usdWithOptions = usdBase + optionEffects;
  const usdDiscount = pickup
    ? Math.round((usdWithOptions * pickupDiscountPercent) / 100)
    : 0;
  const usdTotal = Math.max(0, usdWithOptions - usdDiscount);

  const rate = displayCurrency === 'USD'
    ? 1
    : rates.find((r) => r.currency === displayCurrency)?.rateFromUsd ?? null;

  // No rate means we cannot honestly quote this currency. Fall back to USD
  // rather than inventing a number.
  if (rate === null) {
    return {
      base: usdBase,
      optionsTotal: optionEffects,
      pickupDiscount: usdDiscount,
      total: usdTotal,
      currency: 'USD',
      tier,
      rateFromUsd: 1,
    };
  }

  const decimals = CURRENCIES[displayCurrency].decimals;
  const convert = (usd: number) => tidyAmount(usd * rate, decimals);

  const base = convert(usdBase);
  const total = convert(usdTotal);

  return {
    base,
    optionsTotal: convert(usdWithOptions) - base,
    pickupDiscount: convert(usdWithOptions) - total,
    total,
    currency: displayCurrency,
    tier,
    rateFromUsd: rate,
  };
}

/**
 * Recompute a total using a rate frozen at order time.
 *
 * Used when showing or re-charging an existing order, so a customer who
 * ordered on Monday is never surprised by Thursday's rate.
 */
export function totalAtLockedRate(
  usdTotal: number,
  lockedRateFromUsd: number,
  currency: CurrencyCode,
): number {
  if (currency === 'USD') return usdTotal;
  return tidyAmount(usdTotal * lockedRateFromUsd, CURRENCIES[currency].decimals);
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const meta = CURRENCIES[currency];
  const value = amount / 10 ** meta.decimals;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return meta.symbolAfter ? `${formatted} ${meta.symbol}` : `${meta.symbol}${formatted}`;
}

export function parseMoney(input: string, currency: CurrencyCode): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 10 ** CURRENCIES[currency].decimals);
}

/**
 * When the display currency is not one we can actually charge in, the customer
 * must be told before they pay. Silence here produces chargebacks from people
 * who felt misled.
 */
export function needsChargeCurrencyNotice(
  displayCurrency: CurrencyCode,
  chargeCurrencies: CurrencyCode[],
): boolean {
  return !chargeCurrencies.includes(displayCurrency);
}

export function chargeCurrencyFor(
  displayCurrency: CurrencyCode,
  chargeCurrencies: CurrencyCode[],
): CurrencyCode {
  if (chargeCurrencies.includes(displayCurrency)) return displayCurrency;
  if (chargeCurrencies.includes('USD')) return 'USD';
  return chargeCurrencies[0] ?? 'USD';
}
