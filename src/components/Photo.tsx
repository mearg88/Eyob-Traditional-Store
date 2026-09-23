import { useState } from 'react';

interface Props {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  /** The first photograph on a page loads eagerly; everything else waits. */
  priority?: boolean;
  /** Aspect ratio as a Tailwind class, e.g. 'aspect-[3/4]'. */
  ratio?: string;
}

/**
 * A photograph with a placeholder and lazy loading.
 *
 * Performance matters disproportionately here: much of this audience is on a
 * mid-range Android phone over 3G, and the photographs are the product. The
 * `sizes` hint lets the browser choose the smallest rendition that will do
 * rather than pulling a 1200px file onto a 360px screen.
 */
export default function Photo({
  src, alt, className = '', sizes, priority, ratio = '',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-bone-300 ${ratio} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="tibeb-rule w-14 opacity-45" aria-hidden />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-bone-200 ${ratio} ${className}`}>
      {!loaded && <div className="absolute inset-0 shimmer" aria-hidden />}
      <img
        src={src}
        alt={alt}
        sizes={sizes ?? '(max-width: 640px) 100vw, 33vw'}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
