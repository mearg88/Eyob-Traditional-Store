import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useTranslation } from '../../i18n';

export default function SignUp() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const signUp = useAuth((s) => s.signUp);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = params.get('next') ?? '/account';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signUp({ email, password, fullName, phone });
    setBusy(false);
    if (result.ok) navigate(next);
    else setError(result.message);
  };

  return (
    <div className="mx-auto max-w-sm px-5 py-20 sm:px-8">
      <h1 className="text-display-sm">{t('account.signUpTitle')}</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-400">{t('account.whyAccount')}</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <label className="field-label" htmlFor="name">{t('checkout.fullName')}</label>
          <input
            id="name" required autoComplete="name"
            value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="email">{t('checkout.email')}</label>
          <input
            id="email" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>
        <div>
          {/* Not optional: the tailor contacts every customer about their
              measurements, so an unreachable number stalls the order. */}
          <label className="field-label" htmlFor="phone">{t('checkout.phone')}</label>
          <input
            id="phone" type="tel" required autoComplete="tel"
            value={phone} onChange={(e) => setPhone(e.target.value)}
            className="field" placeholder="+251…"
          />
          <p className="mt-2 text-xs text-ink-300">{t('checkout.phoneHint')}</p>
        </div>
        <div>
          <label className="field-label" htmlFor="password">{t('account.password')}</label>
          <input
            id="password" type="password" required minLength={8} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
          <p className="mt-2 text-xs text-ink-300">{t('account.passwordHint')}</p>
        </div>

        {error && <p className="bg-clay-50 p-3 text-sm text-clay-700">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? t('common.loading') : t('account.signUpTitle')}
        </button>
      </form>

      <p className="mt-8 text-sm text-ink-400">
        {t('account.signInPrompt')}{' '}
        <Link to="/account/sign-in" className="link">{t('account.signInTitle')}</Link>
      </p>
    </div>
  );
}
