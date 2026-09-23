import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { getData } from '../../lib/data';
import type { Category, Design } from '../../lib/types';
import Photo from '../../components/Photo';

export default function AdminDesigns() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getData();
      const [d, c] = await Promise.all([data.adminListDesigns(), data.listCategories()]);
      setDesigns(d);
      setCategories(c);
      setLoading(false);
    })();
  }, []);

  const visible = designs.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Surfaced rather than buried: a category with nothing in it is a gap in the
  // shop, and the owner is the only person who can close it.
  const emptyCategories = categories.filter(
    (c) => !designs.some((d) => d.categoryId === c.id && d.status !== 'archived'),
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">Designs</h1>
        <Link to="/admin/designs/new" className="btn-primary py-2 text-xs">
          <Plus size={15} /> Add
        </Link>
      </div>

      {emptyCategories.length > 0 && !loading && (
        <p className="mt-5 bg-gold-100 p-4 text-sm leading-relaxed text-ink-700">
          <strong className="font-medium">
            {emptyCategories.length === 1 ? 'One category is' : `${emptyCategories.length} categories are`} empty:
          </strong>{' '}
          {emptyCategories.map((c) => c.name).join(', ')}. Customers browsing those will
          find nothing.
        </p>
      )}

      <div className="relative mt-5">
        <Search size={15} className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-300" />
        <label className="sr-only" htmlFor="design-search">Search designs</label>
        <input
          id="design-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field pl-6"
          placeholder="Search by name"
        />
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 shimmer" />)}
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-ink-900/8">
          {visible.map((design) => (
            <Link
              key={design.id}
              to={`/admin/designs/${design.id}`}
              className="flex items-center gap-4 p-3 hover:bg-bone-200/50"
            >
              <Photo
                src={design.photos[0]?.key}
                alt=""
                sizes="64px"
                className="h-20 w-16 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{design.name}</p>
                <p className="text-xs text-ink-300">
                  {categories.find((c) => c.id === design.categoryId)?.name ?? 'No category'}
                  {' · '}
                  {design.productionDays} days
                  {design.photos.length === 0 && ' · no photos'}
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                  design.status === 'published'
                    ? 'bg-sage-100 text-sage-700'
                    : design.status === 'draft'
                      ? 'bg-gold-100 text-gold-500'
                      : 'bg-bone-300 text-ink-400'
                }`}
              >
                {design.status}
              </span>
            </Link>
          ))}

          {visible.length === 0 && (
            <div className="p-12 text-center">
              <p className="font-display text-lg">Nothing here yet</p>
              <p className="mt-2 text-sm text-ink-400">
                {query ? 'Try a different search.' : 'Add your first design to get started.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
