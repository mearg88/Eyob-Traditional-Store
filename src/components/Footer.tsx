import { Link } from 'react-router-dom';
import { useSettings } from '../lib/useCatalogue';

export default function Footer() {
  const settings = useSettings();

  return (
    <footer className="mt-20 border-t border-ink-900/8 bg-cotton-200/60">
      <div className="tibeb-band" aria-hidden />
      <div className="mx-auto grid max-w-content gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl">Eyob Traditional Store</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
            Handwoven Ethiopian clothing from Addis Ababa. Every piece is made on a
            traditional loom by weavers we know by name, and shipped worldwide.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Shop</h3>
          <ul className="space-y-2 text-sm text-ink-500">
            <li><Link to="/shop" className="hover:text-clay-600">All pieces</Link></li>
            <li><Link to="/size-guide" className="hover:text-clay-600">Size guide</Link></li>
            <li><Link to="/track" className="hover:text-clay-600">Track an order</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Help</h3>
          <ul className="space-y-2 text-sm text-ink-500">
            {settings && (
              <>
                <li>
                  <a href={`mailto:${settings.supportEmail}`} className="hover:text-clay-600">
                    {settings.supportEmail}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                    className="hover:text-clay-600"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    WhatsApp us
                  </a>
                </li>
                <li className="pt-1 text-xs text-ink-400">
                  Returns within {settings.returnWindowDays} days
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {settings && (
        <div className="border-t border-ink-900/8">
          <p className="mx-auto max-w-content px-4 py-5 text-xs leading-relaxed text-ink-400 sm:px-6">
            {settings.customsDisclaimer}
          </p>
        </div>
      )}
    </footer>
  );
}
