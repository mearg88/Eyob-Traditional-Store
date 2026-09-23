import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Category, CountryGroup, Design, DesignOption, DesignPrice, ExchangeRate,
  MeasurementSet, Review, StoreSettings,
} from '../types';
import type { DataAdapter, DesignFilters } from './adapter';

// ---------------------------------------------------------------------------
// Supabase adapter.
//
// Every call goes out with the ANON key, which is public by design. What keeps
// customers out of each other's data is Row Level Security in the database,
// not anything in this file. If a policy is missing, no amount of care here
// compensates.
//
// Two things deliberately do NOT live here, because they cannot be done safely
// from a browser: taking payment, which needs the Chapa secret key, and marking
// an order paid, which must only happen on a verified webhook. Both are
// serverless functions under /api.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : Number(v) || fallback);

interface DesignRow extends Row {
  design_photos?: {
    id: string; storage_key: string; alt: string; position: number; widths: number[] | null;
  }[];
}

function toDesign(row: DesignRow): Design {
  return {
    id: str(row.id),
    slug: str(row.slug),
    status: (row.status as Design['status']) ?? 'draft',
    name: str(row.name),
    categoryId: str(row.category_id),
    description: str(row.description),
    careInstructions: str(row.care_instructions),
    fabric: str(row.fabric),
    colour: str(row.colour),
    embroidery: str(row.embroidery),
    occasion: (row.occasion as string[]) ?? [],
    gender: (row.gender as Design['gender']) ?? 'women',
    productionDays: num(row.production_days, 14),
    photos: (row.design_photos ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        id: p.id,
        key: p.storage_key,
        alt: p.alt || str(row.name),
        position: p.position,
        widths: p.widths ?? undefined,
      })),
    featured: Boolean(row.featured),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

const DESIGN_SELECT = '*, design_photos(id, storage_key, alt, position, widths)';

