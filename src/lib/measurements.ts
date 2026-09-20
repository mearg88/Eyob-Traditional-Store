import type { Measurements, ProductKind } from './types';

// ---------------------------------------------------------------------------
// Measurements.
//
// Habesha garments do not map cleanly onto S/M/L, and the shop's ready-made
// stock is one-of-a-kind — each piece physically exists with fixed dimensions.
// So we publish the garment's real numbers and treat S/M/L as a rough hint.
//
// Sellers in this category consistently report that fit-related returns come
// from customers reading a BODY-size chart as if it were a GARMENT chart. We
// avoid the ambiguity by always labelling which one is on screen.
//
// Stored in centimetres. Inches exist only at the point of display.
// ---------------------------------------------------------------------------

export const MEASUREMENT_FIELDS: {
  key: keyof Measurements;
  label: string;
  hint: string;
}[] = [
  { key: 'bust', label: 'Bust', hint: 'Around the fullest part of the chest' },
  { key: 'waist', label: 'Waist', hint: 'Around the natural waistline' },
  { key: 'hips', label: 'Hips', hint: 'Around the fullest part of the hips' },
  { key: 'shoulderToShoulder', label: 'Shoulder to shoulder', hint: 'Across the back, seam to seam' },
  { key: 'shoulderToWaist', label: 'Shoulder to waist', hint: 'From the shoulder seam down to the waist' },
  { key: 'armLength', label: 'Arm length', hint: 'From the shoulder seam to the wrist' },
  { key: 'totalLength', label: 'Total length', hint: 'From the shoulder down to the hem' },
];

export type Unit = 'cm' | 'in';

export function toDisplay(cm: number, unit: Unit): number {
  return unit === 'cm' ? cm : Math.round((cm / 2.54) * 10) / 10;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'cm' ? value : Math.round(value * 2.54 * 10) / 10;
}

export function formatMeasurement(cm: number, unit: Unit): string {
  return `${toDisplay(cm, unit)} ${unit}`;
}

/**
 * Says whose body the numbers on screen describe. One-of-a-kind pieces list
 * the garment; made-to-order collects the wearer. Getting this label right is
 * the cheapest return-prevention available to us.
 */
export function measurementSubject(kind: ProductKind): string {
  return kind === 'one_of_a_kind' ? 'Garment measurements' : 'Your measurements';
}

/** Bust-based nominal sizing, offered only as an approximation. */
export function suggestNominalSize(m: Measurements): string {
  const bust = m.bust;
  if (!bust) return 'One size';
  if (bust < 86) return 'fits approx. XS';
  if (bust < 94) return 'fits approx. S';
  if (bust < 102) return 'fits approx. M';
  if (bust < 112) return 'fits approx. L';
  if (bust < 122) return 'fits approx. XL';
  return 'fits approx. XXL';
}

/** Which measurements a made-to-order customer must supply before checkout. */
export const REQUIRED_FOR_MADE_TO_ORDER: (keyof Measurements)[] = [
  'bust',
  'waist',
  'shoulderToShoulder',
  'armLength',
  'totalLength',
];

export function missingMeasurements(m: Measurements | undefined): (keyof Measurements)[] {
  if (!m) return [...REQUIRED_FOR_MADE_TO_ORDER];
  return REQUIRED_FOR_MADE_TO_ORDER.filter((k) => {
    const v = m[k];
    return v === undefined || v === null || Number.isNaN(v) || v <= 0;
  });
}

export function hasAnyMeasurement(m: Measurements | undefined): boolean {
  if (!m) return false;
  return MEASUREMENT_FIELDS.some(({ key }) => typeof m[key] === 'number' && (m[key] as number) > 0);
}
