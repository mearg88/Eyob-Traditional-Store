import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { getData } from '../lib/data';
import type { Product, ProductPrice } from '../lib/types';
import { findPrice, formatMoney } from '../lib/pricing';
import { useStore } from '../lib/store';
import { guessDisplayTier } from '../lib/useCatalogue';
import { missingMeasurements } from '../lib/measurements';
import ProductImage from '../components/ProductImage';

export default function Cart() {
  const lines = useStore((s) => s.lines);
  const remove = useStore((s) => s.remove);
  const currency = useStore((s) => s.currency);
  const tier = guessDisplayTier();

  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);

  useEffect(() => {
    if (lines.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await getData();
      const ids = lines.map((l) => l.productId);
      const [p, pr] = await Promise.all([data.getProductsByIds(ids), data.listPrices(ids)]);
      if (!cancelled) {
        setProducts(p);
        setPrices(pr);
      }
    })();
    return () => { cancelled = true; };
  }, [lines]);

  const subtotal = lines.reduce((sum, line) => {
    const amount = findPrice(prices, line.productId, currency, tier);
    return sum + (amount ?? 0) * line.quantity;
  }, 0);

  // A made-to-order line without measurements cannot be woven, so it blocks
  // checkout here rather than failing later.
  const incomplete = lines.filter((line) => {
    const product = products.find((p) => p.id === line.productId);
    return product?.kind === 'made_to_order' && missingMeasurements(line.customerMeasurements).length > 0;
  });

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="tibeb-band mx-auto w-32" aria-hidden />
        <h1 className="mt-8 text-3xl">Your basket is empty</h1>
        <p className="mt-3 text-sm text-ink-500">
          Nothing chosen yet. The collection changes as pieces come off the loom.
        </p>
        <Link to="/shop" className="btn-primary mt-7">Browse the collection</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl">Your basket</h1>

      <div className="mt-8 space-y-4">
        {lines.map((line) => {
          const product = products.find((p) => p.id === line.productId);
          if (!product) return null;
          const amount = findPrice(prices, product.id, currency, tier);
          const needs = product.kind === 'made_to_order'
            ? missingMeasurements(line.customerMeasurements)
            : [];

          return (
            <div key={line.productId} className="card flex gap-4 p-4">
              <Link to={`/product/${product.slug}`} className="shrink-0">
                <ProductImage
                  src={product.images[0]?.key}
                  alt={product.name}
                  sizes="96px"
                  className="h-28 w-24 rounded-sm"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link to={`/product/${product.slug}`} className="font-display text-lg hover:text-clay-600">
                  {product.name}
                </Link>
                <p className="mt-0.5 text-xs text-ink-400">{product.fabric}</p>

                {product.kind === 'made_to_order' && (
                  needs.length > 0 ? (
                    <p className="mt-2 text-xs text-clay-600">
                      Measurements needed —{' '}
                      <Link to={`/product/${product.slug}`} className="underline">add them</Link>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-forest-500">
                      Woven to your measurements · about {Math.round((product.leadTimeDays ?? 14) / 7)} weeks
                    </p>
                  )
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-medium">
                    {amount === null ? '—' : formatMoney(amount, currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    className="btn-ghost gap-1.5 px-2 py-1 text-xs"
                    aria-label={`Remove ${product.name} from basket`}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 card p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-ink-500">Subtotal</span>
          <span className="text-xl font-medium">{formatMoney(subtotal, currency)}</span>
        </div>
        <p className="mt-1 text-xs text-ink-400">
          Shipping is added at checkout once we know where it is going.
        </p>

        {incomplete.length > 0 && (
          <p className="mt-4 rounded-sm bg-clay-50 p-3 text-sm text-clay-700">
            {incomplete.length === 1 ? 'One made-to-order piece still needs' : `${incomplete.length} made-to-order pieces still need`}
            {' '}measurements before we can weave.
          </p>
        )}

        <Link
          to="/checkout"
          className={`btn-primary mt-5 w-full ${incomplete.length > 0 ? 'pointer-events-none opacity-50' : ''}`}
          aria-disabled={incomplete.length > 0}
        >
          Continue to checkout
        </Link>
        <Link to="/shop" className="btn-ghost mt-2 w-full text-sm">Keep looking</Link>
      </div>
    </div>
  );
}
