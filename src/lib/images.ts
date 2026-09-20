// ---------------------------------------------------------------------------
// Image processing, done in the browser before upload.
//
// Why here and not on a server: Cloudflare R2's free tier gives 10GB of
// storage and free egress, but no image transformation, and paid resizing
// services are out of scope on a free-tier budget. The browser already has a
// perfectly good image encoder in <canvas>, so the owner's phone does the work
// once at upload time and the shop serves small files forever after.
//
// The practical effect: a 4MB photo straight off a phone camera becomes about
// four renditions totalling roughly 300-500KB. At 50 products x 3 photos that
// is well inside the free allowance, where the originals alone would not be.
// ---------------------------------------------------------------------------

export interface Rendition {
  width: number;
  blob: Blob;
  /** Suffix used in the storage key, e.g. 'listing'. */
  name: string;
}

export const RENDITIONS = [
  { name: 'thumb', width: 200, quality: 0.72 },
  { name: 'listing', width: 600, quality: 0.76 },
  { name: 'detail', width: 1200, quality: 0.8 },
  { name: 'zoom', width: 2000, quality: 0.82 },
] as const;

/**
 * WebP where supported, JPEG otherwise. AVIF would be smaller again but
 * canvas encoding support is still uneven, and a photo that fails to encode
 * is worse than one that is 15% larger.
 */
function bestFormat(): 'image/webp' | 'image/jpeg' {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    img.src = url;
  });
}

/**
 * Produce every rendition from one source file.
 *
 * Never upscales: a 500px photo yields renditions up to 500px and stops, so a
 * small original is not blown up into a large blurry file that costs storage
 * and looks worse.
 */
export async function processImage(file: File): Promise<{
  renditions: Rendition[];
  format: string;
  originalBytes: number;
  processedBytes: number;
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image. Please choose a photo.');
  }

  const img = await loadImage(file);
  const format = bestFormat();
  const renditions: Rendition[] = [];

  for (const spec of RENDITIONS) {
    const width = Math.min(spec.width, img.naturalWidth);
    const height = Math.round((width / img.naturalWidth) * img.naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot process images.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format, spec.quality),
    );
    if (!blob) throw new Error('The photo could not be compressed. Please try another.');

    renditions.push({ width, blob, name: spec.name });

    // Once a rendition hits the original's width, larger ones would only
    // upscale. Stop here.
    if (width === img.naturalWidth) break;
  }

  return {
    renditions,
    format,
    originalBytes: file.size,
    processedBytes: renditions.reduce((sum, r) => sum + r.blob.size, 0),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** R2's free tier. Surfaced in the admin so the owner sees it coming. */
export const R2_FREE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

export function objectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
