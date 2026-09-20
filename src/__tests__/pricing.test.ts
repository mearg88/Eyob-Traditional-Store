import { describe, expect, it } from 'vitest';
import {
  findPrice, formatMoney, guessCurrencyForCountry, parseMoney, tierForCountry,
} from '../lib/pricing';
import type { ProductPrice } from '../lib/types';

describe('tierForCountry — the diaspora pricing rule', () => {
  it('gives local pricing to Ethiopia', () => {
    expect(tierForCountry('ET')).toBe('local');
    expect(tierForCountry('et')).toBe('local');
    expect(tierForCountry(' ET ')).toBe('local');
  });

  it('gives international pricing everywhere else', () => {
    for (const cc of ['US', 'CA', 'GB', 'AE', 'AU', 'SE']) {
      expect(tierForCountry(cc)).toBe('international');
    }
  });

  it('defaults to international when the country is unknown', () => {
    // Failing open to the CHEAPER tier would let anyone with a blank address
    // buy at local prices. Unknown must mean international.
    expect(tierForCountry(undefined)).toBe('international');
    expect(tierForCountry(null)).toBe('international');
    expect(tierForCountry('')).toBe('international');
  });
});

describe('findPrice', () => {
  const prices: ProductPrice[] = [
    { productId: 'p1', currency: 'ETB', tier: 'local', amount: 980000 },
    { productId: 'p1', currency: 'USD', tier: 'international', amount: 17500 },
    { productId: 'p2', currency: 'USD', tier: 'international', amount: 5000 },
  ];

  it('finds an exact match', () => {
    expect(findPrice(prices, 'p1', 'ETB', 'local')).toBe(980000);
  });

  it('falls back from local to international when no local price is set', () => {
    expect(findPrice(prices, 'p2', 'USD', 'local')).toBe(5000);
  });

  it('never falls back from international to local', () => {
    // p1 has an ETB local price but no ETB international one. A diaspora
    // customer must not be handed the local number.
    expect(findPrice(prices, 'p1', 'ETB', 'international')).toBeNull();
  });

  it('returns null rather than zero when nothing is set', () => {
    expect(findPrice(prices, 'p3', 'GBP', 'international')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('puts western symbols in front', () => {
    expect(formatMoney(14500, 'USD')).toBe('$145.00');
    expect(formatMoney(9900, 'GBP')).toBe('£99.00');
  });

  it('puts birr and Gulf codes after the number', () => {
    expect(formatMoney(980000, 'ETB')).toBe('9,800.00 Br');
    expect(formatMoney(53500, 'AED')).toBe('535.00 AED');
  });

  it('respects three-decimal currencies', () => {
    expect(formatMoney(44500, 'KWD')).toBe('44.500 KWD');
  });
});

describe('parseMoney', () => {
  it('converts a typed price to minor units', () => {
    expect(parseMoney('145', 'USD')).toBe(14500);
    expect(parseMoney('145.50', 'USD')).toBe(14550);
  });

  it('handles three-decimal currencies', () => {
    expect(parseMoney('44.5', 'KWD')).toBe(44500);
  });

  it('strips symbols the owner might type', () => {
    expect(parseMoney('$1,450', 'USD')).toBe(145000);
  });

  it('returns null for nonsense rather than zero', () => {
    expect(parseMoney('', 'USD')).toBeNull();
    expect(parseMoney('abc', 'USD')).toBeNull();
  });
});

describe('guessCurrencyForCountry', () => {
  it('maps known countries', () => {
    expect(guessCurrencyForCountry('ET')).toBe('ETB');
    expect(guessCurrencyForCountry('AE')).toBe('AED');
  });

  it('maps euro-area countries to EUR', () => {
    expect(guessCurrencyForCountry('DE')).toBe('EUR');
    expect(guessCurrencyForCountry('SE')).toBe('EUR');
  });

  it('falls back to USD', () => {
    expect(guessCurrencyForCountry('JP')).toBe('USD');
    expect(guessCurrencyForCountry(undefined)).toBe('USD');
  });
});
