import { Link } from 'react-router-dom';
import type { CurrencyCode, Design, PriceTier } from '../lib/types';
import { computePrice, formatMoney } from '../lib/pricing';
import type { PricingContext } from '../lib/hooks';
import Photo from './Photo';

interface Props {
  design: Design;
  pricing: PricingContext;
  currency: CurrencyCode;
  tier: PriceTier;
  priority?: boolean;
}

export default function DesignCard({ design, pricing, currency, tier, priority }: Props) {
  const group = pricing.countryGroups.find((g) => g.countries.includes('*')) ?? null;

  const price = computePrice({
    designId: design.id,
    prices: pricing.prices,
    tier,
    countryGroup: tier === 'local' ? null : group,
    displayCurrency: tier === 'local' ? 'ETB' : currency,
    rates: pricing.rates,
  });

  const photo = design.photos[0];
  const weeks = Math.round(design.productionDays / 7);

  return (
    <Link to={`/design/${design.slug}`} className="group block">
      <Photo
        src={photo?.key}
        alt={photo?.alt ?? design.name}
        priority={priority}
        ratio="aspect-[3/4]"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
        className="transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.02]"
      />

      <div className="pt-4">
        <h3 className="font-display text-xl leading-snug transition-colors group-hover:text-clay-600">
          {design.name}
        </h3>
        <p className="mt-1 text-xs text-ink-300">
          {weeks <= 1 ? 'Ready in about a week' : `Ready in about ${weeks} weeks`}
        </p>
        <p className="mt-2 text-sm text-ink-700">
          {price ? formatMoney(price.total, price.currency) : '—'}
        </p>
      </div>
    </Link>
  );
}
