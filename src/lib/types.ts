// ---------------------------------------------------------------------------
// Domain types.
//
// The one idea that shapes everything: THIS SHOP HAS NO INVENTORY.
//
// A `Design` is a template, not an object. It is photographed once and can be
// ordered by fifty people, each getting a garment cut to their own body. There
// is no stock count, no availability, nothing ever sells out, and two customers
// ordering the same design at the same moment is completely ordinary.
//
// If you are looking for reservation logic or stock levels: they were removed
// deliberately. See docs/DECISIONS.md.
// ---------------------------------------------------------------------------

// --- Money -----------------------------------------------------------------

export type CurrencyCode =
  | 'ETB' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'ILS';

/**
 * Which price a customer gets.
 *
 * Derived from the DELIVERY ADDRESS on the server, never from the displayed
 * currency and never from an IP address. See pricing.ts for why.
 */
export type PriceTier = 'local' | 'international';

/** A group of countries sharing an uplift and a delivery estimate. */
export interface CountryGroup {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 codes. '*' is the catch-all group. */
  countries: string[];
  /**
   * Percentage added to the base USD price to cover delivery to this group.
   * Zero for the group that the base price was written for.
   */
  upliftPercent: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  position: number;
}

/** A cached rate. Checkout reads these, never the network. */
export interface ExchangeRate {
  currency: CurrencyCode;
  /** How many units of `currency` one USD buys, margin already applied. */
  rateFromUsd: number;
  marginPercent: number;
  fetchedAt: string;
}

// --- Catalogue -------------------------------------------------------------

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Which measurements a garment in this category needs. */
  measurementTemplateId: string;
  position: number;
}

export interface DesignPhoto {
  id: string;
  /** Storage key or absolute URL, resolved by the storage layer. */
  key: string;
  alt: string;
  position: number;
  widths?: number[];
}

/**
 * A choice the customer makes that changes the garment and may change the
 * price — sleeve length, border colour, fabric.
 *
 * Every option has a definite price effect, so a total is always calculable
 * and checkout never has to stop and wait for a human to quote.
 */
export interface DesignOption {
  id: string;
  designId: string;
  /** e.g. 'Sleeve length' */
  name: string;
  required: boolean;
  position: number;
  choices: DesignOptionChoice[];
}

export interface DesignOptionChoice {
  id: string;
  label: string;
  /** Added to the base price, in minor units of the base currency. May be 0. */
  priceEffectLocal: number;
  priceEffectUsd: number;
  /** Extra days this choice adds to production. */
  extraProductionDays: number;
  position: number;
}

export type DesignStatus = 'draft' | 'published' | 'archived';

export interface Design {
  id: string;
  slug: string;
  status: DesignStatus;
  name: string;
  categoryId: string;
  description: string;
  careInstructions: string;
  fabric: string;
  colour: string;
  /** Border or embroidery style — the shop's own vocabulary. */
  embroidery: string;
  occasion: string[];
  gender: 'women' | 'men' | 'children' | 'unisex';
  /** Working days in the workshop, before delivery time is added. */
  productionDays: number;
  photos: DesignPhoto[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Exactly two rows per design: one local in ETB, one international in USD. */
export interface DesignPrice {
  designId: string;
  tier: PriceTier;
  /** Minor units. ETB for local, USD for international. */
  amount: number;
}

// --- Measurements ----------------------------------------------------------

export type MeasurementUnit = 'cm' | 'in';

export interface MeasurementField {
  /** Stable machine name, e.g. 'shoulderToShoulder'. */
  key: string;
  label: string;
  /** How to take it. */
  instruction: string;
  /** The mistake people actually make with this one. */
  commonMistake?: string;
  required: boolean;
  /** True when it genuinely cannot be taken alone. */
  needsHelper: boolean;
  /** Sanity bounds in centimetres, used to flag impossible values. */
  minCm: number;
  maxCm: number;
  position: number;
}

export interface MeasurementTemplate {
  id: string;
  name: string;
  description: string;
  fields: MeasurementField[];
}

/** Values keyed by MeasurementField.key. Always centimetres. */
export type MeasurementValues = Record<string, number | undefined>;

/**
 * Used when a customer gives up measuring. Copied from what established
 * Habesha sellers offer, because an approximate order followed by a
 * conversation beats an abandoned basket.
 */
export interface MeasurementFallback {
  heightCm?: number;
  usualSize?: string;
  note?: string;
}

export interface MeasurementSet {
  id: string;
  customerId: string;
  /** The customer's own label, e.g. 'Mine' or 'For Selam'. */
  name: string;
  templateId: string;
  values: MeasurementValues;
  fallback?: MeasurementFallback;
  createdAt: string;
  updatedAt: string;
}

// --- Verification ----------------------------------------------------------

export type ReviewStatus =
  | 'submitted'
  | 'under_review'
  | 'awaiting_customer_confirmation'
  | 'verified'
  | 'rejected';

export type ContactChannel = 'whatsapp' | 'telegram' | 'email' | 'phone';

export interface ContactAttempt {
  id: string;
  channel: ContactChannel;
  attemptedAt: string;
  staffId: string;
  reached: boolean;
  note?: string;
}

/**
 * One edit to one measurement. Append-only, never overwritten.
 *
 * This is the evidence when a customer says the garment does not fit: it shows
 * which numbers were used, who set them, and when the customer approved.
 */
export interface MeasurementEdit {
  id: string;
  reviewId: string;
  fieldKey: string;
  oldValueCm?: number;
  newValueCm: number;
  editedBy: string;
  editedAt: string;
  reason: string;
}

export interface MeasurementReview {
  id: string;
  orderId: string;
  measurementSetId: string;
  status: ReviewStatus;
  assignedTo?: string;
  /** Raised by the automatic checks before a human looks. */
  flags: string[];
  contactAttempts: ContactAttempt[];
  edits: MeasurementEdit[];
  staffNotes?: string;
  customerConfirmedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
}

// --- Orders ----------------------------------------------------------------

export type FulfilmentMethod = 'delivery' | 'pickup';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'measurements_under_review'
  | 'awaiting_customer_confirmation'
  | 'in_production'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** Stages inside production, shown to the customer. */
export type ProductionStage =
  | 'fabric_cut'
  | 'sewing'
  | 'embroidery'
  | 'finishing'
  | 'quality_check';

export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postcode?: string;
  /** ISO alpha-2. Decides the price tier and the delivery estimate. */
  countryCode: string;
  phone: string;
}

export interface OrderItem {
  id: string;
  designId: string;
  /** Snapshots: editing a design later must not rewrite order history. */
  designName: string;
  designSlug: string;
  photoKey?: string;
  /** Chosen option label per option name, snapshotted. */
  chosenOptions: { optionName: string; choiceLabel: string; priceEffect: number }[];
  /** Free text. Captured and shown to staff; changes no price. */
  specialRequest?: string;
  measurementSetId: string;
  /** Copy of the values at order time, so later edits are visible as edits. */
  measurementSnapshot: MeasurementValues;
  quantity: number;
  unitAmount: number;
}

export interface Order {
  id: string;
  reference: string;
  customerId: string;
  email: string;
  phone: string;
  status: OrderStatus;
  productionStage?: ProductionStage;

