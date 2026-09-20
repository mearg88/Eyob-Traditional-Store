import type {
  Address, Category, CurrencyCode, Measurements, Order, OrderStatus, Payment,
  PriceTier, Product, ProductPrice, PromoCode, Review, ShippingRate,
  ShippingZone, StoreSettings,
} from '../types';

// ---------------------------------------------------------------------------
// The data interface.
//
// Two implementations satisfy it: an in-memory mock used for the demo, and
// Supabase for production. Nothing in the UI knows which one it is talking to,
// which is what lets the whole app run with no accounts configured.
// ---------------------------------------------------------------------------

export interface ProductFilters {
  categorySlug?: string;
  search?: string;
  gender?: string;
  occasion?: string;
  colour?: string;
  fabric?: string;
  kind?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: CurrencyCode;
  tier?: PriceTier;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name';
  includeSold?: boolean;
}

export interface CreateOrderInput {
  email: string;
  phone?: string;
  currency: CurrencyCode;
  /** Server recomputes this from shippingAddress; the client's value is ignored. */
  tier: PriceTier;
  items: {
    productId: string;
    quantity: number;
    customerMeasurements?: Measurements;
  }[];
  shippingAddress: Address;
  shippingRateId?: string;
  shippingAmount: number;
  promoCode?: string;
  notes?: string;
}

/**
 * Why reservation has its own result type: with one-of-a-kind stock every
 * sale is a last-item sale, so "someone else got there first" is a normal
 * outcome and needs to be reported to the customer in plain words, not as an
 * exception.
 */
export interface ReservationResult {
  ok: boolean;
  unavailableProductIds: string[];
}

export interface DataAdapter {
  readonly mode: 'demo' | 'supabase';

  listCategories(): Promise<Category[]>;
  listProducts(filters?: ProductFilters): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  listPrices(productIds?: string[]): Promise<ProductPrice[]>;

  listZones(): Promise<ShippingZone[]>;
  listRates(): Promise<ShippingRate[]>;

  listReviews(productId: string): Promise<Review[]>;
  getSettings(): Promise<StoreSettings>;

  findPromo(code: string): Promise<PromoCode | null>;

  /** Atomic. Returns which items were lost to another buyer, if any. */
  reserveProducts(productIds: string[]): Promise<ReservationResult>;
  releaseProducts(productIds: string[]): Promise<void>;

  createOrder(input: CreateOrderInput): Promise<{ order: Order; payment: Payment }>;
  getOrderByReference(reference: string, email: string): Promise<Order | null>;
  listOrdersForEmail(email: string): Promise<Order[]>;

  // --- Admin ---
  adminListOrders(status?: OrderStatus): Promise<Order[]>;
  adminGetOrder(id: string): Promise<Order | null>;
  adminUpdateOrderStatus(
    id: string,
    status: OrderStatus,
    extra?: { trackingNumber?: string; trackingCarrier?: string },
  ): Promise<Order>;
  adminListProducts(): Promise<Product[]>;
  adminSaveProduct(product: Product, prices: ProductPrice[]): Promise<Product>;
  adminArchiveProduct(id: string): Promise<void>;
  adminSaveCategory(category: Category): Promise<Category>;
  adminSaveZone(zone: ShippingZone): Promise<ShippingZone>;
  adminSaveRate(rate: ShippingRate): Promise<ShippingRate>;
  adminDeleteRate(id: string): Promise<void>;
  adminListPromos(): Promise<PromoCode[]>;
  adminSavePromo(promo: PromoCode): Promise<PromoCode>;
  adminSaveSettings(settings: StoreSettings): Promise<StoreSettings>;
  adminListPayments(orderId: string): Promise<Payment[]>;
}
