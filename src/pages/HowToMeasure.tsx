import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Users } from 'lucide-react';
import { MEASUREMENT_TEMPLATES, checkMeasurements, fromDisplay, toDisplay } from '../lib/measurements';
import type { MeasurementValues } from '../lib/types';
import { useStore } from '../lib/store';
import { useTranslation } from '../i18n';
import MeasurementDiagram from '../components/MeasurementDiagram';

// ---------------------------------------------------------------------------
// The measuring guide.
//
// Built as ONE MEASUREMENT PER SCREEN rather than a long form, because that is
// how the task is actually performed: you put the phone down, take a
// measurement, pick the phone back up, type it in. A seventeen-field form
// asks someone to hold their place in a list while holding a tape measure.
//
// Every step carries the instruction, the common mistake, and a warning when
// the measurement genuinely cannot be taken alone. Values are validated as
// they are entered, so an error is caught while the tape is still in hand
// rather than days later by a tailor on the phone.
// ---------------------------------------------------------------------------

export default function HowToMeasure() {
  const { t } = useTranslation();
  const unit = useStore((s) => s.unit);
  const setUnit = useStore((s) => s.setUnit);

  const [templateId, setTemplateId] = useState(MEASUREMENT_TEMPLATES[0].id);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<MeasurementValues>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showFallback, setShowFallback] = useState(false);

  const template = MEASUREMENT_TEMPLATES.find((tpl) => tpl.id === templateId)!;
  const field = template.fields[step];
  const isLast = step === template.fields.length - 1;

  const flags = useMemo(
    () => checkMeasurements(template, values),
    [template, values],
  );
  const fieldFlag =
    field && touched.has(field.key)
      ? flags.find((f) => f.fieldKey === field.key)
      : undefined;

  const current = field ? values[field.key] : undefined;
  const displayValue = current !== undefined ? toDisplay(current, unit) : '';

  const setValue = (raw: string) => {
    if (!field) return;
    setTouched((prev) => new Set(prev).add(field.key));
    if (raw === '') {
      const next = { ...values };
      delete next[field.key];
      setValues(next);
      return;
    }
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setValues({ ...values, [field.key]: fromDisplay(parsed, unit) });
  };

  const completed = template.fields.filter((f) => values[f.key] !== undefined).length;
  const progress = Math.round((completed / template.fields.length) * 100);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <p className="eyebrow">{t('nav.sizeGuide')}</p>
      <h1 className="mt-4 text-display-sm sm:text-display-md">{t('measure.title')}</h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-400">
        {t('measure.subtitle')}
      </p>

      {/* Garment type picker — the field list genuinely differs, so asking
          first avoids collecting measurements nobody needs. */}
      <div className="mt-8">
        <label className="field-label" htmlFor="template">What are you having made?</label>
        <select
          id="template"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setStep(0);
            setValues({});
            setTouched(new Set());
          }}
          className="field-boxed max-w-sm"
        >
          {MEASUREMENT_TEMPLATES.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-ink-300">{template.description}</p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="text-xs text-ink-300">Show in</span>
        <div className="inline-flex border border-ink-900/15">
          {(['cm', 'in'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`px-4 py-2 text-xs ${
                unit === u ? 'bg-ink-900 text-bone-50' : 'text-ink-400 hover:bg-bone-200'
              }`}
            >
              {u === 'cm' ? t('measure.unitCm') : t('measure.unitIn')}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="mt-10">
        <div className="flex justify-between text-xs text-ink-300">
          <span>Measurement {step + 1} of {template.fields.length}</span>
          <span>{progress}% done</span>
        </div>
        <div className="mt-2 h-px bg-ink-900/10">
          <div
            className="h-px bg-clay-500 transition-all duration-500 ease-editorial"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
      </div>

      {/* The step */}
      {field && (
        <div className="mt-8 grid gap-8 border border-ink-900/8 p-6 sm:p-10 md:grid-cols-[200px_1fr] md:gap-12">
          <div className="mx-auto w-40 md:w-full">
            <MeasurementDiagram fieldKey={field.key} />
          </div>

          <div>
            <h2 className="font-display text-2xl">{field.label}</h2>
            <p className="mt-3 leading-relaxed text-ink-500">{field.instruction}</p>

            {field.needsHelper && (
              <p className="mt-4 flex items-start gap-2 bg-bone-200 p-3 text-sm text-ink-500">
                <Users size={15} className="mt-0.5 shrink-0 text-clay-400" />
                {t('measure.helperNeeded')}
              </p>
            )}

            {field.commonMistake && (
              <p className="mt-3 flex items-start gap-2 text-sm text-ink-400">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-gold-400" />
                <span>
                  <strong className="font-medium text-ink-700">{t('measure.commonMistake')}: </strong>
                  {field.commonMistake}
                </span>
              </p>
            )}

            <div className="mt-7">
              <label className="field-label" htmlFor="value">
                {field.label} {field.required && <span className="text-clay-500">*</span>}
              </label>
              <div className="relative max-w-[200px]">
                <input
                  id="value"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.5"
                  value={displayValue}
                  onChange={(e) => setValue(e.target.value)}
                  className="field-boxed pr-12 text-lg"
                  autoFocus
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-300">
                  {unit}
                </span>
              </div>

              {/* Validated as it is typed, so a mistake is caught while the
                  tape is still in hand. */}
              {fieldFlag && (
                <p
                  className={`mt-2 text-sm ${
                    fieldFlag.severity === 'error' ? 'text-clay-600' : 'text-gold-500'
                  }`}
                >
                  {fieldFlag.message}
                </p>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="btn-secondary"
              >
                <ArrowLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (field) setTouched((prev) => new Set(prev).add(field.key));
                  setStep((s) => Math.min(template.fields.length - 1, s + 1));
                }}
                disabled={isLast}
                className="btn-primary flex-1"
              >
                {isLast ? t('measure.finish') : t('measure.next')}
                {!isLast && <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All steps, so someone can jump around rather than being trapped in a
          wizard. */}
      <ol className="mt-8 grid gap-2 sm:grid-cols-2">
        {template.fields.map((f, i) => {
          const done = values[f.key] !== undefined;
          return (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-3 border px-4 py-3 text-left text-sm transition-colors ${
                  i === step
                    ? 'border-ink-900 bg-bone-200/60'
                    : 'border-ink-900/10 hover:border-ink-900/30'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    done ? 'bg-sage-500 text-bone-50' : 'bg-bone-300 text-ink-400'
                  }`}
                >
                  {done ? <Check size={11} /> : i + 1}
                </span>
                <span className="flex-1">{f.label}</span>
                {done && (
                  <span className="tabular text-xs text-ink-300">
                    {toDisplay(values[f.key]!, unit)} {unit}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* The fallback, copied from established sellers: an approximate order
          followed by a conversation beats an abandoned basket. */}
      <div className="mt-10 border border-ink-900/8 p-6">
        {showFallback ? (
          <>
            <h2 className="font-display text-xl">{t('measure.cannotMeasure')}</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-400">
              {t('measure.cannotMeasureBody')}
            </p>
            <div className="mt-5 grid max-w-md gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="height">{t('measure.height')}</label>
                <input id="height" type="number" className="field-boxed" placeholder={unit === 'cm' ? '165' : '65'} />
              </div>
              <div>
                <label className="field-label" htmlFor="usual">{t('measure.usualSize')}</label>
                <input id="usual" className="field-boxed" placeholder="M / 12 / 40" />
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowFallback(true)}
            className="link text-sm"
          >
            {t('measure.cannotMeasure')}
          </button>
        )}
      </div>

      <p className="mt-8 flex items-start gap-2.5 text-sm leading-relaxed text-ink-400">
        <Check size={16} className="mt-0.5 shrink-0 text-sage-500" />
        {t('measure.verifyNote')}
      </p>

      <div className="mt-10">
        <Link to="/shop" className="btn-secondary">{t('cart.browse')}</Link>
      </div>
    </div>
  );
}
