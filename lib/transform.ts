/** Mirror an image horizontally ("h") or vertically ("v"). */
export function flipImage(src: ImageData, axis: "h" | "v"): ImageData {
  const { width, height } = src;
  const out = new ImageData(width, height);
  const s = src.data;
  const d = out.data;
  if (axis === "v") {
    // copy whole rows in reverse order
    for (let y = 0; y < height; y++) {
      const from = (height - 1 - y) * width * 4;
      d.set(s.subarray(from, from + width * 4), y * width * 4);
    }
  } else {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const si = (row + (width - 1 - x)) * 4;
        const di = (row + x) * 4;
        d[di] = s[si];
        d[di + 1] = s[si + 1];
        d[di + 2] = s[si + 2];
        d[di + 3] = s[si + 3];
      }
    }
  }
  return out;
}
