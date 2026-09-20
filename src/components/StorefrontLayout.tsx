import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useCatalogue } from '../lib/useCatalogue';
import CurrencySwitcher from './CurrencySwitcher';
import DemoBanner from './DemoBanner';
import Footer from './Footer';

export default function StorefrontLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = useStore((s) => s.lines.length);
  const { categories } = useCatalogue();
  const location = useLocation();

  // Close the mobile drawer on navigation, and return focus to the top of the
  // page so screen-reader users aren't left where the old page was.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />

      <header className="sticky top-0 z-40 border-b border-ink-900/8 bg-cotton-100/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-content items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="btn-ghost -ml-2 px-2 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="flex shrink-0 items-baseline gap-2">
            <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Eyob
            </span>
            <span className="hidden text-[11px] uppercase tracking-[0.2em] text-ink-400 sm:inline">
              Traditional Store
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {categories.slice(0, 5).map((c) => (
              <NavLink
                key={c.id}
                to={`/shop/${c.slug}`}
                className={({ isActive }) =>
                  `rounded-sm px-3 py-2 text-sm transition-colors ${
                    isActive ? 'text-clay-600' : 'text-ink-500 hover:text-ink-900'
                  }`
                }
              >
                {c.name}
              </NavLink>
            ))}
            <NavLink
              to="/shop"
              className="rounded-sm px-3 py-2 text-sm text-ink-500 transition-colors hover:text-ink-900"
            >
              All
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link to="/shop" className="btn-ghost px-2" aria-label="Search the collection">
              <Search size={19} />
            </Link>
            <CurrencySwitcher />
            <Link to="/cart" className="btn-ghost relative px-2" aria-label={`Cart, ${cartCount} items`}>
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span className="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-semibold text-cotton-50">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="tibeb-band tibeb-band-sm" aria-hidden />

        {menuOpen && (
          <nav className="border-t border-ink-900/8 bg-cotton-50 lg:hidden">
            <ul className="mx-auto max-w-content px-4 py-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/shop/${c.slug}`}
                    className="block border-b border-ink-900/5 py-3 text-ink-700"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/size-guide" className="block py-3 text-ink-500">Size guide</Link>
              </li>
              <li>
                <Link to="/track" className="block py-3 text-ink-500">Track an order</Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
