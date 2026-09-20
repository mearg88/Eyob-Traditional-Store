import type {
  Category, Order, OrderStatus, Payment, Product, ProductPrice, PromoCode,
  ShippingRate, ShippingZone, StoreSettings,
} from '../types';
import { findPrice } from '../pricing';
import type {
  CreateOrderInput, DataAdapter, ProductFilters, ReservationResult,
} from './adapter';
import {
  SEED_CATEGORIES, SEED_ORDERS, SEED_PRICES, SEED_PRODUCTS, SEED_PROMOS,
  SEED_RATES, SEED_REVIEWS, SEED_SETTINGS, SEED_ZONES,
} from './seed';

// ---------------------------------------------------------------------------
// Demo adapter.
//
// Everything lives in memory, with orders and edits mirrored to localStorage
// so a demo survives a page refresh. No network, no accounts, no keys.
//
// It is not a toy: it enforces the same reservation rules as the real thing,
// including refusing to sell a one-of-a-kind piece twice. If the demo can be
// made to double-sell, so could production.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ets.demo.v1';

interface Persisted {
  products: Product[];
  prices: ProductPrice[];
  categories: Category[];
  orders: Order[];
  payments: Payment[];
  zones: ShippingZone[];
  rates: ShippingRate[];
  promos: PromoCode[];
  settings: StoreSettings;
}

function fresh(): Persisted {
  return {
    products: structuredClone(SEED_PRODUCTS),
    prices: structuredClone(SEED_PRICES),
    categories: structuredClone(SEED_CATEGORIES),
    orders: structuredClone(SEED_ORDERS),
    payments: [],
    zones: structuredClone(SEED_ZONES),
    rates: structuredClone(SEED_RATES),
    promos: structuredClone(SEED_PROMOS),
    settings: structuredClone(SEED_SETTINGS),
  };
}

function load(): Persisted {
  if (typeof localStorage === 'undefined') return fresh();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    // Merge over a fresh seed so a stored snapshot from an older build cannot
    // leave newly added fields undefined.
    return { ...fresh(), ...parsed };
  } catch {
    return fresh();
  }
}

let db: Persisted = load();

function save(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Private browsing or a full quota. The demo keeps working in memory.
  }
}

export function resetDemoData(): void {
  db = fresh();
  save();
}

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 60));

function reference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return `ETS-${out}`;
}

