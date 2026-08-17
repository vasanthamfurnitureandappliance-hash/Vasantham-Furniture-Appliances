// Compresses an image File in the browser (canvas-based) until it is at or
// under the target size. Reduces JPEG quality first, then falls back to
// shrinking the image's pixel dimensions if quality reduction alone isn't
// enough (e.g. very large camera photos).
//
// Aadhaar/selfie photos never need to be huge — this keeps them sharp
// enough to read while staying small enough to upload quickly on a weak
// mobile connection.

const MAX_SIZE_BYTES_DEFAULT = 300 * 1024; // 300KB
const MIN_QUALITY = 0.4;
const MIN_DIMENSION = 600; // px, don't shrink below this so text stays legible

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * Compresses an image file to at most `maxSizeKB` (default 300KB).
 * Returns a new File (same base name, .jpg extension, image/jpeg type).
 * If the input is already under the limit, it is still re-encoded as JPEG
 * for a consistent, predictable output — unless it's already small and
 * already a JPEG, in which case the original is returned untouched.
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 300
): Promise<File> {
  const maxBytes = maxSizeKB * 1024;

  // Non-image files (shouldn't happen given upstream validation) pass through.
  if (!file.type.startsWith("image/")) return file;

  if (file.size <= maxBytes && file.type === "image/jpeg") {
    return file;
  }

  const img = await loadImage(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // canvas unsupported — fall back to original

  let quality = 0.85;
  let blob: Blob | null = null;

  // Try reducing quality first at full resolution, then progressively
  // shrink dimensions and retry the quality sweep.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    quality = 0.85;
    while (quality >= MIN_QUALITY) {
      blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= maxBytes) break;
      quality -= 0.1;
    }

    if (blob && blob.size <= maxBytes) break;
    if (width <= MIN_DIMENSION || height <= MIN_DIMENSION) break; // can't shrink further

    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }

  if (!blob) return file; // compression failed entirely — fall back to original

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
}
