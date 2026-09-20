import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getData } from '../../lib/data';
import type { Order, OrderStatus } from '../../lib/types';
import { formatMoney } from '../../lib/pricing';

const FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'To pack' },
  { value: 'in_production', label: 'On the loom' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'pending_payment', label: 'Unpaid' },
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

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
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
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-sm shimmer" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="font-display text-lg">No orders here</p>
          <p className="mt-1 text-sm text-ink-500">Try a different filter.</p>
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-ink-900/8">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/admin/orders/${order.id}`}
              className="flex items-center gap-3 p-4 hover:bg-cotton-200/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{order.shippingAddress.fullName}</p>
                <p className="font-mono text-xs text-ink-400">{order.reference}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {order.items.length} {order.items.length === 1 ? 'piece' : 'pieces'} ·{' '}
                  {order.shippingAddress.countryCode}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-medium">{formatMoney(order.totalAmount, order.currency)}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    order.status === 'paid'
                      ? 'bg-forest-100 text-forest-700'
                      : order.status === 'pending_payment'
                        ? 'bg-gold-100 text-gold-500'
                        : 'bg-cotton-200 text-ink-500'
                  }`}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
