import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCategories, useDesigns, usePricingContext, useBrowsingTier } from '../lib/hooks';
import { useStore } from '../lib/store';
import { useTranslation } from '../i18n';
import DesignCard from '../components/DesignCard';
import Photo from '../components/Photo';

export default function Home() {
  const { t } = useTranslation();
  const currency = useStore((s) => s.currency);
  const tier = useBrowsingTier();
  const pricing = usePricingContext();
  const categories = useCategories();
  const { designs, loading } = useDesigns();

  const featured = designs.filter((d) => d.featured).slice(0, 4);
  const hero = featured[0] ?? designs[0];
  const recent = designs.slice(0, 8);

  return (
    <div>
      {/*
        Hero. The photograph is the argument, so it takes the space and the
        text keeps out of its way. Full-bleed on mobile, split on desktop.
      */}
      <section className="relative">
        <div className="mx-auto grid max-w-content items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1 className="mt-6 text-display-sm sm:text-display-md lg:text-display-lg">
              {t('home.headline')}
              <br />
              <em className="not-italic text-clay-600">{t('home.headlineAccent')}</em>
            </h1>
            <div className="tibeb-rule mt-8 w-24" aria-hidden />
            <p className="mt-8 max-w-prose text-[15px] leading-relaxed text-ink-400">
              {t('home.intro')}
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">
                {t('home.browse')}
                <ArrowRight size={15} />
              </Link>
              <Link to="/how-to-measure" className="btn-secondary">
                {t('home.howItWorks')}
              </Link>
            </div>

            <ul className="mt-12 grid gap-y-2.5 text-xs text-ink-300 sm:grid-cols-2">
              <li>{t('home.trustMeasured')}</li>
              <li>{t('home.trustIncluded')}</li>
              <li>{t('home.trustWorldwide')}</li>
              <li>{t('home.trustSecure')}</li>
            </ul>
          </div>

          <div className="relative">
            <Photo
              src={hero?.photos[0]?.key}
              alt={hero?.photos[0]?.alt ?? 'Handwoven Ethiopian garment'}
              priority
              ratio="aspect-[4/5]"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            {hero && (
              <Link
                to={`/design/${hero.slug}`}
                className="absolute bottom-5 left-5 right-5 bg-bone-50/95 p-5 backdrop-blur-sm transition-transform duration-500 ease-editorial hover:-translate-y-1 sm:left-auto sm:w-64"
              >
                <p className="eyebrow">Featured</p>
                <p className="mt-2 font-display text-lg leading-tight">{hero.name}</p>
                <p className="mt-1 text-xs text-ink-300">{hero.embroidery}</p>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works — the single most important explanation on the site.
          A made-to-measure purchase is unfamiliar; saying so plainly removes
          more hesitation than any amount of styling. */}
      <section className="border-y border-ink-900/8 bg-bone-200/50">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <h2 className="text-display-sm">How it works</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-3">
            {[
              { n: '01', h: 'Choose a design', b: 'Every piece in the collection is made after you order. Nothing is sitting in a warehouse.' },
              { n: '02', h: 'Send your measurements', b: 'Our guide walks you through each one. A tailor checks them and messages you if anything looks wrong.' },
              { n: '03', h: 'We weave and deliver', b: 'Watch it progress from cut to finished. Delivery is included in the price, wherever you are.' },
            ].map((step) => (
              <li key={step.n}>
                <span className="font-display text-3xl text-clay-300">{step.n}</span>
                <h3 className="mt-3 font-display text-xl">{step.h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{step.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="text-display-sm">The collection</h2>
          <Link to="/shop" className="link text-sm">{t('nav.all')}</Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {categories.slice(0, 4).map((category) => {
            const sample = designs.find((d) => d.categoryId === category.id);
            return (
              <Link key={category.id} to={`/shop/${category.slug}`} className="group relative">
                <Photo
                  src={sample?.photos[0]?.key}
                  alt={category.name}
                  ratio="aspect-[4/5]"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />
                <h3 className="absolute inset-x-0 bottom-0 p-4 font-display text-lg text-bone-50">
                  {category.name}
                </h3>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-content px-5 pb-20 sm:px-8">
          <h2 className="mb-10 text-display-sm">Chosen pieces</h2>
          <div className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4">
            {featured.map((design, i) => (
              <DesignCard
                key={design.id}
                design={design}
                pricing={pricing}
                currency={currency}
                tier={tier}
                priority={i < 2}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      <section className="mx-auto max-w-content px-5 pb-24 sm:px-8">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="text-display-sm">Recently added</h2>
          <Link to="/shop" className="link text-sm">{t('nav.all')}</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] shimmer" />
                <div className="mt-4 h-4 w-2/3 shimmer" />
                <div className="mt-2 h-3 w-1/3 shimmer" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4">
            {recent.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                pricing={pricing}
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
