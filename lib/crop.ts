/** Extract a rectangular sub-region of an image as a new ImageData. */
export function cropImageData(
  src: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData {
  const out = new ImageData(w, h);
  const s = src.data;
  const d = out.data;
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * src.width + x) * 4;
    d.set(s.subarray(from, from + w * 4), row * w * 4);
  }
  return out;
}

/** Crop a region that may extend outside the source; out-of-bounds areas are transparent. */
export function extendedCropImageData(
  src: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData {
  const out = new ImageData(w, h);
  const s = src.data;
  const d = out.data;
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const sx = x + col;
      const sy = y + row;
      const di = (row * w + col) * 4;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const si = (sy * src.width + sx) * 4;
      d[di] = s[si];
      d[di + 1] = s[si + 1];
      d[di + 2] = s[si + 2];
      d[di + 3] = s[si + 3];
    }
  }
  return out;
}

/** Bounding box of all non-transparent pixels, or null if fully transparent. */
export function contentBounds(
  src: ImageData,
  alphaThreshold = 16,
): { x: number; y: number; w: number; h: number } | null {
  const { width, height, data } = src;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Trim transparent margins so the content fills the frame. */
export function cropToContent(src: ImageData): ImageData {
  const b = contentBounds(src);
  if (!b || (b.w === src.width && b.h === src.height)) return src;
  return cropImageData(src, b.x, b.y, b.w, b.h);
}
