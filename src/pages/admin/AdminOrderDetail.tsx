import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Printer } from 'lucide-react';
import { getData } from '../../lib/data';
import type { Order, OrderStatus, Payment } from '../../lib/types';
import { formatMoney } from '../../lib/pricing';
import { MEASUREMENT_FIELDS } from '../../lib/measurements';
import PageSpinner from '../../components/PageSpinner';

// Phrased as the actions the owner takes, not as database states.
const NEXT_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'in_production', label: 'Started weaving' },
  { status: 'ready_to_ship', label: 'Packed and ready' },
  { status: 'shipped', label: 'Handed to courier' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'cancelled', label: 'Cancel this order' },
];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getData();
      const found = await data.adminGetOrder(id!);
      setOrder(found);
      setTracking(found?.trackingNumber ?? '');
      setCarrier(found?.trackingCarrier ?? '');
      if (found) setPayments(await data.adminListPayments(found.id));
    })();
  }, [id]);

  if (!order) return <PageSpinner />;

  const update = async (status: OrderStatus) => {
    setSaving(true);
    const data = await getData();
    const updated = await data.adminUpdateOrderStatus(order.id, status, {
      trackingNumber: tracking || undefined,
      trackingCarrier: carrier || undefined,
    });
    setOrder({ ...updated });
    setSaving(false);
  };

  return (
    <div>
      <Link to="/admin/orders" className="btn-ghost mb-3 gap-1 px-0 text-sm">
        <ChevronLeft size={16} /> All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{order.shippingAddress.fullName}</h1>
          <p className="font-mono text-sm text-ink-400">{order.reference}</p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-secondary py-2 text-sm">
          <Printer size={15} /> Packing slip
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-display text-lg">Pieces</h2>
            <ul className="mt-3 divide-y divide-ink-900/8">
              {order.items.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-ink-400">
                        {item.kind === 'made_to_order' ? 'Made to order' : 'One of a kind'}
                      </p>
                    </div>
                    <span>{formatMoney(item.unitAmount * item.quantity, order.currency)}</span>
                  </div>

                  {/* What the weaver needs, printed with the order. */}
                  {item.customerMeasurements && (
                    <div className="mt-3 rounded-sm bg-cotton-200 p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">
                        Customer measurements (cm)
                      </p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                        {MEASUREMENT_FIELDS.filter((f) => item.customerMeasurements?.[f.key]).map((f) => (
                          <div key={f.key} className="flex justify-between gap-2">
                            <dt className="text-ink-400">{f.label}</dt>
                            <dd className="font-medium">{item.customerMeasurements![f.key]}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-1.5 border-t border-ink-900/8 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd>{formatMoney(order.subtotalAmount, order.currency)}</dd>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-forest-500">
                  <dt>Discount {order.promoCode ? `(${order.promoCode})` : ''}</dt>
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
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg">Payment</h2>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-ink-400">No payment recorded yet.</p>
            ) : (
              payments.map((p) => (
                <dl key={p.id} className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Status</dt>
                    <dd className="capitalize">{p.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Reference</dt>
                    <dd className="font-mono text-xs">{p.txRef}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Provider</dt>
                    <dd className="capitalize">{p.provider}</dd>
                  </div>
                  {p.paidAt && (
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Paid</dt>
                      <dd>{new Date(p.paidAt).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              ))
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-display text-lg">Where it goes</h2>
            <address className="mt-2 text-sm not-italic leading-relaxed text-ink-500">
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.line1}<br />
              {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
              {order.shippingAddress.city}
              {order.shippingAddress.postcode ? `, ${order.shippingAddress.postcode}` : ''}<br />
              {order.shippingAddress.countryCode}
            </address>
            <p className="mt-2 text-sm">
              <a href={`tel:${order.shippingAddress.phone}`} className="text-clay-600">
                {order.shippingAddress.phone}
              </a>
            </p>
            <p className="text-sm">
              <a href={`mailto:${order.email}`} className="text-clay-600">{order.email}</a>
            </p>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg">Tracking</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="field-label" htmlFor="carrier">Courier</label>
                <input
                  id="carrier" value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="field py-2 text-sm" placeholder="Ethiopian Postal Service"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="tracking">Tracking number</label>
                <input
                  id="tracking" value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  className="field py-2 text-sm font-mono"
                />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg">Mark as</h2>
            <p className="mt-1 text-xs text-ink-400">
              Currently: <span className="capitalize">{order.status.replace(/_/g, ' ')}</span>
            </p>
            <div className="mt-3 space-y-2">
              {NEXT_STEPS.map((step) => (
                <button
                  key={step.status}
                  type="button"
                  disabled={saving || order.status === step.status}
                  onClick={() => update(step.status)}
                  className={`w-full py-2 text-sm ${
                    step.status === 'cancelled' ? 'btn-ghost text-clay-600' : 'btn-secondary'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