function matchesFilters(p: Product, f: ProductFilters, prices: ProductPrice[]): boolean {
  if (!f.includeSold && (p.status === 'archived' || p.status === 'sold')) return false;
  if (f.gender && p.gender !== f.gender) return false;
  if (f.kind && p.kind !== f.kind) return false;
  if (f.occasion && !p.occasion.includes(f.occasion)) return false;
  if (f.colour && !p.colour.toLowerCase().includes(f.colour.toLowerCase())) return false;
  if (f.fabric && !p.fabric.toLowerCase().includes(f.fabric.toLowerCase())) return false;

  if (f.search) {
    const q = f.search.toLowerCase();
    const haystack = [p.name, p.description, p.fabric, p.colour, p.tibebPattern, ...p.occasion]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if ((f.minAmount !== undefined || f.maxAmount !== undefined) && f.currency && f.tier) {
    const amount = findPrice(prices, p.id, f.currency, f.tier);
    if (amount === null) return false;
    if (f.minAmount !== undefined && amount < f.minAmount) return false;
    if (f.maxAmount !== undefined && amount > f.maxAmount) return false;
  }
  return true;
}

export class MockAdapter implements DataAdapter {
  readonly mode = 'demo' as const;

  async listCategories() {
    return delay([...db.categories].sort((a, b) => a.position - b.position));
  }

  async listProducts(filters: ProductFilters = {}) {
    const categoryId = filters.categorySlug
      ? db.categories.find((c) => c.slug === filters.categorySlug)?.id
      : undefined;

    let out = db.products.filter(
      (p) =>
        (!categoryId || p.categoryId === categoryId) &&
        matchesFilters(p, filters, db.prices),
    );

    const { currency, tier, sort } = filters;
    if (sort === 'price_asc' || sort === 'price_desc') {
      const dir = sort === 'price_asc' ? 1 : -1;
      const priceOf = (p: Product) =>
        currency && tier ? findPrice(db.prices, p.id, currency, tier) ?? Number.MAX_SAFE_INTEGER : 0;
      out = [...out].sort((a, b) => (priceOf(a) - priceOf(b)) * dir);
    } else if (sort === 'name') {
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return delay(out);
  }

  async getProductBySlug(slug: string) {
    return delay(db.products.find((p) => p.slug === slug) ?? null);
  }

  async getProductsByIds(ids: string[]) {
    return delay(db.products.filter((p) => ids.includes(p.id)));
  }

  async listPrices(productIds?: string[]) {
    return delay(
      productIds ? db.prices.filter((p) => productIds.includes(p.productId)) : db.prices,
    );
  }

  async listZones() {
    return delay([...db.zones].sort((a, b) => a.position - b.position));
  }

  async listRates() {
    return delay([...db.rates]);
  }

  async listReviews(productId: string) {
    return delay(SEED_REVIEWS.filter((r) => r.productId === productId && r.approved));
  }

  async getSettings() {
    return delay(db.settings);
  }

  async findPromo(code: string) {
    const promo = db.promos.find(
      (p) => p.code.toLowerCase() === code.trim().toLowerCase() && p.active,
    );
    if (!promo) return delay(null);
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return delay(null);
    if (promo.maxRedemptions && promo.timesRedeemed >= promo.maxRedemptions) return delay(null);
    return delay(promo);
  }

  /**
   * The one-of-a-kind race, handled the same way the database does it: check
   * and flip in a single pass with no await in the middle, so two concurrent
   * callers cannot both observe 'available'.
   */
  async reserveProducts(productIds: string[]): Promise<ReservationResult> {
    const unavailable: string[] = [];
    const toReserve: Product[] = [];

    for (const id of productIds) {
      const product = db.products.find((p) => p.id === id);
      if (!product) {
        unavailable.push(id);
        continue;
      }
      if (product.kind === 'made_to_order') continue;
      if (product.status !== 'available') {
        unavailable.push(id);
        continue;
      }
      toReserve.push(product);
    }

    if (unavailable.length > 0) return delay({ ok: false, unavailableProductIds: unavailable });

    for (const product of toReserve) product.status = 'reserved';
    save();
    return delay({ ok: true, unavailableProductIds: [] });
  }

  async releaseProducts(productIds: string[]) {
    for (const id of productIds) {
      const product = db.products.find((p) => p.id === id);
      if (product && product.status === 'reserved') product.status = 'available';
    }
    save();
    return delay(undefined);
  }

  async createOrder(input: CreateOrderInput) {
    const now = new Date().toISOString();
    const products = db.products.filter((p) => input.items.some((i) => i.productId === p.id));

    const items = input.items.map((item, idx) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitAmount = findPrice(db.prices, product.id, input.currency, input.tier) ?? 0;
      return {
        id: `oi-${Date.now()}-${idx}`,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        imageKey: product.images[0]?.key,
        kind: product.kind,
        quantity: item.quantity,
        unitAmount,
        customerMeasurements: item.customerMeasurements,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);

    let discount = 0;
    if (input.promoCode) {
      const promo = await this.findPromo(input.promoCode);
      if (promo) {
        discount =
          promo.kind === 'percentage'
            ? Math.round((subtotal * promo.value) / 100)
            : promo.currency === input.currency
              ? Math.min(promo.value, subtotal)
              : 0;
      }
    }

    const order: Order = {
      id: `ord-${Date.now()}`,
      reference: reference(),
      email: input.email,
      phone: input.phone,
      status: 'pending_payment',
      currency: input.currency,
      tier: input.tier,
      items: items as Order['items'],
      subtotalAmount: subtotal,
      shippingAmount: input.shippingAmount,
      discountAmount: discount,
      totalAmount: Math.max(0, subtotal - discount) + input.shippingAmount,
      promoCode: input.promoCode,
      shippingAddress: input.shippingAddress,
      shippingRateId: input.shippingRateId,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      orderId: order.id,
      txRef: `${order.reference}-${Date.now().toString(36)}`,
      provider: 'mock',
      status: 'pending',
      amount: order.totalAmount,
      currency: order.currency,
      createdAt: now,
    };

    db.orders.unshift(order);
    db.payments.unshift(payment);
    save();
    return delay({ order, payment });
  }

  async getOrderByReference(ref: string, email: string) {
    const order = db.orders.find(
      (o) =>
        o.reference.toLowerCase() === ref.trim().toLowerCase() &&
        o.email.toLowerCase() === email.trim().toLowerCase(),
    );
    return delay(order ?? null);
  }

  async listOrdersForEmail(email: string) {
    return delay(db.orders.filter((o) => o.email.toLowerCase() === email.trim().toLowerCase()));
  }

  async adminListOrders(status?: OrderStatus) {
    return delay(status ? db.orders.filter((o) => o.status === status) : [...db.orders]);
  }

  async adminGetOrder(id: string) {
    return delay(db.orders.find((o) => o.id === id) ?? null);
  }

  async adminUpdateOrderStatus(
    id: string,
    status: OrderStatus,
    extra?: { trackingNumber?: string; trackingCarrier?: string },
  ) {
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (extra?.trackingNumber !== undefined) order.trackingNumber = extra.trackingNumber;
    if (extra?.trackingCarrier !== undefined) order.trackingCarrier = extra.trackingCarrier;

    // Selling a one-of-a-kind piece takes it off the shelf for good; cancelling
    // puts it back.
    if (status === 'paid' || status === 'shipped' || status === 'delivered') {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product && product.kind === 'one_of_a_kind') product.status = 'sold';
      }
    }
    if (status === 'cancelled') {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product && product.kind === 'one_of_a_kind' && product.status !== 'sold') {
          product.status = 'available';
        }
      }
    }
    save();
    return delay(order);
  }

  async adminListProducts() {
    return delay([...db.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async adminSaveProduct(product: Product, prices: ProductPrice[]) {
    const idx = db.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) db.products[idx] = product;
    else db.products.unshift(product);

    db.prices = db.prices.filter((p) => p.productId !== product.id);
    db.prices.push(...prices);
    save();
    return delay(product);
  }

  async adminArchiveProduct(id: string) {
    const product = db.products.find((p) => p.id === id);
    if (product) product.status = 'archived';
    save();
    return delay(undefined);
  }

  async adminSaveCategory(category: Category) {
    const idx = db.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) db.categories[idx] = category;
    else db.categories.push(category);
    save();
    return delay(category);
  }

  async adminSaveZone(zone: ShippingZone) {
    const idx = db.zones.findIndex((z) => z.id === zone.id);
    if (idx >= 0) db.zones[idx] = zone;
    else db.zones.push(zone);
    save();
    return delay(zone);
  }

  async adminSaveRate(rate: ShippingRate) {
    const idx = db.rates.findIndex((r) => r.id === rate.id);
    if (idx >= 0) db.rates[idx] = rate;
    else db.rates.push(rate);
    save();
    return delay(rate);
  }

  async adminDeleteRate(id: string) {
    db.rates = db.rates.filter((r) => r.id !== id);
    save();
    return delay(undefined);
  }

  async adminListPromos() {
    return delay([...db.promos]);
  }

  async adminSavePromo(promo: PromoCode) {
    const idx = db.promos.findIndex((p) => p.id === promo.id);
    if (idx >= 0) db.promos[idx] = promo;
    else db.promos.push(promo);
    save();
    return delay(promo);
  }

  async adminSaveSettings(settings: StoreSettings) {
    db.settings = settings;
    save();
    return delay(settings);
  }

  async adminListPayments(orderId: string) {
    return delay(db.payments.filter((p) => p.orderId === orderId));
  }

  /** Demo-only: lets the mock checkout mark a payment paid. */
  async _markPaid(txRef: string): Promise<Order | null> {
    const payment = db.payments.find((p) => p.txRef === txRef);
    if (!payment) return null;
    payment.status = 'paid';
    payment.paidAt = new Date().toISOString();
    const order = db.orders.find((o) => o.id === payment.orderId);
    if (order) {
      const madeToOrder = order.items.some((i) => i.kind === 'made_to_order');
      await this.adminUpdateOrderStatus(order.id, madeToOrder ? 'in_production' : 'paid', undefined);
    }
    save();
    return order ?? null;
  }
}