export class SupabaseAdapter implements DataAdapter {
  readonly mode = 'supabase' as const;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  private async rows<T>(
    query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  ): Promise<T[]> {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listCategories(): Promise<Category[]> {
    const rows = await this.rows<Row>(
      this.client.from('categories').select('*').order('position'),
    );
    return rows.map((r) => ({
      id: str(r.id),
      slug: str(r.slug),
      name: str(r.name),
      description: str(r.description),
      measurementTemplateId: str(r.measurement_template_id),
      position: num(r.position),
    }));
  }

  async listDesigns(filters: DesignFilters = {}): Promise<Design[]> {
    let query = this.client.from('designs').select(DESIGN_SELECT);

    if (!filters.includeUnpublished) query = query.eq('status', 'published');
    if (filters.gender) query = query.eq('gender', filters.gender);
    if (filters.occasion) query = query.contains('occasion', [filters.occasion]);
    if (filters.maxProductionDays) query = query.lte('production_days', filters.maxProductionDays);
    if (filters.search) {
      // Postgres full-text would be better at scale; ilike is plenty for a few
      // hundred designs and needs no index maintenance on the free tier.
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.categorySlug) {
      const categories = await this.listCategories();
      const category = categories.find((c) => c.slug === filters.categorySlug);
      if (!category) return [];
      query = query.eq('category_id', category.id);
    }

    query = filters.sort === 'name'
      ? query.order('name')
      : filters.sort === 'soonest'
        ? query.order('production_days')
        : query.order('created_at', { ascending: false });

    const rows = await this.rows<DesignRow>(query);
    let designs = rows.map(toDesign);

    // Price sorting happens here rather than in SQL: price lives in a separate
    // table keyed by tier, and the join is not worth it at this catalogue size.
    if ((filters.sort === 'price_asc' || filters.sort === 'price_desc')) {
      const prices = await this.listPrices(designs.map((d) => d.id));
      const amountOf = (id: string) =>
        prices.find((p) => p.designId === id && p.tier === 'international')?.amount
        ?? Number.MAX_SAFE_INTEGER;
      const dir = filters.sort === 'price_asc' ? 1 : -1;
      designs = [...designs].sort((a, b) => (amountOf(a.id) - amountOf(b.id)) * dir);
    }

    return designs;
  }

  async getDesignBySlug(slug: string): Promise<Design | null> {
    const { data, error } = await this.client
      .from('designs').select(DESIGN_SELECT).eq('slug', slug).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toDesign(data as DesignRow) : null;
  }

  async getDesignsByIds(ids: string[]): Promise<Design[]> {
    if (ids.length === 0) return [];
    const rows = await this.rows<DesignRow>(
      this.client.from('designs').select(DESIGN_SELECT).in('id', ids),
    );
    return rows.map(toDesign);
  }

  async listPrices(designIds?: string[]): Promise<DesignPrice[]> {
    let query = this.client.from('design_prices').select('*');
    if (designIds && designIds.length > 0) query = query.in('design_id', designIds);
    const rows = await this.rows<Row>(query);
    return rows.map((r) => ({
      designId: str(r.design_id),
      tier: r.tier as DesignPrice['tier'],
      amount: num(r.amount),
    }));
  }

  async listOptions(designId: string): Promise<DesignOption[]> {
    const rows = await this.rows<Row>(
      this.client
        .from('design_options')
        .select('*, design_option_choices(*)')
        .eq('design_id', designId)
        .order('position'),
    );

    return rows.map((r) => ({
      id: str(r.id),
      designId: str(r.design_id),
      name: str(r.name),
      required: Boolean(r.required),
      position: num(r.position),
      choices: ((r.design_option_choices as Row[]) ?? [])
        .map((c) => ({
          id: str(c.id),
          label: str(c.label),
          priceEffectLocal: num(c.price_effect_local),
          priceEffectUsd: num(c.price_effect_usd),
          extraProductionDays: num(c.extra_production_days),
          position: num(c.position),
        }))
        .sort((a, b) => a.position - b.position),
    }));
  }

  async listCountryGroups(): Promise<CountryGroup[]> {
    const rows = await this.rows<Row>(
      this.client.from('country_groups').select('*').order('position'),
    );
    return rows.map((r) => ({
      id: str(r.id),
      name: str(r.name),
      countries: (r.countries as string[]) ?? [],
      upliftPercent: num(r.uplift_percent),
      deliveryDaysMin: num(r.delivery_days_min, 7),
      deliveryDaysMax: num(r.delivery_days_max, 14),
      position: num(r.position),
    }));
  }

  async listExchangeRates(): Promise<ExchangeRate[]> {
    const rows = await this.rows<Row>(this.client.from('exchange_rates').select('*'));
    return rows.map((r) => ({
      currency: r.currency as ExchangeRate['currency'],
      rateFromUsd: num(r.rate_from_usd, 1),
      marginPercent: num(r.margin_percent),
      fetchedAt: str(r.fetched_at),
    }));
  }

  async getSettings(): Promise<StoreSettings> {
    const { data, error } = await this.client
      .from('store_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw new Error(error.message);
    const r = (data ?? {}) as Row;
    return {
      storeName: str(r.store_name, 'Eyob Traditional Store'),
      supportEmail: str(r.support_email),
      supportPhone: str(r.support_phone),
      whatsappNumber: str(r.whatsapp_number),
      telegramUsername: str(r.telegram_username) || undefined,
      shopAddress: str(r.shop_address),
      shopMapUrl: str(r.shop_map_url) || undefined,
      pickupDiscountPercent: num(r.pickup_discount_percent),
      forexMarginPercent: num(r.forex_margin_percent, 2),
      chargeCurrencies: (r.charge_currencies as StoreSettings['chargeCurrencies']) ?? ['ETB', 'USD'],
      returnWindowDays: num(r.return_window_days, 14),
      customsDisclaimer: str(r.customs_disclaimer),
    };
  }

  async listReviews(designId: string): Promise<Review[]> {
    const rows = await this.rows<Row>(
      this.client.from('reviews').select('*')
        .eq('design_id', designId).eq('approved', true)
        .order('created_at', { ascending: false }),
    );
    return rows.map((r) => ({
      id: str(r.id),
      designId: str(r.design_id),
      orderId: str(r.order_id),
      customerId: str(r.customer_id),
      authorName: str(r.author_name),
      rating: num(r.rating, 5) as Review['rating'],
      body: str(r.body),
      photoKeys: (r.photo_keys as string[]) ?? [],
      approved: Boolean(r.approved),
      createdAt: str(r.created_at),
    }));
  }

  async listMeasurementSets(customerId: string): Promise<MeasurementSet[]> {
    const rows = await this.rows<Row>(
      this.client.from('measurement_sets').select('*')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false }),
    );
    return rows.map((r) => ({
      id: str(r.id),
      customerId: str(r.customer_id),
      name: str(r.name),
      templateId: str(r.template_id),
      values: (r.values as MeasurementSet['values']) ?? {},
      fallback: (r.fallback as MeasurementSet['fallback']) ?? undefined,
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
    }));
  }

