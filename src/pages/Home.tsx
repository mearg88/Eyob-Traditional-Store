import { Link } from 'react-router-dom';
import { ArrowRight, Package, Scissors, ShieldCheck } from 'lucide-react';
import { useCatalogue, guessDisplayTier } from '../lib/useCatalogue';
import { useStore } from '../lib/store';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';

export default function Home() {
  const currency = useStore((s) => s.currency);
  const tier = guessDisplayTier();
  const { products, categories, prices, loading } = useCatalogue();

  const featured = products.filter((p) => p.featured && p.status !== 'sold').slice(0, 4);
  const recent = products.filter((p) => p.status === 'available').slice(0, 8);
  const hero = featured[0] ?? products[0];

  return (
    <div>
      {/* ---------------------------------------------------------------
          Hero. The garment is the argument, so the photograph takes the
          space and the text stays out of its way.
          --------------------------------------------------------------- */}
      <section className="relative">
        <div className="mx-auto grid max-w-content items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div className="animate-fade-up">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-clay-500">
              Woven in Addis Ababa
            </p>
            <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Cloth made by hand,
              <br />
              <span className="text-clay-600">the way it has always been.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-500">
              Habesha kemis, netela, gabi and kuta — woven on traditional looms
              from handspun cotton, and sent to wherever you are.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">
                See the collection
                <ArrowRight size={16} />
              </Link>
              <Link to="/size-guide" className="btn-secondary">How sizing works</Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-ink-400">
              <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-forest-500" /> Secure payment</span>
              <span className="flex items-center gap-2"><Package size={15} className="text-forest-500" /> Worldwide shipping</span>
              <span className="flex items-center gap-2"><Scissors size={15} className="text-forest-500" /> Woven to measure</span>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-sm shadow-lift">
              <ProductImage
                src={hero?.images[0]?.key}
                alt={hero?.images[0]?.alt ?? 'Handwoven Ethiopian garment'}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="h-full w-full"
              />
            </div>
            {hero && (
              <Link
                to={`/product/${hero.slug}`}
                className="absolute -bottom-4 left-4 right-4 rounded-sm border border-ink-900/8 bg-cotton-50/97 p-4 shadow-lift backdrop-blur transition-transform hover:-translate-y-0.5 sm:left-auto sm:right-6 sm:w-64"
              >
                <p className="text-[10px] uppercase tracking-wider text-clay-500">Featured</p>
                <p className="mt-1 font-display text-lg leading-tight">{hero.name}</p>
                <p className="mt-1 text-xs text-ink-400">{hero.tibebPattern}</p>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl sm:text-3xl">Browse by piece</h2>
          <Link to="/shop" className="text-sm text-ink-500 hover:text-clay-600">
            See everything
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {categories.slice(0, 4).map((category) => {
            const sample = products.find((p) => p.categoryId === category.id);
            return (
              <Link
                key={category.id}
                to={`/shop/${category.slug}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-sm bg-cotton-200"
              >
                <ProductImage
                  src={sample?.images[0]?.key}
                  alt={category.name}
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-display text-lg text-cotton-50">{category.name}</h3>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="border-y border-ink-900/8 bg-cotton-200/45">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
            <h2 className="mb-2 text-2xl sm:text-3xl">Chosen pieces</h2>
            <p className="mb-8 max-w-lg text-sm text-ink-500">
              A few we are particularly proud of this season.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {featured.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  prices={prices}
                  currency={currency}
                  tier={tier}
                  priority={i < 2}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The making-of note — the story that justifies the price to someone
          buying a $150 garment they have only seen in photographs. */}
      <section className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-clay-500">
              Why it costs what it costs
            </p>
            <h2 className="text-2xl sm:text-3xl">Three weeks on a loom, not three minutes on a machine.</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-500">
              <p>
                A wedding kemis takes a weaver the better part of a month. The cotton is
                spun by hand, the tibeb border is counted thread by thread, and the
                pattern exists in the weaver's memory rather than on a card.
              </p>
              <p>
                That is why most of what you see here exists exactly once. When a piece
                is gone, there is not another one identical to it — there is a different
                one, made by the same hands.
              </p>
            </div>
            <Link to="/shop" className="btn-secondary mt-7">
              See what is available now
            </Link>
          </div>

          <div className="order-1 grid grid-cols-2 gap-3 lg:order-2">
            {recent.slice(0, 4).map((p, i) => (
              <div
                key={p.id}
                className={`overflow-hidden rounded-sm ${i % 2 === 1 ? 'mt-6' : ''}`}
              >
                <ProductImage
                  src={p.images[1]?.key ?? p.images[0]?.key}
                  alt={p.images[1]?.alt ?? p.name}
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="aspect-square w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-content px-4 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl sm:text-3xl">Recently woven</h2>
          <Link to="/shop" className="text-sm text-ink-500 hover:text-clay-600">See all</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] rounded-sm shimmer" />
                <div className="mt-3 h-4 w-2/3 rounded shimmer" />
                <div className="mt-2 h-3 w-1/3 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {recent.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                prices={prices}
                currency={currency}
                tier={tier}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
