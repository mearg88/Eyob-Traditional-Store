import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { getData } from '../lib/data';
import type { Design } from '../lib/types';
import { computePrice, formatMoney, findCountryGroup } from '../lib/pricing';
import { useStore } from '../lib/store';
import { useBrowsingTier, usePricingContext } from '../lib/hooks';
import { useTranslation } from '../i18n';
import Photo from '../components/Photo';

export default function Cart() {
  const { t } = useTranslation();
  const lines = useStore((s) => s.lines);
  const remove = useStore((s) => s.remove);
  const currency = useStore((s) => s.currency);
  const detected = useStore((s) => s.detectedCountry);
  const tier = useBrowsingTier();
  const pricing = usePricingContext();

  const [designs, setDesigns] = useState<Design[]>([]);

  useEffect(() => {
    if (lines.length === 0) { setDesigns([]); return; }
    let cancelled = false;
    getData()
      .then((d) => d.getDesignsByIds(lines.map((l) => l.designId)))
      .then((d) => { if (!cancelled) setDesigns(d); });
    return () => { cancelled = true; };
  }, [lines]);

  const group = findCountryGroup(detected ?? '*', pricing.countryGroups);

  const priceFor = (designId: string, choiceIds: string[]) => {
    const design = designs.find((d) => d.id === designId);
    if (!design) return null;
    // Option effects are not known here without loading each design's options;
    // the authoritative total is computed at checkout and again on the server.
    void choiceIds;
    return computePrice({
      designId,
      prices: pricing.prices,
      tier,
      countryGroup: tier === 'local' ? null : group,
      displayCurrency: tier === 'local' ? 'ETB' : currency,
      rates: pricing.rates,
    });
  };

  const subtotal = lines.reduce((sum, line) => {
    const price = priceFor(line.designId, line.chosenChoiceIds);
    return sum + (price?.total ?? 0) * line.quantity;
  }, 0);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-28 text-center sm:px-8">
        <div className="tibeb-rule mx-auto w-28" aria-hidden />
        <h1 className="mt-10 text-display-sm">{t('cart.empty')}</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">{t('cart.emptyBody')}</p>
        <Link to="/shop" className="btn-primary mt-8">{t('cart.browse')}</Link>
      </div>
    );
  }

  const longestProduction = Math.max(
    ...lines.map((l) => designs.find((d) => d.id === l.designId)?.productionDays ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <h1 className="text-display-sm">{t('cart.title')}</h1>

      <ul className="mt-10 space-y-5">
        {lines.map((line) => {
          const design = designs.find((d) => d.id === line.designId);
          if (!design) return null;
          const price = priceFor(design.id, line.chosenChoiceIds);

          return (
            <li key={`${line.designId}-${line.measurementSetId ?? 'new'}`} className="flex gap-5">
              <Link to={`/design/${design.slug}`} className="shrink-0">
                <Photo
                  src={design.photos[0]?.key}
                  alt={design.name}
                  sizes="112px"
                  className="h-36 w-28"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link to={`/design/${design.slug}`} className="font-display text-xl hover:text-clay-600">
                  {design.name}
                </Link>
                <p className="mt-1 text-xs text-ink-300">
                  Ready in about {Math.round(design.productionDays / 7)} weeks
                </p>
                {line.specialRequest && (
                  <p className="mt-2 max-w-prose text-xs italic text-ink-400">
                    “{line.specialRequest}”
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm">
                    {price ? formatMoney(price.total, price.currency) : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(line.designId)}
                    className="btn-ghost gap-1.5 px-0 text-xs"
                    aria-label={`Remove ${design.name}`}
                  >
                    <Trash2 size={13} /> {t('common.remove')}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-12 border-t border-ink-900/8 pt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-ink-400">{t('cart.subtotal')}</span>
          <span className="text-xl">{formatMoney(subtotal, tier === 'local' ? 'ETB' : currency)}</span>
        </div>
        <p className="mt-2 text-xs text-ink-300">
          Delivery is included. Your measurements are taken at the next step, and the
          final price is confirmed there.
        </p>

        {longestProduction > 0 && (
          <p className="mt-1 text-xs text-ink-300">
            Made in about {Math.round(longestProduction / 7)} weeks, then delivered.
          </p>
        )}

        <Link to="/checkout" className="btn-primary mt-7 w-full">
          {t('cart.checkout')}
        </Link>
        <Link to="/shop" className="btn-ghost mt-2 w-full text-xs">
          {t('cart.keepLooking')}
        </Link>
      </div>
    </div>
  );
}
