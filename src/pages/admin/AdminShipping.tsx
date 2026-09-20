import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { getData } from '../../lib/data';
import type { CurrencyCode, ShippingRate, ShippingZone } from '../../lib/types';
import { CURRENCIES, formatMoney, parseMoney } from '../../lib/pricing';

export default function AdminShipping() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getData();
      const [z, r] = await Promise.all([data.listZones(), data.listRates()]);
      setZones(z);
      setRates(r);
    })();
  }, []);

  const updateRate = async (rate: ShippingRate, patch: Partial<ShippingRate>) => {
    const next = { ...rate, ...patch };
    setRates((current) => current.map((r) => (r.id === rate.id ? next : r)));
    const data = await getData();
    await data.adminSaveRate(next);
    setSaved(rate.id);
    setTimeout(() => setSaved(null), 1500);
  };

  return (
    <div>
      <h1 className="text-2xl">Shipping</h1>
      <p className="mt-1 text-sm text-ink-500">
        What you charge to send a parcel to each part of the world.
      </p>

      {/* Stated plainly because it is a real limitation, not a design choice. */}
      <div className="mt-5 flex items-start gap-3 rounded-sm bg-cotton-200 p-4">
        <Info size={17} className="mt-0.5 shrink-0 text-clay-500" />
        <div className="text-sm leading-relaxed text-ink-700">
          <p className="font-medium">These are your own prices, not the courier's.</p>
          <p className="mt-1 text-ink-500">
            Live courier pricing needs a business account with DHL, Aramex or similar.
            Until you have one, set what you know it costs you and adjust as you learn.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {zones.map((zone) => {
          const zoneRates = rates.filter((r) => r.zoneId === zone.id);
          return (
            <section key={zone.id} className="card p-5">
              <h2 className="font-display text-lg">{zone.name}</h2>
              <p className="mt-0.5 text-xs text-ink-400">
                {zone.countries.includes('*')
                  ? 'Everywhere not listed above'
                  : zone.countries.join(', ')}
              </p>

              {zoneRates.length === 0 ? (
                <p className="mt-3 text-sm text-ink-400">No rate set — customers here cannot check out.</p>
              ) : (
                zoneRates.map((rate) => (
                  <div key={rate.id} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor={`${rate.id}-name`}>How it is sent</label>
                      <input
                        id={`${rate.id}-name`}
                        defaultValue={rate.name}
                        onBlur={(e) => updateRate(rate, { name: e.target.value })}
                        className="field py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor={`${rate.id}-base`}>
                        Price for one piece ({rate.currency})
                      </label>
                      <input
                        id={`${rate.id}-base`}
                        type="text" inputMode="decimal"
                        defaultValue={
                          (rate.baseAmount / 10 ** CURRENCIES[rate.currency as CurrencyCode].decimals).toString()
                        }
                        onBlur={(e) => {
                          const amount = parseMoney(e.target.value, rate.currency);
                          if (amount !== null) updateRate(rate, { baseAmount: amount });
                        }}
                        className="field py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor={`${rate.id}-extra`}>
                        Add for each extra piece
                      </label>
                      <input
                        id={`${rate.id}-extra`}
                        type="text" inputMode="decimal"
                        defaultValue={
                          (rate.perExtraItemAmount / 10 ** CURRENCIES[rate.currency as CurrencyCode].decimals).toString()
                        }
                        onBlur={(e) => {
                          const amount = parseMoney(e.target.value, rate.currency);
                          if (amount !== null) updateRate(rate, { perExtraItemAmount: amount });
                        }}
                        className="field py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor={`${rate.id}-days`}>
                        How many days (from / to)
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={`${rate.id}-days`}
                          type="number" min="1"
                          defaultValue={rate.estimatedDaysMin}
                          onBlur={(e) =>
                            updateRate(rate, { estimatedDaysMin: Number.parseInt(e.target.value, 10) || 1 })
                          }
                          className="field py-2 text-sm"
                        />
                        <input
                          type="number" min="1"
                          defaultValue={rate.estimatedDaysMax}
                          onBlur={(e) =>
                            updateRate(rate, { estimatedDaysMax: Number.parseInt(e.target.value, 10) || 1 })
                          }
                          className="field py-2 text-sm"
                          aria-label="Longest number of days"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-ink-400 sm:col-span-2">
                      A customer buying three pieces pays{' '}
                      {formatMoney(rate.baseAmount + 2 * rate.perExtraItemAmount, rate.currency)}.
                      {saved === rate.id && <span className="ml-2 text-forest-500">Saved</span>}
                    </p>
                  </div>
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
