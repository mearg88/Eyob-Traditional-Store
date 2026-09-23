import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, Clock, Ruler, Star, Truck } from 'lucide-react';
import { getData } from '../lib/data';
import type { Design, DesignOption, Review } from '../lib/types';
import { computePrice, formatMoney } from '../lib/pricing';
import { useStore } from '../lib/store';
import { useBrowsingTier, useCategories, usePricingContext } from '../lib/hooks';
import { templateById } from '../lib/measurements';
import { useTranslation } from '../i18n';
import Photo from '../components/Photo';
import PageSpinner from '../components/PageSpinner';

export default function DesignPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [design, setDesign] = useState<Design | null>(null);
  const [options, setOptions] = useState<DesignOption[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [specialRequest, setSpecialRequest] = useState('');

  const currency = useStore((s) => s.currency);
  const addToCart = useStore((s) => s.add);
  const inCart = useStore((s) => (design ? s.lines.some((l) => l.designId === design.id) : false));
  const tier = useBrowsingTier();
  const pricing = usePricingContext();
  const categories = useCategories();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActivePhoto(0);
    setChosen({});

    (async () => {
      const data = await getData();
      const found = await data.getDesignBySlug(slug!);
      if (cancelled) return;
      setDesign(found);

      if (found) {
        const [opts, revs] = await Promise.all([
          data.listOptions(found.id),
          data.listReviews(found.id),
        ]);
        if (!cancelled) {
          setOptions(opts);
          setReviews(revs);
          // Default each option to its first choice so a price always exists.
          setChosen(
            Object.fromEntries(opts.map((o) => [o.id, o.choices[0]?.id]).filter(([, v]) => v)) as Record<string, string>,
          );
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [slug]);

  const category = categories.find((c) => c.id === design?.categoryId);
  const template = category ? templateById(category.measurementTemplateId) : undefined;

  /** Options add a definite amount, so a total is always calculable. */
  const { optionEffects, extraDays } = useMemo(() => {
    let effects = 0;
    let days = 0;
    for (const option of options) {
      const choice = option.choices.find((c) => c.id === chosen[option.id]);
      if (!choice) continue;
      effects += tier === 'local' ? choice.priceEffectLocal : choice.priceEffectUsd;
      days += choice.extraProductionDays;
    }
    return { optionEffects: effects, extraDays: days };
  }, [options, chosen, tier]);

  const group = pricing.countryGroups.find((g) => g.countries.includes('*')) ?? null;

  const price = design
    ? computePrice({
        designId: design.id,
        prices: pricing.prices,
        tier,
        countryGroup: tier === 'local' ? null : group,
        displayCurrency: tier === 'local' ? 'ETB' : currency,
        rates: pricing.rates,
        optionEffects,
      })
    : null;

  if (loading) return <PageSpinner />;

  if (!design) {
    return (
      <div className="py-28 text-center">
        <h1 className="text-display-sm">{t('errors.designGone')}</h1>
        <Link to="/shop" className="btn-primary mt-8">{t('nav.all')}</Link>
      </div>
    );
  }

  const totalDays = design.productionDays + extraDays;
  const weeks = Math.round(totalDays / 7);
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const handleAdd = () => {
    addToCart({
      designId: design.id,
      quantity: 1,
      chosenChoiceIds: Object.values(chosen),
      specialRequest: specialRequest.trim() || undefined,
    });
    // Measurements are collected next — they are the point of the product.
    navigate('/how-to-measure');
  };

  return (
    <div className="mx-auto max-w-content px-5 py-8 sm:px-8 sm:py-12">
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost mb-6 gap-1 px-0 text-xs">
        <ChevronLeft size={15} /> {t('common.back')}
      </button>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block w-full cursor-zoom-in"
            aria-label="View larger"
          >
            <Photo
              src={design.photos[activePhoto]?.key}
              alt={design.photos[activePhoto]?.alt ?? design.name}
              priority
              ratio="aspect-[4/5]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </button>

          {design.photos.length > 1 && (
            <div className="mt-3 flex gap-2">
              {design.photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  className={`w-16 border-2 transition-colors ${
                    i === activePhoto ? 'border-ink-900' : 'border-transparent hover:border-bone-400'
                  }`}
                  aria-label={`View photograph ${i + 1}`}
                  aria-current={i === activePhoto}
                >
                  <Photo src={p.key} alt="" ratio="aspect-[3/4]" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          <p className="eyebrow">{t('design.madeToOrder')}</p>
          <h1 className="mt-4 text-display-sm leading-tight sm:text-display-md">{design.name}</h1>

          {avgRating !== null && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={13}
                    className={n <= Math.round(avgRating) ? 'fill-gold-300 text-gold-300' : 'text-bone-400'}
                  />
                ))}
              </div>
              <span className="text-xs text-ink-300">
                {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}

          <p className="mt-7 text-2xl">
            {price ? formatMoney(price.total, price.currency) : '—'}
          </p>
          <p className="mt-1.5 text-xs text-ink-300">
            {t('design.deliveryIncluded')} · {t('design.taxNote')}
          </p>

          <p className="mt-7 max-w-prose leading-relaxed text-ink-500">{design.description}</p>

          <p className="mt-6 flex items-start gap-2.5 border-y border-ink-900/8 py-4 text-sm text-ink-500">
            <Clock size={16} className="mt-0.5 shrink-0 text-clay-400" />
            <span>{t('design.readyIn', { weeks })} once your measurements are confirmed.</span>
          </p>

          {/* Options: each carries a definite price effect, so the total is
              always known and checkout never has to wait for a quote. */}
          {options.length > 0 && (
            <div className="mt-8 space-y-6">
              <h2 className="font-display text-lg">{t('design.chooseOptions')}</h2>
              {options.map((option) => (
                <fieldset key={option.id}>
                  <legend className="field-label">{option.name}</legend>
                  <div className="flex flex-wrap gap-2">
                    {option.choices.map((choice) => {
                      const effect = tier === 'local' ? choice.priceEffectLocal : choice.priceEffectUsd;
                      const selected = chosen[option.id] === choice.id;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => setChosen((c) => ({ ...c, [option.id]: choice.id }))}
                          className={`chip ${selected ? 'chip-active' : ''}`}
                        >
                          {choice.label}
                          {effect > 0 && (
                            <span className="opacity-70">
                              +{formatMoney(effect, tier === 'local' ? 'ETB' : 'USD')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {/* Free text. Captured, shown to staff, changes no price — it gets
              discussed on the contact the tailor is already making. */}
          <div className="mt-8">
            <label className="field-label" htmlFor="special">{t('design.specialRequest')}</label>
            <textarea
              id="special"
              rows={2}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              className="field-boxed"
              placeholder="Longer sleeves, a different border colour…"
            />
            <p className="mt-2 text-xs text-ink-300">{t('design.specialRequestHint')}</p>
          </div>

          {template && (
            <p className="mt-8 flex items-start gap-2.5 bg-bone-200/70 p-4 text-sm text-ink-500">
              <Ruler size={16} className="mt-0.5 shrink-0 text-clay-400" />
              <span>
                Made to your measurements — {template.fields.filter((f) => f.required).length}{' '}
                measurements needed.{' '}
                <Link to="/how-to-measure" className="link">See how to take them</Link>
              </span>
            </p>
          )}

          <div className="mt-8">
            {inCart ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/cart" className="btn-primary flex-1">{t('cart.title')}</Link>
                <Link to="/shop" className="btn-secondary flex-1">{t('cart.keepLooking')}</Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={!price}
                className="btn-primary w-full"
              >
                {t('design.addToBasket')}
              </button>
            )}

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-300">
              <span className="flex items-center gap-1.5"><Truck size={13} /> {t('home.trustIncluded')}</span>
              <span className="flex items-center gap-1.5"><Check size={13} /> {t('home.trustSecure')}</span>
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-ink-900/8 pt-7 text-sm">
            <div>
              <dt className="eyebrow text-ink-300">{t('design.fabric')}</dt>
              <dd className="mt-1.5">{design.fabric}</dd>
            </div>
            <div>
              <dt className="eyebrow text-ink-300">{t('design.colour')}</dt>
              <dd className="mt-1.5">{design.colour}</dd>
            </div>
            <div>
              <dt className="eyebrow text-ink-300">{t('design.embroidery')}</dt>
              <dd className="mt-1.5">{design.embroidery}</dd>
            </div>
            <div>
              <dt className="eyebrow text-ink-300">{t('design.occasion')}</dt>
              <dd className="mt-1.5 capitalize">{design.occasion.join(', ')}</dd>
            </div>
          </dl>

          <details className="mt-7 border-t border-ink-900/8 pt-6">
            <summary className="cursor-pointer text-sm">{t('design.care')}</summary>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-400">
              {design.careInstructions}
            </p>
          </details>
        </div>
      </div>

      {reviews.length > 0 && (
        <section className="mt-20 border-t border-ink-900/8 pt-12">
          <h2 className="text-display-sm">What customers said</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="card p-6">
                <div className="flex items-center gap-2">
                  <div className="flex" aria-label={`${review.rating} out of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={n <= review.rating ? 'fill-gold-300 text-gold-300' : 'text-bone-400'}
                      />
                    ))}
                  </div>
                  <span className="text-sm">{review.authorName}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-400">{review.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/95 p-4"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${design.name}, enlarged`}
        >
          <img
            src={design.photos[activePhoto]?.key}
            alt={design.photos[activePhoto]?.alt ?? design.name}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            className="absolute right-5 top-5 bg-bone-50/15 p-3 text-bone-50"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
