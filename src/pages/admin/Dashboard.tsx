import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Globe, MapPin, TrendingUp } from 'lucide-react';
import { getData } from '../../lib/data';
import type { Order, Product } from '../../lib/types';
import { formatMoney } from '../../lib/pricing';

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getData();
      const [o, p] = await Promise.all([data.adminListOrders(), data.adminListProducts()]);
      setOrders(o);
      setProducts(p);
      setLoading(false);
    })();
  }, []);

  const paid = orders.filter((o) => !['pending_payment', 'cancelled'].includes(o.status));

  // Totals are grouped by currency rather than summed, because adding birr to
  // dollars would produce a number that means nothing.
  const byCurrency = paid.reduce<Record<string, number>>((acc, o) => {
    acc[o.currency] = (acc[o.currency] ?? 0) + o.totalAmount;
    return acc;
  }, {});

  const localCount = paid.filter((o) => o.tier === 'local').length;
  const intlCount = paid.filter((o) => o.tier === 'international').length;

  const needsAttention = orders.filter((o) =>
    ['paid', 'in_production', 'ready_to_ship'].includes(o.status),
  );
  const available = products.filter((p) => p.status === 'available').length;
  const lowStock = available < 5;

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-24 rounded-sm shimmer" />
    ))}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl">Today</h1>
      <p className="mt-1 text-sm text-ink-500">
        {needsAttention.length === 0
          ? 'Nothing needs your attention right now.'
          : `${needsAttention.length} ${needsAttention.length === 1 ? 'order needs' : 'orders need'} attention.`}
      </p>

      {lowStock && (
        <div className="mt-5 flex items-start gap-3 rounded-sm border border-gold-200 bg-gold-100 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-gold-500" />
          <div>
            <p className="text-sm font-medium">Only {available} pieces are available to buy</p>
            <p className="mt-0.5 text-sm text-ink-500">
              Customers cannot buy what is not listed. Add the pieces you have ready.
            </p>
            <Link to="/admin/products/new" className="btn-secondary mt-3 py-2 text-sm">
              Add a piece
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <TrendingUp size={18} className="text-clay-400" />
          <p className="mt-2 text-xs uppercase tracking-wider text-ink-400">Sales</p>
          {Object.keys(byCurrency).length === 0 ? (
            <p className="mt-1 text-2xl font-medium">—</p>
          ) : (
            Object.entries(byCurrency).map(([code, amount]) => (
              <p key={code} className="mt-1 text-xl font-medium">
                {formatMoney(amount, code as 'USD')}
              </p>
            ))
          )}
          <p className="mt-1 text-xs text-ink-400">{paid.length} paid orders</p>
        </div>

        <div className="card p-5">
          <MapPin size={18} className="text-forest-500" />
          <p className="mt-2 text-xs uppercase tracking-wider text-ink-400">Inside Ethiopia</p>
          <p className="mt-1 text-2xl font-medium">{localCount}</p>
          <p className="mt-1 text-xs text-ink-400">orders</p>
        </div>

        <div className="card p-5">
          <Globe size={18} className="text-clay-400" />
          <p className="mt-2 text-xs uppercase tracking-wider text-ink-400">Abroad</p>
          <p className="mt-1 text-2xl font-medium">{intlCount}</p>
          <p className="mt-1 text-xs text-ink-400">orders</p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm text-ink-500 hover:text-clay-600">See all</Link>
        </div>

        {orders.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-display text-lg">No orders yet</p>
            <p className="mt-1 text-sm text-ink-500">
              When someone buys, the order appears here and you will get a message.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-ink-900/8">
            {orders.slice(0, 6).map((order) => (
              <Link
                key={order.id}
                to={`/admin/orders/${order.id}`}
                className="flex items-center gap-3 p-4 hover:bg-cotton-200/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{order.shippingAddress.fullName}</p>
                  <p className="font-mono text-xs text-ink-400">{order.reference}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatMoney(order.totalAmount, order.currency)}
                  </p>
                  <p className="text-xs capitalize text-ink-400">
                    {order.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl">Your shop</h2>
        <div className="card grid grid-cols-3 divide-x divide-ink-900/8">
          <div className="p-4 text-center">
            <p className="text-xl font-medium">{available}</p>
            <p className="text-xs text-ink-400">available</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xl font-medium">{products.filter((p) => p.status === 'sold').length}</p>
            <p className="text-xs text-ink-400">sold</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xl font-medium">
              {products.filter((p) => p.kind === 'made_to_order').length}
            </p>
            <p className="text-xs text-ink-400">made to order</p>
          </div>
        </div>
      </section>
    </div>
  );
}
