import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Category, Measurements, Order, OrderStatus, Payment, Product, ProductPrice,
  PromoCode, Review, ShippingRate, ShippingZone, StoreSettings,
} from '../types';
import type {
  CreateOrderInput, DataAdapter, ProductFilters, ReservationResult,
} from './adapter';

// ---------------------------------------------------------------------------
// Supabase adapter.
//
// Every call here goes out with the ANON key, which is public by design. What
// keeps customers out of each other's data is Row Level Security in the
// database (see supabase/schema.sql), not anything in this file. If a policy
// is missing, no amount of care in this adapter compensates for it.
//
// Two operations deliberately do NOT live here, because they cannot be done
// safely from a browser:
//
//   - taking payment, which needs the Chapa secret key
//   - marking an order paid, which must only ever happen on a verified webhook
//
// Both live in /api as serverless functions.
// ---------------------------------------------------------------------------

/** snake_case in Postgres, camelCase in TypeScript. Mapped explicitly. */
interface ProductRow {
  id: string; slug: string; kind: Product['kind']; status: Product['status'];
  name: string; category_id: string; description: string; care_instructions: string;
  fabric: string; colour: string; tibeb_pattern: string; occasion: string[];
  gender: Product['gender']; measurements: Measurements; nominal_size: string;
  lead_time_days: number | null; featured: boolean; created_at: string;
  product_images?: { id: string; storage_key: string; alt: string; position: number; widths: number[] | null }[];
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    status: row.status,
    name: row.name,
    categoryId: row.category_id,
    description: row.description ?? '',
    careInstructions: row.care_instructions ?? '',
    fabric: row.fabric ?? '',
    colour: row.colour ?? '',
    tibebPattern: row.tibeb_pattern ?? '',
    occasion: row.occasion ?? [],
    gender: row.gender,
    measurements: row.measurements ?? {},
    nominalSize: row.nominal_size ?? '',
    leadTimeDays: row.lead_time_days ?? undefined,
    images: (row.product_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        id: img.id,
        key: img.storage_key,
        alt: img.alt ?? row.name,
        position: img.position,
        widths: img.widths ?? undefined,
      })),
    featured: row.featured,
    createdAt: row.created_at,
  };
}

