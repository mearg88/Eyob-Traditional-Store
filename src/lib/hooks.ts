import { useEffect, useState } from 'react';
import { getData } from './data';
import type { DesignFilters } from './data';
import type {
  Category, CountryGroup, Design, DesignPrice, ExchangeRate, StoreSettings,
} from './types';
import { useStore } from './store';
import { tierForCountry } from './pricing';

// ---------------------------------------------------------------------------
// Data hooks.
//
// Deliberately small and hand-rolled rather than a data-fetching library: the
// catalogue is a few hundred rows, most of it is fetched once, and a caching
// library would weigh more than the data it cached on a phone over 3G.
// ---------------------------------------------------------------------------

/**
 * The tier used while BROWSING, guessed from the detected country.
 *
 * A display convenience only. What the customer is actually charged comes from
 * the delivery address at checkout, computed on the server. If this guess turns
 * out wrong, checkout corrects it and says so rather than silently changing the
 * number.
 */
export function useBrowsingTier() {
  const detected = useStore((s) => s.detectedCountry);
  return tierForCountry(detected);
}

export function useCategories(): Category[] {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    let cancelled = false;
    getData()
      .then((d) => d.listCategories())
      .then((c) => { if (!cancelled) setCategories(c); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return categories;
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

export interface PricingContext {
  prices: DesignPrice[];
  rates: ExchangeRate[];
  countryGroups: CountryGroup[];
  settings: StoreSettings | null;
  ready: boolean;
}

/** Everything needed to price anything. Fetched once and shared. */
export function usePricingContext(): PricingContext {
  const [state, setState] = useState<PricingContext>({
    prices: [], rates: [], countryGroups: [], settings: null, ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getData();
        const [prices, rates, countryGroups, settings] = await Promise.all([
          data.listPrices(),
          data.listExchangeRates(),
          data.listCountryGroups(),
          data.getSettings(),
        ]);
        if (!cancelled) setState({ prices, rates, countryGroups, settings, ready: true });
      } catch (err) {
        console.error(err);
        if (!cancelled) setState((s) => ({ ...s, ready: true }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}

interface DesignsState {
  designs: Design[];
  loading: boolean;
  error: string | null;
}

export function useDesigns(filters: DesignFilters = {}): DesignsState {
  const [state, setState] = useState<DesignsState>({
    designs: [], loading: true, error: null,
  });

  // Serialised so an inline filter object doesn't retrigger every render.
  const key = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const data = await getData();
        const designs = await data.listDesigns(JSON.parse(key) as DesignFilters);
        if (!cancelled) setState({ designs, loading: false, error: null });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setState({
            designs: [],
            loading: false,
            // Shown to customers, so it says what to do rather than what broke.
            error: 'We could not load the collection just now. Please check your connection and try again.',
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [key]);

  return state;
}

/**
 * Ask the hosting platform which country the visitor is in.
 *
 * Both Vercel and Cloudflare provide this free in a request header, so there
 * is no third-party geolocation service and no cost. Used only to guess a
 * display currency — never to decide a price.
 */
export function useCountryDetection(): void {
  const detected = useStore((s) => s.detectedCountry);
  const setDetectedCountry = useStore((s) => s.setDetectedCountry);

  useEffect(() => {
    if (detected) return;

    let cancelled = false;
    fetch('/api/geo')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { country?: string } | null) => {
        if (!cancelled && body?.country) setDetectedCountry(body.country);
      })
      .catch(() => {
        // No geo endpoint in local development. The locale guess already made
        // in the store stands, and the customer can switch currency anyway.
      });

    return () => { cancelled = true; };
  }, [detected, setDetectedCountry]);
}
