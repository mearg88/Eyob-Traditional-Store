import { describe, expect, it } from 'vitest';
import {
  chargeNotice, promisedDate, rateToLock, resolveTier,
} from '../lib/checkout';
import type { Address, CountryGroup, ExchangeRate, StoreSettings } from '../lib/types';

const ADDIS: Address = {
  fullName: 'A', line1: '1', city: 'Addis Ababa', countryCode: 'ET', phone: '+251',
};
const SEATTLE: Address = {
  fullName: 'B', line1: '1', city: 'Seattle', countryCode: 'US', phone: '+1',
};

const GROUP: CountryGroup = {
  id: 'g', name: 'USA', countries: ['US'], upliftPercent: 0,
  deliveryDaysMin: 7, deliveryDaysMax: 14, position: 1,
};

describe('resolveTier', () => {
  it('gives local pricing to an Ethiopian delivery', () => {
    expect(resolveTier('delivery', ADDIS)).toBe('local');
  });

  it('gives international pricing to a delivery abroad', () => {
    expect(resolveTier('delivery', SEATTLE)).toBe('international');
  });

  it('always gives local pricing for collection', () => {
    // Someone collecting is standing in the shop in Addis, whatever their
    // account or browser says.
    expect(resolveTier('pickup')).toBe('local');
    expect(resolveTier('pickup', SEATTLE)).toBe('local');
  });

  it('defaults to international with no address', () => {
    // Failing open to the cheaper tier would be exploitable.
    expect(resolveTier('delivery')).toBe('international');
  });
});

describe('promisedDate', () => {
  // A Monday, so the working-day arithmetic is easy to reason about.
  const monday = new Date('2026-01-05T09:00:00Z');

  it('adds production and delivery days', () => {
    const due = promisedDate(10, GROUP, 'delivery', monday);
    expect(due.getTime()).toBeGreaterThan(monday.getTime());
  });

  it('adds no delivery time for collection', () => {
    const collect = promisedDate(10, GROUP, 'pickup', monday);
    const deliver = promisedDate(10, GROUP, 'delivery', monday);
    expect(collect.getTime()).toBeLessThan(deliver.getTime());
  });

  it('never lands on a Sunday, because the workshop does not weave then', () => {
    for (let days = 1; days <= 40; days += 1) {
      expect(promisedDate(days, null, 'pickup', monday).getDay()).not.toBe(0);
    }
  });

  it('quotes longer for a slower destination', () => {
    const slow: CountryGroup = { ...GROUP, deliveryDaysMax: 25 };
    expect(promisedDate(10, slow, 'delivery', monday).getTime())
      .toBeGreaterThan(promisedDate(10, GROUP, 'delivery', monday).getTime());
  });
});

describe('rateToLock', () => {
  const rates: ExchangeRate[] = [
    { currency: 'GBP', rateFromUsd: 0.81, marginPercent: 2, fetchedAt: '' },
  ];

  it('is 1 for the currencies prices are typed in', () => {
    expect(rateToLock('USD', rates)).toBe(1);
    expect(rateToLock('ETB', rates)).toBe(1);
  });

  it('captures the stored rate for everything else', () => {
    expect(rateToLock('GBP', rates)).toBe(0.81);
  });

  it('falls back to 1 rather than zero when a rate is missing', () => {
    // Zero would make the order free. One makes it a dollar price, which is
    // wrong but safe, and visible.
    expect(rateToLock('CAD', rates)).toBe(1);
  });
});

describe('chargeNotice', () => {
  const settings = { chargeCurrencies: ['ETB', 'USD'] } as StoreSettings;

  it('stays quiet when we can charge in what is displayed', () => {
    expect(chargeNotice('USD', settings).needed).toBe(false);
    expect(chargeNotice('ETB', settings).needed).toBe(false);
  });

  it('warns when the customer will be charged in something else', () => {
    // Silence here is what produces chargebacks from people who felt misled.
    const notice = chargeNotice('GBP', settings);
    expect(notice.needed).toBe(true);
    expect(notice.chargeCurrency).toBe('USD');
  });

  it('assumes the safe default when settings have not loaded', () => {
    expect(chargeNotice('EUR', null).needed).toBe(true);
    expect(chargeNotice('USD', null).needed).toBe(false);
  });
});
