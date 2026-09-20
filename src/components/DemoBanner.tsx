import { useState } from 'react';
import { X } from 'lucide-react';
import { isDemoMode } from '../lib/data';

/**
 * Shown only when no Supabase keys are configured. It exists so nobody —
 * least of all the shop owner during a demo — mistakes seeded sample data
 * and simulated payments for the real thing.
 */
export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (!isDemoMode || dismissed) return null;

  return (
    <div className="bg-forest-700 px-4 py-2 text-center text-xs text-cotton-100">
      <div className="mx-auto flex max-w-content items-center justify-center gap-3">
        <span>
          <strong className="font-semibold">Demo mode</strong>
          {' — sample catalogue, placeholder photography, and simulated payments. '}
          <span className="hidden sm:inline">No card is ever charged.</span>
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 hover:bg-cotton-100/10"
          aria-label="Dismiss demo notice"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
