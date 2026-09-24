import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { getData } from '../lib/data';
import { useAuth } from '../lib/auth';

interface Props {
  designId: string;
  className?: string;
}

export default function WishlistButton({ designId, className = '' }: Props) {
  const customer = useAuth((s) => s.customer);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!customer) return;
    getData()
      .then((d) => d.listWishlist(customer.id))
      .then((w) => setSaved(w.some((e) => e.designId === designId)))
      .catch(() => undefined);
  }, [customer, designId]);

  // Signed-out visitors see nothing rather than a button that bounces them to
  // a sign-in page — an interruption while browsing loses more than it gains.
  if (!customer) return null;

  const toggle = async () => {
    setBusy(true);
    const data = await getData();
    setSaved(await data.toggleWishlist(customer.id, designId));
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from your saved designs' : 'Save this design'}
      className={`btn-ghost gap-2 text-xs ${className}`}
    >
      <Heart size={15} className={saved ? 'fill-clay-500 text-clay-500' : ''} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
