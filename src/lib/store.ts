import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, CurrencyCode, Measurements } from './types';
import { guessCurrencyForCountry } from './pricing';

// ---------------------------------------------------------------------------
// Client state: the cart, the display currency, and the measurement unit.
//
// The cart persists to localStorage so a customer who closes the tab on a
// slow phone comes back to their basket. Note what is NOT stored here: no
// prices and no totals. Those are recomputed from the catalogue on every
// render and again on the server at checkout, so a tampered localStorage
// entry cannot change what anyone is charged.
// ---------------------------------------------------------------------------

interface CartState {
  lines: CartLine[];
  currency: CurrencyCode;
  /** Set once from the browser locale, then only ever by the user. */
  currencyTouched: boolean;
  unit: 'cm' | 'in';
  promoCode: string | null;

  add(productId: string, measurements?: Measurements): void;
  remove(productId: string): void;
  setMeasurements(productId: string, measurements: Measurements): void;
  clear(): void;
  setCurrency(currency: CurrencyCode): void;
  setUnit(unit: 'cm' | 'in'): void;
  setPromoCode(code: string | null): void;
  count(): number;
  has(productId: string): boolean;
}

/** Best-effort guess from the browser locale. Display only — never pricing. */
function initialCurrency(): CurrencyCode {
  if (typeof navigator === 'undefined') return 'USD';
  const region = new Intl.Locale(navigator.language || 'en-US').maximize().region;
  return guessCurrencyForCountry(region ?? undefined);
}

/** Imperial-speaking markets get inches by default; everyone else cm. */
function initialUnit(): 'cm' | 'in' {
  if (typeof navigator === 'undefined') return 'cm';
  const region = new Intl.Locale(navigator.language || 'en-US').maximize().region;
  return region === 'US' || region === 'GB' ? 'in' : 'cm';
}

export const useStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      currency: initialCurrency(),
      currencyTouched: false,
      unit: initialUnit(),
      promoCode: null,

      add(productId, measurements) {
        const { lines } = get();
        // Every ready-made piece is one of a kind, so quantity never exceeds
        // one. Adding twice is a no-op rather than an error.
        if (lines.some((l) => l.productId === productId)) return;
        set({ lines: [...lines, { productId, quantity: 1, customerMeasurements: measurements }] });
      },

      remove(productId) {
        set({ lines: get().lines.filter((l) => l.productId !== productId) });
      },

      setMeasurements(productId, measurements) {
        set({
          lines: get().lines.map((l) =>
            l.productId === productId ? { ...l, customerMeasurements: measurements } : l,
          ),
        });
      },

      clear() {
        set({ lines: [], promoCode: null });
      },

      setCurrency(currency) {
        set({ currency, currencyTouched: true });
      },

      setUnit(unit) {
        set({ unit });
      },

      setPromoCode(promoCode) {
        set({ promoCode });
      },

      count() {
        return get().lines.length;
      },

      has(productId) {
        return get().lines.some((l) => l.productId === productId);
      },
    }),
    {
      name: 'ets.cart.v1',
      partialize: (s) => ({
        lines: s.lines,
        currency: s.currency,
        currencyTouched: s.currencyTouched,
        unit: s.unit,
        promoCode: s.promoCode,
      }),
    },
  ),
);
