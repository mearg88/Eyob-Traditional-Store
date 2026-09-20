import type { Measurements } from '../lib/types';
import {
  MEASUREMENT_FIELDS, REQUIRED_FOR_MADE_TO_ORDER, fromDisplay, toDisplay,
} from '../lib/measurements';

interface Props {
  value: Measurements;
  onChange(next: Measurements): void;
  unit: 'cm' | 'in';
  showErrors?: boolean;
}

/**
 * Collects a made-to-order customer's measurements.
 *
 * Values are held in centimetres and converted only for display, so switching
 * units mid-form cannot introduce rounding drift into what the weaver receives.
 */
export default function MeasurementForm({ value, onChange, unit, showErrors }: Props) {
  const update = (key: keyof Measurements, raw: string) => {
    if (raw === '') {
      const next = { ...value };
      delete next[key];
      onChange(next);
      return;
    }
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onChange({ ...value, [key]: fromDisplay(parsed, unit) });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MEASUREMENT_FIELDS.map((field) => {
        const required = REQUIRED_FOR_MADE_TO_ORDER.includes(field.key);
        const current = value[field.key];
        const missing = showErrors && required && !current;

        return (
          <div key={field.key}>
            <label className="field-label" htmlFor={`m-${field.key}`}>
              {field.label}
              {required && <span className="ml-1 text-clay-500">*</span>}
            </label>
            <div className="relative">
              <input
                id={`m-${field.key}`}
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                value={current !== undefined ? toDisplay(current, unit) : ''}
                onChange={(e) => update(field.key, e.target.value)}
                aria-invalid={missing || undefined}
                aria-describedby={`m-${field.key}-hint`}
                className={`field pr-12 ${missing ? 'border-clay-500' : ''}`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">
                {unit}
              </span>
            </div>
            <p id={`m-${field.key}-hint`} className="mt-1 text-xs text-ink-400">
              {missing ? 'The weaver needs this one' : field.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}
