import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  useBrowsingTier, useCategories, useDesigns, usePricingContext,
} from '../lib/hooks';
import { useStore } from '../lib/store';
import DesignCard from '../components/DesignCard';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'soonest', label: 'Ready soonest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name' },
];

const GENDERS = ['women', 'men', 'children', 'unisex'];

/** Someone with an event coming needs to know what can be finished in time. */
const LEAD_TIMES = [
  { value: '7', label: 'Within a week' },
  { value: '14', label: 'Within 2 weeks' },
  { value: '21', label: 'Within 3 weeks' },
];

export default function Shop() {
  const { categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const currency = useStore((s) => s.currency);
  const tier = useBrowsingTier();
  const pricing = usePricingContext();
  const categories = useCategories();

  const filters = useMemo(
    () => ({
      categorySlug,
      search: params.get('q') ?? undefined,
      gender: params.get('gender') ?? undefined,
      occasion: params.get('occasion') ?? undefined,
      maxProductionDays: params.get('lead') ? Number(params.get('lead')) : undefined,
      sort: (params.get('sort') as 'newest') ?? 'newest',
    }),
    [categorySlug, params],
  );

  const { designs, loading, error } = useDesigns(filters);
  const category = categories.find((c) => c.slug === categorySlug);

  const occasions = useMemo(
    () => [...new Set(designs.flatMap((d) => d.occasion))].sort(),
    [designs],
  );

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const activeCount = ['gender', 'occasion', 'lead', 'q'].filter((k) => params.get(k)).length;

  return (
    <div className="mx-auto max-w-content px-5 py-12 sm:px-8">
      <header className="mb-10">
        <h1 className="text-display-sm sm:text-display-md">
          {category?.name ?? 'The collection'}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-400">
          {category?.description
            ?? 'Every piece is woven by hand in Addis Ababa, and cut to your own measurements after you order.'}
        </p>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-ink-900/8 py-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="btn-ghost gap-2 text-xs"
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 && (
            <span className="bg-clay-500 px-1.5 text-[10px] text-bone-50">{activeCount}</span>
          )}
        </button>

        <label className="sr-only" htmlFor="search">Search the collection</label>
        <input
          id="search"
          type="search"
          placeholder="Search…"
          defaultValue={params.get('q') ?? ''}
          onChange={(e) => setParam('q', e.target.value || null)}
          className="field max-w-[180px] py-1.5 text-sm"
        />

        <label className="sr-only" htmlFor="sort">Sort by</label>
        <select
          id="sort"
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => setParam('sort', e.target.value)}
          className="field ml-auto max-w-[180px] py-1.5 text-xs"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {filtersOpen && (
        <div className="mb-10 space-y-6 border border-ink-900/8 p-6">
          <fieldset>
            <legend className="field-label">Who it is for</legend>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setParam('gender', g)}
                  className={`chip capitalize ${params.get('gender') === g ? 'chip-active' : ''}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Needed by</legend>
            <div className="flex flex-wrap gap-2">
              {LEAD_TIMES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setParam('lead', l.value)}
                  className={`chip ${params.get('lead') === l.value ? 'chip-active' : ''}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>

          {occasions.length > 0 && (
            <fieldset>
              <legend className="field-label">Occasion</legend>
              <div className="flex flex-wrap gap-2">
                {occasions.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setParam('occasion', o)}
                    className={`chip capitalize ${params.get('occasion') === o ? 'chip-active' : ''}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="btn-ghost gap-1.5 px-0 text-xs text-clay-600"
            >
              <X size={13} /> Clear all
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="border border-clay-200 bg-clay-50 p-6 text-sm text-clay-700">{error}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] shimmer" />
              <div className="mt-4 h-4 w-2/3 shimmer" />
            </div>
          ))}
        </div>
      ) : designs.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-2xl">Nothing matches that yet</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-ink-400">
            Try removing a filter. If you have something particular in mind, tell us and
            we will weave it.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-6 text-xs text-ink-300">
            {designs.length} {designs.length === 1 ? 'design' : 'designs'}
          </p>
          <div className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4">
            {designs.map((design, i) => (
              <DesignCard
                key={design.id}
                design={design}
                pricing={pricing}
                currency={currency}
                tier={tier}
                priority={i < 4}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
