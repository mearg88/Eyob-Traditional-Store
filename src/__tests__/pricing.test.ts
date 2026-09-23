import { describe, expect, it } from 'vitest';
import {
  chargeCurrencyFor, computePrice, findCountryGroup, formatMoney,
  guessCurrencyForCountry, needsChargeCurrencyNotice, parseMoney, tidyAmount,
  tierForCountry,
} from '../lib/pricing';
import type { CountryGroup, DesignPrice, ExchangeRate } from '../lib/types';
import { SEED_COUNTRY_GROUPS } from '../lib/data/seed';

const PRICES: DesignPrice[] = [
  { designId: 'd1', tier: 'local', amount: 1_450_000 },        // 14,500 birr
  { designId: 'd1', tier: 'international', amount: 28_500 },   // $285
  { designId: 'd2', tier: 'international', amount: 10_000 },   // $100, no local
];

const RATES: ExchangeRate[] = [
  { currency: 'GBP', rateFromUsd: 0.8, marginPercent: 2, fetchedAt: '' },
  { currency: 'EUR', rateFromUsd: 0.94, marginPercent: 2, fetchedAt: '' },
];

const NO_UPLIFT: CountryGroup = {
  id: 'g', name: 'Test', countries: ['*'], upliftPercent: 0,
  deliveryDaysMin: 7, deliveryDaysMax: 14, position: 1,
};

describe('tierForCountry — the anti-spoofing rule', () => {
  it('gives local pricing only to Ethiopia', () => {
    expect(tierForCountry('ET')).toBe('local');
    expect(tierForCountry('et')).toBe('local');
    expect(tierForCountry('  ET  ')).toBe('local');
  });

  it('gives international pricing everywhere else', () => {
    for (const cc of ['US', 'CA', 'GB', 'AU', 'IL', 'DE', 'AE']) {
      expect(tierForCountry(cc)).toBe('international');
    }
  });

  it('defaults to international when the country is unknown', () => {
    // Failing open to the CHEAPER tier would let a blank address buy at
    // Ethiopian prices. Unknown must mean international.
    expect(tierForCountry(undefined)).toBe('international');
    expect(tierForCountry(null)).toBe('international');
    expect(tierForCountry('')).toBe('international');
  });
});

describe('computePrice — local orders', () => {
  it('uses the birr price as typed, with no conversion', () => {
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'local', countryGroup: null,
      displayCurrency: 'ETB', rates: RATES,
    });
    expect(result?.total).toBe(1_450_000);
    expect(result?.currency).toBe('ETB');
  });

  it('never applies an uplift to a local order', () => {
    const withUplift: CountryGroup = { ...NO_UPLIFT, upliftPercent: 50 };
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'local', countryGroup: withUplift,
      displayCurrency: 'ETB', rates: RATES,
    });
    expect(result?.total).toBe(1_450_000);
  });

  it('applies the pickup discount', () => {
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'local', countryGroup: null,
      displayCurrency: 'ETB', rates: RATES, pickup: true, pickupDiscountPercent: 10,
    });
    expect(result?.total).toBe(1_450_000 - 145_000);
  });
});

describe('computePrice — international orders', () => {
  it('returns the USD price unchanged with no uplift', () => {
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'international',
      countryGroup: NO_UPLIFT, displayCurrency: 'USD', rates: RATES,
    });
    expect(result?.total).toBe(28_500);
  });

  it('applies the country uplift before converting', () => {
    const australia: CountryGroup = { ...NO_UPLIFT, upliftPercent: 12 };
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'international',
      countryGroup: australia, displayCurrency: 'USD', rates: RATES,
    });
    // $285 + 12% = $319.20, tidied to a round number
    expect(result!.total).toBeGreaterThan(28_500);
    expect(result!.total).toBeLessThan(33_000);
  });

  it('converts using the stored rate', () => {
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'international',
      countryGroup: NO_UPLIFT, displayCurrency: 'GBP', rates: RATES,
    });
    // $285 x 0.8 = £228, tidied to the nearest 5
    expect(result?.currency).toBe('GBP');
    expect(result?.total).toBe(23_000);
    expect(result?.rateFromUsd).toBe(0.8);
  });

  it('falls back to USD rather than inventing a rate', () => {
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'international',
      countryGroup: NO_UPLIFT, displayCurrency: 'CAD', rates: RATES,
    });
    expect(result?.currency).toBe('USD');
    expect(result?.total).toBe(28_500);
  });

  it('adds option effects', () => {
    const result = computePrice({
      designId: 'd1', prices: PRICES, tier: 'international',
      countryGroup: NO_UPLIFT, displayCurrency: 'USD', rates: RATES,
      optionEffects: 2_500,
    });
    expect(result?.total).toBe(31_000);
  });

  it('returns null when no price is set, rather than zero', () => {
    const result = computePrice({
      designId: 'missing', prices: PRICES, tier: 'international',
      countryGroup: NO_UPLIFT, displayCurrency: 'USD', rates: RATES,
    });
    expect(result).toBeNull();
  });

  it('returns null for a local price that was never set', () => {
    // d2 has no local price. It must NOT silently fall back to the
    // international figure or to zero.
    const result = computePrice({
      designId: 'd2', prices: PRICES, tier: 'local', countryGroup: null,
      displayCurrency: 'ETB', rates: RATES,
    });
    expect(result).toBeNull();
  });
});

