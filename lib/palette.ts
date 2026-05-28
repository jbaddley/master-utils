export type RGBA = { r: number; g: number; b: number; a: number };

type Bucket = { n: number; r: number; g: number; b: number };

/**
 * Extract `count` representative colors so the tracer can vectorize against the
 * picture's real palette.
 *
 * Median cut (by pixel population) drops thin-but-important colors like outline
 * strokes. Instead we build a coarse color histogram, drop anti-aliasing noise,
 * then use farthest-point selection: seed with the most common color and keep
 * adding whichever surviving color is most *distinct* from those already
 * chosen. That preserves visually distinct colors regardless of area.
 */
export function extractPalette(imageData: ImageData, count: number): RGBA[] {
  const { data } = imageData;
  const totalPixels = data.length / 4;
  const step = Math.max(1, Math.floor(totalPixels / 60000));

  // 5-bit-per-channel histogram (32³ cells) keyed by quantized color.
  const SHIFT = 3;
  const buckets = new Map<number, Bucket>();
  let sampled = 0;
  for (let i = 0; i < totalPixels; i += step) {
    const o = i * 4;
    if (data[o + 3] < 128) continue; // opaque pixels only
    sampled++;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const key = ((r >> SHIFT) << 10) | ((g >> SHIFT) << 5) | (b >> SHIFT);
    let e = buckets.get(key);
    if (!e) {
      e = { n: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, e);
    }
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
  }
  if (sampled === 0) return [{ r: 0, g: 0, b: 0, a: 255 }];

  const avg = (e: Bucket): RGBA & { n: number } => ({
    r: Math.round(e.r / e.n),
    g: Math.round(e.g / e.n),
    b: Math.round(e.b / e.n),
    a: 255,
    n: e.n,
  });

  // Drop buckets too small to be real flat colors (anti-aliasing fringe).
  const noiseFloor = Math.max(1, sampled * 0.0015);
  let entries = [...buckets.values()].filter((e) => e.n >= noiseFloor).map(avg);
  if (entries.length === 0) entries = [...buckets.values()].map(avg);

  entries.sort((a, b) => b.n - a.n);
  const chosen = [entries[0]];
  const used = new Set([0]);
  while (chosen.length < count && chosen.length < entries.length) {
    let bestIdx = -1;
    let bestDist = -1;
    for (let i = 0; i < entries.length; i++) {
      if (used.has(i)) continue;
      const e = entries[i];
      let minD = Infinity;
      for (const c of chosen) {
        const d = (e.r - c.r) ** 2 + (e.g - c.g) ** 2 + (e.b - c.b) ** 2;
        if (d < minD) minD = d;
      }
      if (minD > bestDist) {
        bestDist = minD;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    used.add(bestIdx);
    chosen.push(entries[bestIdx]);
  }

  const colors = chosen
    .map(({ r, g, b }) => ({ r, g, b, a: 255 }))
    .sort((a, b) => luminance(a) - luminance(b));
  return dedupe(colors, 10);
}

// Median cut over-splits large flat regions into identical boxes. Drop colors
// that are visually indistinguishable from one already kept.
function dedupe(colors: RGBA[], minDistance = 12): RGBA[] {
  const kept: RGBA[] = [];
  for (const c of colors) {
    if (kept.every((k) => colorDistance(k, c) >= minDistance)) kept.push(c);
  }
  return kept;
}

function colorDistance(a: RGBA, b: RGBA): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * Snap every opaque pixel to its nearest color in `palette`, returning a new
 * ImageData. imagetracerjs won't honor a fixed palette verbatim (it re-averages
 * clusters), so we quantize up front. This also hard-snaps anti-aliased edges,
 * which removes muddy in-between colors and yields cleaner, leaner vectors.
 */
export function quantizeToPalette(src: ImageData, palette: RGBA[]): ImageData {
  const out = new ImageData(src.width, src.height);
  const s = src.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    // Binarize alpha: transparent pixels stay (0,0,0,0) so they never get
    // snapped to an opaque palette color (which would fill the background).
    if (s[i + 3] < 128) continue; // out is zero-initialized → fully transparent
    let best = palette[0];
    let bestDist = Infinity;
    for (const c of palette) {
      const dist = (s[i] - c.r) ** 2 + (s[i + 1] - c.g) ** 2 + (s[i + 2] - c.b) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    d[i] = best.r;
    d[i + 1] = best.g;
    d[i + 2] = best.b;
    d[i + 3] = 255;
  }
  return out;
}

/** True if any pixel is meaningfully transparent. */
export function hasTransparency(src: ImageData): boolean {
  const s = src.data;
  for (let i = 3; i < s.length; i += 4) {
    if (s[i] < 128) return true;
  }
  return false;
}

function luminance(c: RGBA): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

export function rgbaToHex({ r, g, b }: RGBA): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function hexToRgba(hex: string): RGBA {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: 255,
  };
}
