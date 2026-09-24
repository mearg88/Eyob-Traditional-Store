import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, Check, ChevronLeft, History, Mail, MessageCircle, Phone, Send,
} from 'lucide-react';
import { getData } from '../../lib/data';
import type {
  ContactChannel, MeasurementReview, MeasurementSet, Order,
} from '../../lib/types';
import { templateById, toDisplay } from '../../lib/measurements';
import { useStore } from '../../lib/store';
import { useAuth } from '../../lib/auth';
import PageSpinner from '../../components/PageSpinner';

const CHANNELS: { value: ContactChannel; label: string; icon: typeof Phone }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
];

/**
 * One set of measurements, with everything the specialist needs in one place:
 * the numbers, what the automatic checks flagged, the customer's contact
 * details, and the full history of every change.
 *
 * Editing a value always sends it back to the customer to confirm. That is not
 * a courtesy — it is the record that protects the shop when someone says the
 * garment does not fit.
 */
export default function AdminVerificationDetail() {
  const { id } = useParams();
  const unit = useStore((s) => s.unit);
  const staffEmail = useAuth((s) => s.staffEmail) ?? 'staff';

  const [review, setReview] = useState<MeasurementReview | null>(null);
  const [set, setSet] = useState<MeasurementSet | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await getData();
    const r = await data.getMeasurementReview(id!);
    setReview(r);
    if (r) {
      const o = await data.adminGetOrder(r.orderId);
      setOrder(o);
      if (o) {
        const sets = await data.listMeasurementSets(o.customerId);
        setSet(sets.find((m) => m.id === r.measurementSetId) ?? null);
      }
    }
  };

  useEffect(() => { void load(); }, [id]);

  if (!review) return <PageSpinner />;

  const template = set ? templateById(set.templateId) : undefined;

  const saveEdit = async (fieldKey: string) => {
    const parsed = Number.parseFloat(editValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setBusy(true);
    const data = await getData();
    // Stored in centimetres whatever the specialist is looking at.
    const cm = unit === 'cm' ? parsed : Math.round(parsed * 2.54 * 10) / 10;
    await data.editMeasurement({
      reviewId: review.id,
      fieldKey,
      newValueCm: cm,
      editedBy: staffEmail,
      reason: editReason || 'Corrected after speaking to the customer',
    });
    setEditing(null);
    setEditValue('');
    setEditReason('');
    await load();
    setBusy(false);
  };

  const logContact = async (channel: ContactChannel, reached: boolean) => {
    setBusy(true);
    const data = await getData();
    await data.logContactAttempt({
      reviewId: review.id, channel, staffId: staffEmail, reached,
    });
    await load();
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true);
    const data = await getData();
    await data.setMeasurementReviewStatus(review.id, 'verified', staffEmail);
    await load();
    setBusy(false);
  };

  const waitingOnCustomer = review.status === 'awaiting_customer_confirmation';

  return (
    <div>
      <Link to="/admin/measurements" className="btn-ghost mb-4 gap-1 px-0 text-xs">
        <ChevronLeft size={15} /> Queue
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{order?.items[0]?.designName ?? 'Measurements'}</h1>
          <p className="font-mono text-sm text-ink-300">{order?.reference}</p>
        </div>
        <span className="bg-bone-300 px-2.5 py-1 text-[10px] uppercase tracking-wide text-ink-500">
          {review.status.replace(/_/g, ' ')}
        </span>
      </div>

      {review.flags.length > 0 && (
        <div className="mt-6 bg-gold-100 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <AlertTriangle size={15} className="text-gold-500" />
            Worth checking before you cut
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-500">
            {review.flags.map((flag) => <li key={flag}>· {flag}</li>)}
          </ul>
        </div>
      )}

      {waitingOnCustomer && (
        <p className="mt-6 bg-bone-200 p-4 text-sm text-ink-500">
          You have changed a measurement, so the customer has been asked to confirm it.
          Nothing is cut until they do.
        </p>
      )}

      {/* Contact details, front and centre: messaging is the first move. */}
      {order && (
        <section className="card mt-6 p-5">
          <h2 className="font-display text-lg">Contact the customer</h2>
          <p className="mt-1 text-sm text-ink-400">{order.email} · {order.phone}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noreferrer noopener"
              className="btn-secondary py-2 text-xs"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
            <a href={`mailto:${order.email}`} className="btn-secondary py-2 text-xs">
              <Mail size={14} /> Email
            </a>
            <a href={`tel:${order.phone}`} className="btn-secondary py-2 text-xs">
              <Phone size={14} /> Call
            </a>
          </div>

          <p className="mt-5 field-label">Record what happened</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(({ value, label, icon: Icon }) => (
              <div key={value} className="flex">
                <button
                  type="button" disabled={busy}
                  onClick={() => logContact(value, true)}
                  className="chip rounded-none"
                >
                  <Icon size={12} /> {label} — reached
                </button>
              </div>
            ))}
            <button
              type="button" disabled={busy}
              onClick={() => logContact('phone', false)}
              className="chip"
            >
              No answer
            </button>
          </div>

          {review.contactAttempts.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-xs text-ink-400">
              {review.contactAttempts.map((a) => (
                <li key={a.id}>
                  {new Date(a.attemptedAt).toLocaleString()} — {a.channel},{' '}
                  {a.reached ? 'reached' : 'no answer'}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* The measurements themselves */}
      <section className="card mt-5 p-5">
        <h2 className="font-display text-lg">What the customer sent</h2>
        {set?.fallback?.heightCm && (
          <p className="mt-2 bg-bone-200 p-3 text-sm text-ink-500">
            The customer could not measure. They gave their height as{' '}
            {set.fallback.heightCm}cm and their usual size as{' '}
            {set.fallback.usualSize}. You will need to work these out with them.
          </p>
        )}

        <dl className="mt-4 divide-y divide-ink-900/8">
          {template?.fields.map((field) => {
            const value = set?.values[field.key];
            const wasEdited = review.edits.some((e) => e.fieldKey === field.key);
            const flagged = review.flags.some((f) => f.includes(field.label));

            return (
              <div key={field.key} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm">
                    {field.label}
                    {wasEdited && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-clay-500">
                        changed
                      </span>
                    )}
                  </dt>
                  <dd className="flex items-center gap-3">
                    <span className={`tabular text-sm ${flagged ? 'text-gold-500' : ''}`}>
                      {value !== undefined ? `${toDisplay(value, unit)} ${unit}` : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(field.key);
                        setEditValue(value !== undefined ? String(toDisplay(value, unit)) : '');
                      }}
                      className="text-xs text-clay-600 underline underline-offset-2"
                    >
                      change
                    </button>
                  </dd>
                </div>

                {editing === field.key && (
                  <div className="mt-3 bg-bone-200 p-3">
                    <div className="flex gap-2">
                      <input
                        type="number" step="0.5" min="1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="field-boxed max-w-[110px] py-1.5 text-sm"
                        autoFocus
                      />
                      <input
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Why? e.g. re-measured on the call"
                        className="field-boxed flex-1 py-1.5 text-sm"
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button" disabled={busy}
                        onClick={() => saveEdit(field.key)}
                        className="btn-primary py-1.5 text-xs"
                      >
                        Save change
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="btn-ghost py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-ink-400">
                      The customer will be asked to confirm this before anything is cut.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </dl>
      </section>

      {/* The audit trail. Append-only, and the customer can see it too. */}
      {review.edits.length > 0 && (
        <section className="card mt-5 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <History size={16} className="text-clay-400" /> Every change
          </h2>
          <p className="mt-1 text-xs text-ink-300">
            This record cannot be edited or deleted, by anyone. It is what settles a
            disagreement about fit later.
          </p>
          <ul className="mt-4 space-y-3">
            {review.edits.map((edit) => (
              <li key={edit.id} className="border-l-2 border-clay-200 pl-3 text-sm">
                <p>
                  <strong className="font-medium">{edit.fieldKey}</strong>{' '}
                  {edit.oldValueCm ?? '—'}cm → {edit.newValueCm}cm
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {edit.editedBy} · {new Date(edit.editedAt).toLocaleString()}
                </p>
                {edit.reason && <p className="mt-0.5 text-xs text-ink-400">{edit.reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {review.status !== 'verified' && (
        <div className="sticky bottom-20 mt-6 lg:bottom-4">
          <button
            type="button"
            disabled={busy || waitingOnCustomer}
            onClick={verify}
            className="btn-primary w-full"
          >
            <Check size={16} />
            These are right — start making it
          </button>
          {waitingOnCustomer && (
            <p className="mt-2 text-center text-xs text-ink-300">
              Waiting for the customer to confirm your change first.
            </p>
          )}
        </div>
      )}

      {review.status === 'verified' && (
        <p className="mt-6 flex items-center gap-2 bg-sage-100 p-4 text-sm text-sage-700">
          <Check size={16} />
          Verified{review.verifiedAt && ` on ${new Date(review.verifiedAt).toLocaleDateString()}`}.
          The workshop can cut.
        </p>
      )}
    </div>
  );
}
