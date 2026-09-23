import { Link } from 'react-router-dom';
import { useSettings } from '../lib/hooks';
import { useTranslation } from '../i18n';

export default function Footer() {
  const settings = useSettings();
  const { t } = useTranslation();

  return (
    <footer className="mt-28 border-t border-ink-900/8">
      <div className="mx-auto grid max-w-content gap-12 px-5 py-16 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl">Eyob Traditional Store</h2>
          <div className="tibeb-rule mt-4 w-20" aria-hidden />
          <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink-400">
            {t('footer.tagline')}
          </p>
        </div>

        <div>
          <h3 className="eyebrow mb-4 text-ink-300">{t('footer.shop')}</h3>
          <ul className="space-y-2.5 text-sm text-ink-400">
            <li><Link to="/shop" className="hover:text-ink-900">{t('nav.all')}</Link></li>
            <li><Link to="/how-to-measure" className="hover:text-ink-900">{t('nav.sizeGuide')}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="eyebrow mb-4 text-ink-300">{t('footer.help')}</h3>
          <ul className="space-y-2.5 text-sm text-ink-400">
            {settings && (
              <>
                <li>
                  <a href={`mailto:${settings.supportEmail}`} className="hover:text-ink-900">
                    {settings.supportEmail}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-ink-900"
                  >
                    WhatsApp
                  </a>
                </li>
                <li className="pt-2 text-xs leading-relaxed text-ink-300">
                  {settings.shopAddress}
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {settings && (
        <div className="border-t border-ink-900/8">
          <p className="mx-auto max-w-content px-5 py-6 text-xs leading-relaxed text-ink-300 sm:px-8">
            {settings.customsDisclaimer}
          </p>
        </div>
      )}
    </footer>
  );
}
