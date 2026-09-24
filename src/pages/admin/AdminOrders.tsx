import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getData } from '../../lib/data';
import type { Order, OrderStatus } from '../../lib/types';
import { formatMoney } from '../../lib/pricing';

const FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'measurements_under_review', label: 'To check' },
  { value: 'in_production', label: 'Being made' },
  { value: 'ready', label: 'Ready' },
  { value: 'dispatched', label: 'Sent' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getData();
      setOrders(await data.adminListOrders(filter === 'all' ? undefined : filter));
      setLoading(false);
    })();
  }, [filter]);

  return (
    <div>
      <h1 className="text-2xl">Orders</h1>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value} type="button" onClick={() => setFilter(f.value)}
            className={`chip shrink-0 ${filter === f.value ? 'chip-active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 shimmer" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="font-display text-lg">No orders here</p>
          <p className="mt-2 text-sm text-ink-400">
            {filter === 'all' ? 'When someone orders, it appears here.' : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-ink-900/8">
          {orders.map((order) => (
            <Link
              key={order.id} to={`/admin/orders/${order.id}`}
              className="flex items-center gap-3 p-4 hover:bg-bone-200/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {order.shippingAddress?.fullName ?? order.email}
                </p>
                <p className="font-mono text-xs text-ink-300">{order.reference}</p>
                <p className="mt-1 text-xs text-ink-300">
                  {order.items.length} {order.items.length === 1 ? 'piece' : 'pieces'}
                  {' · '}
                  {order.fulfilment === 'pickup'
                    ? 'collecting'
                    : order.shippingAddress?.countryCode}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm">{formatMoney(order.totalAmount, order.currency)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-300">
                  {order.status.replace(/_/g, ' ')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
