import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getData } from '../../lib/data';
import type { PromoCode } from '../../lib/types';

export default function AdminPromos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState(10);

  useEffect(() => {
    (async () => {
      const data = await getData();
      setPromos(await data.adminListPromos());
    })();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const promo: PromoCode = {
      id: `promo-${Date.now()}`,
      code: code.toUpperCase().replace(/\s/g, ''),
      kind: 'percentage',
      value: percent,
      timesRedeemed: 0,
      active: true,
    };
    const data = await getData();
    await data.adminSavePromo(promo);
    setPromos((current) => [...current, promo]);
    setCode('');
    setCreating(false);
  };

  const toggle = async (promo: PromoCode) => {
    const next = { ...promo, active: !promo.active };
    const data = await getData();
    await data.adminSavePromo(next);
    setPromos((current) => current.map((p) => (p.id === promo.id ? next : p)));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Discount codes</h1>
        <button type="button" onClick={() => setCreating((v) => !v)} className="btn-primary py-2 text-sm">
          <Plus size={16} /> New code
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-500">
        Give customers a code to type at checkout for money off.
      </p>

      {creating && (
        <form onSubmit={create} className="card mt-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="promo-code">The code</label>
              <input
                id="promo-code" required value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="field" placeholder="TIMKAT20"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="promo-percent">Percent off</label>
              <input
                id="promo-percent" type="number" min="1" max="90" required value={percent}
                onChange={(e) => setPercent(Number.parseInt(e.target.value, 10) || 10)}
                className="field"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary mt-4">Create code</button>
        </form>
      )}

      <div className="card mt-5 divide-y divide-ink-900/8">
        {promos.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display text-lg">No codes yet</p>
            <p className="mt-1 text-sm text-ink-500">Create one when you want to run an offer.</p>
          </div>
        ) : (
          promos.map((promo) => (
            <div key={promo.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono font-medium">{promo.code}</p>
                <p className="text-xs text-ink-400">
                  {promo.kind === 'percentage' ? `${promo.value}% off` : 'Fixed amount off'}
                  {' · used '}{promo.timesRedeemed} {promo.timesRedeemed === 1 ? 'time' : 'times'}
                  {promo.maxRedemptions ? ` of ${promo.maxRedemptions}` : ''}
                </p>
                {promo.expiresAt && (
                  <p className="text-xs text-ink-400">
                    Ends {new Date(promo.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggle(promo)}
                className={`chip ${promo.active ? 'chip-active' : ''}`}
              >
                {promo.active ? 'On' : 'Off'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
