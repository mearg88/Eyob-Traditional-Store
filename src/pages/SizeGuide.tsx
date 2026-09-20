import { Link } from 'react-router-dom';
import { Ruler } from 'lucide-react';
import { useStore } from '../lib/store';
import { MEASUREMENT_FIELDS } from '../lib/measurements';

/**
 * Traditional Ethiopian garments do not map onto S/M/L, and the ready-made
 * pieces here are one of a kind — each one physically exists with fixed
 * dimensions. So the guide teaches the distinction that actually causes
 * returns: whether the numbers on screen describe the garment or the wearer.
 */
export default function SizeGuide() {
  const unit = useStore((s) => s.unit);
  const setUnit = useStore((s) => s.setUnit);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-clay-500">Size guide</p>
      <h1 className="text-3xl sm:text-4xl">Finding your fit</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-500">
        Traditional Ethiopian clothing is not cut to standard sizes. A netela is
        measured by its length, a gabi by how many layers it holds, and a kemis by
        the body it was woven for. We publish real numbers instead of a letter.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-ink-400">Show in</span>
        <div className="inline-flex rounded-sm border border-ink-900/15">
          {(['cm', 'in'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`px-4 py-2 text-sm ${
                unit === u ? 'bg-clay-500 text-cotton-50' : 'text-ink-500 hover:bg-cotton-200'
              }`}
            >
              {u === 'cm' ? 'Centimetres' : 'Inches'}
            </button>
          ))}
        </div>
      </div>

      {/* The distinction that prevents most returns. */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-xl">Ready-made pieces</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            These already exist, so we list{' '}
            <strong className="font-medium text-ink-900">the garment's own measurements</strong>.
            Compare them against a garment you already own and like the fit of — not
            against your body.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-xl">Made to order</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            These are woven after you order, so we ask for{' '}
            <strong className="font-medium text-ink-900">your body measurements</strong>{' '}
            and the weaver adds the ease. Do not add any yourself.
          </p>
        </div>
      </div>

      <h2 className="mt-12 text-2xl">How to measure</h2>
      <p className="mt-2 text-sm text-ink-500">
        Use a soft tape. Keep it level and snug without pulling. If you can, have
        someone else measure you — self-measuring the back is unreliable.
      </p>

      <dl className="mt-6 divide-y divide-ink-900/8 border-y border-ink-900/8">
        {MEASUREMENT_FIELDS.map((field) => (
          <div key={field.key} className="flex gap-4 py-4">
            <Ruler size={16} className="mt-0.5 shrink-0 text-clay-400" />
            <div>
              <dt className="font-medium text-ink-900">{field.label}</dt>
              <dd className="mt-0.5 text-sm text-ink-500">{field.hint}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-10 rounded-sm border border-clay-200 bg-clay-50 p-6">
        <h3 className="font-display text-lg">Not sure?</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Send us the measurements of a dress you already own that fits you well and
          we will tell you which pieces will suit. It costs nothing and saves a
          return.
        </p>
        <Link to="/shop" className="btn-secondary mt-4">Browse the collection</Link>
      </div>
    </div>
  );
}
