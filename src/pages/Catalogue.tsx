import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useCatalogue, guessDisplayTier } from '../lib/useCatalogue';
import { useStore } from '../lib/store';
import ProductCard from '../components/ProductCard';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name' },
] as const;

const GENDERS = ['women', 'men', 'children', 'unisex'];
const KINDS = [
  { value: 'one_of_a_kind', label: 'Ready to ship' },
  { value: 'made_to_order', label: 'Made to order' },
];

export default function Catalogue() {
  const { categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const currency = useStore((s) => s.currency);
  const tier = guessDisplayTier();

  const filters = useMemo(
    () => ({
      categorySlug,
      search: params.get('q') ?? undefined,
      gender: params.get('gender') ?? undefined,
      occasion: params.get('occasion') ?? undefined,
      kind: params.get('kind') ?? undefined,
      sort: (params.get('sort') as 'newest' | undefined) ?? 'newest',
      currency,
      tier,
    }),
    [categorySlug, params, currency, tier],
  );

  const { products, categories, prices, loading, error } = useCatalogue(filters);
  const category = categories.find((c) => c.slug === categorySlug);

  const occasions = useMemo(
    () => [...new Set(products.flatMap((p) => p.occasion))].sort(),
    [products],
  );

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const activeCount = ['gender', 'occasion', 'kind', 'q'].filter((k) => params.get(k)).length;

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl">{category?.name ?? 'The collection'}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500">
          {category?.description ??
            'Every piece woven by hand in Addis Ababa. Most exist only once.'}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="btn-secondary gap-2 py-2 text-sm"
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-clay-500 px-1.5 text-[10px] text-cotton-50">
              {activeCount}
            </span>
          )}
        </button>

        <label className="sr-only" htmlFor="search">Search the collection</label>
        <input
          id="search"
          type="search"
          placeholder="Search…"
          defaultValue={params.get('q') ?? ''}
          onChange={(e) => setParam('q', e.target.value || null)}
          className="field max-w-[200px] py-2 text-sm"
        />

        <label className="sr-only" htmlFor="sort">Sort by</label>
        <select
          id="sort"
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => setParam('sort', e.target.value)}
          className="field ml-auto max-w-[190px] py-2 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {filtersOpen && (
        <div className="mb-8 rounded-sm border border-ink-900/10 bg-cotton-50 p-5">
          <div className="space-y-5">
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
              <legend className="field-label">Availability</legend>
              <div className="flex flex-wrap gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setParam('kind', k.value)}
                    className={`chip ${params.get('kind') === k.value ? 'chip-active' : ''}`}
                  >
                    {k.label}
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
                className="btn-ghost gap-1.5 px-0 text-sm text-clay-600"
              >
                <X size={14} /> Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-sm border border-clay-200 bg-clay-50 p-6 text-sm text-clay-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] rounded-sm shimmer" />
              <div className="mt-3 h-4 w-2/3 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-2xl">Nothing matches that yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
            Try removing a filter, or tell us what you are looking for and we will
            weave it.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-ink-400">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                prices={prices}
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
