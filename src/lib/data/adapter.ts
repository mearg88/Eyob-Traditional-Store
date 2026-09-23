import type {
  Category, CountryGroup, Design, DesignOption, DesignPrice, ExchangeRate,
  MeasurementSet, Review, StoreSettings,
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

  // --- Admin ---
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