  async saveMeasurementSet(set: MeasurementSet): Promise<MeasurementSet> {
    const { error } = await this.client.from('measurement_sets').upsert({
      id: set.id,
      customer_id: set.customerId,
      name: set.name,
      template_id: set.templateId,
      values: set.values,
      fallback: set.fallback ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return set;
  }

  async deleteMeasurementSet(id: string): Promise<void> {
    const { error } = await this.client.from('measurement_sets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async adminListDesigns(): Promise<Design[]> {
    const rows = await this.rows<DesignRow>(
      this.client.from('designs').select(DESIGN_SELECT)
        .order('updated_at', { ascending: false }),
    );
    return rows.map(toDesign);
  }

  async adminSaveDesign(
    design: Design,
    prices: DesignPrice[],
    options: DesignOption[],
  ): Promise<Design> {
    const { error } = await this.client.from('designs').upsert({
      id: design.id,
      slug: design.slug,
      status: design.status,
      name: design.name,
      category_id: design.categoryId || null,
      description: design.description,
      care_instructions: design.careInstructions,
      fabric: design.fabric,
      colour: design.colour,
      embroidery: design.embroidery,
      occasion: design.occasion,
      gender: design.gender,
      production_days: design.productionDays,
      featured: design.featured,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    // Replace rather than diff: a design has at most two prices, a handful of
    // options and a few photos, so the simpler path is also the safer one.
    await this.client.from('design_prices').delete().eq('design_id', design.id);
    if (prices.length > 0) {
      const { error: priceError } = await this.client.from('design_prices').insert(
        prices.map((p) => ({ design_id: design.id, tier: p.tier, amount: p.amount })),
      );
      if (priceError) throw new Error(priceError.message);
    }

    await this.client.from('design_photos').delete().eq('design_id', design.id);
    if (design.photos.length > 0) {
      const { error: photoError } = await this.client.from('design_photos').insert(
        design.photos.map((p) => ({
          design_id: design.id,
          storage_key: p.key,
          alt: p.alt,
          position: p.position,
          widths: p.widths ?? null,
        })),
      );
      if (photoError) throw new Error(photoError.message);
    }

    // Deleting the options cascades to their choices.
    await this.client.from('design_options').delete().eq('design_id', design.id);
    for (const option of options) {
      const { error: optionError } = await this.client.from('design_options').insert({
        id: option.id,
        design_id: design.id,
        name: option.name,
        required: option.required,
        position: option.position,
      });
      if (optionError) throw new Error(optionError.message);

      if (option.choices.length > 0) {
        const { error: choiceError } = await this.client.from('design_option_choices').insert(
          option.choices.map((c) => ({
            id: c.id,
            option_id: option.id,
            label: c.label,
            price_effect_local: c.priceEffectLocal,
            price_effect_usd: c.priceEffectUsd,
            extra_production_days: c.extraProductionDays,
            position: c.position,
          })),
        );
        if (choiceError) throw new Error(choiceError.message);
      }
    }

    return design;
  }

  async adminArchiveDesign(id: string): Promise<void> {
    const { error } = await this.client
      .from('designs').update({ status: 'archived' }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async adminSaveCategory(category: Category): Promise<Category> {
    const { error } = await this.client.from('categories').upsert({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      measurement_template_id: category.measurementTemplateId || null,
      position: category.position,
    });
    if (error) throw new Error(error.message);
    return category;
  }

  async adminDeleteCategory(id: string): Promise<void> {
    const { error } = await this.client.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async adminSaveCountryGroup(group: CountryGroup): Promise<CountryGroup> {
    const { error } = await this.client.from('country_groups').upsert({
      id: group.id,
      name: group.name,
      countries: group.countries,
      uplift_percent: group.upliftPercent,
      delivery_days_min: group.deliveryDaysMin,
      delivery_days_max: group.deliveryDaysMax,
      position: group.position,
    });
    if (error) throw new Error(error.message);
    return group;
  }

  async adminSaveSettings(settings: StoreSettings): Promise<StoreSettings> {
    const { error } = await this.client.from('store_settings').upsert({
      id: 1,
      store_name: settings.storeName,
      support_email: settings.supportEmail,
      support_phone: settings.supportPhone,
      whatsapp_number: settings.whatsappNumber,
      telegram_username: settings.telegramUsername ?? null,
      shop_address: settings.shopAddress,
      shop_map_url: settings.shopMapUrl ?? null,
      pickup_discount_percent: settings.pickupDiscountPercent,
      forex_margin_percent: settings.forexMarginPercent,
      charge_currencies: settings.chargeCurrencies,
      return_window_days: settings.returnWindowDays,
      customs_disclaimer: settings.customsDisclaimer,
    });
    if (error) throw new Error(error.message);
    return settings;
  }

  async adminRefreshRates(): Promise<ExchangeRate[]> {
    // The refresh runs server-side, where the rate provider is called and the
    // margin applied. Doing it here would put the shop's margin in the browser.
    const response = await fetch('/api/rates/refresh', { method: 'POST' });
    if (!response.ok) throw new Error('Could not refresh rates just now.');
    return this.listExchangeRates();
  }
}
