import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Clock, MessageCircle, Package } from 'lucide-react';
import { getData } from '../lib/data';
import type {
  MeasurementReview, Order, OrderEvent, StoreSettings,
} from '../lib/types';
import { formatMoney } from '../lib/pricing';
import { useTranslation } from '../i18n';
import PageSpinner from '../components/PageSpinner';
import Photo from '../components/Photo';

const STAGES = [
  { kind: 'order_placed', label: 'Order placed' },
  { kind: 'payment_received', label: 'Payment received' },
  { kind: 'measurements_verified', label: 'Measurements confirmed' },
  { kind: 'stage_fabric_cut', label: 'Fabric cut' },
  { kind: 'stage_sewing', label: 'Sewing' },
  { kind: 'stage_embroidery', label: 'Embroidery' },
  { kind: 'stage_finishing', label: 'Finishing' },
  { kind: 'stage_quality_check', label: 'Quality check' },
  { kind: 'status_ready', label: 'Ready' },
  { kind: 'status_dispatched', label: 'On its way' },
  { kind: 'status_delivered', label: 'Delivered' },
];

export default function OrderPage() {
  const { reference } = useParams();
  const { t } = useTranslation();

  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [review, setReview] = useState<MeasurementReview | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getData();
      const o = await data.getOrder(reference!);
      if (cancelled) return;
      setOrder(o);
      if (o) {
        const [e, r, s] = await Promise.all([
          data.listOrderEvents(o.id),
          data.getMeasurementReviewForOrder(o.id),
          data.getSettings(),
        ]);
        if (!cancelled) { setEvents(e); setReview(r); setSettings(s); }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reference]);

  if (loading) return <PageSpinner />;

  if (!order) {
    return (
      <div className="py-28 text-center">
        <h1 className="text-display-sm">{t('errors.notFound')}</h1>
        <Link to="/account" className="btn-primary mt-8">{t('account.title')}</Link>
      </div>
    );
  }

  const done = new Set(events.map((e) => e.kind));
  const needsConfirmation = review?.status === 'awaiting_customer_confirmation';

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <p className="eyebrow">{t('order.reference')} {order.reference}</p>
      <h1 className="mt-4 text-display-sm">
        {t(`order.status${order.status.split('_').map((w) =>
          w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as never)}
      </h1>

      {/* The one thing that might be waiting on them, first and unmissable. */}
      {needsConfirmation && (
        <div className="mt-8 border-l-2 border-clay-500 bg-clay-50 p-5">
          <h2 className="font-display text-lg">{t('order.confirmMeasurements')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            {t('order.confirmMeasurementsBody')}
          </p>
          <Link to={`/order/${order.reference}/measurements`} className="btn-primary mt-4">
            See what changed
          </Link>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl">{t('order.timeline')}</h2>
        <ol className="mt-5">
          {STAGES.map((stage) => {
            const event = events.find((e) => e.kind === stage.kind);
            const reached = done.has(stage.kind);
            return (
              <li key={stage.kind} className="flex gap-4 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${
                      reached ? 'bg-sage-500 text-bone-50' : 'border border-ink-900/15 bg-bone-100'
                    }`}
                  >
                    {reached && <Check size={11} />}
                  </span>
                  <span className="mt-1 w-px flex-1 bg-ink-900/10 last:hidden" />
                </div>
                <div className="flex-1 pb-1">
                  <p className={`text-sm ${reached ? '' : 'text-ink-300'}`}>{stage.label}</p>
                  {event && (
                    <p className="text-xs text-ink-300">
                      {new Date(event.at).toLocaleDateString()}
                    </p>
                  )}
                  {/* Progress photographs from the workshop. For a customer who
                      has never seen the shop, this is the most reassuring
                      thing on the page. */}
                  {event?.photoKey && (
                    <Photo
                      src={event.photoKey}
                      alt={`${stage.label} photograph`}
                      sizes="200px"
                      className="mt-3 h-40 w-32"
                    />
                  )}
                  {event?.note && (
                    <p className="mt-1 max-w-prose text-xs text-ink-400">{event.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card mt-10 p-6">
        <h2 className="font-display text-lg">What you ordered</h2>
        <ul className="mt-4 divide-y divide-ink-900/8">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <Photo src={item.photoKey} alt="" sizes="56px" className="h-16 w-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{item.designName}</p>
                {item.chosenOptions.map((o) => (
                  <p key={o.optionName} className="text-xs text-ink-300">
                    {o.optionName}: {o.choiceLabel}
                  </p>
                ))}
                {item.specialRequest && (
                  <p className="mt-1 text-xs italic text-ink-400">“{item.specialRequest}”</p>
                )}
              </div>
              <span className="text-sm">
                {formatMoney(item.unitAmount * item.quantity, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-ink-900/8 pt-4 text-sm">
          {order.pickupDiscountAmount > 0 && (
            <div className="flex justify-between text-sage-500">
              <dt>Collecting from the shop</dt>
              <dd>−{formatMoney(order.pickupDiscountAmount, order.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <Clock size={16} className="text-clay-400" />
          <h3 className="mt-2 text-sm font-medium">Expected</h3>
          <p className="mt-1 text-sm text-ink-400">
            {new Date(order.promisedDate).toLocaleDateString(undefined, {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          {order.pausedDays > 0 && (
            <p className="mt-1 text-xs text-ink-300">
              Extended by {order.pausedDays} day{order.pausedDays === 1 ? '' : 's'} while
              we waited to hear back from you.
            </p>
          )}
        </div>

        <div className="card p-5">
          <Package size={16} className="text-clay-400" />
          <h3 className="mt-2 text-sm font-medium">
            {order.fulfilment === 'pickup' ? 'Collecting from' : 'Delivering to'}
          </h3>
          {order.fulfilment === 'pickup' ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-400">
              {settings?.shopAddress}
            </p>
          ) : (
            <address className="mt-1 text-sm not-italic leading-relaxed text-ink-400">
              {order.shippingAddress?.fullName}<br />
              {order.shippingAddress?.line1}<br />
              {order.shippingAddress?.city}, {order.shippingAddress?.countryCode}
            </address>
          )}
        </div>
      </div>

      {settings && (
        <a
          href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
          target="_blank" rel="noreferrer noopener"
          className="btn-secondary mt-8 w-full"
        >
          <MessageCircle size={15} /> Message us about this order
        </a>
      )}
    </div>
  );
}
