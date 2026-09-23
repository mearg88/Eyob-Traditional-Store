import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useTranslation } from '../../i18n';
import { isDemoMode } from '../../lib/data';

export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const signIn = useAuth((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Where to go afterwards — set when a customer was sent here mid-checkout.
  const next = params.get('next') ?? '/account';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.ok) navigate(next);
    else setError(result.message);
  };

  return (
    <div className="mx-auto max-w-sm px-5 py-20 sm:px-8">
      <h1 className="text-display-sm">{t('account.signInTitle')}</h1>

      {isDemoMode && (
        <p className="mt-5 bg-bone-200 p-3 text-xs leading-relaxed text-ink-500">
          <strong className="font-medium">Demo.</strong> No accounts exist yet, so any
          email and any password will sign you in.
        </p>
      )}

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <label className="field-label" htmlFor="email">{t('checkout.email')}</label>
          <input
            id="email" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="password">{t('account.password')}</label>
          <input
            id="password" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>

        {error && <p className="bg-clay-50 p-3 text-sm text-clay-700">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? t('common.loading') : t('account.signInTitle')}
        </button>
      </form>

      <p className="mt-8 text-sm text-ink-400">
        {t('account.signUpPrompt')}{' '}
        <Link to={`/account/join${params.get('next') ? `?next=${params.get('next')}` : ''}`} className="link">
          {t('account.signUpTitle')}
        </Link>
      </p>
    </div>
  );
}
