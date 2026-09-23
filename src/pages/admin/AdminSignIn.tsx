import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { isDemoMode } from '../../lib/data';

export default function AdminSignIn() {
  const signInStaff = useAuth((s) => s.signInStaff);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signInStaff(email, password);
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bone-100 px-5">
      <div className="w-full max-w-sm">
        <div className="tibeb-rule mb-10 w-24" aria-hidden />
        <h1 className="font-display text-3xl">Shop admin</h1>
        <p className="mt-2 text-sm text-ink-400">Sign in to manage the shop.</p>

        {isDemoMode && (
          <p className="mt-6 flex items-start gap-2 bg-gold-100 p-3 text-xs leading-relaxed text-ink-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold-500" />
            <span>
              <strong className="font-semibold">Demo.</strong> There is no account system
              yet, so any email and password will let you in, as the owner. Connecting
              Supabase turns on real sign-in and roles.
            </span>
          </p>
        )}

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div>
            <label className="field-label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email" type="email" required autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </div>

          {error && <p className="bg-clay-50 p-3 text-sm text-clay-700">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Link to="/" className="mt-8 block text-center text-sm text-ink-300 hover:text-ink-900">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
