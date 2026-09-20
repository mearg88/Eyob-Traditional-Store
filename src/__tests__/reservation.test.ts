import { beforeEach, describe, expect, it } from 'vitest';
import { MockAdapter } from '../lib/data/mock';
import { resetDemoData } from '../lib/data/mock';

// ---------------------------------------------------------------------------
// The double-sell guarantee.
//
// Every ready-made piece is unique, so "two customers buying the last item" is
// not an edge case here — it is every sale. These tests pin the behaviour in
// the demo adapter; the same guarantee in production comes from the
// reserve_products() function in supabase/schema.sql, where an atomic
// conditional UPDATE does the same job under real concurrency.
// ---------------------------------------------------------------------------

describe('reserveProducts', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    resetDemoData();
    adapter = new MockAdapter();
  });

  it('reserves an available one-of-a-kind piece', async () => {
    const result = await adapter.reserveProducts(['prod-002']);
    expect(result.ok).toBe(true);
    expect(result.unavailableProductIds).toEqual([]);
  });

  it('refuses to reserve the same piece twice', async () => {
    const first = await adapter.reserveProducts(['prod-002']);
    const second = await adapter.reserveProducts(['prod-002']);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.unavailableProductIds).toEqual(['prod-002']);
  });

  it('lets two concurrent buyers race, and only one wins', async () => {
    const [a, b] = await Promise.all([
      adapter.reserveProducts(['prod-003']),
      adapter.reserveProducts(['prod-003']),
    ]);

    const winners = [a, b].filter((r) => r.ok);
    expect(winners).toHaveLength(1);
  });

  it('never blocks a made-to-order piece, which cannot run out', async () => {
    const first = await adapter.reserveProducts(['prod-001']);
    const second = await adapter.reserveProducts(['prod-001']);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it('is all-or-nothing across a basket', async () => {
    await adapter.reserveProducts(['prod-002']);

    // prod-005 is free, prod-002 is taken. The whole basket must fail.
    const result = await adapter.reserveProducts(['prod-005', 'prod-002']);
    expect(result.ok).toBe(false);

    // prod-005 must be back on the shelf, not stranded in 'reserved'.
    const retry = await adapter.reserveProducts(['prod-005']);
    expect(retry.ok).toBe(true);
  });

  it('puts a piece back when the reservation is released', async () => {
    await adapter.reserveProducts(['prod-006']);
    await adapter.releaseProducts(['prod-006']);
    expect((await adapter.reserveProducts(['prod-006'])).ok).toBe(true);
  });

  it('reports an unknown product as unavailable rather than throwing', async () => {
    const result = await adapter.reserveProducts(['does-not-exist']);
    expect(result.ok).toBe(false);
    expect(result.unavailableProductIds).toEqual(['does-not-exist']);
  });

  it('keeps a sold piece sold even after a release', async () => {
    await adapter.reserveProducts(['prod-009']);
    const { order } = await adapter.createOrder({
      email: 'test@example.com',
      currency: 'USD',
      tier: 'international',
      items: [{ productId: 'prod-009', quantity: 1 }],
      shippingAddress: {
        fullName: 'Test', line1: '1 St', city: 'Seattle',
        countryCode: 'US', phone: '+1555',
      },
      shippingAmount: 3500,
    });
    await adapter.adminUpdateOrderStatus(order.id, 'paid');

    const result = await adapter.reserveProducts(['prod-009']);
    expect(result.ok).toBe(false);
  });
});

describe('createOrder', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    resetDemoData();
    adapter = new MockAdapter();
  });

  it('snapshots the price so later edits do not rewrite history', async () => {
    const { order } = await adapter.createOrder({
      email: 'test@example.com',
      currency: 'USD',
      tier: 'international',
      items: [{ productId: 'prod-002', quantity: 1 }],
      shippingAddress: {
        fullName: 'Test', line1: '1 St', city: 'Seattle',
        countryCode: 'US', phone: '+1555',
      },
      shippingAmount: 3500,
    });

    expect(order.items[0].unitAmount).toBe(17500);
    expect(order.items[0].productName).toBe('Meskel Celebration Kemis');
    expect(order.totalAmount).toBe(17500 + 3500);
  });

  it('applies a percentage promo code', async () => {
    const { order } = await adapter.createOrder({
      email: 'test@example.com',
      currency: 'USD',
      tier: 'international',
      items: [{ productId: 'prod-002', quantity: 1 }],
      shippingAddress: {
        fullName: 'Test', line1: '1 St', city: 'Seattle',
        countryCode: 'US', phone: '+1555',
      },
      shippingAmount: 3500,
      promoCode: 'WELCOME10',
    });

    expect(order.discountAmount).toBe(1750);
    expect(order.totalAmount).toBe(17500 - 1750 + 3500);
  });

  it('ignores an unknown promo code rather than failing the order', async () => {
    const { order } = await adapter.createOrder({
      email: 'test@example.com',
      currency: 'USD',
      tier: 'international',
      items: [{ productId: 'prod-002', quantity: 1 }],
      shippingAddress: {
        fullName: 'Test', line1: '1 St', city: 'Seattle',
        countryCode: 'US', phone: '+1555',
      },
      shippingAmount: 3500,
      promoCode: 'NOTREAL',
    });

    expect(order.discountAmount).toBe(0);
  });

  it('creates a pending payment alongside the order', async () => {
    const { order, payment } = await adapter.createOrder({
      email: 'test@example.com',
      currency: 'USD',
      tier: 'international',
      items: [{ productId: 'prod-002', quantity: 1 }],
      shippingAddress: {
        fullName: 'Test', line1: '1 St', city: 'Seattle',
        countryCode: 'US', phone: '+1555',
      },
      shippingAmount: 3500,
    });

    expect(payment.status).toBe('pending');
    expect(payment.amount).toBe(order.totalAmount);
    expect(order.status).toBe('pending_payment');
  });

  it('will not open someone else’s order with the wrong email', async () => {
    const { order } = await adapter.createOrder({
      email: 'real@example.com',
      currency: 'USD',
      tier: 'international',
      items: [{ productId: 'prod-002', quantity: 1 }],
      shippingAddress: {
        fullName: 'Test', line1: '1 St', city: 'Seattle',
        countryCode: 'US', phone: '+1555',
      },
      shippingAmount: 3500,
    });

    expect(await adapter.getOrderByReference(order.reference, 'attacker@example.com')).toBeNull();
    expect(await adapter.getOrderByReference(order.reference, 'real@example.com')).not.toBeNull();
  });
});
