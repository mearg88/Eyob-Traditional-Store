import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAdmin } from '../../lib/adminAuth';
import { isDemoMode } from '../../lib/data';

export default function AdminLogin() {
  const signIn = useAdmin((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) setError(result.message ?? 'Could not sign in.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cotton-100 px-4">
      <div className="w-full max-w-sm">
        <div className="tibeb-band mb-8" aria-hidden />
        <h1 className="font-display text-3xl">Shop admin</h1>
        <p className="mt-2 text-sm text-ink-500">Sign in to manage your store.</p>

        {isDemoMode && (
          <p className="mt-5 flex items-start gap-2 rounded-sm bg-gold-100 p-3 text-xs leading-relaxed text-ink-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold-500" />
            <span>
              <strong className="font-semibold">Demo mode.</strong> There is no real
              account system yet, so any email and any password will let you in.
              Connecting Supabase turns on proper sign-in.
            </span>
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field" autoComplete="username"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field" autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-sm bg-clay-50 p-3 text-sm text-clay-700">{error}</p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Link to="/" className="mt-6 block text-center text-sm text-ink-400 hover:text-clay-600">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
