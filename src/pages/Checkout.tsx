import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, Lock, Package, Store } from 'lucide-react';
import { getData } from '../lib/data';
import type { Address, Category, Design, FulfilmentMethod } from '../lib/types';
import { computePrice, findCountryGroup, formatMoney } from '../lib/pricing';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { useBrowsingTier, usePricingContext } from '../lib/hooks';
import {
  chargeNotice, formatPromisedDate, placeOrder, promisedDate, resolveTier,
} from '../lib/checkout';
import { startPayment } from '../lib/payment';
import { useTranslation } from '../i18n';
import MeasurementPicker from '../components/MeasurementPicker';
import Photo from '../components/Photo';

const COUNTRIES = [
  { code: 'ET', name: 'Ethiopia' }, { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' }, { code: 'SE', name: 'Sweden' },
  { code: 'NL', name: 'Netherlands' }, { code: 'IT', name: 'Italy' },
  { code: 'IL', name: 'Israel' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AU', name: 'Australia' },
];

const EMPTY: Address = {
  fullName: '', line1: '', line2: '', city: '', region: '', postcode: '',
  countryCode: '', phone: '',
};

export default function Checkout() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const lines = useStore((s) => s.lines);
  const currency = useStore((s) => s.currency);
  const clear = useStore((s) => s.clear);
  const customer = useAuth((s) => s.customer);
  const browsingTier = useBrowsingTier();
  const pricing = usePricingContext();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fulfilment, setFulfilment] = useState<FulfilmentMethod>('delivery');
  const [address, setAddress] = useState<Address>(EMPTY);
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [measurementSets, setMeasurementSets] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An account is required: the order runs for weeks and the customer has to be
  // able to come back and approve their measurements.
  useEffect(() => {
    if (!customer) navigate('/account/sign-in?next=/checkout');
  }, [customer, navigate]);

  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    (async () => {
      const data = await getData();
      const [d, c] = await Promise.all([
        data.getDesignsByIds(lines.map((l) => l.designId)),
        data.listCategories(),
      ]);
      if (!cancelled) { setDesigns(d); setCategories(c); }
    })();
    return () => { cancelled = true; };
  }, [lines]);

  const tier = resolveTier(fulfilment, address);
  const tierChanged = Boolean(address.countryCode || fulfilment === 'pickup')
    && tier !== browsingTier;

  const group = address.countryCode
    ? findCountryGroup(address.countryCode, pricing.countryGroups)
    : null;

  const displayCurrency = tier === 'local' ? 'ETB' : currency;

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => {
      const price = computePrice({
        designId: line.designId,
        prices: pricing.prices,
        tier,
        countryGroup: tier === 'local' ? null : group,
        displayCurrency,
        rates: pricing.rates,
      });
      return sum + (price?.total ?? 0) * line.quantity;
    }, 0),
    [lines, pricing, tier, group, displayCurrency],
  );

  const pickupDiscount = fulfilment === 'pickup' && pricing.settings
    ? Math.round((subtotal * pricing.settings.pickupDiscountPercent) / 100)
    : 0;
  const total = Math.max(0, subtotal - pickupDiscount);

  const maxProduction = Math.max(
    ...designs.map((d) => d.productionDays), 0,
  );
  const due = promisedDate(maxProduction, group, fulfilment);

  const notice = chargeNotice(displayCurrency, pricing.settings);

  const allMeasured = lines.every((l) => measurementSets[l.designId]);
  const canSubmit =
    customer && phone && allMeasured && !submitting
    && (fulfilment === 'pickup'
      || (address.fullName && address.line1 && address.city && address.countryCode));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !customer) return;
    setSubmitting(true);
    setError(null);

    const result = await placeOrder({
      customerId: customer.id,
      email: customer.email,
      phone,
      currency: displayCurrency,
      fulfilment,
      address: fulfilment === 'delivery' ? { ...address, phone } : undefined,
      lines: lines.map((l) => ({
        designId: l.designId,
        quantity: l.quantity,
        chosenChoiceIds: l.chosenChoiceIds,
        specialRequest: l.specialRequest,
        measurementSetId: measurementSets[l.designId],
      })),
      maxProductionDays: maxProduction,
      countryGroups: pricing.countryGroups,
      rates: pricing.rates,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.message);
      return;
    }

    const payment = await startPayment(result.order, result.payment);
    if (!payment.ok) {
      setSubmitting(false);
      setError(payment.message);
      return;
    }

    clear();
    if (payment.redirectUrl) window.location.href = payment.redirectUrl;
    else navigate(`/order/${result.order.reference}`);
  };

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-28 text-center sm:px-8">
        <h1 className="text-display-sm">{t('cart.empty')}</h1>
        <Link to="/shop" className="btn-primary mt-8">{t('cart.browse')}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <h1 className="text-display-sm">{t('checkout.title')}</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="space-y-12">
          {/* Measurements first: they are the product, not an afterthought. */}
          <section>
            <h2 className="font-display text-xl">{t('measure.title')}</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-400">
              {t('measure.verifyNote')}
            </p>

            <div className="mt-6 space-y-8">
              {lines.map((line) => {
                const design = designs.find((d) => d.id === line.designId);
                if (!design) return null;
                const category = categories.find((c) => c.id === design.categoryId);
                return (
                  <div key={line.designId}>
                    <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Photo
                        src={design.photos[0]?.key} alt="" sizes="40px"
                        className="h-12 w-10"
                      />
                      {design.name}
                    </p>
                    <MeasurementPicker
                      templateId={category?.measurementTemplateId ?? 'tmpl-standard'}
                      selectedId={measurementSets[line.designId]}
                      onSelect={(setId) =>
                        setMeasurementSets((m) => ({ ...m, [line.designId]: setId }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl">{t('checkout.delivery')}</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFulfilment('delivery')}
                className={`flex items-start gap-3 border p-4 text-left ${
                  fulfilment === 'delivery' ? 'border-ink-900 bg-bone-200/60' : 'border-ink-900/12'
                }`}
              >
                <Package size={17} className="mt-0.5 shrink-0 text-clay-400" />
                <span>
                  <span className="block text-sm font-medium">
                    {t('checkout.deliverToAddress')}
                  </span>
                  <span className="block text-xs text-ink-300">Delivery is in the price</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFulfilment('pickup')}
                className={`flex items-start gap-3 border p-4 text-left ${
                  fulfilment === 'pickup' ? 'border-ink-900 bg-bone-200/60' : 'border-ink-900/12'
                }`}
              >
                <Store size={17} className="mt-0.5 shrink-0 text-clay-400" />
                <span>
                  <span className="block text-sm font-medium">
                    {t('checkout.collectFromShop')}
                  </span>
                  {pricing.settings && pricing.settings.pickupDiscountPercent > 0 && (
                    <span className="block text-xs text-sage-500">
                      {pricing.settings.pickupDiscountPercent}% less
                    </span>
                  )}
                </span>
              </button>
            </div>

            {fulfilment === 'pickup' && pricing.settings && (
              <p className="mt-4 bg-bone-200 p-4 text-sm leading-relaxed text-ink-500">
                {t('checkout.collectAddress')} {pricing.settings.shopAddress}
              </p>
            )}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="phone">{t('checkout.phone')}</label>
                <input
                  id="phone" type="tel" required value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="field" placeholder="+251…"
                />
                <p className="mt-2 text-xs text-ink-300">{t('checkout.phoneHint')}</p>
              </div>

              {fulfilment === 'delivery' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="fullName">{t('checkout.fullName')}</label>
                    <input
                      id="fullName" required value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                      className="field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="line1">{t('checkout.address')}</label>
                    <input
                      id="line1" required value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="city">{t('checkout.city')}</label>
                    <input
                      id="city" required value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="country">{t('checkout.country')}</label>
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
                    <label className="field-label" htmlFor="postcode">{t('checkout.postcode')}</label>
                    <input
                      id="postcode" value={address.postcode}
                      onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                      className="field"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Said out loud rather than quietly changing the number. */}
            {tierChanged && (
              <p className="mt-5 flex items-start gap-2 bg-bone-200 p-4 text-sm text-ink-600">
                <Info size={16} className="mt-0.5 shrink-0 text-clay-500" />
                <span>
                  {t('checkout.priceChanged', {
                    country: fulfilment === 'pickup'
                      ? 'collection in Addis Ababa'
                      : COUNTRIES.find((c) => c.code === address.countryCode)?.name ?? '',
                  })}{' '}
                  {tier === 'local'
                    ? t('checkout.priceChangedLocal')
                    : t('checkout.priceChangedIntl')}
                </span>
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="font-display text-xl">Your order</h2>

            <ul className="mt-5 space-y-4">
              {lines.map((line) => {
                const design = designs.find((d) => d.id === line.designId);
                if (!design) return null;
                const price = computePrice({
                  designId: design.id,
                  prices: pricing.prices,
                  tier,
                  countryGroup: tier === 'local' ? null : group,
                  displayCurrency,
                  rates: pricing.rates,
                });
                return (
                  <li key={line.designId} className="flex gap-3">
                    <Photo src={design.photos[0]?.key} alt="" sizes="56px" className="h-16 w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{design.name}</p>
                      {!measurementSets[line.designId] && (
                        <p className="text-xs text-clay-600">{t('cart.measurementsNeeded')}</p>
                      )}
                    </div>
                    <span className="text-sm">
                      {price ? formatMoney(price.total, price.currency) : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>

            <dl className="mt-6 space-y-2 border-t border-ink-900/8 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-400">{t('cart.subtotal')}</dt>
                <dd>{formatMoney(subtotal, displayCurrency)}</dd>
              </div>
              {pickupDiscount > 0 && (
                <div className="flex justify-between text-sage-500">
                  <dt>Collecting from the shop</dt>
                  <dd>−{formatMoney(pickupDiscount, displayCurrency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-900/8 pt-3 text-base">
                <dt>Total</dt>
                <dd className="font-medium">{formatMoney(total, displayCurrency)}</dd>
              </div>
            </dl>

            {maxProduction > 0 && (
              <p className="mt-5 bg-bone-200 p-3 text-sm text-ink-500">
                {t('checkout.readyBy', { date: formatPromisedDate(due) })}
              </p>
            )}

            {/* If we cannot charge in what they are looking at, say so before
                they pay, not on their bank statement. */}
            {notice.needed && (
              <p className="mt-3 flex items-start gap-2 bg-gold-100 p-3 text-xs leading-relaxed text-ink-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold-500" />
                {t('checkout.chargeCurrencyNote', {
                  chargeCurrency: notice.chargeCurrency,
                  displayCurrency,
                })}
              </p>
            )}

            {error && (
              <p className="mt-4 bg-clay-50 p-3 text-sm text-clay-700">{error}</p>
            )}

            <button type="submit" disabled={!canSubmit} className="btn-primary mt-6 w-full">
              {submitting ? t('checkout.paying') : t('checkout.payNow')}
            </button>

            {!allMeasured && (
              <p className="mt-2 text-center text-xs text-ink-300">
                Add your measurements above to continue.
              </p>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-300">
              <Lock size={11} /> {t('checkout.securedBy')}
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
