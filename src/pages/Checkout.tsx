import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, Lock } from 'lucide-react';
import { getData } from '../lib/data';
import type { Address, Product, ProductPrice } from '../lib/types';
import { findPrice, formatMoney, tierForCountry } from '../lib/pricing';
import { useStore } from '../lib/store';
import { guessDisplayTier } from '../lib/useCatalogue';
import { formatDeliveryEstimate } from '../lib/shipping';
import type { ShippingQuote } from '../lib/shipping';
import { placeOrder, quoteShipping } from '../lib/checkout';
import { startPayment } from '../lib/payment';
import ProductImage from '../components/ProductImage';

const COUNTRIES = [
  { code: 'ET', name: 'Ethiopia' }, { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' }, { code: 'SE', name: 'Sweden' },
  { code: 'NL', name: 'Netherlands' }, { code: 'IT', name: 'Italy' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' }, { code: 'KW', name: 'Kuwait' },
  { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
];

const EMPTY: Address = {
  fullName: '', line1: '', line2: '', city: '', region: '', postcode: '',
  countryCode: '', phone: '',
};

export default function Checkout() {
  const navigate = useNavigate();
  const lines = useStore((s) => s.lines);
  const currency = useStore((s) => s.currency);
  const clear = useStore((s) => s.clear);
  const displayTier = guessDisplayTier();

  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [address, setAddress] = useState<Address>(EMPTY);
  const [email, setEmail] = useState('');
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [selectedRate, setSelectedRate] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    (async () => {
      const data = await getData();
      const ids = lines.map((l) => l.productId);
      const [p, pr] = await Promise.all([data.getProductsByIds(ids), data.listPrices(ids)]);
      if (!cancelled) { setProducts(p); setPrices(pr); }
    })();
    return () => { cancelled = true; };
  }, [lines]);

  // The tier that will actually be charged, from the destination country.
  const chargedTier = address.countryCode ? tierForCountry(address.countryCode) : displayTier;
  const tierChanged = Boolean(address.countryCode) && chargedTier !== displayTier;

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const amount = findPrice(prices, line.productId, currency, chargedTier);
        return sum + (amount ?? 0) * line.quantity;
      }, 0),
    [lines, prices, currency, chargedTier],
  );

  // Re-quote whenever the destination or the basket size changes.
  useEffect(() => {
    if (!address.countryCode || !address.city) { setQuotes([]); return; }
    let cancelled = false;
    (async () => {
      const result = await quoteShipping(address, lines.length, currency);
      if (cancelled) return;
      setQuotes(result);
      setSelectedRate((current) =>
        current && result.some((q) => q.rateId === current) ? current : result[0]?.rateId ?? null,
      );
    })();
    return () => { cancelled = true; };
  }, [address.countryCode, address.city, lines.length, currency, address]);

  const quote = quotes.find((q) => q.rateId === selectedRate) ?? null;
  const shippingAmount = quote?.amount ?? 0;
  const discount = promoApplied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shippingAmount;

  const applyPromo = async () => {
    setPromoError(null);
    const data = await getData();
    const promo = await data.findPromo(promoInput);
    if (!promo) {
      setPromoApplied(null);
      setPromoError('That code is not valid, or it has expired.');
      return;
    }
    const value =
      promo.kind === 'percentage'
        ? Math.round((subtotal * promo.value) / 100)
        : promo.currency === currency
          ? Math.min(promo.value, subtotal)
          : 0;
    if (value === 0) {
      setPromoError(`That code cannot be used in ${currency}.`);
      return;
    }
    setPromoApplied({ code: promo.code, discount: value });
  };

  const canSubmit =
    email.includes('@') && address.fullName && address.line1 && address.city &&
    address.countryCode && address.phone && selectedRate && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = await placeOrder({
      email,
      phone: address.phone,
      currency,
      address,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        customerMeasurements: l.customerMeasurements,
      })),
      shippingRateId: selectedRate!,
      shippingAmount,
      promoCode: promoApplied?.code,
    });

    if (!result.ok) {
      setSubmitting(false);
      if (result.reason === 'unavailable') {
        const names = products
          .filter((p) => result.unavailableProductIds.includes(p.id))
          .map((p) => p.name);
        setError(
          `${names.join(' and ')} ${names.length === 1 ? 'was' : 'were'} bought by someone else while you were checking out. Nothing has been charged. Please remove ${names.length === 1 ? 'it' : 'them'} from your basket to continue.`,
        );
      } else {
        setError(result.message);
      }
      return;
    }

    const payment = await startPayment(result.order, result.payment);
    if (!payment.ok) {
      setSubmitting(false);
      setError(payment.message);
      return;
    }

    clear();
    if (payment.redirectUrl) {
      window.location.href = payment.redirectUrl;
    } else {
      navigate(`/order/${result.order.reference}?email=${encodeURIComponent(email)}`);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl">There is nothing to check out</h1>
        <Link to="/shop" className="btn-primary mt-6">Browse the collection</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 font-display text-xl">Where should it go?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field" placeholder="you@example.com"
                />
                <p className="mt-1 text-xs text-ink-400">
                  We send your order confirmation and tracking here.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="fullName">Full name</label>
                <input
                  id="fullName" required value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="field"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="line1">Address</label>
                <input
                  id="line1" required value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="field"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="city">City</label>
                <input
                  id="city" required value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="field"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="country">Country</label>
                <select
                  id="country" required value={address.countryCode}
                  onChange={(e) => setAddress({ ...address, countryCode: e.target.value })}
                  className="field"
                >
                  <option value="">Choose…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="postcode">Postcode</label>
                <input
                  id="postcode" value={address.postcode}
                  onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                  className="field"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="phone">Phone</label>
                <input
                  id="phone" type="tel" required value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="field" placeholder="+251…"
                />
              </div>
            </div>

            {/* Honesty about the pricing tier. If the destination moves the
                customer between local and diaspora pricing, say so rather
                than quietly changing the number. */}
            {tierChanged && (
              <p className="mt-4 flex items-start gap-2 rounded-sm bg-cotton-200 p-3 text-sm text-ink-700">
                <Info size={16} className="mt-0.5 shrink-0 text-clay-500" />
                <span>
                  Prices have been updated for delivery to{' '}
                  {COUNTRIES.find((c) => c.code === address.countryCode)?.name}.{' '}
                  {chargedTier === 'local'
                    ? 'Local pricing now applies.'
                    : 'International pricing applies to orders shipped outside Ethiopia.'}
                </span>
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-display text-xl">Delivery</h2>
            {!address.countryCode || !address.city ? (
              <p className="rounded-sm border border-dashed border-ink-900/15 p-4 text-sm text-ink-400">
                Enter your city and country and we will show the delivery options.
              </p>
            ) : quotes.length === 0 ? (
              <p className="rounded-sm bg-clay-50 p-4 text-sm text-clay-700">
                We do not have a delivery rate set for that destination yet. Please
                contact us and we will arrange it by hand.
              </p>
            ) : (
              <div className="space-y-2">
                {quotes.map((q) => (
                  <label
                    key={q.rateId}
                    className={`flex cursor-pointer items-center gap-3 rounded-sm border p-4 ${
                      selectedRate === q.rateId
                        ? 'border-clay-400 bg-clay-50'
                        : 'border-ink-900/12 hover:border-ink-900/25'
                    }`}
                  >
                    <input
                      type="radio" name="rate" value={q.rateId}
                      checked={selectedRate === q.rateId}
                      onChange={() => setSelectedRate(q.rateId)}
                      className="accent-clay-500"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{q.label}</span>
                      <span className="block text-xs text-ink-400">
                        {formatDeliveryEstimate(q.estimatedDaysMin, q.estimatedDaysMax)}
                      </span>
                    </span>
                    <span className="text-sm font-medium">
                      {formatMoney(q.amount, q.currency)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="font-display text-xl">Your order</h2>

            <ul className="mt-4 space-y-3">
              {lines.map((line) => {
                const product = products.find((p) => p.id === line.productId);
                if (!product) return null;
                const amount = findPrice(prices, product.id, currency, chargedTier);
                return (
                  <li key={line.productId} className="flex gap-3">
                    <ProductImage
                      src={product.images[0]?.key}
                      alt=""
                      sizes="56px"
                      className="h-16 w-14 shrink-0 rounded-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      {product.kind === 'made_to_order' && (
                        <p className="text-xs text-forest-500">
                          Made to order · {Math.round((product.leadTimeDays ?? 14) / 7)} weeks
                        </p>
                      )}
                    </div>
                    <span className="text-sm">{amount === null ? '—' : formatMoney(amount, currency)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 border-t border-ink-900/8 pt-4">
              <label className="field-label" htmlFor="promo">Promo code</label>
              <div className="flex gap-2">
                <input
                  id="promo" value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="field py-2 text-sm" placeholder="WELCOME10"
                />
                <button type="button" onClick={applyPromo} className="btn-secondary py-2 text-sm">
                  Apply
                </button>
              </div>
              {promoError && <p className="mt-1.5 text-xs text-clay-600">{promoError}</p>}
              {promoApplied && (
                <p className="mt-1.5 text-xs text-forest-500">
                  {promoApplied.code} applied.
                </p>
              )}
            </div>

            <dl className="mt-5 space-y-2 border-t border-ink-900/8 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd>{formatMoney(subtotal, currency)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-forest-500">
                  <dt>Discount</dt>
                  <dd>−{formatMoney(discount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd>{quote ? formatMoney(shippingAmount, quote.currency) : '—'}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-900/8 pt-3 text-base font-medium">
                <dt>Total</dt>
                <dd>{formatMoney(total, currency)}</dd>
              </div>
            </dl>

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-sm bg-clay-50 p-3 text-sm text-clay-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" disabled={!canSubmit} className="btn-primary mt-5 w-full">
              {submitting ? 'Please wait…' : 'Pay securely'}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-400">
              <Lock size={12} /> Payment is handled by Chapa. We never see your card.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
