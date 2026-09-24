import type {
  Category, ContactChannel, CountryGroup, Design, DesignOption, DesignPrice,
  ExchangeRate, MeasurementReview, MeasurementSet, Order, OrderEvent,
  OrderStatus, Payment, ProductionStage, Review, StoreSettings, WishlistEntry,
} from '../types';
import type {
  CreateOrderInput, DataAdapter, DesignFilters, EditMeasurementInput,
} from './adapter';
import { checkMeasurements, templateById } from '../measurements';
import {
  SEED_CATEGORIES, SEED_COUNTRY_GROUPS, SEED_DESIGNS, SEED_OPTIONS,
  SEED_PRICES, SEED_RATES, SEED_REVIEWS, SEED_SETTINGS,
} from './seed';

// ---------------------------------------------------------------------------
// Demo adapter.
//
// Everything in memory, mirrored to localStorage so a demonstration survives a
// page refresh. No network, no accounts, no keys.
//
// It is not a toy: it runs the same code paths the real adapter does, so
// anything that works here works there. The one thing it cannot simulate is
// Row Level Security, which is why the security rules live in the database
// rather than in either adapter.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ets.demo.v2';

interface Persisted {
  designs: Design[];
  prices: DesignPrice[];
  options: DesignOption[];
  categories: Category[];
  countryGroups: CountryGroup[];
  rates: ExchangeRate[];
  settings: StoreSettings;
  measurementSets: MeasurementSet[];
  orders: Order[];
  orderEvents: OrderEvent[];
  payments: Payment[];
  measurementReviews: MeasurementReview[];
  wishlist: WishlistEntry[];
  customerReviews: Review[];
}

function fresh(): Persisted {
  return {
    designs: structuredClone(SEED_DESIGNS),
    prices: structuredClone(SEED_PRICES),
    options: structuredClone(SEED_OPTIONS),
    categories: structuredClone(SEED_CATEGORIES),
    countryGroups: structuredClone(SEED_COUNTRY_GROUPS),
    rates: structuredClone(SEED_RATES),
    settings: structuredClone(SEED_SETTINGS),
    measurementSets: [],
    orders: [],
    orderEvents: [],
    payments: [],
    measurementReviews: [],
    wishlist: [],
    customerReviews: structuredClone(SEED_REVIEWS),
  };
}

/** Human reference: no O/0/I/1, so it survives being read over the phone. */
function makeReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return `ETS-${out}`;
}

function load(): Persisted {
  if (typeof localStorage === 'undefined') return fresh();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    // Merged over a fresh seed so a snapshot from an older build cannot leave
    // newly added fields undefined.
    return { ...fresh(), ...(JSON.parse(raw) as Partial<Persisted>) };
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
    // Private browsing or a full quota. The demo carries on in memory.
  }
}

export function resetDemoData(): void {
  db = fresh();
  save();
}

/** A small delay so loading states are exercised rather than skipped. */
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 50));

