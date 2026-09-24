import { useEffect, useState } from 'react';
import { Check, Plus, Ruler } from 'lucide-react';
import { getData } from '../lib/data';
import type { MeasurementSet, MeasurementValues } from '../lib/types';
import {
  MEASUREMENT_TEMPLATES, checkMeasurements, fromDisplay, missingRequired,
  templateById, toDisplay,
} from '../lib/measurements';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import MeasurementDiagram from './MeasurementDiagram';

interface Props {
  templateId: string;
  selectedId?: string;
  onSelect(setId: string): void;
}

/**
 * Choosing or taking measurements at checkout.
 *
 * Saved sets come first, because a returning customer should not measure
 * themselves twice — that reuse is one of the strongest reasons to have an
 * account at all.
 */
export default function MeasurementPicker({ templateId, selectedId, onSelect }: Props) {
  const customer = useAuth((s) => s.customer);
  const unit = useStore((s) => s.unit);

  const [sets, setSets] = useState<MeasurementSet[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('Mine');
  const [values, setValues] = useState<MeasurementValues>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const template = templateById(templateId) ?? MEASUREMENT_TEMPLATES[0];

  useEffect(() => {
    if (!customer) return;
    getData().then((d) => d.listMeasurementSets(customer.id)).then(setSets);
  }, [customer]);

  const usable = sets.filter((s) => s.templateId === templateId);
  const flags = checkMeasurements(template, values);
  const missing = missingRequired(template, values);
  const field = template.fields[step];

  const save = async () => {
    if (!customer) return;
    setSaving(true);
    const data = await getData();
    const set: MeasurementSet = {
      id: `ms-${Date.now().toString(36)}`,
      customerId: customer.id,
      name: name || 'My measurements',
      templateId,
      values,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await data.saveMeasurementSet(set);
    setSets((s) => [...s, set]);
    onSelect(set.id);
    setCreating(false);
    setValues({});
    setStep(0);
    setSaving(false);
  };

  return (
    <div>
      {usable.length > 0 && !creating && (
        <ul className="space-y-2">
          {usable.map((set) => {
            const filled = template.fields.filter((f) => set.values[f.key] !== undefined);
            return (
              <li key={set.id}>
                <button
                  type="button"
                  onClick={() => onSelect(set.id)}
                  className={`flex w-full items-start gap-3 border p-4 text-left transition-colors ${
                    selectedId === set.id
                      ? 'border-ink-900 bg-bone-200/60'
                      : 'border-ink-900/12 hover:border-ink-900/40'
                  }`}
                >
                  <Ruler size={16} className="mt-0.5 shrink-0 text-clay-400" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{set.name}</span>
                    <span className="block text-xs text-ink-300">
                      {filled.length} measurements · saved{' '}
                      {new Date(set.updatedAt).toLocaleDateString()}
                    </span>
                  </span>
                  {selectedId === set.id && <Check size={15} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!creating ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn-secondary mt-3 w-full"
        >
          <Plus size={15} /> Take new measurements
        </button>
      ) : (
        <div className="mt-3 border border-ink-900/12 p-5">
          <div className="mb-5">
            <label className="field-label" htmlFor="set-name">Name this set</label>
            <input
              id="set-name" value={name} onChange={(e) => setName(e.target.value)}
              className="field max-w-[240px]" placeholder="Mine, or For Selam"
            />
          </div>

          {field && (
            <div className="grid gap-6 sm:grid-cols-[120px_1fr]">
              <div className="mx-auto w-28 sm:w-full">
                <MeasurementDiagram fieldKey={field.key} />
              </div>
              <div>
                <p className="text-xs text-ink-300">
                  {step + 1} of {template.fields.length}
                </p>
                <h4 className="mt-1 font-display text-xl">{field.label}</h4>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">
                  {field.instruction}
                </p>
                {field.needsHelper && (
                  <p className="mt-2 text-xs text-clay-600">
                    You will need someone to help with this one.
                  </p>
                )}

                <div className="relative mt-4 max-w-[160px]">
                  <input
                    type="number" step="0.5" min="1"
                    value={values[field.key] !== undefined
                      ? toDisplay(values[field.key]!, unit) : ''}
                    onChange={(e) => {
                      const parsed = Number.parseFloat(e.target.value);
                      if (e.target.value === '') {
                        const next = { ...values };
                        delete next[field.key];
                        setValues(next);
                      } else if (Number.isFinite(parsed) && parsed > 0) {
                        setValues({ ...values, [field.key]: fromDisplay(parsed, unit) });
                      }
                    }}
                    className="field-boxed pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-300">
                    {unit}
                  </span>
                </div>

                {/* Caught while the tape is still in hand, not days later. */}
                {flags.find((f) => f.fieldKey === field.key && values[field.key] !== undefined) && (
                  <p className="mt-2 text-sm text-gold-500">
                    {flags.find((f) => f.fieldKey === field.key)!.message}
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="btn-secondary py-2 text-xs"
                  >
                    Back
                  </button>
                  {step < template.fields.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep((s) => s + 1)}
                      className="btn-primary flex-1 py-2 text-xs"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={missing.length > 0 || saving}
                      onClick={save}
                      className="btn-primary flex-1 py-2 text-xs"
                    >
                      {saving ? 'Saving…' : 'Save measurements'}
                    </button>
                  )}
                </div>

                {step === template.fields.length - 1 && missing.length > 0 && (
                  <p className="mt-2 text-xs text-clay-600">
                    Still needed: {missing.map((f) => f.label).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setCreating(false); setValues({}); setStep(0); }}
            className="btn-ghost mt-4 px-0 text-xs"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
