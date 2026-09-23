import { Link, useRouteError } from 'react-router-dom';
import { translate } from '../i18n';

/**
 * Non-technical people see this page, so it says what happened and what to do.
 * The stack trace goes to the console for whoever is debugging, never to the
 * screen.
 */
export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="tibeb-rule w-32" aria-hidden />
      <h1 className="mt-10 text-display-sm">{translate('en', 'common.somethingWentWrong')}</h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-400">
        {translate('en', 'common.somethingWentWrongBody')}
      </p>
      <div className="mt-10 flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="btn-primary">
          {translate('en', 'common.tryAgain')}
        </button>
        <Link to="/" className="btn-secondary">{translate('en', 'nav.collection')}</Link>
      </div>
    </div>
  );
}
