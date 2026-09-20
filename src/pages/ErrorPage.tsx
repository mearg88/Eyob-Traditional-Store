import { Link, useRouteError } from 'react-router-dom';

/**
 * Non-technical people see this page, so it says what happened and what to do.
 * The stack trace goes to the console for whoever is debugging, never to the
 * screen.
 */
export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="tibeb-band w-40" aria-hidden />
      <h1 className="mt-8 text-3xl">Something went wrong on our side</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        This page could not be loaded. It is not something you did. Try again in a
        moment, or go back to the collection.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="btn-primary">
          Try again
        </button>
        <Link to="/" className="btn-secondary">Back to the shop</Link>
      </div>
    </div>
  );
}
