import { useState } from 'react';
import { X } from 'lucide-react';
import { isDemoMode } from '../lib/data';

/**
 * Shown only when no Supabase keys are configured, so that nobody — least of
 * all the shop owner during a demonstration — mistakes seeded sample data for
 * the real thing.
 */
export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (!isDemoMode || dismissed) return null;

  return (
    <div className="bg-ink-900 px-5 py-2 text-center text-[11px] text-bone-200">
      <div className="mx-auto flex max-w-content items-center justify-center gap-3">
        <span>
          <strong className="font-semibold text-bone-50">Demo</strong>
          {' — sample catalogue and placeholder prices. No payment is taken.'}
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 hover:bg-bone-50/10"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
