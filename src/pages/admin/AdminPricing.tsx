import { useEffect, useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { getData } from '../../lib/data';
import type { CountryGroup, ExchangeRate } from '../../lib/types';
import { CURRENCIES } from '../../lib/pricing';

/**
 * Where the owner controls what customers abroad actually pay.
 *
 * The uplift exists because delivery is included in the price and there are no
 * shipping zones: sending a gown to Sydney costs far more than to London, so
 * each region carries a percentage on top of the one dollar price. Changing a
 * courier means editing one number here, not three hundred designs.
 */
export default function AdminPricing() {
  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getData();
      const [g, r] = await Promise.all([data.listCountryGroups(), data.listExchangeRates()]);
      setGroups(g);
      setRates(r);
    })();
  }, []);

  const update = async (group: CountryGroup, patch: Partial<CountryGroup>) => {
    const next = { ...group, ...patch };
    setGroups((gs) => gs.map((g) => (g.id === group.id ? next : g)));
    const data = await getData();
    await data.adminSaveCountryGroup(next);
    setSaved(group.id);
    setTimeout(() => setSaved(null), 1500);
  };

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const data = await getData();
      setRates(await data.adminRefreshRates());
    } catch {
      setRefreshError(
        'Could not reach the rate service just now. The rates below are still being used, so nothing is broken.',
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl">Pricing</h1>
      <p className="mt-1 text-sm text-ink-400">
        You type one birr price and one dollar price per design. This page decides what
        happens to the dollar price for each part of the world.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-xl">Regions</h2>
        <p className="mt-1 text-sm text-ink-400">
          The uplift covers your delivery cost to that region. Ethiopia is not listed
          because local orders use the birr price directly.
        </p>

        <div className="mt-5 space-y-4">
          {groups.filter((g) => g.id !== 'grp-et').map((group) => (
            <div key={group.id} className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">{group.name}</h3>
                {saved === group.id && <span className="text-xs text-sage-500">Saved</span>}
              </div>
              <p className="mt-0.5 text-xs text-ink-300">
                {group.countries.includes('*')
                  ? 'Everywhere not listed above'
                  : `${group.countries.length} countries`}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="field-label" htmlFor={`${group.id}-uplift`}>
                    Add to the price (%)
                  </label>
                  <input
                    id={`${group.id}-uplift`}
                    type="number" step="0.5" min="-50" max="100"
                    defaultValue={group.upliftPercent}
                    onBlur={(e) => update(group, { upliftPercent: Number(e.target.value) || 0 })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`${group.id}-min`}>
                    Delivery days, from
                  </label>
                  <input
                    id={`${group.id}-min`} type="number" min="1"
                    defaultValue={group.deliveryDaysMin}
                    onBlur={(e) => update(group, { deliveryDaysMin: Number(e.target.value) || 1 })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`${group.id}-max`}>
                    Delivery days, to
                  </label>
                  <input
                    id={`${group.id}-max`} type="number" min="1"
                    defaultValue={group.deliveryDaysMax}
                    onBlur={(e) => update(group, { deliveryDaysMax: Number(e.target.value) || 1 })}
                    className="field"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-ink-300">
                A $285 design shows as{' '}
                <strong className="font-medium text-ink-500">
                  ${Math.round(285 * (1 + group.upliftPercent / 100))}
                </strong>{' '}
                here, and a customer is told it arrives in{' '}
                {group.deliveryDaysMin}–{group.deliveryDaysMax} days after it is made.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Exchange rates</h2>
          <button
            type="button" onClick={refresh} disabled={refreshing}
            className="btn-secondary py-2 text-xs"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating…' : 'Update now'}
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 bg-bone-200 p-4 text-sm leading-relaxed text-ink-500">
          <Info size={16} className="mt-0.5 shrink-0 text-clay-400" />
          <span>
            Rates update automatically once a day, with a small margin added to protect
            you from currency movement. Checkout always reads the stored rates, so if
            the rate service is ever down your shop keeps working.
          </span>
        </p>

        {refreshError && (
          <p className="mt-3 bg-gold-100 p-3 text-sm text-ink-700">{refreshError}</p>
        )}

        <div className="card mt-5 divide-y divide-ink-900/8">
          {rates.map((rate) => (
            <div key={rate.currency} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{rate.currency}</p>
                <p className="text-xs text-ink-300">{CURRENCIES[rate.currency]?.name}</p>
              </div>
              <div className="text-right">
                <p className="tabular text-sm">
                  1 USD = {rate.rateFromUsd.toFixed(3)} {rate.currency}
                </p>
                <p className="text-xs text-ink-300">
                  includes {rate.marginPercent}% margin
                  {rate.fetchedAt && ` · ${new Date(rate.fetchedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          ))}
          {rates.length === 0 && (
            <p className="p-8 text-center text-sm text-ink-400">
              No rates stored yet. Press Update now.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
