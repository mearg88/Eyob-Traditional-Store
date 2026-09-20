import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getData, isDemoMode } from '../../lib/data';
import type { StoreSettings } from '../../lib/types';
import { resetDemoData } from '../../lib/data/mock';

export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getData();
      setSettings(await data.getSettings());
    })();
  }, []);

  if (!settings) return <div className="h-40 rounded-sm shimmer" />;

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

      <section className="card mt-6 p-5">
        <h2 className="font-display text-lg">Your shop</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="storeName">Shop name</label>
            <input
              id="storeName" value={settings.storeName}
              onChange={(e) => set('storeName', e.target.value)} className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="supportEmail">Email customers write to</label>
            <input
              id="supportEmail" type="email" value={settings.supportEmail}
              onChange={(e) => set('supportEmail', e.target.value)} className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="supportPhone">Phone</label>
            <input
              id="supportPhone" value={settings.supportPhone}
              onChange={(e) => set('supportPhone', e.target.value)} className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="whatsapp">WhatsApp number</label>
            <input
              id="whatsapp" value={settings.whatsappNumber}
              onChange={(e) => set('whatsappNumber', e.target.value)} className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="returnDays">Returns accepted for (days)</label>
            <input
              id="returnDays" type="number" min="0" max="90" value={settings.returnWindowDays}
              onChange={(e) => set('returnWindowDays', Number.parseInt(e.target.value, 10) || 0)}
              className="field"
            />
          </div>
        </div>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-display text-lg">What customers are told about customs</h2>
        <textarea
          rows={3} value={settings.customsDisclaimer}
          onChange={(e) => set('customsDisclaimer', e.target.value)}
          className="field mt-3"
        />
        <p className="mt-1 text-xs text-ink-400">
          Shown at the bottom of every page and again at checkout.
        </p>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <ShieldCheck size={18} className="text-forest-500" /> Payments
        </h2>
        {isDemoMode ? (
          <div className="mt-3 rounded-sm bg-gold-100 p-4 text-sm leading-relaxed text-ink-700">
            <p className="font-medium">Payments are simulated right now.</p>
            <p className="mt-1 text-ink-500">
              Nothing is charged and no money moves. To take real payments you need a
              Chapa merchant account; your developer adds the keys to the server and
              this section will show them as connected.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-forest-500">Chapa is connected and live.</p>
        )}
      </section>

      {isDemoMode && (
        <section className="card mt-5 p-5">
          <h2 className="font-display text-lg">Demo data</h2>
          <p className="mt-1 text-sm text-ink-500">
            Puts the sample catalogue and orders back to how they started. Useful
            before showing someone the shop.
          </p>
          <button
            type="button"
            onClick={() => { resetDemoData(); window.location.reload(); }}
            className="btn-secondary mt-3 py-2 text-sm"
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
