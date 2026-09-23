interface Props {
  fieldKey: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Animated measuring diagrams.
//
// Inline SVG rather than images or video: a few hundred bytes each, crisp at
// any size, no network request, and the tape animates without JavaScript. That
// matters — this guide is used most on a mid-range phone, often on a slow
// connection, by someone standing up holding a tape measure.
//
// Each diagram shows a simplified figure with the tape highlighted in clay and
// a dashed line that travels along the measurement path, so it is obvious
// WHERE the tape goes rather than merely what the measurement is called.
//
// The figure is deliberately abstract. A realistic body would need to pick an
// age, size and skin tone, and would exclude people; a mannequin outline reads
// as "any body".
// ---------------------------------------------------------------------------

const FIGURE = (
  <>
    {/* Head */}
    <circle cx="60" cy="22" r="12" className="fill-none stroke-bone-500" strokeWidth="1.5" />
    {/* Neck */}
    <path d="M60 34 L60 42" className="stroke-bone-500" strokeWidth="1.5" fill="none" />
    {/* Torso */}
    <path
      d="M38 46 Q60 40 82 46 L79 92 Q60 98 41 92 Z"
      className="fill-bone-200 stroke-bone-500"
      strokeWidth="1.5"
    />
    {/* Skirt */}
    <path d="M41 92 L30 168 Q60 176 90 168 L79 92" className="fill-bone-200 stroke-bone-500" strokeWidth="1.5" />
    {/* Arms */}
    <path d="M38 46 L26 96" className="stroke-bone-500" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M82 46 L94 96" className="stroke-bone-500" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </>
);

/** The tape: a dashed clay line that travels its path. */
function Tape({ d, dur = '2.4s' }: { d: string; dur?: string }) {
  return (
    <>
      <path d={d} className="stroke-clay-200" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path
        d={d}
        className="stroke-clay-500"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="8 120"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="128"
          to="0"
          dur={dur}
          repeatCount="indefinite"
        />
      </path>
    </>
  );
}

const PATHS: Record<string, string> = {
  bust: 'M36 60 Q60 72 84 60',
  underbust: 'M37 74 Q60 85 83 74',
  waist: 'M40 90 Q60 100 80 90',
  hips: 'M35 112 Q60 124 85 112',
  shoulderToShoulder: 'M38 47 L82 47',
  shoulderToWaist: 'M78 48 L78 92',
  napeToWaist: 'M60 42 L60 92',
  sleeveLength: 'M82 47 L94 96',
  totalLength: 'M82 47 L88 168',
  hollowToHem: 'M60 45 L66 168',
  armhole: 'M80 48 Q92 58 84 68',
  bicep: 'M79 64 Q86 70 90 64',
  chest: 'M36 60 Q60 72 84 60',
  shirtLength: 'M82 47 L80 120',
  trouserWaist: 'M40 90 Q60 100 80 90',
  inseam: 'M58 122 L54 172',
  length: 'M30 40 L30 170',
  width: 'M30 100 L90 100',
};

export default function MeasurementDiagram({ fieldKey, className = '' }: Props) {
  const path = PATHS[fieldKey];

  return (
    <svg
      viewBox="0 0 120 190"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="Diagram showing where to place the tape measure"
    >
      {FIGURE}
      {path && <Tape d={path} />}
    </svg>
  );
}
