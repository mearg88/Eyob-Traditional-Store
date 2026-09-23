import type {
  MeasurementField, MeasurementSet, MeasurementTemplate, MeasurementUnit,
  MeasurementValues,
} from './types';

// ---------------------------------------------------------------------------
// Measurements.
//
// SOURCE OF THESE FIELDS, stated plainly: they come from research into what
// established Habesha sellers ask customers for, not from this workshop's own
// practice. The owner asked for that approach explicitly.
//
// The common set across sellers is shoulder-to-shoulder, bust, waist,
// shoulder-to-waist, sleeve length and total length, with hips added by some.
// Bridal work adds underbust, armhole, bicep, nape-to-waist and hollow-to-hem.
//
// TREAT THIS AS A DRAFT UNTIL THE WORKSHOP CONFIRMS IT. Templates are data, so
// correcting them is an edit here rather than a change to any screen.
//
// Stored in centimetres always. Inches exist only at the point of display, so
// there is one number in the database and no rounding drift when a customer
// toggles units halfway through.
// ---------------------------------------------------------------------------

const f = (
  key: string,
  label: string,
  instruction: string,
  opts: Partial<MeasurementField> = {},
): MeasurementField => ({
  key,
  label,
  instruction,
  required: true,
  needsHelper: false,
  minCm: 20,
  maxCm: 200,
  position: 0,
  ...opts,
});

/** Fields shared by most fitted garments. */
const SHOULDER_TO_SHOULDER = f(
  'shoulderToShoulder',
  'Shoulder to shoulder',
  'Across the back, from the point of one shoulder to the other.',
  {
    commonMistake: 'Measuring across the front instead of the back makes this too small.',
    needsHelper: true,
    minCm: 25,
    maxCm: 65,
  },
);

const BUST = f('bust', 'Bust', 'Around the fullest part of the chest, keeping the tape level.', {
  commonMistake: 'Pulling the tape tight. It should sit snug but not press in.',
  minCm: 60,
  maxCm: 160,
});

const UNDERBUST = f('underbust', 'Underbust', 'Directly under the bust, all the way around the ribcage.', {
  minCm: 55,
  maxCm: 150,
});

const WAIST = f('waist', 'Waist', 'Around the narrowest part of the waist, above the navel.', {
  commonMistake: 'Measuring at the trouser line rather than the natural waist, which is higher.',
  minCm: 50,
  maxCm: 160,
});

const HIPS = f('hips', 'Hips', 'Around the fullest part of the hips and seat.', {
  minCm: 60,
  maxCm: 180,
});

const SHOULDER_TO_WAIST = f(
  'shoulderToWaist',
  'Shoulder to waist',
  'From the shoulder seam straight down to the natural waist.',
  { needsHelper: true, minCm: 25, maxCm: 60 },
);

const SLEEVE = f('sleeveLength', 'Sleeve length', 'From the shoulder point down to the wrist, arm relaxed.', {
  commonMistake: 'Bending the arm. Keep it straight and relaxed at your side.',
  minCm: 30,
  maxCm: 90,
});

const TOTAL_LENGTH = f(
  'totalLength',
  'Total length',
  'From the shoulder down to where you want the hem to finish.',
  {
    commonMistake: 'Forgetting the shoes you will wear. Measure in them if you can.',
    needsHelper: true,
    minCm: 60,
    maxCm: 200,
  },
);

const ARMHOLE = f('armhole', 'Armhole', 'Around the top of the arm where it meets the shoulder.', {
  needsHelper: true,
  minCm: 25,
  maxCm: 70,
});

const BICEP = f('bicep', 'Upper arm', 'Around the fullest part of the upper arm.', {
  minCm: 18,
  maxCm: 60,
});

const NAPE_TO_WAIST = f(
  'napeToWaist',
  'Nape to waist',
  'From the bone at the base of the neck down to the natural waist.',
  { needsHelper: true, minCm: 25, maxCm: 60 },
);

const HOLLOW_TO_HEM = f(
  'hollowToHem',
  'Hollow to hem',
  'From the hollow at the base of the throat down to the hem.',
  { needsHelper: true, minCm: 80, maxCm: 200 },
);

const withPositions = (fields: MeasurementField[]): MeasurementField[] =>
  fields.map((field, i) => ({ ...field, position: i }));

