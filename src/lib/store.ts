import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, CurrencyCode, MeasurementUnit } from './types';
import { guessCurrencyForCountry } from './pricing';

// ---------------------------------------------------------------------------
// Client state: the basket, the displayed currency, and the measurement unit.
//
// Note what is NOT stored here: no prices and no totals. Those are recomputed
// from the catalogue on every render, and again on the server at checkout, so
// editing localStorage cannot change what anyone is charged.
//
// The detected country is kept because it seeds the currency guess, but it is
// explicitly a DISPLAY hint. The price tier comes from the delivery address at
// checkout — see pricing.ts.
// ---------------------------------------------------------------------------

interface StoreState {
  lines: CartLine[];
  currency: CurrencyCode;
  /** False until the visitor chooses for themselves; then we stop guessing. */
  currencyChosenByUser: boolean;
  unit: MeasurementUnit;
  /** From the hosting platform's geo header, for the currency guess only. */
  detectedCountry: string | null;

  add(line: CartLine): void;
  remove(designId: string): void;
  updateLine(designId: string, patch: Partial<CartLine>): void;
  clear(): void;

  setCurrency(currency: CurrencyCode): void;
  setDetectedCountry(country: string): void;
  setUnit(unit: MeasurementUnit): void;

  count(): number;
  has(designId: string): boolean;
}

function initialCurrency(): CurrencyCode {
  if (typeof navigator === 'undefined') return 'USD';
  try {
    const region = new Intl.Locale(navigator.language || 'en-US').maximize().region;
    return guessCurrencyForCountry(region);
  } catch {
    return 'USD';
  }
}

/** Imperial-speaking markets get inches; everyone else centimetres. */
function initialUnit(): MeasurementUnit {
  if (typeof navigator === 'undefined') return 'cm';
  try {
    const region = new Intl.Locale(navigator.language || 'en-US').maximize().region;
    return region === 'US' ? 'in' : 'cm';
  } catch {
    return 'cm';
  }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      lines: [],
      currency: initialCurrency(),
      currencyChosenByUser: false,
      unit: initialUnit(),
      detectedCountry: null,

      add(line) {
        const { lines } = get();
        // Each basket line is one garment made to one set of measurements, so
        // the same design can legitimately appear twice with different
        // measurements — for a mother and daughter, say. Lines are therefore
        // keyed by design plus measurement set, not by design alone.
        const existing = lines.findIndex(
          (l) => l.designId === line.designId && l.measurementSetId === line.measurementSetId,
        );
        if (existing >= 0) {
          const next = [...lines];
          next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
          set({ lines: next });
          return;
        }
        set({ lines: [...lines, line] });
      },

      remove(designId) {
        set({ lines: get().lines.filter((l) => l.designId !== designId) });
      },

      updateLine(designId, patch) {
        set({
          lines: get().lines.map((l) => (l.designId === designId ? { ...l, ...patch } : l)),
        });
      },

      clear() {
        set({ lines: [] });
      },

      setCurrency(currency) {
        set({ currency, currencyChosenByUser: true });
      },

      setDetectedCountry(country) {
        const { currencyChosenByUser } = get();
        set({
          detectedCountry: country,
          // Only override the currency while the visitor has not chosen one.
          ...(currencyChosenByUser ? {} : { currency: guessCurrencyForCountry(country) }),
        });
      },

      setUnit(unit) {
        set({ unit });
      },

      count() {
        return get().lines.reduce((sum, l) => sum + l.quantity, 0);
      },

      has(designId) {
        return get().lines.some((l) => l.designId === designId);
      },
    }),
    {
      name: 'ets.cart.v2',
      partialize: (s) => ({
        lines: s.lines,
        currency: s.currency,
        currencyChosenByUser: s.currencyChosenByUser,
        unit: s.unit,
        detectedCountry: s.detectedCountry,
      }),
    },
  ),
);