function toOrder(row: Record<string, unknown>): Order {
  const items = (row.order_items as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: row.id as string,
    reference: row.reference as string,
    customerId: (row.customer_id as string) ?? undefined,
    email: row.email as string,
    phone: (row.phone as string) ?? undefined,
    status: row.status as OrderStatus,
    currency: row.currency as Order['currency'],
    tier: row.tier as Order['tier'],
    items: items.map((i) => ({
      id: i.id as string,
      productId: i.product_id as string,
      productName: i.product_name as string,
      productSlug: i.product_slug as string,
      imageKey: (i.image_key as string) ?? undefined,
      kind: i.kind as Product['kind'],
      quantity: i.quantity as number,
      unitAmount: i.unit_amount as number,
      customerMeasurements: (i.customer_measurements as Measurements) ?? undefined,
    })),
    subtotalAmount: row.subtotal_amount as number,
    shippingAmount: row.shipping_amount as number,
    discountAmount: row.discount_amount as number,
    totalAmount: row.total_amount as number,
    promoCode: (row.promo_code as string) ?? undefined,
    shippingAddress: row.shipping_address as Order['shippingAddress'],
    shippingRateId: (row.shipping_rate_id as string) ?? undefined,
    trackingNumber: (row.tracking_number as string) ?? undefined,
    trackingCarrier: (row.tracking_carrier as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const PRODUCT_SELECT = '*, product_images(id, storage_key, alt, position, widths)';
const ORDER_SELECT = '*, order_items(*)';

export class SupabaseAdapter implements DataAdapter {
  readonly mode = 'supabase' as const;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  private async rows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listCategories(): Promise<Category[]> {
    const rows = await this.rows(
      this.client.from('categories').select('*').order('position'),
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      description: (r.description as string) ?? '',
      position: r.position as number,
    }));
  }

  async listProducts(filters: ProductFilters = {}): Promise<Product[]> {
    let query = this.client.from('products').select(PRODUCT_SELECT);

    if (!filters.includeSold) query = query.in('status', ['available', 'reserved']);
    if (filters.gender) query = query.eq('gender', filters.gender);
    if (filters.kind) query = query.eq('kind', filters.kind);
    if (filters.occasion) query = query.contains('occasion', [filters.occasion]);
    if (filters.search) {
      // Postgres full-text would be better; ilike keeps the free tier simple
      // and 50 products do not need an index.
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }
    if (filters.categorySlug) {
      const categories = await this.listCategories();
      const category = categories.find((c) => c.slug === filters.categorySlug);
      if (!category) return [];
      query = query.eq('category_id', category.id);
    }

    query = filters.sort === 'name'
      ? query.order('name')
      : query.order('created_at', { ascending: false });

    const rows = await this.rows<ProductRow>(query);
    let products = rows.map(toProduct);

    // Price sorting happens here rather than in SQL because price lives in a
    // separate table keyed by currency and tier, and sorting on it in Postgres
    // would need a join the free tier can do without at this catalogue size.
    if ((filters.sort === 'price_asc' || filters.sort === 'price_desc') && filters.currency && filters.tier) {
      const prices = await this.listPrices(products.map((p) => p.id));
      const amountOf = (id: string) =>
        prices.find((p) => p.productId === id && p.currency === filters.currency && p.tier === filters.tier)
          ?.amount ?? Number.MAX_SAFE_INTEGER;
      const dir = filters.sort === 'price_asc' ? 1 : -1;
      products = [...products].sort((a, b) => (amountOf(a.id) - amountOf(b.id)) * dir);
    }

    return products;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProduct(data as ProductRow) : null;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const rows = await this.rows<ProductRow>(
      this.client.from('products').select(PRODUCT_SELECT).in('id', ids),
    );
    return rows.map(toProduct);
  }

  async listPrices(productIds?: string[]): Promise<ProductPrice[]> {
    let query = this.client.from('product_prices').select('*');
    if (productIds && productIds.length > 0) query = query.in('product_id', productIds);
    const rows = await this.rows(query);
    return rows.map((r: Record<string, unknown>) => ({
      productId: r.product_id as string,
      currency: r.currency as ProductPrice['currency'],
      tier: r.tier as ProductPrice['tier'],
      amount: r.amount as number,
    }));
  }

  async listZones(): Promise<ShippingZone[]> {
    const rows = await this.rows(
      this.client.from('shipping_zones').select('*').order('position'),
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      countries: r.countries as string[],
      position: r.position as number,
    }));
  }

  async listRates(): Promise<ShippingRate[]> {
    const rows = await this.rows(this.client.from('shipping_rates').select('*'));
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      zoneId: r.zone_id as string,
      name: r.name as string,
      currency: r.currency as ShippingRate['currency'],
      baseAmount: r.base_amount as number,
      perExtraItemAmount: r.per_extra_item_amount as number,
      estimatedDaysMin: r.estimated_days_min as number,
      estimatedDaysMax: r.estimated_days_max as number,
    }));
  }

  async listReviews(productId: string): Promise<Review[]> {
    const rows = await this.rows(
      this.client.from('reviews').select('*')
        .eq('product_id', productId).eq('approved', true)
        .order('created_at', { ascending: false }),
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      productId: r.product_id as string,
      authorName: r.author_name as string,
      rating: r.rating as Review['rating'],
      body: r.body as string,
      approved: r.approved as boolean,
      createdAt: r.created_at as string,
    }));
  }

  async getSettings(): Promise<StoreSettings> {
    const { data, error } = await this.client
      .from('store_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      storeName: (row.store_name as string) ?? 'Eyob Traditional Store',
      supportEmail: (row.support_email as string) ?? '',
      supportPhone: (row.support_phone as string) ?? '',
      whatsappNumber: (row.whatsapp_number as string) ?? '',
      defaultCurrency: (row.default_currency as StoreSettings['defaultCurrency']) ?? 'USD',
      enabledCurrencies: (row.enabled_currencies as StoreSettings['enabledCurrencies']) ?? ['ETB', 'USD'],
      returnWindowDays: (row.return_window_days as number) ?? 14,
      customsDisclaimer: (row.customs_disclaimer as string) ?? '',
    };
  }

  async findPromo(code: string): Promise<PromoCode | null> {
    const { data, error } = await this.client
      .from('promo_codes').select('*')
      .ilike('code', code.trim()).eq('active', true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as Record<string, unknown>;
    const promo: PromoCode = {
      id: row.id as string,
      code: row.code as string,
      kind: row.kind as PromoCode['kind'],
      value: row.value as number,
      currency: (row.currency as PromoCode['currency']) ?? undefined,
      minOrderAmount: (row.min_order_amount as number) ?? undefined,
      expiresAt: (row.expires_at as string) ?? undefined,
      maxRedemptions: (row.max_redemptions as number) ?? undefined,
      timesRedeemed: (row.times_redeemed as number) ?? 0,
      active: row.active as boolean,
    };

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return null;
    if (promo.maxRedemptions && promo.timesRedeemed >= promo.maxRedemptions) return null;
    return promo;
  }

  /**
   * Delegated to a Postgres function, which is the only way to make this
   * atomic. reserve_products() flips available -> reserved inside a single
   * transaction and returns whatever it could not claim, so two customers
   * racing for the same one-of-a-kind piece cannot both win.
   */
  async reserveProducts(productIds: string[]): Promise<ReservationResult> {
    const { data, error } = await this.client.rpc('reserve_products', {
      p_product_ids: productIds,
    });
    if (error) throw new Error(error.message);
    const unavailable = (data as string[] | null) ?? [];
    return { ok: unavailable.length === 0, unavailableProductIds: unavailable };
  }

  async releaseProducts(productIds: string[]): Promise<void> {
    const { error } = await this.client.rpc('release_products', { p_product_ids: productIds });
    if (error) throw new Error(error.message);
  }

  async createOrder(input: CreateOrderInput): Promise<{ order: Order; payment: Payment }> {
    // A Postgres function again, so the order, its items and the payment row
    // are written in one transaction. A half-written order with no payment
    // record is the kind of thing nobody notices until a customer complains.
    const { data, error } = await this.client.rpc('create_order', {
      p_email: input.email,
      p_phone: input.phone ?? null,
      p_currency: input.currency,
      p_tier: input.tier,
      p_items: input.items,
      p_shipping_address: input.shippingAddress,
      p_shipping_rate_id: input.shippingRateId ?? null,
      p_shipping_amount: input.shippingAmount,
      p_promo_code: input.promoCode ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw new Error(error.message);

    const result = data as { order: Record<string, unknown>; payment: Record<string, unknown> };
    return {
      order: toOrder(result.order),
      payment: {
        id: result.payment.id as string,
        orderId: result.payment.order_id as string,
        txRef: result.payment.tx_ref as string,
        provider: 'chapa',
        status: result.payment.status as Payment['status'],
        amount: result.payment.amount as number,
        currency: result.payment.currency as Payment['currency'],
        createdAt: result.payment.created_at as string,
      },
    };
  }

  async getOrderByReference(reference: string, email: string): Promise<Order | null> {
    // RLS allows an anonymous read only when BOTH the reference and the email
    // match, so a guessed reference alone reveals nothing.
    const { data, error } = await this.client
      .from('orders').select(ORDER_SELECT)
      .eq('reference', reference.trim().toUpperCase())
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toOrder(data as Record<string, unknown>) : null;
  }

  async listOrdersForEmail(email: string): Promise<Order[]> {
    const rows = await this.rows(
      this.client.from('orders').select(ORDER_SELECT)
        .eq('email', email.trim().toLowerCase())
        .order('created_at', { ascending: false }),
    );
    return rows.map((r) => toOrder(r as Record<string, unknown>));
  }

  async adminListOrders(status?: OrderStatus): Promise<Order[]> {
    let query = this.client.from('orders').select(ORDER_SELECT)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const rows = await this.rows(query);
    return rows.map((r) => toOrder(r as Record<string, unknown>));
  }

  async adminGetOrder(id: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toOrder(data as Record<string, unknown>) : null;
  }

  async adminUpdateOrderStatus(
    id: string,
    status: OrderStatus,
    extra?: { trackingNumber?: string; trackingCarrier?: string },
  ): Promise<Order> {
    const { error } = await this.client.rpc('admin_set_order_status', {
      p_order_id: id,
      p_status: status,
      p_tracking_number: extra?.trackingNumber ?? null,
      p_tracking_carrier: extra?.trackingCarrier ?? null,
    });
    if (error) throw new Error(error.message);
    const order = await this.adminGetOrder(id);
    if (!order) throw new Error('Order not found after update');
    return order;
  }

  async adminListProducts(): Promise<Product[]> {
    const rows = await this.rows<ProductRow>(
      this.client.from('products').select(PRODUCT_SELECT)
        .order('created_at', { ascending: false }),
    );
    return rows.map(toProduct);
  }

  async adminSaveProduct(product: Product, prices: ProductPrice[]): Promise<Product> {
    const { error } = await this.client.from('products').upsert({
      id: product.id,
      slug: product.slug,
      kind: product.kind,
      status: product.status,
      name: product.name,
      category_id: product.categoryId,
      description: product.description,
      care_instructions: product.careInstructions,
      fabric: product.fabric,
      colour: product.colour,
      tibeb_pattern: product.tibebPattern,
      occasion: product.occasion,
      gender: product.gender,
      measurements: product.measurements,
      nominal_size: product.nominalSize,
      lead_time_days: product.leadTimeDays ?? null,
      featured: product.featured,
    });
    if (error) throw new Error(error.message);

    await this.client.from('product_prices').delete().eq('product_id', product.id);
    if (prices.length > 0) {
      const { error: priceError } = await this.client.from('product_prices').insert(
        prices.map((p) => ({
          product_id: product.id,
          currency: p.currency,
          tier: p.tier,
          amount: p.amount,
        })),
      );
      if (priceError) throw new Error(priceError.message);
    }

    await this.client.from('product_images').delete().eq('product_id', product.id);
    if (product.images.length > 0) {
      const { error: imageError } = await this.client.from('product_images').insert(
        product.images.map((img) => ({
          product_id: product.id,
          storage_key: img.key,
          alt: img.alt,
          position: img.position,
          widths: img.widths ?? null,
        })),
      );
      if (imageError) throw new Error(imageError.message);
    }

    return product;
  }

  async adminArchiveProduct(id: string): Promise<void> {
    const { error } = await this.client
      .from('products').update({ status: 'archived' }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async adminSaveCategory(category: Category): Promise<Category> {
    const { error } = await this.client.from('categories').upsert({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      position: category.position,
    });
    if (error) throw new Error(error.message);
    return category;
  }

  async adminSaveZone(zone: ShippingZone): Promise<ShippingZone> {
    const { error } = await this.client.from('shipping_zones').upsert({
      id: zone.id, name: zone.name, countries: zone.countries, position: zone.position,
    });
    if (error) throw new Error(error.message);
    return zone;
  }

  async adminSaveRate(rate: ShippingRate): Promise<ShippingRate> {
    const { error } = await this.client.from('shipping_rates').upsert({
      id: rate.id,
      zone_id: rate.zoneId,
      name: rate.name,
      currency: rate.currency,
      base_amount: rate.baseAmount,
      per_extra_item_amount: rate.perExtraItemAmount,
      estimated_days_min: rate.estimatedDaysMin,
      estimated_days_max: rate.estimatedDaysMax,
    });
    if (error) throw new Error(error.message);
    return rate;
  }

  async adminDeleteRate(id: string): Promise<void> {
    const { error } = await this.client.from('shipping_rates').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async adminListPromos(): Promise<PromoCode[]> {
    const rows = await this.rows(this.client.from('promo_codes').select('*'));
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      code: r.code as string,
      kind: r.kind as PromoCode['kind'],
      value: r.value as number,
      currency: (r.currency as PromoCode['currency']) ?? undefined,
      minOrderAmount: (r.min_order_amount as number) ?? undefined,
      expiresAt: (r.expires_at as string) ?? undefined,
      maxRedemptions: (r.max_redemptions as number) ?? undefined,
      timesRedeemed: (r.times_redeemed as number) ?? 0,
      active: r.active as boolean,
    }));
  }

  async adminSavePromo(promo: PromoCode): Promise<PromoCode> {
    const { error } = await this.client.from('promo_codes').upsert({
      id: promo.id,
      code: promo.code,
      kind: promo.kind,
      value: promo.value,
      currency: promo.currency ?? null,
      min_order_amount: promo.minOrderAmount ?? null,
      expires_at: promo.expiresAt ?? null,
      max_redemptions: promo.maxRedemptions ?? null,
      active: promo.active,
    });
    if (error) throw new Error(error.message);
    return promo;
  }

  async adminSaveSettings(settings: StoreSettings): Promise<StoreSettings> {
    const { error } = await this.client.from('store_settings').upsert({
      id: 1,
      store_name: settings.storeName,
      support_email: settings.supportEmail,
      support_phone: settings.supportPhone,
      whatsapp_number: settings.whatsappNumber,
      default_currency: settings.defaultCurrency,
      enabled_currencies: settings.enabledCurrencies,
      return_window_days: settings.returnWindowDays,
      customs_disclaimer: settings.customsDisclaimer,
    });
    if (error) throw new Error(error.message);
    return settings;
  }

  async adminListPayments(orderId: string): Promise<Payment[]> {
    const rows = await this.rows(
      this.client.from('payments').select('*').eq('order_id', orderId),
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      orderId: r.order_id as string,
      txRef: r.tx_ref as string,
      providerReference: (r.provider_reference as string) ?? undefined,
      provider: (r.provider as Payment['provider']) ?? 'chapa',
      status: r.status as Payment['status'],
      amount: r.amount as number,
      currency: r.currency as Payment['currency'],
      rawWebhookPayload: r.raw_webhook_payload,
      failureReason: (r.failure_reason as string) ?? undefined,
      createdAt: r.created_at as string,
      paidAt: (r.paid_at as string) ?? undefined,
    }));
  }
}
