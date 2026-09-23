import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3, Coins, FolderTree, LogOut, Settings, Shirt,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ROLES, can } from '../../lib/permissions';
import type { Permission } from '../../lib/types';

const NAV: { to: string; label: string; icon: typeof Shirt; end?: boolean; needs?: Permission }[] = [
  { to: '/admin', label: 'Today', icon: BarChart3, end: true },
  { to: '/admin/designs', label: 'Designs', icon: Shirt, needs: 'designs.read' },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, needs: 'designs.write' },
  { to: '/admin/pricing', label: 'Pricing', icon: Coins, needs: 'prices.read' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, needs: 'settings.write' },
];

/**
 * Mobile-first by requirement: the shop is run from a phone. Navigation is a
 * bottom bar within thumb reach on small screens, and only becomes a sidebar
 * once there is room for one.
 */
export default function AdminLayout() {
  const staffRole = useAuth((s) => s.staffRole);
  const staffEmail = useAuth((s) => s.staffEmail);
  const signOutStaff = useAuth((s) => s.signOutStaff);

  const visible = NAV.filter((item) => !item.needs || can(staffRole, item.needs));

  return (
    <div className="min-h-screen bg-bone-100 pb-20 lg:flex lg:pb-0">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-ink-900/8 bg-bone-50 lg:flex">
        <div className="p-5">
          <Link to="/" className="font-display text-xl">Eyob</Link>
          <p className="mt-0.5 text-[10px] uppercase tracking-eyebrow text-ink-300">Admin</p>
        </div>
        <nav className="px-3">
          {visible.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `mb-0.5 flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors ${
                  isActive ? 'bg-ink-900 text-bone-50' : 'text-ink-400 hover:bg-bone-200'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <p className="px-3 py-1 text-xs text-ink-300">{staffEmail}</p>
          <p className="px-3 pb-2 text-[10px] uppercase tracking-wider text-ink-300">
            {staffRole ? ROLES[staffRole].label : ''}
          </p>
          <button type="button" onClick={signOutStaff} className="btn-ghost w-full justify-start gap-3 text-xs">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b border-ink-900/8 bg-bone-50 px-5 lg:hidden">
          <Link to="/" className="font-display text-lg">Eyob Admin</Link>
          <button type="button" onClick={signOutStaff} className="btn-ghost" aria-label="Sign out">
            <LogOut size={17} />
          </button>
        </header>

        <main className="mx-auto max-w-5xl p-5 sm:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-900/10 bg-bone-50 lg:hidden">
        {visible.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                isActive ? 'text-clay-600' : 'text-ink-300'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
