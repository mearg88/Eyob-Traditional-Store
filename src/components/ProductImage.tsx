import { useState } from 'react';

interface Props {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  /** The first image on a page should load eagerly; everything else waits. */
  priority?: boolean;
}

/**
 * Product image with a shimmer placeholder and lazy loading.
 *
 * Performance matters disproportionately here: a large share of this audience
 * is on a mid-range Android phone over 3G, and the photographs are the whole
 * product. `sizes` lets the browser pick the smallest rendition that will do
 * rather than pulling the zoom-sized original onto a 360px screen.
 */
export default function ProductImage({ src, alt, className = '', sizes, priority }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-cotton-300 ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="tibeb-band tibeb-band-sm w-16 opacity-40" aria-hidden />
      </div>
    );
  }

  // Unsplash serves arbitrary widths from a query parameter, so we can build a
  // real srcset from one URL. Self-hosted R2 renditions replace this with the
  // widths generated at upload time.
  const srcSet = src.includes('images.unsplash.com')
    ? [400, 800, 1200].map((w) => `${src.replace(/w=\d+/, `w=${w}`)} ${w}w`).join(', ')
    : undefined;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="absolute inset-0 shimmer" aria-hidden />}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes ?? '(max-width: 640px) 100vw, 33vw'}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