export const MEASUREMENT_TEMPLATES: MeasurementTemplate[] = [
  {
    id: 'tmpl-standard',
    name: 'Standard dress',
    description: 'Habesha kemis and everyday dresses.',
    fields: withPositions([
      SHOULDER_TO_SHOULDER, BUST, WAIST, HIPS, SHOULDER_TO_WAIST, SLEEVE, TOTAL_LENGTH,
    ]),
  },
  {
    id: 'tmpl-bridal',
    name: 'Bridal and structured gowns',
    description: 'Fitted bodices and structured gowns need more than a flowing dress does.',
    fields: withPositions([
      SHOULDER_TO_SHOULDER, BUST, UNDERBUST, WAIST, HIPS, SHOULDER_TO_WAIST,
      NAPE_TO_WAIST, ARMHOLE, BICEP, SLEEVE, HOLLOW_TO_HEM, TOTAL_LENGTH,
    ]),
  },
  {
    id: 'tmpl-wrap',
    name: 'Wraps and shawls',
    description: 'Netela, shash, gabi and kuta. These drape rather than fit, so the body barely matters.',
    fields: withPositions([
      f('length', 'Length', 'How long you would like the wrap to be.', { minCm: 100, maxCm: 350 }),
      f('width', 'Width', 'How wide you would like it.', { required: false, minCm: 40, maxCm: 200 }),
    ]),
  },
  {
    id: 'tmpl-mens',
    name: "Men's traditional",
    description: 'Shirts, trousers and full sets.',
    fields: withPositions([
      SHOULDER_TO_SHOULDER,
      f('chest', 'Chest', 'Around the fullest part of the chest.', { minCm: 70, maxCm: 160 }),
      WAIST,
      SLEEVE,
      f('shirtLength', 'Shirt length', 'From the shoulder down to where the shirt should end.', {
        needsHelper: true, minCm: 50, maxCm: 120,
      }),
      f('trouserWaist', 'Trouser waist', 'Around where the trousers sit.', {
        required: false, minCm: 55, maxCm: 160,
      }),
      f('inseam', 'Inside leg', 'From the crotch down to the ankle.', {
        required: false, needsHelper: true, minCm: 50, maxCm: 120,
      }),
    ]),
  },
  {
    id: 'tmpl-children',
    name: "Children's",
    description: 'Parents often know the age and little else, so age is collected too.',
    fields: withPositions([
      f('age', 'Age in years', "The child's age, which helps us sanity-check the rest.", {
        minCm: 1, maxCm: 16,
      }),
      SHOULDER_TO_SHOULDER, BUST, WAIST, SLEEVE, TOTAL_LENGTH,
    ]),
  },
];

export function templateById(id: string): MeasurementTemplate | undefined {
  return MEASUREMENT_TEMPLATES.find((t) => t.id === id);
}

// --- Units -----------------------------------------------------------------

export function toDisplay(cm: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? cm : Math.round((cm / 2.54) * 10) / 10;
}

export function fromDisplay(value: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? value : Math.round(value * 2.54 * 10) / 10;
}

export function formatMeasurement(cm: number, unit: MeasurementUnit): string {
  return `${toDisplay(cm, unit)} ${unit}`;
}

// --- Validation ------------------------------------------------------------

export interface MeasurementFlag {
  fieldKey?: string;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Checks run before a human looks at a set.
 *
 * The point is not to reject anything — it is to put the obviously wrong ones
 * at the top of the specialist's queue, so the customer gets contacted sooner
 * and the garment is not cut from a typo.
 */
export function checkMeasurements(
  template: MeasurementTemplate,
  values: MeasurementValues,
): MeasurementFlag[] {
  const flags: MeasurementFlag[] = [];

  for (const field of template.fields) {
    const value = values[field.key];

    if (field.required && (value === undefined || value === null || Number.isNaN(value))) {
      flags.push({
        fieldKey: field.key,
        severity: 'error',
        message: `${field.label} is missing`,
      });
      continue;
    }
    if (value === undefined) continue;

    if (value < field.minCm || value > field.maxCm) {
      flags.push({
        fieldKey: field.key,
        severity: 'error',
        message: `${field.label} of ${value}cm is outside the range we can work from`,
      });
    }
  }

  // Relationships between fields. These catch the transposed digits and
  // swapped fields that individual range checks cannot.
  const { bust, waist, hips, sleeveLength, totalLength, shoulderToWaist } = values;

  if (sleeveLength && totalLength && sleeveLength > totalLength) {
    flags.push({
      severity: 'error',
      message: 'Sleeve length is greater than the total length, which cannot be right',
    });
  }

  if (shoulderToWaist && totalLength && shoulderToWaist > totalLength) {
    flags.push({
      severity: 'error',
      message: 'Shoulder to waist is greater than the total length',
    });
  }

  if (bust && waist && waist > bust + 20) {
    flags.push({
      severity: 'warning',
      message: 'Waist is much larger than bust — worth confirming with the customer',
    });
  }

  if (bust && hips && Math.abs(bust - hips) > 40) {
    flags.push({
      severity: 'warning',
      message: 'Bust and hips differ by a lot — worth confirming',
    });
  }

  // A tape read in inches but entered as centimetres is the classic error, and
  // it produces a garment half the size it should be.
  if (bust && bust < 55) {
    flags.push({
      fieldKey: 'bust',
      severity: 'warning',
      message: 'Bust looks small — the customer may have measured in inches',
    });
  }

  return flags;
}

export function missingRequired(
  template: MeasurementTemplate,
  values: MeasurementValues,
): MeasurementField[] {
  return template.fields.filter((field) => {
    if (!field.required) return false;
    const value = values[field.key];
    return value === undefined || value === null || Number.isNaN(value) || value <= 0;
  });
}

export function isComplete(template: MeasurementTemplate, set: MeasurementSet): boolean {
  // The height-and-dress-size fallback is a valid, deliberate route through
  // this: the specialist follows up rather than the order being abandoned.
  if (set.fallback?.heightCm && set.fallback?.usualSize) return true;
  return missingRequired(template, set.values).length === 0;
}
