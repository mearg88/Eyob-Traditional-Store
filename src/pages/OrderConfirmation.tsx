import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Mail, Package } from 'lucide-react';
import { getData } from '../lib/data';
import type { Order } from '../lib/types';
import { formatMoney } from '../lib/pricing';
import PageSpinner from '../components/PageSpinner';

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending_payment: {
    title: 'Waiting for payment',
    body: 'We have not received confirmation from the payment provider yet. This can take a minute. You do not need to pay again.',
  },
  paid: {
    title: 'Payment received',
    body: 'Thank you. We are preparing your parcel and will email you when it ships.',
  },
  in_production: {
    title: 'On the loom',
    body: 'Your payment has been received and weaving has begun. We will email you when it is ready to ship.',
  },
  ready_to_ship: { title: 'Ready to ship', body: 'Your parcel is packed and leaving us shortly.' },
  shipped: { title: 'On its way', body: 'Your parcel has left Addis Ababa.' },
  delivered: { title: 'Delivered', body: 'We hope you love it.' },
  cancelled: { title: 'Cancelled', body: 'This order was cancelled. Nothing has been charged.' },
  refunded: { title: 'Refunded', body: 'This order has been refunded.' },
};

export default function OrderConfirmation() {
  const { reference } = useParams();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getData();
      const found = await data.getOrderByReference(reference!, email);
      if (!cancelled) { setOrder(found); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [reference, email]);

  if (loading) return <PageSpinner />;

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl">We could not find that order</h1>
        <p className="mt-3 text-sm text-ink-500">
          Check the reference and the email address you used. If you have just paid
          and it is not showing yet, give it a minute and refresh.
        </p>
        <Link to="/track" className="btn-primary mt-6">Track an order</Link>
      </div>
    );
  }

  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.paid;
  const madeToOrder = order.items.some((i) => i.kind === 'made_to_order');

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        {order.status === 'pending_payment' ? (
          <Clock size={44} className="mx-auto text-gold-400" />
        ) : (
          <CheckCircle2 size={44} className="mx-auto text-forest-500" />
        )}
        <h1 className="mt-5 text-3xl">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">{copy.body}</p>
        <p className="mt-5 inline-block rounded-sm bg-cotton-200 px-4 py-2 font-mono text-sm">
          {order.reference}
        </p>
      </div>

      <div className="card mt-10 p-6">
        <h2 className="font-display text-lg">What you ordered</h2>
        <ul className="mt-4 divide-y divide-ink-900/8">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.productName}</p>
                {item.kind === 'made_to_order' && (
                  <p className="text-xs text-forest-500">Woven to your measurements</p>
                )}
              </div>
              <span className="shrink-0 text-sm">
                {formatMoney(item.unitAmount * item.quantity, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-ink-900/8 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">Subtotal</dt>
            <dd>{formatMoney(order.subtotalAmount, order.currency)}</dd>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-forest-500">
              <dt>Discount</dt>
              <dd>−{formatMoney(order.discountAmount, order.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-500">Shipping</dt>
            <dd>{formatMoney(order.shippingAmount, order.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink-900/8 pt-2 font-medium">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <Package size={18} className="text-clay-400" />
          <h3 className="mt-2 font-medium">Shipping to</h3>
          <address className="mt-1 text-sm not-italic leading-relaxed text-ink-500">
            {order.shippingAddress.fullName}<br />
            {order.shippingAddress.line1}<br />
            {order.shippingAddress.city}
            {order.shippingAddress.postcode ? `, ${order.shippingAddress.postcode}` : ''}<br />
            {order.shippingAddress.countryCode}
          </address>
          {order.trackingNumber && (
            <p className="mt-3 text-sm">
              <span className="text-ink-400">Tracking: </span>
              <span className="font-mono">{order.trackingNumber}</span>
            </p>
          )}
        </div>

        <div className="card p-5">
          <Mail size={18} className="text-clay-400" />
          <h3 className="mt-2 font-medium">We emailed you</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            A copy of this went to {order.email}. If it has not arrived, check your
            spam folder.
          </p>
          {madeToOrder && (
            <p className="mt-2 text-xs text-forest-500">
              We will be in touch if the weaver needs to check anything about your
              measurements.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link to="/shop" className="btn-secondary">Continue browsing</Link>
      </div>
    </div>
  );
}
