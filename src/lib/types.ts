// ---------------------------------------------------------------------------
// Domain types.
//
// Two shapes of product exist and they behave differently everywhere:
//
//   one_of_a_kind  A single physical garment. Quantity is always 1. It has
//                  real, fixed measurements because the thing exists. Once
//                  sold it is gone — there is no restocking it.
//
//   made_to_order  Woven after the order arrives. Never out of stock. The
//                  customer supplies their own measurements and waits
//                  `leadTimeDays`.
//
// Almost every awkward branch in this codebase traces back to that split.
// ---------------------------------------------------------------------------

export type ProductKind = 'one_of_a_kind' | 'made_to_order';

/** Only meaningful for one_of_a_kind. Made-to-order items are always sellable. */
export type ProductStatus = 'available' | 'reserved' | 'sold' | 'archived';

export type CurrencyCode =
  | 'ETB'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'AED'
  | 'SAR'
  | 'QAR'
  | 'KWD'
  | 'OMR'
  | 'BHD';

/**
 * Which price a customer gets. Decided by the SHIPPING DESTINATION, never by
 * IP address or by anything the browser claims — see pricing.ts.
 */
export type PriceTier = 'local' | 'international';

/**
 * The seven measurements used across Habesha garment sellers. Stored in
 * centimetres always; inches are a display conversion only, so there is
 * exactly one unit in the database and no rounding drift.
 *
 * For one_of_a_kind these describe THE GARMENT.
 * For made_to_order these describe THE CUSTOMER.
 */
export interface Measurements {
  bust?: number;
  waist?: number;
  hips?: number;
  shoulderToShoulder?: number;
  shoulderToWaist?: number;
  armLength?: number;
  totalLength?: number;
}

export interface ProductImage {
  id: string;
  /** Storage key or absolute URL. Resolved by the storage adapter. */
  key: string;
  alt: string;
  position: number;
  /** Rendition widths generated at upload time. */
  widths?: number[];
}

export interface Product {
  id: string;
  slug: string;
  kind: ProductKind;
  status: ProductStatus;
  name: string;
  categoryId: string;
  description: string;
  careInstructions: string;
  /** Fabric, e.g. 'Handspun cotton, shemma weave'. */
  fabric: string;
  colour: string;
  /** Border pattern style — the tibeb. Free text; the shop's own vocabulary. */
  tibebPattern: string;
  occasion: string[];
  gender: 'women' | 'men' | 'children' | 'unisex';
  measurements: Measurements;
  /** Informal label shown beside real numbers, e.g. 'fits approx. M'. */
  nominalSize: string;
  /** Made-to-order only. Quoted to the customer before they buy. */
  leadTimeDays?: number;
  images: ProductImage[];
  featured: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  position: number;
}

/** One row per product per currency per tier. Entered by hand, never converted. */
export interface ProductPrice {
  productId: string;
  currency: CurrencyCode;
  tier: PriceTier;
  /** Minor units (cents/santim) to keep arithmetic in integers. */
  amount: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 codes. 'ET-AA' is the Addis special case. */
  countries: string[];
  position: number;
}

export interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  currency: CurrencyCode;
  /** Minor units. Flat per order, plus a per-extra-item surcharge. */
  baseAmount: number;
  perExtraItemAmount: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'in_production'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'abandoned'
  | 'refunded';

export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postcode?: string;
  /** ISO alpha-2. Drives the price tier and the shipping zone. */
  countryCode: string;
  phone: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  /** Snapshot: renaming a product later must not rewrite order history. */
  productName: string;
  productSlug: string;
  imageKey?: string;
  kind: ProductKind;
  quantity: number;
  /** Snapshot of unit price in minor units, in the order's currency. */
  unitAmount: number;
  /** Made-to-order only: what the customer asked to be woven to. */
  customerMeasurements?: Measurements;
}

export interface Order {
  id: string;
  /** Human-facing reference, e.g. 'ETS-7Q4M2K'. Shown in emails and to support. */
  reference: string;
  customerId?: string;
  email: string;
  phone?: string;
  status: OrderStatus;
  currency: CurrencyCode;
  tier: PriceTier;
  items: OrderItem[];
  subtotalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  promoCode?: string;
  shippingAddress: Address;
  shippingRateId?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  /** Our reference, sent to Chapa as tx_ref and echoed back on the webhook. */
  txRef: string;
  /** Chapa's own id, only known after they confirm. */
  providerReference?: string;
  provider: 'chapa' | 'mock';
  status: PaymentStatus;
  amount: number;
  currency: CurrencyCode;
  /** Verbatim webhook body, kept for audit and dispute resolution. */
  rawWebhookPayload?: unknown;
  failureReason?: string;
  createdAt: string;
  paidAt?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  kind: 'percentage' | 'fixed';
  /** Percent (1-100) or minor units when fixed. */
  value: number;
  /** Fixed-amount codes are tied to one currency; percentages apply anywhere. */
  currency?: CurrencyCode;
  minOrderAmount?: number;
  expiresAt?: string;
  maxRedemptions?: number;
  timesRedeemed: number;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  approved: boolean;
  createdAt: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
  customerMeasurements?: Measurements;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  defaultCurrency: CurrencyCode;
  enabledCurrencies: CurrencyCode[];
  returnWindowDays: number;
  customsDisclaimer: string;
}
