import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Camera, ChevronLeft, Loader2, Printer, Ruler } from 'lucide-react';
import { getData } from '../../lib/data';
import type {
  MeasurementReview, Order, OrderEvent, ProductionStage,
} from '../../lib/types';
import { formatMoney } from '../../lib/pricing';
import { templateById } from '../../lib/measurements';
import { useAuth } from '../../lib/auth';
import { processImage, objectUrl } from '../../lib/images';
import PageSpinner from '../../components/PageSpinner';

const STAGES: { value: ProductionStage; label: string }[] = [
  { value: 'fabric_cut', label: 'Fabric cut' },
  { value: 'sewing', label: 'Sewing' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'quality_check', label: 'Quality check' },
];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const staffEmail = useAuth((s) => s.staffEmail) ?? 'staff';

  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [review, setReview] = useState<MeasurementReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const data = await getData();
    const o = await data.adminGetOrder(id!);
    setOrder(o);
    if (o) {
      setEvents(await data.listOrderEvents(o.id));
      setReview(await data.getMeasurementReviewForOrder(o.id));
    }
  };

  useEffect(() => { void load(); }, [id]);

  if (!order) return <PageSpinner />;

  const setStage = async (stage: ProductionStage) => {
    setBusy(true);
    const data = await getData();
    await data.adminSetOrderStatus(order.id, 'in_production', staffEmail, stage);
    await load();
    setBusy(false);
  };

  const setStatus = async (status: Order['status']) => {
    setBusy(true);
    const data = await getData();
    await data.adminSetOrderStatus(order.id, status, staffEmail);
    await load();
    setBusy(false);
  };

  /** A photograph of the work in progress, sent to the customer's timeline. */
  const addProgressPhoto = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const result = await processImage(files[0]);
      const rendition = result.renditions.find((r) => r.name === 'listing') ?? result.renditions[0];
      const data = await getData();
      await data.adminAddOrderEvent({
        orderId: order.id,
        kind: `stage_${order.productionStage ?? 'sewing'}`,
        photoKey: objectUrl(rendition.blob),
        actorId: staffEmail,
        visibleToCustomer: true,
      });
      await load();
    } finally {
      setUploading(false);
    }
  };

  const verified = review?.status === 'verified';

  return (
    <div>
      <Link to="/admin/orders" className="btn-ghost mb-4 gap-1 px-0 text-xs">
        <ChevronLeft size={15} /> All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">
            {order.shippingAddress?.fullName ?? order.email}
          </h1>
          <p className="font-mono text-sm text-ink-300">{order.reference}</p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-secondary py-2 text-xs">
          <Printer size={14} /> Packing slip
        </button>
      </div>

      {/* Nothing is cut before the measurements are verified, so this is the
          first thing the workshop needs to know. */}
      {!verified && (
        <p className="mt-5 bg-gold-100 p-4 text-sm text-ink-700">
          Measurements are not confirmed yet — do not cut.{' '}
          {review && (
            <Link to={`/admin/measurements/${review.id}`} className="link">
              Check them now
            </Link>
          )}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-display text-lg">Pieces</h2>
            <ul className="mt-4 divide-y divide-ink-900/8">
              {order.items.map((item) => {
                const template = templateById('tmpl-standard');
                return (
                  <li key={item.id} className="py-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.designName}</p>
                        {item.chosenOptions.map((o) => (
                          <p key={o.optionName} className="text-xs text-ink-300">
                            {o.optionName}: {o.choiceLabel}
                          </p>
                        ))}
                      </div>
                      <span className="shrink-0 text-sm">
                        {formatMoney(item.unitAmount * item.quantity, order.currency)}
                      </span>
                    </div>

                    {item.specialRequest && (
                      <p className="mt-3 bg-bone-200 p-3 text-sm italic text-ink-600">
                        “{item.specialRequest}”
                      </p>
                    )}

                    {/* What the workshop cuts to, printed with the order. */}
                    <div className="mt-3 bg-bone-200 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-400">
                        <Ruler size={11} /> Measurements (cm)
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                        {Object.entries(item.measurementSnapshot).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-2">
                            <dt className="truncate text-ink-400">
                              {template?.fields.find((f) => f.key === key)?.label ?? key}
                            </dt>
                            <dd className="tabular font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex justify-between border-t border-ink-900/8 pt-4 font-medium">
              <span>Total</span>
              <span>{formatMoney(order.totalAmount, order.currency)}</span>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg">Progress</h2>
            <p className="mt-1 text-sm text-ink-400">
              The customer sees each of these as you mark them.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {STAGES.map((stage) => (
                <button
                  key={stage.value}
                  type="button"
                  disabled={busy || !verified}
                  onClick={() => setStage(stage.value)}
                  className={`chip ${order.productionStage === stage.value ? 'chip-active' : ''}`}
                >
                  {stage.label}
                </button>
              ))}
            </div>

            <label className="btn-secondary mt-4 cursor-pointer py-2 text-xs">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {uploading ? 'Adding…' : 'Add a photo of the work'}
              <input
                type="file" accept="image/*" className="sr-only"
                onChange={(e) => addProgressPhoto(e.target.files)}
              />
            </label>
            <p className="mt-2 text-xs text-ink-300">
              For a customer abroad who has never seen the workshop, a photograph of
              their own garment being made is the most reassuring thing you can send.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-900/8 pt-4">
              <button
                type="button" disabled={busy} onClick={() => setStatus('ready')}
                className="btn-secondary py-2 text-xs"
              >
                Ready
              </button>
              <button
                type="button" disabled={busy} onClick={() => setStatus('dispatched')}
                className="btn-secondary py-2 text-xs"
              >
                Sent to the customer
              </button>
              <button
                type="button" disabled={busy} onClick={() => setStatus('delivered')}
                className="btn-secondary py-2 text-xs"
              >
                Delivered
              </button>
            </div>
          </section>

          {events.length > 0 && (
            <section className="card p-5">
              <h2 className="font-display text-lg">History</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 text-ink-400">
                    <span className="capitalize">{e.kind.replace(/_/g, ' ')}</span>
                    <span className="shrink-0 text-xs">
                      {new Date(e.at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-display text-lg">
              {order.fulfilment === 'pickup' ? 'Collecting' : 'Deliver to'}
            </h2>
            {order.fulfilment === 'pickup' ? (
              <p className="mt-2 text-sm text-ink-400">From the shop.</p>
            ) : (
              <address className="mt-2 text-sm not-italic leading-relaxed text-ink-400">
                {order.shippingAddress?.fullName}<br />
                {order.shippingAddress?.line1}<br />
                {order.shippingAddress?.city}
                {order.shippingAddress?.postcode ? `, ${order.shippingAddress.postcode}` : ''}<br />
                {order.shippingAddress?.countryCode}
              </address>
            )}
            <p className="mt-3 text-sm">
              <a href={`tel:${order.phone}`} className="text-clay-600">{order.phone}</a>
            </p>
            <p className="text-sm">
              <a href={`mailto:${order.email}`} className="text-clay-600">{order.email}</a>
            </p>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg">Promised</h2>
            <p className="mt-2 text-sm">
              {new Date(order.promisedDate).toLocaleDateString(undefined, {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            {order.pausedDays > 0 && (
              <p className="mt-1 text-xs text-ink-300">
                Plus {order.pausedDays} day{order.pausedDays === 1 ? '' : 's'} paused while
                waiting on the customer.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
