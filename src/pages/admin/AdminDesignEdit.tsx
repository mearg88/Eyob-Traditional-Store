import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, GripVertical, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { getData } from '../../lib/data';
import type {
  Category, Design, DesignOption, DesignPhoto, DesignPrice,
} from '../../lib/types';
import { computePrice, formatMoney, parseMoney } from '../../lib/pricing';
import { R2_FREE_LIMIT_BYTES, formatBytes, objectUrl, processImage } from '../../lib/images';
import { usePricingContext } from '../../lib/hooks';
import Photo from '../../components/Photo';

const BLANK: Design = {
  id: '', slug: '', status: 'draft', name: '', categoryId: '',
  description: '', careInstructions:
    'Hand wash cold with mild soap. Do not bleach. Dry flat in shade. Warm iron on the reverse.',
  fabric: '', colour: '', embroidery: '', occasion: [], gender: 'women',
  productionDays: 21, photos: [], featured: false, createdAt: '', updatedAt: '',
};

const OCCASIONS = ['wedding', 'holiday', 'celebration', 'church', 'everyday'];

export default function AdminDesignEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const pricing = usePricingContext();

  const [design, setDesign] = useState<Design>(BLANK);
  const [prices, setPrices] = useState<DesignPrice[]>([]);
  const [options, setOptions] = useState<DesignOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [bytesAdded, setBytesAdded] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getData();
      setCategories(await data.listCategories());
      if (!isNew) {
        const all = await data.adminListDesigns();
        const found = all.find((d) => d.id === id);
        if (found) {
          setDesign(found);
          const [p, o] = await Promise.all([data.listPrices([found.id]), data.listOptions(found.id)]);
          setPrices(p);
          setOptions(o);
        }
      }
    })();
  }, [id, isNew]);

  const set = <K extends keyof Design>(key: K, value: Design[K]) =>
    setDesign((d) => ({ ...d, [key]: value }));

  const priceFor = (tier: 'local' | 'international') =>
    prices.find((p) => p.tier === tier)?.amount;

  const setPrice = (tier: 'local' | 'international', raw: string) => {
    const currency = tier === 'local' ? 'ETB' : 'USD';
    const amount = parseMoney(raw, currency);
    setPrices((current) => {
      const rest = current.filter((p) => p.tier !== tier);
      if (amount === null) return rest;
      return [...rest, { designId: design.id || 'new', tier, amount }];
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessing(true);
    setPhotoError(null);

    try {
      for (const file of Array.from(files)) {
        const result = await processImage(file);

        // Without R2 credentials the largest rendition is held as a blob URL so
        // the upload can be seen working. With credentials the renditions are
        // PUT to the bucket and the key stored instead.
        const detail = result.renditions.find((r) => r.name === 'detail') ?? result.renditions[0];

        setDesign((d) => ({
          ...d,
          photos: [
            ...d.photos,
            {
              id: `pho-${Date.now()}-${d.photos.length}`,
              key: objectUrl(detail.blob),
              alt: `${d.name || 'Design'} photograph ${d.photos.length + 1}`,
              position: d.photos.length,
              widths: result.renditions.map((r) => r.width),
            },
          ],
        }));

        setBytesAdded((n) => n + result.processedBytes);
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'That photo could not be added.');
    } finally {
      setProcessing(false);
    }
  };

  /** Drag to reorder. The first photograph is the one customers see first. */
  const reorder = (from: number, to: number) => {
    setDesign((d) => {
      const photos = [...d.photos];
      const [moved] = photos.splice(from, 1);
      photos.splice(to, 0, moved);
      return { ...d, photos: photos.map((p, i) => ({ ...p, position: i })) as DesignPhoto[] };
    });
  };

  const save = async (status?: Design['status']) => {
    setSaving(true);
    const slug = design.slug
      || design.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const final: Design = {
      ...design,
      status: status ?? design.status,
      id: design.id || `dsn-${Date.now().toString(36)}`,
      slug,
      createdAt: design.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = await getData();
    await data.adminSaveDesign(
      final,
      prices.map((p) => ({ ...p, designId: final.id })),
      options.map((o) => ({ ...o, designId: final.id })),
    );
    setSaving(false);
    navigate('/admin/designs');
  };

  const archive = async () => {
    const data = await getData();
    await data.adminArchiveDesign(design.id);
    navigate('/admin/designs');
  };

  const usedPercent = Math.min(100, (bytesAdded / R2_FREE_LIMIT_BYTES) * 100);

  // Shows what a customer abroad will actually see, which is not obvious from
  // a dollar figure once the uplift and the exchange rate are applied. Run
  // through computePrice rather than multiplied by hand, so the number here is
  // exactly the number on the storefront — rounding included.
  const intl = priceFor('international');
  const euGroup = pricing.countryGroups.find((g) => g.id === 'grp-eu');
  const usGroup = pricing.countryGroups.find((g) => g.id === 'grp-na');

  const previewFor = (group: typeof euGroup, currency: 'EUR' | 'USD') =>
    intl === undefined
      ? null
      : computePrice({
          designId: 'preview',
          prices: [{ designId: 'preview', tier: 'international', amount: intl }],
          tier: 'international',
          countryGroup: group ?? null,
          displayCurrency: currency,
          rates: pricing.rates,
        });

  const euPreview = previewFor(euGroup, 'EUR');
  const usPreview = previewFor(usGroup, 'USD');

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <Link to="/admin/designs" className="btn-ghost mb-4 gap-1 px-0 text-xs">
        <ChevronLeft size={15} /> All designs
      </Link>

      <h1 className="text-2xl">{isNew ? 'Add a design' : design.name || 'Edit design'}</h1>

      <div className="mt-8 space-y-6">
        {/* Photographs first: it is what matters most and takes longest. */}
        <section className="card p-5">
          <h2 className="font-display text-lg">Photographs</h2>
          <p className="mt-1 text-sm text-ink-400">
            Take them in daylight against a plain wall. We shrink and compress them
            automatically — you do not need to do anything to the files. Drag to
            reorder; the first one is what customers see in the collection.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {design.photos.map((photo, i) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => setDragging(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragging !== null) reorder(dragging, i); setDragging(null); }}
                className="group relative cursor-move"
              >
                <Photo src={photo.key} alt="" sizes="96px" className="h-28 w-24" />
                {i === 0 && (
                  <span className="absolute left-0 top-0 bg-ink-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-bone-50">
                    Main
                  </span>
                )}
                <GripVertical
                  size={13}
                  className="absolute bottom-1 left-1 text-bone-50 opacity-0 transition-opacity group-hover:opacity-80"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDesign((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== photo.id) }))
                  }
                  className="absolute -right-2 -top-2 rounded-full bg-clay-500 p-1.5 text-bone-50"
                  aria-label="Remove this photograph"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}

            <label className="flex h-28 w-24 cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-ink-900/20 text-ink-300 hover:border-clay-400 hover:text-clay-500">
              {processing ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              <span className="text-[10px]">{processing ? 'Working…' : 'Add'}</span>
              <input
                type="file" accept="image/*" multiple className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>

          {photoError && <p className="mt-3 text-sm text-clay-600">{photoError}</p>}

          {bytesAdded > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-ink-300">
                <span>Added this session</span>
                <span>{formatBytes(bytesAdded)} of {formatBytes(R2_FREE_LIMIT_BYTES)}</span>
              </div>
              <div className="mt-1.5 h-px bg-ink-900/10">
                <div className="h-px bg-sage-500" style={{ width: `${Math.max(1, usedPercent)}%` }} />
              </div>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg">About this design</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="name">Name</label>
              <input
                id="name" required value={design.name}
                onChange={(e) => set('name', e.target.value)}
                className="field" placeholder="Off-Shoulder Kemis"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="category">Category</label>
              <select
                id="category" required value={design.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className="field"
              >
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-ink-300">
                Decides which measurements the customer is asked for.
              </p>
            </div>

            <div>
              <label className="field-label" htmlFor="gender">Who it is for</label>
              <select
                id="gender" value={design.gender}
                onChange={(e) => set('gender', e.target.value as Design['gender'])}
                className="field"
              >
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="children">Children</option>
                <option value="unisex">Anyone</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="description">Description</label>
              <textarea
                id="description" rows={4} value={design.description}
                onChange={(e) => set('description', e.target.value)}
                className="field-boxed"
                placeholder="How it is made, what makes it different, who it suits."
              />
            </div>

            <div>
              <label className="field-label" htmlFor="fabric">Fabric</label>
              <input
                id="fabric" value={design.fabric}
                onChange={(e) => set('fabric', e.target.value)}
                className="field" placeholder="Handspun cotton, shemma weave"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="colour">Colour</label>
              <input
                id="colour" value={design.colour}
                onChange={(e) => set('colour', e.target.value)}
                className="field" placeholder="Cream with red border"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="embroidery">Border or embroidery</label>
              <input
                id="embroidery" value={design.embroidery}
                onChange={(e) => set('embroidery', e.target.value)}
                className="field" placeholder="Narrow geometric tibeb in red and gold"
              />
            </div>

            <fieldset className="sm:col-span-2">
              <legend className="field-label">Occasion</legend>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() =>
                      set('occasion', design.occasion.includes(o)
                        ? design.occasion.filter((x) => x !== o)
                        : [...design.occasion, o])
                    }
                    className={`chip capitalize ${design.occasion.includes(o) ? 'chip-active' : ''}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg">How long it takes</h2>
          <div className="mt-4 max-w-[180px]">
            <label className="field-label" htmlFor="days">Working days to make</label>
            <input
              id="days" type="number" min="1" max="120" required
              value={design.productionDays}
              onChange={(e) => set('productionDays', Number.parseInt(e.target.value, 10) || 1)}
              className="field"
            />
          </div>
          <p className="mt-2 text-sm text-ink-400">
            Delivery time is added on top, per destination. Be generous — a customer
            told three weeks who waits four is an unhappy customer, and your refund
            promise is measured against this.
          </p>
        </section>

        {/* Two prices, typed by hand. No exchange-rate feed anywhere: what you
            type is what a customer pays, converted only for display. */}
        <section className="card p-5">
          <h2 className="font-display text-lg">Prices</h2>
          <p className="mt-1 text-sm text-ink-400">
            Two prices. Everything else is worked out from the dollar price.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="price-local">
                Inside Ethiopia (birr)
              </label>
              <input
                id="price-local" type="text" inputMode="decimal"
                defaultValue={priceFor('local') !== undefined ? (priceFor('local')! / 100).toString() : ''}
                onBlur={(e) => setPrice('local', e.target.value)}
                className="field" placeholder="14500"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="price-intl">
                Abroad (US dollars)
              </label>
              <input
                id="price-intl" type="text" inputMode="decimal"
                defaultValue={intl !== undefined ? (intl / 100).toString() : ''}
                onBlur={(e) => setPrice('international', e.target.value)}
                className="field" placeholder="285"
              />
              <p className="mt-1.5 text-xs text-ink-300">
                Delivery is included in this. Each region adds its own uplift on top —
                see Pricing.
              </p>
            </div>
          </div>

          {euPreview && usPreview && (
            <p className="mt-5 bg-bone-200 p-3 text-xs leading-relaxed text-ink-500">
              A customer in Europe sees{' '}
              <strong className="font-medium">
                {formatMoney(euPreview.total, euPreview.currency)}
              </strong>
              {' '}and one in the USA{' '}
              <strong className="font-medium">
                {formatMoney(usPreview.total, usPreview.currency)}
              </strong>
              . These are the exact prices they are shown.
            </p>
          )}
        </section>

        <section className="card p-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox" checked={design.featured}
              onChange={(e) => set('featured', e.target.checked)}
              className="mt-1 h-4 w-4 accent-clay-500"
            />
            <span>
              <span className="block font-medium">Show on the front page</span>
              <span className="block text-sm text-ink-400">
                Featured designs appear in the Chosen pieces row.
              </span>
            </span>
          </label>
        </section>

        {/* Publish is a separate, deliberate act. A half-finished design with
            no photographs should never appear in the shop by accident. */}
        <div className="sticky bottom-20 space-y-2 lg:bottom-4">
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-secondary flex-1">
              {saving ? 'Saving…' : 'Save as draft'}
            </button>
            <button
              type="button"
              disabled={saving || design.photos.length === 0 || !design.name}
              onClick={() => void save('published')}
              className="btn-primary flex-1"
            >
              Publish
            </button>
          </div>
          {design.photos.length === 0 && (
            <p className="text-center text-xs text-ink-300">
              Add at least one photograph before publishing.
            </p>
          )}
          {!isNew && (
            <button type="button" onClick={archive} className="btn-ghost w-full text-xs">
              Hide this design
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
