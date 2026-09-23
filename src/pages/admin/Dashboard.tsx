import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Camera, Shirt } from 'lucide-react';
import { getData } from '../../lib/data';
import type { Category, Design } from '../../lib/types';

export default function Dashboard() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

  const published = designs.filter((d) => d.status === 'published');
  const drafts = designs.filter((d) => d.status === 'draft');
  const withoutPhotos = designs.filter(
    (d) => d.status !== 'archived' && d.photos.length === 0,
  );
  const emptyCategories = categories.filter(
    (c) => !published.some((d) => d.categoryId === c.id),
  );

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-24 shimmer" />
    ))}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl">Today</h1>
      <p className="mt-1 text-sm text-ink-400">
        Orders and measurement checking arrive in the next milestone. For now this is
        your catalogue.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <Shirt size={17} className="text-clay-400" />
          <p className="mt-3 text-2xl">{published.length}</p>
          <p className="text-xs text-ink-300">designs live</p>
        </div>
        <div className="card p-5">
          <Camera size={17} className="text-gold-400" />
          <p className="mt-3 text-2xl">{drafts.length}</p>
          <p className="text-xs text-ink-300">drafts not yet published</p>
        </div>
        <div className="card p-5">
          <AlertCircle size={17} className="text-ink-300" />
          <p className="mt-3 text-2xl">{emptyCategories.length}</p>
          <p className="text-xs text-ink-300">categories with nothing in them</p>
        </div>
      </div>

      {/* Things only the owner can fix, stated plainly rather than buried. */}
      {(withoutPhotos.length > 0 || emptyCategories.length > 0) && (
        <section className="mt-8">
          <h2 className="font-display text-xl">Worth your attention</h2>
          <ul className="mt-4 space-y-3">
            {withoutPhotos.length > 0 && (
              <li className="card p-5">
                <p className="font-medium">
                  {withoutPhotos.length === 1
                    ? 'One design has no photograph'
                    : `${withoutPhotos.length} designs have no photographs`}
                </p>
                <p className="mt-1 text-sm text-ink-400">
                  They cannot be published until they do. The photograph is what sells
                  the garment.
                </p>
                <Link to="/admin/designs" className="btn-secondary mt-4 py-2 text-xs">
                  See designs
                </Link>
              </li>
            )}

            {emptyCategories.length > 0 && (
              <li className="card p-5">
                <p className="font-medium">
                  {emptyCategories.map((c) => c.name).join(', ')}{' '}
                  {emptyCategories.length === 1 ? 'has' : 'have'} nothing in{' '}
                  {emptyCategories.length === 1 ? 'it' : 'them'}
                </p>
                <p className="mt-1 text-sm text-ink-400">
                  A customer who taps one of these finds an empty page. Either add
                  designs, or remove the category.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link to="/admin/designs/new" className="btn-secondary py-2 text-xs">
                    Add a design
                  </Link>
                  <Link to="/admin/categories" className="btn-ghost py-2 text-xs">
                    Edit categories
                  </Link>
                </div>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Recently edited</h2>
          <Link to="/admin/designs" className="link text-sm">All designs</Link>
        </div>
        <div className="card divide-y divide-ink-900/8">
          {designs.slice(0, 6).map((design) => (
            <Link
              key={design.id}
              to={`/admin/designs/${design.id}`}
              className="flex items-center justify-between gap-3 p-4 hover:bg-bone-200/50"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{design.name}</span>
              <span className="shrink-0 text-xs capitalize text-ink-300">{design.status}</span>
            </Link>
          ))}
          {designs.length === 0 && (
            <div className="p-12 text-center">
              <p className="font-display text-lg">No designs yet</p>
              <Link to="/admin/designs/new" className="btn-primary mt-5">Add your first</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
