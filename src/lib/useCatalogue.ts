import { useEffect, useState } from 'react';
import { getData } from './data';
import type { ProductFilters } from './data';
import type {
  Category, Product, ProductPrice, PriceTier, StoreSettings,
} from './types';
import { tierForCountry } from './pricing';

/**
 * The tier used while BROWSING, guessed from the browser locale.
 *
 * This is a display convenience only. The amount actually charged is derived
 * from the shipping address on the server at checkout — see pricing.ts. If
 * the guess turns out to be wrong, checkout corrects it and tells the
 * customer the prices changed rather than silently charging a different
 * number.
 */
export function guessDisplayTier(): PriceTier {
  if (typeof navigator === 'undefined') return 'international';
  try {
    const region = new Intl.Locale(navigator.language || 'en-US').maximize().region;
    return tierForCountry(region);
  } catch {
    return 'international';
  }
}

interface CatalogueState {
  products: Product[];
  categories: Category[];
  prices: ProductPrice[];
  settings: StoreSettings | null;
  loading: boolean;
  error: string | null;
}

export function useCatalogue(filters: ProductFilters = {}): CatalogueState {
  const [state, setState] = useState<CatalogueState>({
    products: [], categories: [], prices: [], settings: null, loading: true, error: null,
  });

  // Serialised so an inline filter object doesn't retrigger on every render.
  const key = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const data = await getData();
        const parsed = JSON.parse(key) as ProductFilters;
        const [products, categories, prices, settings] = await Promise.all([
          data.listProducts(parsed),
          data.listCategories(),
          data.listPrices(),
          data.getSettings(),
        ]);
        if (!cancelled) {
          setState({ products, categories, prices, settings, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            // Shown to customers, so it says what to do rather than what broke.
            error: 'We could not load the collection just now. Please check your connection and try again.',
          }));
          console.error(err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [key]);

  return state;
}

export function useSettings(): StoreSettings | null {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  useEffect(() => {
    let cancelled = false;
    getData()
      .then((d) => d.getSettings())
      .then((s) => { if (!cancelled) setSettings(s); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return settings;
}
