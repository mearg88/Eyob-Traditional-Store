import { describe, expect, it } from 'vitest';
import { FlatRateProvider, findZoneForAddress } from '../lib/shipping';
import { SEED_RATES, SEED_ZONES } from '../lib/data/seed';
import type { Address } from '../lib/types';

const base: Address = {
  fullName: 'Test Person', line1: '1 Street', city: 'Addis Ababa',
  countryCode: 'ET', phone: '+251900000000',
};

describe('findZoneForAddress', () => {
  it('routes Addis to its own zone, not the general Ethiopia zone', () => {
    expect(findZoneForAddress(base, SEED_ZONES)?.id).toBe('zone-addis');
  });

  it('routes elsewhere in Ethiopia to the national zone', () => {
    expect(findZoneForAddress({ ...base, city: 'Bahir Dar' }, SEED_ZONES)?.id)
      .toBe('zone-ethiopia');
  });

  it('matches a country to its zone', () => {
    expect(findZoneForAddress({ ...base, countryCode: 'US', city: 'Seattle' }, SEED_ZONES)?.id)
      .toBe('zone-namerica');
  });

  it('falls back to the catch-all zone so checkout is never a dead end', () => {
    expect(findZoneForAddress({ ...base, countryCode: 'JP', city: 'Osaka' }, SEED_ZONES)?.id)
      .toBe('zone-rest');
  });
});

describe('FlatRateProvider', () => {
  const provider = new FlatRateProvider();

  it('quotes the base rate for a single item', async () => {
    const quotes = await provider.quote({
      address: base, itemCount: 1, currency: 'ETB',
      zones: SEED_ZONES, rates: SEED_RATES,
    });
    expect(quotes).toHaveLength(1);
    expect(quotes[0].amount).toBe(15000);
  });

  it('adds the surcharge for each item beyond the first', async () => {
    const quotes = await provider.quote({
      address: base, itemCount: 3, currency: 'ETB',
      zones: SEED_ZONES, rates: SEED_RATES,
    });
    // 150 birr base + 2 x 50 birr
    expect(quotes[0].amount).toBe(15000 + 2 * 5000);
  });

  it('returns nothing when no rate exists in the chosen currency', async () => {
    const quotes = await provider.quote({
      address: base, itemCount: 1, currency: 'USD',
      zones: SEED_ZONES, rates: SEED_RATES,
    });
    expect(quotes).toEqual([]);
  });

  it('never returns a negative amount for an empty basket', async () => {
    const quotes = await provider.quote({
      address: base, itemCount: 0, currency: 'ETB',
      zones: SEED_ZONES, rates: SEED_RATES,
    });
    expect(quotes[0].amount).toBe(15000);
  });
});
