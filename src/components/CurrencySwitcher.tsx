import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useStore } from '../lib/store';
import { CURRENCIES, CURRENCY_CODES } from '../lib/pricing';
import type { CurrencyCode } from '../lib/types';

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

  const choose = (code: CurrencyCode) => {
    setCurrency(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn-ghost gap-1 px-2 text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${currency}. Change currency`}
      >
        <span className="font-medium">{currency}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Choose a currency"
          className="absolute right-0 z-50 mt-1 max-h-80 w-60 overflow-y-auto rounded-sm border border-ink-900/10 bg-cotton-50 py-1 shadow-lift"
        >
          {CURRENCY_CODES.map((code) => {
            const meta = CURRENCIES[code];
            const selected = code === currency;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(code)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-cotton-200 ${
                    selected ? 'text-clay-600' : 'text-ink-700'
                  }`}
                >
                  <span className="w-10 shrink-0 font-medium">{code}</span>
                  <span className="flex-1 truncate text-ink-400">{meta.name}</span>
                  {selected && <Check size={14} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