describe('tidyAmount — prices should read like prices', () => {
  it('rounds mid-range amounts to the nearest 5', () => {
    expect(tidyAmount(13_742, 2)).toBe(13_500);
  });

  it('rounds large amounts to the nearest 10', () => {
    expect(tidyAmount(52_337, 2)).toBe(52_000);
  });

  it('rounds small amounts to the nearest half', () => {
    expect(tidyAmount(1_237, 2)).toBe(1_250);
  });
});

describe('findCountryGroup', () => {
  it('finds the group a country belongs to', () => {
    expect(findCountryGroup('US', SEED_COUNTRY_GROUPS)?.id).toBe('grp-na');
    expect(findCountryGroup('GB', SEED_COUNTRY_GROUPS)?.id).toBe('grp-eu');
    expect(findCountryGroup('AU', SEED_COUNTRY_GROUPS)?.id).toBe('grp-oc');
  });

  it('falls back to the catch-all so checkout is never a dead end', () => {
    expect(findCountryGroup('JP', SEED_COUNTRY_GROUPS)?.id).toBe('grp-rest');
  });
});

describe('guessCurrencyForCountry — display only', () => {
  it('maps the permitted countries', () => {
    expect(guessCurrencyForCountry('ET')).toBe('ETB');
    expect(guessCurrencyForCountry('GB')).toBe('GBP');
    expect(guessCurrencyForCountry('IL')).toBe('ILS');
    expect(guessCurrencyForCountry('CA')).toBe('CAD');
  });

  it('maps every EU country to EUR, including non-euro members', () => {
    for (const cc of ['DE', 'FR', 'PL', 'SE', 'CZ', 'HU', 'DK', 'RO']) {
      expect(guessCurrencyForCountry(cc)).toBe('EUR');
    }
  });

  it('maps Switzerland and Norway to EUR too', () => {
    expect(guessCurrencyForCountry('CH')).toBe('EUR');
    expect(guessCurrencyForCountry('NO')).toBe('EUR');
  });

  it('falls back to USD everywhere else, including the Gulf', () => {
    expect(guessCurrencyForCountry('AE')).toBe('USD');
    expect(guessCurrencyForCountry('SA')).toBe('USD');
    expect(guessCurrencyForCountry('JP')).toBe('USD');
    expect(guessCurrencyForCountry(undefined)).toBe('USD');
  });
});

describe('charge currency disclosure', () => {
  const canCharge = ['ETB', 'USD'] as const;

  it('flags when we display a currency we cannot charge in', () => {
    // A Londoner sees GBP but is charged USD. Saying nothing here produces
    // chargebacks from people who felt misled.
    expect(needsChargeCurrencyNotice('GBP', [...canCharge])).toBe(true);
    expect(needsChargeCurrencyNotice('USD', [...canCharge])).toBe(false);
    expect(needsChargeCurrencyNotice('ETB', [...canCharge])).toBe(false);
  });

  it('charges in USD when the displayed currency is unsupported', () => {
    expect(chargeCurrencyFor('GBP', [...canCharge])).toBe('USD');
    expect(chargeCurrencyFor('ETB', [...canCharge])).toBe('ETB');
  });
});

describe('formatMoney', () => {
  it('puts western symbols before the number', () => {
    expect(formatMoney(28_500, 'USD')).toBe('$285.00');
    expect(formatMoney(23_000, 'GBP')).toBe('£230.00');
  });

  it('puts birr after the number', () => {
    expect(formatMoney(1_450_000, 'ETB')).toBe('14,500.00 Br');
  });
});

describe('parseMoney', () => {
  it('converts typed prices to minor units', () => {
    expect(parseMoney('285', 'USD')).toBe(28_500);
    expect(parseMoney('$14,500', 'ETB')).toBe(1_450_000);
  });

  it('returns null for nonsense rather than zero', () => {
    expect(parseMoney('', 'USD')).toBeNull();
    expect(parseMoney('abc', 'USD')).toBeNull();
  });
});
