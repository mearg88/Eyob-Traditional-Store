import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, Clock, Ruler, Star, Truck } from 'lucide-react';
import { getData } from '../lib/data';
import type { Measurements, Product, ProductPrice, Review } from '../lib/types';
import { findPrice, formatMoney } from '../lib/pricing';
import { useStore } from '../lib/store';
import { guessDisplayTier } from '../lib/useCatalogue';
import {
  MEASUREMENT_FIELDS, measurementSubject, toDisplay,
} from '../lib/measurements';
import ProductImage from '../components/ProductImage';
import PageSpinner from '../components/PageSpinner';
import MeasurementForm from '../components/MeasurementForm';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [added, setAdded] = useState(false);

  const currency = useStore((s) => s.currency);
  const unit = useStore((s) => s.unit);
  const setUnit = useStore((s) => s.setUnit);
  const addToCart = useStore((s) => s.add);
  const inCart = useStore((s) => (slug ? s.lines.some((l) => l.productId === product?.id) : false));
  const tier = guessDisplayTier();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveImage(0);

    (async () => {
      const data = await getData();
      const found = await data.getProductBySlug(slug!);
      if (cancelled) return;
      setProduct(found);
      if (found) {
        const [p, r] = await Promise.all([
          data.listPrices([found.id]),
          data.listReviews(found.id),
        ]);
        if (!cancelled) {
          setPrices(p);
          setReviews(r);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <PageSpinner />;

  if (!product) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl">We could not find that piece</h1>
        <p className="mt-2 text-sm text-ink-500">It may have sold and been taken down.</p>
        <Link to="/shop" className="btn-primary mt-6">Back to the collection</Link>
      </div>
    );
  }

  const amount = findPrice(prices, product.id, currency, tier);
  const sold = product.status === 'sold';
  const madeToOrder = product.kind === 'made_to_order';
  const hasMeasurements = MEASUREMENT_FIELDS.some((f) => product.measurements[f.key]);
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const handleAdd = () => {
    addToCart(product.id, madeToOrder ? measurements : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="btn-ghost mb-4 gap-1 px-0 text-sm"
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block w-full cursor-zoom-in overflow-hidden rounded-sm bg-cotton-200"
            aria-label="Open larger image"
          >
            <ProductImage
              src={product.images[activeImage]?.key}
              alt={product.images[activeImage]?.alt ?? product.name}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="aspect-[4/5] w-full"
            />
          </button>

          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-16 overflow-hidden rounded-sm border-2 transition-colors ${
                    i === activeImage ? 'border-clay-500' : 'border-transparent hover:border-cotton-500'
                  }`}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === activeImage}
                >
                  <ProductImage src={img.key} alt="" sizes="64px" className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-clay-500">
            {madeToOrder ? 'Woven to order' : 'One piece only'}
          </p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{product.name}</h1>

          {avgRating !== null && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    className={n <= Math.round(avgRating) ? 'fill-gold-300 text-gold-300' : 'text-cotton-500'}
                  />
                ))}
              </div>
              <span className="text-xs text-ink-400">
                {avgRating.toFixed(1)} from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}

          <p className="mt-5 text-2xl font-medium">
            {amount === null ? (
              <span className="text-ink-400">Enquire for price</span>
            ) : (
              formatMoney(amount, currency)
            )}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Shipping calculated at checkout. Duties are not included.
          </p>

          <p className="mt-6 leading-relaxed text-ink-700">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-ink-900/8 py-5 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-400">Fabric</dt>
              <dd className="mt-0.5 text-ink-900">{product.fabric}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-400">Colour</dt>
              <dd className="mt-0.5 text-ink-900">{product.colour}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-400">Border</dt>
              <dd className="mt-0.5 text-ink-900">{product.tibebPattern}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-400">Size</dt>
              <dd className="mt-0.5 text-ink-900">{product.nominalSize}</dd>
            </div>
          </dl>

          {madeToOrder && product.leadTimeDays && (
            <p className="mt-5 flex items-start gap-2 rounded-sm bg-forest-100 p-3 text-sm text-forest-700">
              <Clock size={16} className="mt-0.5 shrink-0" />
              <span>
                Woven after you order — about{' '}
                <strong className="font-medium">{Math.round(product.leadTimeDays / 7)} weeks</strong>{' '}
                before it ships.
              </span>
            </p>
          )}

          {/* Measurements: the garment's own for ready-made pieces, the
              customer's for made-to-order. Labelled either way. */}
          {(hasMeasurements || madeToOrder) && (
            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg">
                  <Ruler size={16} className="text-clay-400" />
                  {measurementSubject(product.kind)}
                </h2>
                <div className="inline-flex rounded-sm border border-ink-900/12 text-xs">
                  {(['cm', 'in'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-2.5 py-1 ${unit === u ? 'bg-clay-500 text-cotton-50' : 'text-ink-500'}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {madeToOrder ? (
                <>
                  <p className="mb-3 text-sm text-ink-500">
                    Give us your own measurements — the weaver adds the ease, so do
                    not add any yourself.{' '}
                    <Link to="/size-guide" className="text-clay-600 underline">
                      How to measure
                    </Link>
                  </p>
                  <MeasurementForm value={measurements} onChange={setMeasurements} unit={unit} />
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-ink-500">
                    These are the measurements of this garment, not of a body.
                    Compare them with something you already own.
                  </p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {MEASUREMENT_FIELDS.filter((f) => product.measurements[f.key]).map((f) => (
                      <div key={f.key} className="flex justify-between border-b border-ink-900/5 py-1.5">
                        <dt className="text-ink-500">{f.label}</dt>
                        <dd className="font-medium">
                          {toDisplay(product.measurements[f.key]!, unit)} {unit}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </section>
          )}

          {/* Buy */}
          <div className="mt-8">
            {sold ? (
              <div className="rounded-sm border border-ink-900/10 bg-cotton-200 p-5 text-center">
                <p className="font-display text-lg">This piece has sold</p>
                <p className="mt-1 text-sm text-ink-500">
                  It existed only once. We can weave something similar to your measurements.
                </p>
                <Link to="/shop?kind=made_to_order" className="btn-secondary mt-4">
                  See made-to-order pieces
                </Link>
              </div>
            ) : inCart ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/cart" className="btn-primary flex-1">Go to basket</Link>
                <Link to="/shop" className="btn-secondary flex-1">Keep looking</Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={amount === null}
                className="btn-primary w-full text-base"
              >
                {added ? (<><Check size={18} /> Added</>) : 'Add to basket'}
              </button>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-400">
              <span className="flex items-center gap-1.5"><Truck size={13} /> Worldwide shipping</span>
              <span className="flex items-center gap-1.5"><Check size={13} /> Secure payment via Chapa</span>
            </div>
          </div>

          <details className="mt-8 border-t border-ink-900/8 pt-5">
            <summary className="cursor-pointer text-sm font-medium">Care instructions</summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">{product.careInstructions}</p>
          </details>
        </div>
      </div>

      {reviews.length > 0 && (
        <section className="mt-16 border-t border-ink-900/8 pt-10">
          <h2 className="text-2xl">What customers said</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="card p-5">
                <div className="flex items-center gap-2">
                  <div className="flex" aria-label={`${review.rating} out of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={13}
                        className={n <= review.rating ? 'fill-gold-300 text-gold-300' : 'text-cotton-500'}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{review.authorName}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">{review.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/92 p-4"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name}, enlarged`}
        >
          <img
            src={product.images[activeImage]?.key}
            alt={product.images[activeImage]?.alt ?? product.name}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-cotton-50/20 p-3 text-cotton-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
