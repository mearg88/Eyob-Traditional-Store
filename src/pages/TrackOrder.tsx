import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrackOrder() {
  const navigate = useNavigate();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/order/${reference.trim().toUpperCase()}?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl">Track an order</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-500">
        Enter the reference from your confirmation email, along with the email
        address you used. Both are needed — the reference on its own is not enough
        to open someone else's order.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="field-label" htmlFor="ref">Order reference</label>
          <input
            id="ref" required value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            className="field font-mono" placeholder="ETS-XXXXXX"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="track-email">Email</label>
          <input
            id="track-email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field" placeholder="you@example.com"
          />
        </div>
        <button type="submit" className="btn-primary w-full">Find my order</button>
      </form>
    </div>
  );
}