function matches(design: Design, filters: DesignFilters, categories: Category[]): boolean {
  if (!filters.includeUnpublished && design.status !== 'published') return false;
  if (filters.gender && design.gender !== filters.gender) return false;
  if (filters.occasion && !design.occasion.includes(filters.occasion)) return false;
  if (filters.colour && !design.colour.toLowerCase().includes(filters.colour.toLowerCase())) return false;
  if (filters.fabric && !design.fabric.toLowerCase().includes(filters.fabric.toLowerCase())) return false;
  if (filters.maxProductionDays && design.productionDays > filters.maxProductionDays) return false;

  if (filters.categorySlug) {
    const category = categories.find((c) => c.slug === filters.categorySlug);
    if (!category || design.categoryId !== category.id) return false;
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    const haystack = [
      design.name, design.description, design.fabric, design.colour,
      design.embroidery, ...design.occasion,
    ].join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export class MockAdapter implements DataAdapter {
  readonly mode = 'demo' as const;

  async listCategories() {
    return delay([...db.categories].sort((a, b) => a.position - b.position));
  }

  async listDesigns(filters: DesignFilters = {}) {
    let out = db.designs.filter((d) => matches(d, filters, db.categories));

    switch (filters.sort) {
      case 'name':
        out = [...out].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'soonest':
        out = [...out].sort((a, b) => a.productionDays - b.productionDays);
        break;
      case 'price_asc':
      case 'price_desc': {
        const dir = filters.sort === 'price_asc' ? 1 : -1;
        const priceOf = (d: Design) =>
          db.prices.find((p) => p.designId === d.id && p.tier === 'international')?.amount
          ?? Number.MAX_SAFE_INTEGER;
        out = [...out].sort((a, b) => (priceOf(a) - priceOf(b)) * dir);
        break;
      }
      default:
        out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return delay(out);
  }

  async getDesignBySlug(slug: string) {
    return delay(db.designs.find((d) => d.slug === slug) ?? null);
  }

  async getDesignsByIds(ids: string[]) {
    return delay(db.designs.filter((d) => ids.includes(d.id)));
  }

  async listPrices(designIds?: string[]) {
    return delay(
      designIds ? db.prices.filter((p) => designIds.includes(p.designId)) : db.prices,
    );
  }

  async listOptions(designId: string) {
    return delay(
      db.options
        .filter((o) => o.designId === designId)
        .sort((a, b) => a.position - b.position),
    );
  }

  async listCountryGroups() {
    return delay([...db.countryGroups].sort((a, b) => a.position - b.position));
  }

  async listExchangeRates() {
    return delay([...db.rates]);
  }

  async getSettings() {
    return delay(db.settings);
  }

  async listReviews(designId: string) {
    return delay(db.customerReviews.filter((r) => r.designId === designId && r.approved));
  }

  async listMeasurementSets(customerId: string) {
    return delay(db.measurementSets.filter((m) => m.customerId === customerId));
  }

  async saveMeasurementSet(set: MeasurementSet) {
    const idx = db.measurementSets.findIndex((m) => m.id === set.id);
    if (idx >= 0) db.measurementSets[idx] = set;
    else db.measurementSets.push(set);
    save();
    return delay(set);
  }

  async deleteMeasurementSet(id: string) {
    db.measurementSets = db.measurementSets.filter((m) => m.id !== id);
    save();
    return delay(undefined);
  }

  async adminListDesigns() {
    return delay([...db.designs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async adminSaveDesign(design: Design, prices: DesignPrice[], options: DesignOption[]) {
    const next = { ...design, updatedAt: new Date().toISOString() };
    const idx = db.designs.findIndex((d) => d.id === next.id);
    if (idx >= 0) db.designs[idx] = next;
    else db.designs.unshift(next);

    db.prices = db.prices.filter((p) => p.designId !== next.id).concat(prices);
    db.options = db.options.filter((o) => o.designId !== next.id).concat(options);
    save();
    return delay(next);
  }

  async adminArchiveDesign(id: string) {
    const design = db.designs.find((d) => d.id === id);
    if (design) {
      design.status = 'archived';
      design.updatedAt = new Date().toISOString();
    }
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

  async adminDeleteCategory(id: string) {
    // Designs keep their categoryId so nothing is silently orphaned; the
    // admin surfaces them as needing a category.
    db.categories = db.categories.filter((c) => c.id !== id);
    save();
    return delay(undefined);
  }

  async adminSaveCountryGroup(group: CountryGroup) {
    const idx = db.countryGroups.findIndex((g) => g.id === group.id);
    if (idx >= 0) db.countryGroups[idx] = group;
    else db.countryGroups.push(group);
    save();
    return delay(group);
  }

  async adminSaveSettings(settings: StoreSettings) {
    db.settings = settings;
    save();
    return delay(settings);
  }

  async adminRefreshRates() {
    // Demo mode has no network. Real refresh lives in the rates function.
    db.rates = db.rates.map((r) => ({ ...r, fetchedAt: new Date().toISOString() }));
    save();
    return delay(db.rates);
  }

  // --- Orders ---------------------------------------------------------------

  async createOrder(input: CreateOrderInput) {
    const now = new Date().toISOString();
    const designs = db.designs.filter((d) => input.items.some((i) => i.designId === d.id));

    const items = input.items.map((item, idx) => {
      const design = designs.find((d) => d.id === item.designId)!;
      const base = db.prices.find((p) => p.designId === design.id && p.tier === input.tier);

      // Option effects are summed from the stored choices, never from the
      // client, so a tampered basket cannot discount itself.
      const options = db.options.filter((o) => o.designId === design.id);
      let optionEffect = 0;
      const chosen: { optionName: string; choiceLabel: string; priceEffect: number }[] = [];
      for (const option of options) {
        const choice = option.choices.find((c) => item.chosenChoiceIds.includes(c.id));
        if (!choice) continue;
        const effect = input.tier === 'local' ? choice.priceEffectLocal : choice.priceEffectUsd;
        optionEffect += effect;
        chosen.push({ optionName: option.name, choiceLabel: choice.label, priceEffect: effect });
      }

      const set = db.measurementSets.find((m) => m.id === item.measurementSetId);

      return {
        id: `oi-${Date.now()}-${idx}`,
        designId: design.id,
        designName: design.name,
        designSlug: design.slug,
        photoKey: design.photos[0]?.key,
        chosenOptions: chosen,
        specialRequest: item.specialRequest,
        measurementSetId: item.measurementSetId,
        measurementSnapshot: set ? { ...set.values } : {},
        quantity: item.quantity,
        unitAmount: (base?.amount ?? 0) + optionEffect,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);
    const discount = input.fulfilment === 'pickup'
      ? Math.round((subtotal * db.settings.pickupDiscountPercent) / 100)
      : 0;

    const order: Order = {
      id: `ord-${Date.now().toString(36)}`,
      reference: makeReference(),
      customerId: input.customerId,
      email: input.email,
      phone: input.phone,
      status: 'pending_payment',
      currency: input.currency,
      tier: input.tier,
      lockedRateFromUsd: input.lockedRateFromUsd,
      lockedAt: now,
      items,
      subtotalAmount: subtotal,
      pickupDiscountAmount: discount,
      totalAmount: Math.max(0, subtotal - discount),
      fulfilment: input.fulfilment,
      shippingAddress: input.shippingAddress,
      promisedDate: input.promisedDate,
      pausedDays: 0,
      createdAt: now,
      updatedAt: now,
    };

    const payment: Payment = {
      id: `pay-${Date.now().toString(36)}`,
      orderId: order.id,
      txRef: `${order.reference}-${Date.now().toString(36)}`,
      provider: 'mock',
      status: 'pending',
      amount: order.totalAmount,
      chargeCurrency: db.settings.chargeCurrencies.includes(order.currency)
        ? order.currency
        : 'USD',
      displayCurrency: order.currency,
      createdAt: now,
    };

    db.orders.unshift(order);
    db.payments.unshift(payment);
    db.orderEvents.push({
      id: `evt-${Date.now()}`,
      orderId: order.id,
      at: now,
      kind: 'order_placed',
      visibleToCustomer: true,
    });

    // Every order enters the verification queue. The automatic checks run now
    // so the specialist opens the queue with the doubtful ones already flagged.
    for (const item of items) {
      const set = db.measurementSets.find((m) => m.id === item.measurementSetId);
      const template = set ? templateById(set.templateId) : undefined;
      const flags = set && template
        ? checkMeasurements(template, set.values).map((f) => f.message)
        : [];

      db.measurementReviews.unshift({
        id: `rev-${Date.now().toString(36)}-${item.id}`,
        orderId: order.id,
        measurementSetId: item.measurementSetId,
        status: 'submitted',
        flags,
        contactAttempts: [],
        edits: [],
        createdAt: now,
      });
    }

    save();
    return delay({ order, payment });
  }

  async getOrder(reference: string) {
    return delay(
      db.orders.find((o) => o.reference.toUpperCase() === reference.trim().toUpperCase()) ?? null,
    );
  }

  async listOrdersForCustomer(customerId: string) {
    return delay(db.orders.filter((o) => o.customerId === customerId));
  }

  async listOrderEvents(orderId: string) {
    return delay(
      db.orderEvents.filter((e) => e.orderId === orderId).sort((a, b) => a.at.localeCompare(b.at)),
    );
  }

  // --- Verification ---------------------------------------------------------

  async listMeasurementReviews(status?: MeasurementReview['status']) {
    const all = status
      ? db.measurementReviews.filter((r) => r.status === status)
      : db.measurementReviews;
    // Flagged sets first: those are the ones most likely to need a call.
    return delay(
      [...all].sort((a, b) => b.flags.length - a.flags.length
        || b.createdAt.localeCompare(a.createdAt)),
    );
  }

  async getMeasurementReview(id: string) {
    return delay(db.measurementReviews.find((r) => r.id === id) ?? null);
  }

  async getMeasurementReviewForOrder(orderId: string) {
    return delay(db.measurementReviews.find((r) => r.orderId === orderId) ?? null);
  }

  async editMeasurement(input: EditMeasurementInput) {
    const review = db.measurementReviews.find((r) => r.id === input.reviewId);
    if (!review) throw new Error('That measurement review no longer exists.');

    const set = db.measurementSets.find((m) => m.id === review.measurementSetId);
    const oldValue = set?.values[input.fieldKey];

    // Appended, never overwritten. This log is the evidence in a fit dispute,
    // and it is worth nothing if it can be edited after the fact.
    review.edits.push({
      id: `edt-${Date.now().toString(36)}`,
      reviewId: review.id,
      fieldKey: input.fieldKey,
      oldValueCm: oldValue,
      newValueCm: input.newValueCm,
      editedBy: input.editedBy,
      editedAt: new Date().toISOString(),
      reason: input.reason,
    });

    if (set) {
      set.values = { ...set.values, [input.fieldKey]: input.newValueCm };
      set.updatedAt = new Date().toISOString();
    }

    // A changed measurement always needs the customer to agree before anything
    // is cut. That confirmation is what protects the shop later.
    review.status = 'awaiting_customer_confirmation';
    review.customerConfirmedAt = undefined;

    const order = db.orders.find((o) => o.id === review.orderId);
    if (order) {
      order.status = 'awaiting_customer_confirmation';
      order.updatedAt = new Date().toISOString();
    }

    save();
    return delay(review);
  }

  async logContactAttempt(input: {
    reviewId: string; channel: ContactChannel; staffId: string;
    reached: boolean; note?: string;
  }) {
    const review = db.measurementReviews.find((r) => r.id === input.reviewId);
    if (!review) throw new Error('That measurement review no longer exists.');

    review.contactAttempts.push({
      id: `att-${Date.now().toString(36)}`,
      channel: input.channel,
      attemptedAt: new Date().toISOString(),
      staffId: input.staffId,
      reached: input.reached,
      note: input.note,
    });
    if (review.status === 'submitted') review.status = 'under_review';
    save();
    return delay(review);
  }

  async setMeasurementReviewStatus(
    id: string,
    status: MeasurementReview['status'],
    by: string,
    notes?: string,
  ) {
    const review = db.measurementReviews.find((r) => r.id === id);
    if (!review) throw new Error('That measurement review no longer exists.');

    review.status = status;
    if (notes !== undefined) review.staffNotes = notes;

    if (status === 'verified') {
      review.verifiedAt = new Date().toISOString();
      review.verifiedBy = by;

      // Production only begins once every set on the order is verified.
      const order = db.orders.find((o) => o.id === review.orderId);
      const siblings = db.measurementReviews.filter((r) => r.orderId === review.orderId);
      if (order && siblings.every((r) => r.status === 'verified')) {
        order.status = 'in_production';
        order.productionStage = 'fabric_cut';
        order.updatedAt = new Date().toISOString();
        db.orderEvents.push({
          id: `evt-${Date.now()}`,
          orderId: order.id,
          at: new Date().toISOString(),
          kind: 'measurements_verified',
          visibleToCustomer: true,
        });
      }
    }

    save();
    return delay(review);
  }

  async confirmMeasurements(reviewId: string) {
    const review = db.measurementReviews.find((r) => r.id === reviewId);
    if (!review) throw new Error('That measurement review no longer exists.');

    review.customerConfirmedAt = new Date().toISOString();
    // Confirmation returns it to the specialist, who has the last word before
    // cloth is cut.
    review.status = 'under_review';

    const order = db.orders.find((o) => o.id === review.orderId);
    if (order) {
      order.status = 'measurements_under_review';
      // The promised date pauses while the shop waits on the customer, so a
      // slow reply cannot run down the shop's own refund deadline.
      const waitedFrom = review.edits.at(-1)?.editedAt;
      if (waitedFrom) {
        const days = Math.floor(
          (Date.now() - new Date(waitedFrom).getTime()) / 86_400_000,
        );
        order.pausedDays += Math.max(0, days);
      }
      order.updatedAt = new Date().toISOString();
    }

    save();
    return delay(review);
  }

  // --- Social ---------------------------------------------------------------

  async listWishlist(customerId: string) {
    return delay(db.wishlist.filter((w) => w.customerId === customerId));
  }

  async toggleWishlist(customerId: string, designId: string) {
    const existing = db.wishlist.findIndex(
      (w) => w.customerId === customerId && w.designId === designId,
    );
    if (existing >= 0) {
      db.wishlist.splice(existing, 1);
      save();
      return delay(false);
    }
    db.wishlist.push({ customerId, designId, addedAt: new Date().toISOString() });
    save();
    return delay(true);
  }

  async submitReview(input: {
    designId: string; orderId: string; customerId: string; authorName: string;
    rating: 1 | 2 | 3 | 4 | 5; body: string; photoKeys: string[];
  }) {
    // Mirrors the database policy: only a delivered order containing that
    // design may be reviewed. Enforced in both places so the demo cannot do
    // something production would refuse.
    const order = db.orders.find((o) => o.id === input.orderId);
    if (!order || order.customerId !== input.customerId || order.status !== 'delivered') {
      throw new Error('Only a delivered order can be reviewed.');
    }
    if (!order.items.some((i) => i.designId === input.designId)) {
      throw new Error('That design was not part of this order.');
    }

    const review: Review = {
      id: `crv-${Date.now().toString(36)}`,
      ...input,
      approved: false,
      createdAt: new Date().toISOString(),
    };
    db.customerReviews.unshift(review);
    save();
    return delay(review);
  }

  // --- Admin: orders --------------------------------------------------------

  async adminListOrders(status?: OrderStatus) {
    return delay(status ? db.orders.filter((o) => o.status === status) : [...db.orders]);
  }

  async adminGetOrder(id: string) {
    return delay(db.orders.find((o) => o.id === id) ?? null);
  }

  async adminSetOrderStatus(
    id: string,
    status: OrderStatus,
    by: string,
    stage?: ProductionStage,
  ) {
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');

    order.status = status;
    if (stage) order.productionStage = stage;
    order.updatedAt = new Date().toISOString();

    db.orderEvents.push({
      id: `evt-${Date.now()}`,
      orderId: order.id,
      at: order.updatedAt,
      kind: stage ? `stage_${stage}` : `status_${status}`,
      actorId: by,
      visibleToCustomer: true,
    });

    save();
    return delay(order);
  }

  async adminAddOrderEvent(input: {
    orderId: string; kind: string; note?: string; photoKey?: string;
    actorId?: string; visibleToCustomer?: boolean;
  }) {
    const event: OrderEvent = {
      id: `evt-${Date.now().toString(36)}`,
      orderId: input.orderId,
      at: new Date().toISOString(),
      kind: input.kind,
      note: input.note,
      photoKey: input.photoKey,
      actorId: input.actorId,
      visibleToCustomer: input.visibleToCustomer ?? true,
    };
    db.orderEvents.push(event);
    save();
    return delay(event);
  }

  async adminListPendingReviews() {
    return delay(db.customerReviews.filter((r) => !r.approved));
  }

  async adminModerateReview(id: string, approved: boolean) {
    const review = db.customerReviews.find((r) => r.id === id);
    if (review) review.approved = approved;
    save();
    return delay(undefined);
  }

  /** Demo only: completes the simulated payment so the flow can be shown. */
  async _markPaid(txRef: string): Promise<Order | null> {
    const payment = db.payments.find((p) => p.txRef === txRef);
    if (!payment) return null;
    payment.status = 'paid';
    payment.paidAt = new Date().toISOString();

    const order = db.orders.find((o) => o.id === payment.orderId);
    if (order) {
      order.status = 'measurements_under_review';
      order.updatedAt = new Date().toISOString();
      db.orderEvents.push({
        id: `evt-${Date.now()}`,
        orderId: order.id,
        at: order.updatedAt,
        kind: 'payment_received',
        visibleToCustomer: true,
      });
    }
    save();
    return order ?? null;
  }

}
