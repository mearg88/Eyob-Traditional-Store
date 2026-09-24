import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import { getData } from '../lib/data';
import type { MeasurementReview, Order, StoreSettings } from '../lib/types';
import { toDisplay } from '../lib/measurements';
import { useStore } from '../lib/store';
import { useTranslation } from '../i18n';
import PageSpinner from '../components/PageSpinner';

/**
 * Where the customer approves a change the tailor made after speaking to them.
 *
 * Production cannot start until they do. The page shows what they sent beside
 * what the tailor suggests, because "we changed something" is not consent —
 * seeing the two numbers is.
 */
export default function ConfirmMeasurements() {
  const { reference } = useParams();
  const { t } = useTranslation();
  const unit = useStore((s) => s.unit);

  const [order, setOrder] = useState<Order | null>(null);
  const [review, setReview] = useState<MeasurementReview | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await getData();
    const o = await data.getOrder(reference!);
    setOrder(o);
    if (o) setReview(await data.getMeasurementReviewForOrder(o.id));
    setSettings(await data.getSettings());
    setLoading(false);
  };

  useEffect(() => { void load(); }, [reference]);

  if (loading) return <PageSpinner />;

  if (!order || !review) {
    return (
      <div className="py-28 text-center">
        <h1 className="text-display-sm">{t('errors.notFound')}</h1>
        <Link to="/account" className="btn-primary mt-8">{t('account.title')}</Link>
      </div>
    );
  }

  const confirm = async () => {
    setBusy(true);
    const data = await getData();
    await data.confirmMeasurements(review.id);
    await load();
    setBusy(false);
  };

  // Only the latest change per field matters to the customer; the full history
  // is in the admin.
  const latest = new Map<string, typeof review.edits[number]>();
  for (const edit of review.edits) latest.set(edit.fieldKey, edit);
  const changes = [...latest.values()];

  const done = Boolean(review.customerConfirmedAt);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      {done ? (
        <>
          <Check size={36} className="text-sage-500" />
          <h1 className="mt-5 text-display-sm">Thank you</h1>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-400">
            Your measurements are confirmed. Our tailor will look once more, and then
            your garment goes on the loom.
          </p>
        </>
      ) : (
        <>
          <p className="eyebrow">{order.reference}</p>
          <h1 className="mt-4 text-display-sm">{t('order.confirmMeasurements')}</h1>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-400">
            {t('order.confirmMeasurementsBody')}
          </p>

          {changes.length > 0 && (
            <div className="card mt-10">
              <h2 className="border-b border-ink-900/8 p-5 font-display text-lg">
                {t('order.whatChanged')}
              </h2>
              <ul className="divide-y divide-ink-900/8">
                {changes.map((edit) => (
                  <li key={edit.id} className="p-5">
                    <p className="text-sm font-medium capitalize">
                      {edit.fieldKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-300">
                          {t('order.yourValue')}
                        </p>
                        <p className="tabular mt-0.5 text-ink-400 line-through">
                          {edit.oldValueCm !== undefined
                            ? `${toDisplay(edit.oldValueCm, unit)} ${unit}`
                            : '—'}
                        </p>
                      </div>
                      <ArrowRight size={15} className="text-clay-400" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-300">
                          {t('order.ourValue')}
                        </p>
                        <p className="tabular mt-0.5 font-medium">
                          {toDisplay(edit.newValueCm, unit)} {unit}
                        </p>
                      </div>
                    </div>
                    {edit.reason && (
                      <p className="mt-3 text-xs text-ink-400">{edit.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              type="button" disabled={busy} onClick={confirm}
              className="btn-primary flex-1"
            >
              <Check size={16} /> {t('order.confirmChanges')}
            </button>
            {settings && (
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank" rel="noreferrer noopener"
                className="btn-secondary flex-1"
              >
                <MessageCircle size={16} /> {t('order.queryChanges')}
              </a>
            )}
          </div>

          <p className="mt-6 text-xs leading-relaxed text-ink-300">
            Nothing is cut until you approve. If anything looks wrong, message us
            instead — it is far easier to fix now than after it is woven.
          </p>
        </>
      )}

      <Link to={`/order/${order.reference}`} className="link mt-10 inline-block text-sm">
        See your order
      </Link>
    </div>
  );
}
