import { useState } from 'react';
import { Camera, Loader2, Star } from 'lucide-react';
import { getData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { objectUrl, processImage } from '../lib/images';

interface Props {
  designId: string;
  orderId: string;
  onDone(): void;
}

/**
 * Only shown to a customer whose order was delivered and contained this
 * design. The database enforces the same rule, so this is a convenience rather
 * than the guard.
 */
export default function ReviewForm({ designId, orderId, onDone }: Props) {
  const customer = useAuth((s) => s.customer);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!customer) return null;

  const addPhoto = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const result = await processImage(files[0]);
      const rendition = result.renditions.find((r) => r.name === 'listing') ?? result.renditions[0];
      setPhotos((p) => [...p, objectUrl(rendition.blob)]);
    } catch {
      setError('That photo could not be added.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await getData();
      await data.submitReview({
        designId, orderId,
        customerId: customer.id,
        authorName: customer.fullName,
        rating, body, photoKeys: photos,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That review could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6">
      <h3 className="font-display text-lg">How was it?</h3>

      <div className="mt-4 flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n} type="button" onClick={() => setRating(n)}
            aria-label={`${n} out of 5`}
            className="p-1"
          >
            <Star
              size={22}
              className={n <= rating ? 'fill-gold-300 text-gold-300' : 'text-bone-400'}
            />
          </button>
        ))}
      </div>

      <label className="field-label mt-5" htmlFor="review-body">Your review</label>
      <textarea
        id="review-body" required rows={4} value={body}
        onChange={(e) => setBody(e.target.value)}
        className="field-boxed"
        placeholder="How was the fit, the fabric, the delivery?"
      />

      {/* A customer's own photograph is the most persuasive thing on a product
          page — far more than any studio shot. */}
      <div className="mt-5">
        <p className="field-label">Add a photo of yourself wearing it</p>
        <div className="flex flex-wrap gap-2">
          {photos.map((src) => (
            <img key={src} src={src} alt="" className="h-20 w-16 object-cover" />
          ))}
          <label className="flex h-20 w-16 cursor-pointer items-center justify-center border border-dashed border-ink-900/25 text-ink-300 hover:border-clay-400">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            <input type="file" accept="image/*" className="sr-only"
              onChange={(e) => addPhoto(e.target.files)} />
          </label>
        </div>
      </div>

      {error && <p className="mt-4 bg-clay-50 p-3 text-sm text-clay-700">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
        {busy ? 'Sending…' : 'Send review'}
      </button>
      <p className="mt-2 text-center text-xs text-ink-300">
        We read every review before it appears.
      </p>
    </form>
  );
}
