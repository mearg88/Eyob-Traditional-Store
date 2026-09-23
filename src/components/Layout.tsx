import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTranslation } from '../i18n';
import { useCategories } from '../lib/hooks';
import CurrencySwitcher from './CurrencySwitcher';
import DemoBanner from './DemoBanner';
import Footer from './Footer';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useStore((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const categories = useCategories();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />

      <header className="sticky top-0 z-40 border-b border-ink-900/8 bg-bone-100/92 backdrop-blur-sm">
        <div className="mx-auto flex h-[72px] max-w-content items-center gap-4 px-5 sm:px-8">
          <button
            type="button"
            className="btn-ghost -ml-3 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? t('common.close') : t('nav.menu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="shrink-0">
            <span className="font-display text-2xl tracking-tight">Eyob</span>
            <span className="ml-2 hidden text-[10px] uppercase tracking-eyebrow text-ink-300 sm:inline">
              Traditional
            </span>
          </Link>

          <nav className="ml-10 hidden items-center gap-7 lg:flex">
            {categories.slice(0, 5).map((c) => (
              <NavLink
                key={c.id}
                to={`/shop/${c.slug}`}
                className={({ isActive }) =>
                  `text-[13px] transition-colors ${
                    isActive ? 'text-clay-600' : 'text-ink-400 hover:text-ink-900'
                  }`
                }
              >
                {c.name}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link to="/shop" className="btn-ghost" aria-label={t('common.search')}>
              <Search size={18} />
            </Link>
            <CurrencySwitcher />
            <Link
              to="/cart"
              className="btn-ghost relative"
              aria-label={`${t('nav.cart')}, ${count}`}
            >
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute right-1 top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-clay-500 px-1 text-[9px] font-semibold text-bone-50">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-ink-900/8 bg-bone-50 lg:hidden">
            <ul className="mx-auto max-w-content px-5 py-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/shop/${c.slug}`}
                    className="block border-b border-ink-900/6 py-3.5 text-ink-700"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/how-to-measure" className="block py-3.5 text-ink-400">
                  {t('nav.sizeGuide')}
                </Link>
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
