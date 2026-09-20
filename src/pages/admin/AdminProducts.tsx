import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { getData } from '../../lib/data';
import type { Product } from '../../lib/types';
import ProductImage from '../../components/ProductImage';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getData();
      setProducts(await data.adminListProducts());
      setLoading(false);
    })();
  }, []);

  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">Your pieces</h1>
        <Link to="/admin/products/new" className="btn-primary py-2 text-sm">
          <Plus size={16} /> Add
        </Link>
      </div>

      <div className="relative mt-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <label className="sr-only" htmlFor="product-search">Search your pieces</label>
        <input
          id="product-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field pl-9"
          placeholder="Search by name"
        />
      </div>

      {loading ? (
        <div className="mt-5 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-sm shimmer" />)}
        </div>
      ) : (
        <div className="card mt-5 divide-y divide-ink-900/8">
          {visible.map((product) => (
            <Link
              key={product.id}
              to={`/admin/products/${product.id}`}
              className="flex items-center gap-3 p-3 hover:bg-cotton-200/50"
            >
              <ProductImage
                src={product.images[0]?.key}
                alt=""
                sizes="56px"
                className="h-16 w-14 shrink-0 rounded-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-xs text-ink-400">
                  {product.kind === 'made_to_order' ? 'Made to order' : 'One of a kind'}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                  product.status === 'available'
                    ? 'bg-forest-100 text-forest-700'
                    : product.status === 'sold'
                      ? 'bg-cotton-300 text-ink-500'
                      : 'bg-gold-100 text-gold-500'
                }`}
              >
                {product.status}
              </span>
            </Link>
          ))}

          {visible.length === 0 && (
            <div className="p-10 text-center">
              <p className="font-display text-lg">Nothing found</p>
              <p className="mt-1 text-sm text-ink-500">
                {query ? 'Try a different search.' : 'Add your first piece to get started.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
