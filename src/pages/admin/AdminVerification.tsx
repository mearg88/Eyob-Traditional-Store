import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, MessageCircle } from 'lucide-react';
import { getData } from '../../lib/data';
import type { MeasurementReview, Order } from '../../lib/types';

const FILTERS: { value: MeasurementReview['status'] | 'open'; label: string }[] = [
  { value: 'open', label: 'Needs checking' },
  { value: 'awaiting_customer_confirmation', label: 'Waiting on customer' },
  { value: 'verified', label: 'Done' },
];

/**
 * The specialist's work queue.
 *
 * Sorted with the flagged sets first, because those are the ones most likely
 * to need a message, and a queue that buries the urgent work behind the
 * routine work is a queue nobody trusts.
 */
export default function AdminVerification() {
  const [reviews, setReviews] = useState<MeasurementReview[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'open' | MeasurementReview['status']>('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getData();
      const [r, o] = await Promise.all([
        data.listMeasurementReviews(filter === 'open' ? undefined : filter),
        data.adminListOrders(),
      ]);
      setReviews(
        filter === 'open'
          ? r.filter((x) => x.status === 'submitted' || x.status === 'under_review')
          : r,
      );
      setOrders(o);
      setLoading(false);
    })();
  }, [filter]);

  const orderFor = (review: MeasurementReview) => orders.find((o) => o.id === review.orderId);

  return (
    <div>
      <h1 className="text-2xl">Measurements</h1>
      <p className="mt-1 text-sm text-ink-400">
        Check every set before anything is cut. Anything that looks wrong is flagged
        for you.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`chip shrink-0 ${filter === f.value ? 'chip-active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 shimmer" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="font-display text-lg">Nothing waiting</p>
          <p className="mt-2 text-sm text-ink-400">
            {filter === 'open'
              ? 'Every set of measurements has been checked.'
              : 'Nothing here right now.'}
          </p>
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-ink-900/8">
          {reviews.map((review) => {
            const order = orderFor(review);
            const errors = review.flags.length;
            return (
              <Link
                key={review.id}
                to={`/admin/measurements/${review.id}`}
                className="block p-4 hover:bg-bone-200/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {order?.items[0]?.designName ?? 'Order'}
                    </p>
                    <p className="font-mono text-xs text-ink-300">
                      {order?.reference}
                    </p>
                  </div>
                  {errors > 0 && (
                    <span className="flex shrink-0 items-center gap-1 bg-gold-100 px-2 py-1 text-[10px] uppercase tracking-wide text-gold-500">
                      <AlertTriangle size={10} />
                      {errors} to check
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-300">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                  {review.contactAttempts.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={11} />
                      {review.contactAttempts.length} contact
                      {review.contactAttempts.length === 1 ? '' : 's'}
                    </span>
                  )}
                  {review.edits.length > 0 && (
                    <span>{review.edits.length} changed</span>
                  )}
                  {review.status === 'awaiting_customer_confirmation' && (
                    <span className="text-clay-600">waiting on the customer</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
