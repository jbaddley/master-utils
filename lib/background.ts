import type { RGBA } from "./palette";

/**
 * Remove a solid background by flood-filling inward from the image edges,
 * clearing pixels within `tolerance` of the sampled corner color. Because it
 * grows from the border, interior regions that happen to match the background
 * color are kept. If the corners are already transparent, only transparent
 * regions are treated as background (so it's a safe no-op on cut-out images).
 */
export function removeBackground(src: ImageData, tolerance = 40): ImageData {
  const { width, height } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), width, height);
  const d = out.data;
  const n = width * height;

  const bg = cornerColor(d, width, height);
  const bgTransparent = bg.a < 128;
  const tol2 = tolerance * tolerance;

  const matches = (idx: number): boolean => {
    const o = idx * 4;
    if (bgTransparent) return d[o + 3] < 128;
    if (d[o + 3] < 128) return true; // existing transparency is background too
    const dr = d[o] - bg.r;
    const dg = d[o + 1] - bg.g;
    const db = d[o + 2] - bg.b;
    return dr * dr + dg * dg + db * db <= tol2;
  };

  const visited = new Uint8Array(n);
  const stack: number[] = [];
  const seed = (idx: number) => {
    if (!visited[idx] && matches(idx)) {
      visited[idx] = 1;
      stack.push(idx);
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed(x + (height - 1) * width);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  while (stack.length) {
    const idx = stack.pop()!;
    d[idx * 4 + 3] = 0; // clear to transparent
    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) seed(idx - 1);
    if (x < width - 1) seed(idx + 1);
    if (y > 0) seed(idx - width);
    if (y < height - 1) seed(idx + width);
  }
  return out;
}

/**
 * Flood-fill from a single point, clearing the connected region of pixels
 * within `tolerance` of the clicked color to transparent. Use this to erase
 * pockets the edge-based background remover can't reach (e.g. gaps enclosed by
 * the subject), or any block of color the user wants gone.
 */
export function floodEraseAt(
  src: ImageData,
  x: number,
  y: number,
  tolerance = 48,
): ImageData {
  const { width, height } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), width, height);
  const d = out.data;
  const start = y * width + x;
  if (d[start * 4 + 3] < 128) return out; // clicked a transparent pixel

  const ref = { r: d[start * 4], g: d[start * 4 + 1], b: d[start * 4 + 2] };
  const tol2 = tolerance * tolerance;
  const matches = (idx: number): boolean => {
    const o = idx * 4;
    if (d[o + 3] < 128) return false;
    const dr = d[o] - ref.r;
    const dg = d[o + 1] - ref.g;
    const db = d[o + 2] - ref.b;
    return dr * dr + dg * dg + db * db <= tol2;
  };

  const visited = new Uint8Array(width * height);
  const stack: number[] = [start];
  visited[start] = 1;
  const seed = (idx: number) => {
    if (!visited[idx] && matches(idx)) {
      visited[idx] = 1;
      stack.push(idx);
    }
  };
  while (stack.length) {
    const idx = stack.pop()!;
    d[idx * 4 + 3] = 0;
    const px = idx % width;
    const py = (idx - px) / width;
    if (px > 0) seed(idx - 1);
    if (px < width - 1) seed(idx + 1);
    if (py > 0) seed(idx - width);
    if (py < height - 1) seed(idx + width);
  }
  return out;
}

// Background reference = average of the corners that agree with the top-left
// one, so a stray colored corner doesn't skew it.
function cornerColor(d: Uint8ClampedArray, width: number, height: number): RGBA {
  const idxs = [0, width - 1, (height - 1) * width, height * width - 1];
  const cols = idxs.map((i) => ({
    r: d[i * 4],
    g: d[i * 4 + 1],
    b: d[i * 4 + 2],
    a: d[i * 4 + 3],
  }));
  const ref = cols[0];
  const near = cols.filter(
    (c) => (c.r - ref.r) ** 2 + (c.g - ref.g) ** 2 + (c.b - ref.b) ** 2 <= 40 * 40,
  );
  const count = near.length;
  return {
    r: Math.round(near.reduce((s, c) => s + c.r, 0) / count),
    g: Math.round(near.reduce((s, c) => s + c.g, 0) / count),
    b: Math.round(near.reduce((s, c) => s + c.b, 0) / count),
    a: Math.round(near.reduce((s, c) => s + c.a, 0) / count),
  };
}
