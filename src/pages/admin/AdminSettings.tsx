import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getData, isDemoMode } from '../../lib/data';
import { resetDemoData } from '../../lib/data/mock';
import type { StoreSettings } from '../../lib/types';
import { useAuth } from '../../lib/auth';
import { can } from '../../lib/permissions';

export default function AdminSettings() {
  const staffRole = useAuth((s) => s.staffRole);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getData().then((d) => d.getSettings()).then(setSettings);
  }, []);

  if (!can(staffRole, 'settings.write')) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-2xl">Settings</h1>
        <p className="mt-3 text-sm text-ink-400">
          Only the owner can change store settings.
        </p>
      </div>
    );
  }

  if (!settings) return <div className="h-40 shimmer" />;

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) =>
    setSettings({ ...settings, [key]: value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await getData();
    await data.adminSaveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={save}>
      <h1 className="text-2xl">Settings</h1>

      <section className="card mt-8 p-5">
        <h2 className="font-display text-lg">Your shop</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="storeName">Shop name</label>
            <input
              id="storeName" value={settings.storeName}
              onChange={(e) => set('storeName', e.target.value)} className="field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="address">Shop address</label>
            <input
              id="address" value={settings.shopAddress}
              onChange={(e) => set('shopAddress', e.target.value)} className="field"
            />
            <p className="mt-1.5 text-xs text-ink-300">
              Shown to customers choosing to collect. Currently a placeholder.
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="email">Email customers write to</label>
            <input
              id="email" type="email" value={settings.supportEmail}
              onChange={(e) => set('supportEmail', e.target.value)} className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="whatsapp">WhatsApp number</label>
            <input
              id="whatsapp" value={settings.whatsappNumber}
              onChange={(e) => set('whatsappNumber', e.target.value)} className="field"
            />
          </div>
        </div>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-display text-lg">Collection from the shop</h2>
        <div className="mt-4 max-w-[200px]">
          <label className="field-label" htmlFor="pickup">Discount for collecting (%)</label>
          <input
            id="pickup" type="number" min="0" max="50"
            value={settings.pickupDiscountPercent}
            onChange={(e) => set('pickupDiscountPercent', Number(e.target.value) || 0)}
            className="field"
          />
        </div>
        <p className="mt-2 text-sm text-ink-400">
          Delivery is included in your prices, so collecting has to cost less or nobody
          will choose it.
        </p>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-display text-lg">What customers are told about customs</h2>
        <textarea
          rows={3} value={settings.customsDisclaimer}
          onChange={(e) => set('customsDisclaimer', e.target.value)}
          className="field-boxed mt-4"
        />
        <p className="mt-1.5 text-xs text-ink-300">
          Shown at the bottom of every page and again at checkout.
        </p>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <ShieldCheck size={17} className="text-sage-500" /> Payments
        </h2>
        {isDemoMode ? (
          <div className="mt-4 bg-gold-100 p-4 text-sm leading-relaxed text-ink-700">
            <p className="font-medium">Payments are simulated right now.</p>
            <p className="mt-1 text-ink-500">
              Nothing is charged and no money moves. Taking real payments needs a Chapa
              merchant account and its keys added to the server.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-400">
            Charging in: {settings.chargeCurrencies.join(', ')}. Customers shown any
            other currency are told what they will actually be charged.
          </p>
        )}
      </section>

      {isDemoMode && (
        <section className="card mt-5 p-5">
          <h2 className="font-display text-lg">Demo data</h2>
          <p className="mt-1 text-sm text-ink-400">
            Puts the sample catalogue back how it started. Useful before showing
            someone the shop.
          </p>
          <button
            type="button"
            onClick={() => { resetDemoData(); window.location.reload(); }}
            className="btn-secondary mt-4 py-2 text-xs"
          >
            Reset the demo
          </button>
        </section>
      )}

      <div className="sticky bottom-20 mt-6 lg:bottom-4">
        <button type="submit" className="btn-primary w-full">
          {saved ? 'Saved' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
