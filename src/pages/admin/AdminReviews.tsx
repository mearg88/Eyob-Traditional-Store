import { useEffect, useState } from 'react';
import { Check, Star, X } from 'lucide-react';
import { getData } from '../../lib/data';
import type { Review } from '../../lib/types';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await getData();
    setReviews(await data.adminListPendingReviews());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const moderate = async (id: string, approved: boolean) => {
    const data = await getData();
    await data.adminModerateReview(id, approved);
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl">Reviews</h1>
      <p className="mt-1 text-sm text-ink-400">
        Only customers whose order was delivered can write one. Nothing appears on the
        shop until you approve it.
      </p>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 shimmer" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="font-display text-lg">Nothing waiting</p>
          <p className="mt-2 text-sm text-ink-400">No reviews need your attention.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="card p-5">
              <div className="flex items-center gap-2">
                <div className="flex" aria-label={`${review.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n} size={13}
                      className={n <= review.rating ? 'fill-gold-300 text-gold-300' : 'text-bone-400'}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{review.authorName}</span>
                <span className="text-xs text-ink-300">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-500">{review.body}</p>

              {review.photoKeys.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {review.photoKeys.map((key) => (
                    <img key={key} src={key} alt="" className="h-24 w-20 object-cover" />
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button" onClick={() => moderate(review.id, true)}
                  className="btn-primary py-2 text-xs"
                >
                  <Check size={14} /> Publish
                </button>
                <button
                  type="button" onClick={() => moderate(review.id, false)}
                  className="btn-ghost py-2 text-xs"
                >
                  <X size={14} /> Leave hidden
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
