import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { getData } from '../../lib/data';
import type {
  Category, CurrencyCode, Measurements, Product, ProductPrice,
} from '../../lib/types';
import { CURRENCIES, formatMoney, parseMoney } from '../../lib/pricing';
import { MEASUREMENT_FIELDS, suggestNominalSize } from '../../lib/measurements';
import { R2_FREE_LIMIT_BYTES, formatBytes, objectUrl, processImage } from '../../lib/images';
import ProductImage from '../../components/ProductImage';

const BLANK: Product = {
  id: '', slug: '', kind: 'one_of_a_kind', status: 'available', name: '',
  categoryId: '', description: '', careInstructions:
    'Hand wash cold with mild soap. Do not bleach. Dry flat in shade. Warm iron on the reverse.',
  fabric: '', colour: '', tibebPattern: '', occasion: [], gender: 'women',
  measurements: {}, nominalSize: '', images: [], featured: false, createdAt: '',
};

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [product, setProduct] = useState<Product>(BLANK);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    (async () => {
      const data = await getData();
      setCategories(await data.listCategories());
      if (!isNew) {
        const all = await data.adminListProducts();
        const found = all.find((p) => p.id === id);
        if (found) {
          setProduct(found);
          setPrices(await data.listPrices([found.id]));
        }
      }
    })();
  }, [id, isNew]);

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setProduct((p) => ({ ...p, [key]: value }));

  const setMeasurement = (key: keyof Measurements, raw: string) => {
    const value = raw === '' ? undefined : Number.parseFloat(raw);
    setProduct((p) => ({
      ...p,
      measurements: { ...p.measurements, [key]: Number.isFinite(value!) ? value : undefined },
    }));
  };

  const priceFor = (currency: CurrencyCode, tier: 'local' | 'international') =>
    prices.find((p) => p.currency === currency && p.tier === tier)?.amount;

  const setPrice = (currency: CurrencyCode, tier: 'local' | 'international', raw: string) => {
    const amount = parseMoney(raw, currency);
    setPrices((current) => {
      const rest = current.filter((p) => !(p.currency === currency && p.tier === tier));
      if (amount === null) return rest;
      return [...rest, { productId: product.id || 'new', currency, tier, amount }];
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessing(true);
    setImageError(null);

    try {
      for (const file of Array.from(files)) {
        const result = await processImage(file);

        // In demo mode there is no R2 bucket, so the largest rendition is held
        // as a blob URL purely so the owner can see the upload working. With
        // R2 credentials the renditions are PUT to the bucket and the key is
        // stored instead.
        const detail = result.renditions.find((r) => r.name === 'detail') ?? result.renditions[0];

        setProduct((p) => ({
          ...p,
          images: [
            ...p.images,
            {
              id: `img-${Date.now()}-${p.images.length}`,
              key: objectUrl(detail.blob),
              alt: `${p.name || 'Product'} photo ${p.images.length + 1}`,
              position: p.images.length,
              widths: result.renditions.map((r) => r.width),
            },
          ],
        }));

        setStorageUsed((n) => n + result.processedBytes);
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'That photo could not be added.');
    } finally {
      setProcessing(false);
    }
  };

  const removeImage = (imageId: string) =>
    setProduct((p) => ({ ...p, images: p.images.filter((i) => i.id !== imageId) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const finalProduct: Product = {
      ...product,
      id: product.id || `prod-${Date.now()}`,
      slug: product.slug || slug,
      createdAt: product.createdAt || new Date().toISOString(),
      nominalSize: product.nominalSize || suggestNominalSize(product.measurements),
    };

    const data = await getData();
    await data.adminSaveProduct(
      finalProduct,
      prices.map((p) => ({ ...p, productId: finalProduct.id })),
    );
    setSaving(false);
    navigate('/admin/products');
  };

  const archive = async () => {
    const data = await getData();
    await data.adminArchiveProduct(product.id);
    navigate('/admin/products');
  };

  const usedPercent = useMemo(
    () => Math.min(100, (storageUsed / R2_FREE_LIMIT_BYTES) * 100),
    [storageUsed],
  );

  return (
    <form onSubmit={save}>
      <Link to="/admin/products" className="btn-ghost mb-3 gap-1 px-0 text-sm">
        <ChevronLeft size={16} /> All pieces
      </Link>

      <h1 className="text-2xl">{isNew ? 'Add a piece' : product.name || 'Edit piece'}</h1>

      <div className="mt-6 space-y-5">
        {/* Photos first: it is what the owner cares about and what takes longest. */}
        <section className="card p-5">
          <h2 className="font-display text-lg">Photos</h2>
          <p className="mt-1 text-sm text-ink-500">
            Take them in daylight against a plain wall. We shrink and compress them
            automatically — you do not need to do anything to the files.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {product.images.map((image) => (
              <div key={image.id} className="relative">
                <ProductImage src={image.key} alt="" sizes="96px" className="h-28 w-24 rounded-sm" />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute -right-2 -top-2 rounded-full bg-clay-500 p-1.5 text-cotton-50"
                  aria-label="Remove this photo"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <label className="flex h-28 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-ink-900/20 text-ink-400 hover:border-clay-400 hover:text-clay-500">
              {processing ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
              <span className="text-[10px]">{processing ? 'Working…' : 'Add photo'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>

          {imageError && <p className="mt-3 text-sm text-clay-600">{imageError}</p>}

          {storageUsed > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-ink-400">
                <span>Storage used this session</span>
                <span>{formatBytes(storageUsed)} of {formatBytes(R2_FREE_LIMIT_BYTES)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cotton-300">
                <div className="h-full bg-forest-500" style={{ width: `${Math.max(1, usedPercent)}%` }} />
              </div>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg">About this piece</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="name">Name</label>
              <input
                id="name" required value={product.name}
                onChange={(e) => set('name', e.target.value)}
                className="field" placeholder="Meskel Celebration Kemis"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="category">Category</label>
              <select
                id="category" required value={product.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className="field"
              >
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="gender">Who it is for</label>
              <select
                id="gender" value={product.gender}
                onChange={(e) => set('gender', e.target.value as Product['gender'])}
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
                id="description" rows={4} value={product.description}
                onChange={(e) => set('description', e.target.value)}
                className="field" placeholder="How it was made, who wove it, what makes it different."
              />
            </div>

            <div>
              <label className="field-label" htmlFor="fabric">Fabric</label>
              <input
                id="fabric" value={product.fabric}
                onChange={(e) => set('fabric', e.target.value)}
                className="field" placeholder="Handspun cotton, shemma weave"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="colour">Colour</label>
              <input
                id="colour" value={product.colour}
                onChange={(e) => set('colour', e.target.value)}
                className="field" placeholder="Cream with red border"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="tibeb">Border pattern (tibeb)</label>
              <input
                id="tibeb" value={product.tibebPattern}
                onChange={(e) => set('tibebPattern', e.target.value)}
                className="field" placeholder="Narrow geometric tibeb in red and gold"
              />
            </div>
          </div>
        </section>

        {/* The one_of_a_kind / made_to_order choice, in the owner's language. */}
        <section className="card p-5">
          <h2 className="font-display text-lg">How you sell it</h2>
          <div className="mt-4 space-y-2">
            <label className={`flex cursor-pointer gap-3 rounded-sm border p-4 ${
              product.kind === 'one_of_a_kind' ? 'border-clay-400 bg-clay-50' : 'border-ink-900/12'
            }`}>
              <input
                type="radio" name="kind" checked={product.kind === 'one_of_a_kind'}
                onChange={() => set('kind', 'one_of_a_kind')}
                className="mt-1 accent-clay-500"
              />
              <span>
                <span className="block font-medium">I have this piece ready</span>
                <span className="block text-sm text-ink-500">
                  One piece only. When it sells it comes off the site automatically.
                </span>
              </span>
            </label>

            <label className={`flex cursor-pointer gap-3 rounded-sm border p-4 ${
              product.kind === 'made_to_order' ? 'border-clay-400 bg-clay-50' : 'border-ink-900/12'
            }`}>
              <input
                type="radio" name="kind" checked={product.kind === 'made_to_order'}
                onChange={() => set('kind', 'made_to_order')}
                className="mt-1 accent-clay-500"
              />
              <span>
                <span className="block font-medium">I weave it after they order</span>
                <span className="block text-sm text-ink-500">
                  Never sells out. The customer sends their measurements.
                </span>
              </span>
            </label>
          </div>

          {product.kind === 'made_to_order' && (
            <div className="mt-4">
              <label className="field-label" htmlFor="lead">How many days until it ships?</label>
              <input
                id="lead" type="number" min="1" max="120"
                value={product.leadTimeDays ?? ''}
                onChange={(e) => set('leadTimeDays', Number.parseInt(e.target.value, 10) || undefined)}
                className="field max-w-[140px]" placeholder="21"
              />
              <p className="mt-1 text-xs text-ink-400">
                Be generous. A customer told three weeks who waits four is unhappy.
              </p>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg">
            {product.kind === 'one_of_a_kind' ? 'Measurements of this garment' : 'Typical measurements'}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {product.kind === 'one_of_a_kind'
              ? 'Measure the garment itself and enter it in centimetres. Customers compare these against something they already own.'
              : 'A guide only — each customer sends their own measurements when they order.'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {MEASUREMENT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="field-label" htmlFor={`adm-${field.key}`}>{field.label}</label>
                <div className="relative">
                  <input
                    id={`adm-${field.key}`} type="number" min="1" step="0.5"
                    value={product.measurements[field.key] ?? ''}
                    onChange={(e) => setMeasurement(field.key, e.target.value)}
                    className="field pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">
                    cm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Prices are typed by hand for every currency, by explicit decision:
            no exchange-rate feed exists anywhere in this system. */}
        <section className="card p-5">
          <h2 className="font-display text-lg">Prices</h2>
          <p className="mt-1 text-sm text-ink-500">
            You set each price yourself. Nothing is converted automatically, so what
            you type is exactly what the customer pays.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 text-left text-xs uppercase tracking-wider text-ink-400">
                  <th className="pb-2 pr-3">Currency</th>
                  <th className="pb-2 pr-3">Inside Ethiopia</th>
                  <th className="pb-2">Abroad</th>
                </tr>
              </thead>
              <tbody>
                {(['ETB', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'SAR'] as CurrencyCode[]).map((code) => (
                  <tr key={code} className="border-b border-ink-900/5">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{code}</span>
                      <span className="ml-2 hidden text-xs text-ink-400 sm:inline">
                        {CURRENCIES[code].region}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {code === 'ETB' ? (
                        <input
                          type="text" inputMode="decimal"
                          defaultValue={
                            priceFor(code, 'local') !== undefined
                              ? (priceFor(code, 'local')! / 100).toString()
                              : ''
                          }
                          onBlur={(e) => setPrice(code, 'local', e.target.value)}
                          className="field w-28 py-1.5 text-sm" placeholder="—"
                        />
                      ) : (
                        <span className="text-xs text-ink-400">local sales are in birr</span>
                      )}
                    </td>
                    <td className="py-2">
                      <input
                        type="text" inputMode="decimal"
                        defaultValue={
                          priceFor(code, 'international') !== undefined
                            ? (priceFor(code, 'international')! / 10 ** CURRENCIES[code].decimals).toString()
                            : ''
                        }
                        onBlur={(e) => setPrice(code, 'international', e.target.value)}
                        className="field w-28 py-1.5 text-sm" placeholder="—"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {priceFor('USD', 'international') !== undefined && (
            <p className="mt-3 text-xs text-ink-400">
              A customer in the USA will see{' '}
              {formatMoney(priceFor('USD', 'international')!, 'USD')}.
            </p>
          )}
        </section>

        <section className="card p-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox" checked={product.featured}
              onChange={(e) => set('featured', e.target.checked)}
              className="h-4 w-4 accent-clay-500"
            />
            <span>
              <span className="block font-medium">Show on the front page</span>
              <span className="block text-sm text-ink-500">Featured pieces appear first.</span>
            </span>
          </label>
        </section>

        <div className="sticky bottom-20 flex gap-3 lg:bottom-4">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : isNew ? 'Add this piece' : 'Save changes'}
          </button>
          {!isNew && (
            <button type="button" onClick={archive} className="btn-secondary">
              Hide
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