  currency: CurrencyCode;
  tier: PriceTier;
  /** The rate used, frozen at placement so it can never move under the customer. */
  lockedRateFromUsd: number;
  lockedAt: string;

  items: OrderItem[];
  subtotalAmount: number;
  pickupDiscountAmount: number;
  totalAmount: number;

  fulfilment: FulfilmentMethod;
  shippingAddress?: Address;

  /** What the customer was promised. */
  promisedDate: string;
  /**
   * Days the clock was stopped while waiting on the customer. The refund
   * guarantee is measured against promisedDate plus this, so a slow customer
   * cannot run down the shop's own deadline.
   */
  pausedDays: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  at: string;
  /** Machine-readable, translated for display. */
  kind: string;
  /** Optional progress photograph from the workshop. */
  photoKey?: string;
  note?: string;
  /** Staff id, or null when the system generated it. */
  actorId?: string;
  visibleToCustomer: boolean;
}

// --- Payments --------------------------------------------------------------

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'abandoned' | 'refunded';

export interface Payment {
  id: string;
  orderId: string;
  txRef: string;
  providerReference?: string;
  provider: 'chapa' | 'mock';
  status: PaymentStatus;
  amount: number;
  /** What we actually charged in, which may differ from what was displayed. */
  chargeCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  rawWebhookPayload?: unknown;
  failureReason?: string;
  createdAt: string;
  paidAt?: string;
}

export type RefundClaimStatus = 'open' | 'approved' | 'declined';

export interface RefundClaim {
  id: string;
  orderId: string;
  status: RefundClaimStatus;
  customerReason: string;
  staffDecisionReason?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

// --- People ----------------------------------------------------------------

/**
 * Roles are rows in a table rather than values in code, so adding a
 * Measurement Specialist who can see contact details but not prices is a
 * configuration change rather than a rewrite.
 */
export type RoleName = 'owner' | 'staff';

export type Permission =
  | 'designs.read' | 'designs.write'
  | 'orders.read' | 'orders.write'
  | 'measurements.read' | 'measurements.write'
  | 'customers.read'
  | 'prices.read' | 'prices.write'
  | 'settings.write'
  | 'users.manage'
  | 'revenue.read';

export interface Role {
  name: RoleName;
  label: string;
  permissions: Permission[];
}

export interface StaffUser {
  id: string;
  email: string;
  displayName: string;
  role: RoleName;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  /** Guessed from IP on first visit, then only ever changed by the customer. */
  preferredCurrency?: CurrencyCode;
  preferredUnit: MeasurementUnit;
  createdAt: string;
}

// --- Social ----------------------------------------------------------------

export interface Review {
  id: string;
  designId: string;
  orderId: string;
  customerId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  photoKeys: string[];
  approved: boolean;
  createdAt: string;
}

export interface WishlistEntry {
  customerId: string;
  designId: string;
  addedAt: string;
}

// --- Settings --------------------------------------------------------------

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  telegramUsername?: string;
  shopAddress: string;
  shopMapUrl?: string;
  /** Subtracted when the customer collects rather than having it delivered. */
  pickupDiscountPercent: number;
  /** Added to fetched exchange rates. */
  forexMarginPercent: number;
  /** What Chapa can actually charge in, as opposed to what we display. */
  chargeCurrencies: CurrencyCode[];
  returnWindowDays: number;
  customsDisclaimer: string;
}

export interface CartLine {
  designId: string;
  quantity: number;
  chosenChoiceIds: string[];
  specialRequest?: string;
  measurementSetId?: string;
}
