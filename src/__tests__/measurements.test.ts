import { describe, expect, it } from 'vitest';
import {
  MEASUREMENT_TEMPLATES, checkMeasurements, fromDisplay, isComplete,
  missingRequired, templateById, toDisplay,
} from '../lib/measurements';
import type { MeasurementSet } from '../lib/types';

const standard = templateById('tmpl-standard')!;
const bridal = templateById('tmpl-bridal')!;
const wrap = templateById('tmpl-wrap')!;

describe('templates', () => {
  it('gives bridal more fields than a standard dress', () => {
    expect(bridal.fields.length).toBeGreaterThan(standard.fields.length);
  });

  it('asks a wrap for almost nothing, since it drapes rather than fits', () => {
    expect(wrap.fields.length).toBeLessThan(standard.fields.length);
    expect(wrap.fields.map((f) => f.key)).toContain('length');
    expect(wrap.fields.map((f) => f.key)).not.toContain('bust');
  });

  it('gives every field a sane range', () => {
    for (const template of MEASUREMENT_TEMPLATES) {
      for (const field of template.fields) {
        expect(field.maxCm).toBeGreaterThan(field.minCm);
        expect(field.instruction.length).toBeGreaterThan(10);
      }
    }
  });

  it('marks the measurements that genuinely need a second person', () => {
    const needsHelp = standard.fields.filter((f) => f.needsHelper).map((f) => f.key);
    expect(needsHelp).toContain('shoulderToShoulder');
    expect(needsHelp).toContain('totalLength');
    // Bust can be done alone.
    expect(needsHelp).not.toContain('bust');
  });
});

describe('unit conversion', () => {
  it('leaves centimetres alone', () => {
    expect(toDisplay(96, 'cm')).toBe(96);
    expect(fromDisplay(96, 'cm')).toBe(96);
  });

  it('converts to inches for display', () => {
    expect(toDisplay(96, 'in')).toBeCloseTo(37.8, 1);
  });

  it('round-trips without drifting', () => {
    // A customer toggling units mid-form must not corrupt what the tailor gets.
    const original = 96;
    const inches = toDisplay(original, 'in');
    expect(fromDisplay(inches, 'in')).toBeCloseTo(original, 0);
  });
});

describe('checkMeasurements — catching errors while the tape is in hand', () => {
  it('passes a plausible set', () => {
    const flags = checkMeasurements(standard, {
      shoulderToShoulder: 38, bust: 92, waist: 74, hips: 98,
      shoulderToWaist: 41, sleeveLength: 56, totalLength: 145,
    });
    expect(flags.filter((f) => f.severity === 'error')).toHaveLength(0);
  });

  it('flags a missing required measurement', () => {
    const flags = checkMeasurements(standard, { bust: 92 });
    expect(flags.some((f) => f.fieldKey === 'waist' && f.severity === 'error')).toBe(true);
  });

  it('flags a sleeve longer than the whole garment', () => {
    const flags = checkMeasurements(standard, {
      shoulderToShoulder: 38, bust: 92, waist: 74, hips: 98,
      shoulderToWaist: 41, sleeveLength: 200, totalLength: 145,
    });
    expect(flags.some((f) => f.message.includes('Sleeve length is greater'))).toBe(true);
  });

  it('flags a value outside the possible range', () => {
    const flags = checkMeasurements(standard, {
      shoulderToShoulder: 38, bust: 400, waist: 74, hips: 98,
      shoulderToWaist: 41, sleeveLength: 56, totalLength: 145,
    });
    expect(flags.some((f) => f.fieldKey === 'bust' && f.severity === 'error')).toBe(true);
  });

  it('warns when a tape was probably read in inches', () => {
    // The classic error: 36 inches entered as 36 centimetres, which would
    // produce a garment less than half the size it should be.
    const flags = checkMeasurements(standard, {
      shoulderToShoulder: 38, bust: 36, waist: 28, hips: 38,
      shoulderToWaist: 41, sleeveLength: 56, totalLength: 145,
    });
    expect(flags.some((f) => f.message.includes('inches'))).toBe(true);
  });

  it('warns, but does not reject, an unusual body shape', () => {
    // Real people are this shape. It is worth confirming, never worth refusing.
    const flags = checkMeasurements(standard, {
      shoulderToShoulder: 38, bust: 90, waist: 118, hips: 100,
      shoulderToWaist: 41, sleeveLength: 56, totalLength: 145,
    });
    const waistFlag = flags.find((f) => f.message.includes('Waist is much larger'));
    expect(waistFlag?.severity).toBe('warning');
    expect(flags.filter((f) => f.severity === 'error')).toHaveLength(0);
  });
});

describe('missingRequired', () => {
  it('ignores optional fields', () => {
    const missing = missingRequired(wrap, { length: 200 });
    expect(missing.map((f) => f.key)).not.toContain('width');
  });

  it('treats zero as missing rather than as a value', () => {
    const missing = missingRequired(wrap, { length: 0 });
    expect(missing.map((f) => f.key)).toContain('length');
  });
});

describe('isComplete', () => {
  const base: MeasurementSet = {
    id: 'm1', customerId: 'c1', name: 'Mine', templateId: 'tmpl-wrap',
    values: {}, createdAt: '', updatedAt: '',
  };

  it('is incomplete with nothing filled in', () => {
    expect(isComplete(wrap, base)).toBe(false);
  });

  it('is complete once the required fields are there', () => {
    expect(isComplete(wrap, { ...base, values: { length: 200 } })).toBe(true);
  });

  it('accepts the height-and-size fallback as a valid route', () => {
    // A customer who cannot measure is followed up by a tailor. That beats an
    // abandoned basket, and it is what established sellers already do.
    expect(
      isComplete(wrap, {
        ...base,
        fallback: { heightCm: 165, usualSize: 'M' },
      }),
    ).toBe(true);
  });

  it('does not accept a half-filled fallback', () => {
    expect(isComplete(wrap, { ...base, fallback: { heightCm: 165 } })).toBe(false);
  });
});
