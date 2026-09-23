import type {
  Category, CountryGroup, Design, DesignOption, DesignPrice, ExchangeRate,
  MeasurementSet, StoreSettings,
} from '../types';
import type { DataAdapter, DesignFilters } from './adapter';
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
  };
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
    return delay(SEED_REVIEWS.filter((r) => r.designId === designId && r.approved));
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
}
