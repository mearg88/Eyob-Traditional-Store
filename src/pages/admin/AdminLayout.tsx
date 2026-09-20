import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  BarChart3, LogOut, Package, Percent, Settings, ShoppingCart, Truck,
} from 'lucide-react';
import { useAdmin } from '../../lib/adminAuth';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/shipping', label: 'Shipping', icon: Truck },
  { to: '/admin/promos', label: 'Discounts', icon: Percent },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

/**
 * Mobile-first by requirement: the owner runs the shop from a phone. The
 * navigation is a bottom bar on small screens — thumb-reachable — and only
 * becomes a sidebar once there is room for one.
 */
export default function AdminLayout() {
  const signOut = useAdmin((s) => s.signOut);
  const email = useAdmin((s) => s.email);

  return (
    <div className="min-h-screen bg-cotton-100 pb-20 lg:flex lg:pb-0">
      <aside className="hidden w-60 shrink-0 border-r border-ink-900/8 bg-cotton-50 lg:block">
        <div className="p-5">
          <Link to="/" className="font-display text-xl">Eyob</Link>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-ink-400">Admin</p>
        </div>
        <nav className="px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `mb-0.5 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-clay-500 text-cotton-50' : 'text-ink-500 hover:bg-cotton-200'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <p className="px-3 py-2 text-xs text-ink-400">{email}</p>
          <button type="button" onClick={signOut} className="btn-ghost w-full justify-start gap-3 text-sm">
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b border-ink-900/8 bg-cotton-50 px-4 lg:hidden">
          <Link to="/" className="font-display text-lg">Eyob Admin</Link>
          <button type="button" onClick={signOut} className="btn-ghost px-2" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </header>

        <main className="mx-auto max-w-5xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-900/10 bg-cotton-50 lg:hidden">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                isActive ? 'text-clay-600' : 'text-ink-400'
              }`
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
