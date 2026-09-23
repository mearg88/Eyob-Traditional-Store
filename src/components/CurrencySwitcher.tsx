import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useStore } from '../lib/store';
import { CURRENCIES, CURRENCY_CODES } from '../lib/pricing';
import type { CurrencyCode } from '../lib/types';

/**
 * Changes what prices are DISPLAYED in, and nothing else.
 *
 * Choosing birr from Toronto shows birr; it does not buy at Ethiopian prices,
 * because the tier comes from the delivery address on the server. See
 * lib/pricing.ts.
 */
export default function CurrencySwitcher() {
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn-ghost gap-1 text-xs"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${currency}. Change currency`}
      >
        <span className="font-medium tracking-wide">{currency}</span>
        <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Choose a currency"
          className="absolute right-0 z-50 mt-1 w-56 border border-ink-900/10 bg-bone-50 py-1 shadow-lift"
        >
          {CURRENCY_CODES.map((code: CurrencyCode) => {
            const selected = code === currency;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => { setCurrency(code); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-bone-200 ${
                    selected ? 'text-clay-600' : 'text-ink-500'
                  }`}
                >
                  <span className="w-9 shrink-0 text-xs font-medium">{code}</span>
                  <span className="flex-1 truncate text-xs text-ink-300">
                    {CURRENCIES[code].name}
                  </span>
                  {selected && <Check size={13} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
