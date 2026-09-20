import { Link } from 'react-router-dom';
import type { CurrencyCode, PriceTier, Product, ProductPrice } from '../lib/types';
import { findPrice, formatMoney } from '../lib/pricing';
import ProductImage from './ProductImage';

interface Props {
  product: Product;
  prices: ProductPrice[];
  currency: CurrencyCode;
  tier: PriceTier;
  priority?: boolean;
}

export default function ProductCard({ product, prices, currency, tier, priority }: Props) {
  const amount = findPrice(prices, product.id, currency, tier);
  const sold = product.status === 'sold';
  const image = product.images[0];

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block focus-visible:outline-none"
      aria-label={product.name}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-cotton-200">
        <ProductImage
          src={image?.key}
          alt={image?.alt ?? product.name}
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]"
        />

        {sold && (
          <div className="absolute inset-0 flex items-center justify-center bg-cotton-50/75">
            <span className="rounded-sm bg-ink-900/85 px-3 py-1.5 text-xs uppercase tracking-wider text-cotton-50">
              Sold
            </span>
          </div>
        )}

        {!sold && product.kind === 'made_to_order' && (
          <span className="absolute left-2 top-2 rounded-sm bg-forest-700/92 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-cotton-50">
            Made to order
          </span>
        )}

        {!sold && product.kind === 'one_of_a_kind' && (
          <span className="absolute left-2 top-2 rounded-sm bg-cotton-50/92 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-700">
            One piece only
          </span>
        )}
      </div>

      <div className="pt-3">
        <h3 className="font-display text-lg leading-snug text-ink-900 group-hover:text-clay-600">
          {product.name}
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-400">{product.fabric}</p>
        <p className="mt-1.5 text-sm font-medium text-ink-900">
          {amount === null ? (
            <span className="text-ink-400">Enquire for price</span>
          ) : (
            formatMoney(amount, currency)
          )}
        </p>
      </div>
    </Link>
  );
}
