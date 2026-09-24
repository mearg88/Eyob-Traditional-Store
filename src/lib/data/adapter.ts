import type {
  Category, ContactChannel, CountryGroup, Design, DesignOption, DesignPrice,
  ExchangeRate, MeasurementReview, MeasurementSet, Order,
  OrderEvent, OrderStatus, Payment, ProductionStage, Review, StoreSettings,
  WishlistEntry,
} from '../types';

// ---------------------------------------------------------------------------
// The data interface.
//
// Two implementations satisfy it: an in-memory one for development and
// demonstration, and Supabase for production. No component knows which it is
// talking to, which is what lets the whole application run with no accounts
// configured.
//
// Order and verification methods arrive with their milestones. The catalogue
// surface is here in full because everything else builds on it.
// ---------------------------------------------------------------------------

export interface DesignFilters {
  categorySlug?: string;
  search?: string;
  gender?: string;
  occasion?: string;
  colour?: string;
  fabric?: string;
  /** Only designs that can be finished within this many days. */
  maxProductionDays?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name' | 'soonest';
  includeUnpublished?: boolean;
}

export interface CreateOrderInput {
  customerId: string;
  email: string;
  phone: string;
  currency: import('../types').CurrencyCode;
  /** Recomputed server-side from the delivery country; the client's value is ignored. */
  tier: import('../types').PriceTier;
  lockedRateFromUsd: number;
  fulfilment: import('../types').FulfilmentMethod;
  shippingAddress?: import('../types').Address;
  items: {
    designId: string;
    quantity: number;
    chosenChoiceIds: string[];
    specialRequest?: string;
    measurementSetId: string;
  }[];
  promisedDate: string;
}

export interface EditMeasurementInput {
  reviewId: string;
  fieldKey: string;
  newValueCm: number;
  editedBy: string;
  reason: string;
}

export interface DataAdapter {
  readonly mode: 'demo' | 'supabase';

  // --- Catalogue ---
  listCategories(): Promise<Category[]>;
  listDesigns(filters?: DesignFilters): Promise<Design[]>;
  getDesignBySlug(slug: string): Promise<Design | null>;
  getDesignsByIds(ids: string[]): Promise<Design[]>;
  listPrices(designIds?: string[]): Promise<DesignPrice[]>;
  listOptions(designId: string): Promise<DesignOption[]>;

  // --- Pricing context ---
  listCountryGroups(): Promise<CountryGroup[]>;
  listExchangeRates(): Promise<ExchangeRate[]>;
  getSettings(): Promise<StoreSettings>;

  // --- Social ---
  listReviews(designId: string): Promise<Review[]>;

  // --- Measurements ---
  listMeasurementSets(customerId: string): Promise<MeasurementSet[]>;
  saveMeasurementSet(set: MeasurementSet): Promise<MeasurementSet>;
  deleteMeasurementSet(id: string): Promise<void>;

  // --- Orders ---
  createOrder(input: CreateOrderInput): Promise<{ order: Order; payment: Payment }>;
  getOrder(reference: string): Promise<Order | null>;
  listOrdersForCustomer(customerId: string): Promise<Order[]>;
  listOrderEvents(orderId: string): Promise<OrderEvent[]>;

  // --- Verification ---
  /** The specialist's work queue. */
  listMeasurementReviews(status?: MeasurementReview['status']): Promise<MeasurementReview[]>;
  getMeasurementReview(id: string): Promise<MeasurementReview | null>;
  getMeasurementReviewForOrder(orderId: string): Promise<MeasurementReview | null>;
  /**
   * Records an edit AND applies it. Append-only: the previous value is kept,
   * never overwritten, because this is the evidence in a fit dispute.
   */
  editMeasurement(input: EditMeasurementInput): Promise<MeasurementReview>;
  logContactAttempt(input: {
    reviewId: string;
    channel: ContactChannel;
    staffId: string;
    reached: boolean;
    note?: string;
  }): Promise<MeasurementReview>;
  /** Moves a review to awaiting_customer_confirmation, or straight to verified. */
  setMeasurementReviewStatus(
    id: string,
    status: MeasurementReview['status'],
    by: string,
    notes?: string,
  ): Promise<MeasurementReview>;
  /** The customer approving the tailor's changes. Production cannot start before this. */
  confirmMeasurements(reviewId: string): Promise<MeasurementReview>;

  // --- Social ---
  listWishlist(customerId: string): Promise<WishlistEntry[]>;
  toggleWishlist(customerId: string, designId: string): Promise<boolean>;
  submitReview(input: {
    designId: string;
    orderId: string;
    customerId: string;
    authorName: string;
    rating: 1 | 2 | 3 | 4 | 5;
    body: string;
    photoKeys: string[];
  }): Promise<Review>;

  // --- Admin ---
  adminListOrders(status?: OrderStatus): Promise<Order[]>;
  adminGetOrder(id: string): Promise<Order | null>;
  adminSetOrderStatus(
    id: string,
    status: OrderStatus,
    by: string,
    stage?: ProductionStage,
  ): Promise<Order>;
  adminAddOrderEvent(input: {
    orderId: string;
    kind: string;
    note?: string;
    photoKey?: string;
    actorId?: string;
    visibleToCustomer?: boolean;
  }): Promise<OrderEvent>;
  adminListPendingReviews(): Promise<Review[]>;
  adminModerateReview(id: string, approved: boolean): Promise<void>;
  adminListDesigns(): Promise<Design[]>;
  adminSaveDesign(
    design: Design,
    prices: DesignPrice[],
    options: DesignOption[],
  ): Promise<Design>;
  adminArchiveDesign(id: string): Promise<void>;
  adminSaveCategory(category: Category): Promise<Category>;
  adminDeleteCategory(id: string): Promise<void>;
  adminSaveCountryGroup(group: CountryGroup): Promise<CountryGroup>;
  adminSaveSettings(settings: StoreSettings): Promise<StoreSettings>;
  adminRefreshRates(): Promise<ExchangeRate[]>;
}
