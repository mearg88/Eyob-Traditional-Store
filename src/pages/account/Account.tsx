import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ruler, User } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getData } from '../../lib/data';
import type { MeasurementSet } from '../../lib/types';
import { templateById, toDisplay } from '../../lib/measurements';
import { useStore } from '../../lib/store';
import { useTranslation } from '../../i18n';

export default function Account() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const customer = useAuth((s) => s.customer);
  const signOut = useAuth((s) => s.signOut);
  const unit = useStore((s) => s.unit);

  const [sets, setSets] = useState<MeasurementSet[]>([]);

  useEffect(() => {
    if (!customer) {
      navigate('/account/sign-in');
      return;
    }
    let cancelled = false;
    getData()
      .then((d) => d.listMeasurementSets(customer.id))
      .then((s) => { if (!cancelled) setSets(s); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [customer, navigate]);

  if (!customer) return null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-display-sm">{t('account.title')}</h1>
      <p className="mt-2 text-sm text-ink-400">{customer.email}</p>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Ruler size={17} className="text-clay-400" />
          {t('account.measurements')}
        </h2>

        {sets.length === 0 ? (
          <div className="mt-4 border border-dashed border-ink-900/15 p-8 text-center">
            <p className="text-sm text-ink-400">
              No saved measurements yet. They are saved automatically when you order,
              so your next order takes seconds.
            </p>
            <Link to="/how-to-measure" className="btn-secondary mt-5">
              {t('nav.sizeGuide')}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {sets.map((set) => {
              const template = templateById(set.templateId);
              const filled = template
                ? template.fields.filter((f) => set.values[f.key] !== undefined)
                : [];
              return (
                <li key={set.id} className="card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium">{set.name}</h3>
                    <span className="text-xs text-ink-300">{template?.name}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                    {filled.map((f) => (
                      <div key={f.key} className="flex justify-between gap-2">
                        <dt className="text-ink-400">{f.label}</dt>
                        <dd className="tabular">{toDisplay(set.values[f.key]!, unit)} {unit}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <User size={17} className="text-clay-400" />
          {t('account.details')}
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between border-b border-ink-900/8 py-2">
            <dt className="text-ink-400">{t('checkout.fullName')}</dt>
            <dd>{customer.fullName}</dd>
          </div>
          <div className="flex justify-between border-b border-ink-900/8 py-2">
            <dt className="text-ink-400">{t('checkout.email')}</dt>
            <dd>{customer.email}</dd>
          </div>
          {customer.phone && (
            <div className="flex justify-between border-b border-ink-900/8 py-2">
              <dt className="text-ink-400">{t('checkout.phone')}</dt>
              <dd>{customer.phone}</dd>
            </div>
          )}
        </dl>
      </section>

      <button
        type="button"
        onClick={() => { void signOut(); navigate('/'); }}
        className="btn-secondary mt-12"
      >
        {t('nav.signOut')}
      </button>
    </div>
  );
}
