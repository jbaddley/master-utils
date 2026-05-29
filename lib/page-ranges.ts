/** Parse "1-3,5,7" into sorted 1-based page indices within [1, pageCount]. */
export function parsePageRanges(spec: string, pageCount: number): number[] {
  const pages = new Set<number>();
  const parts = spec.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one page or range.");

  for (const part of parts) {
    if (part.includes("-")) {
      const [rawA, rawB] = part.split("-").map((s) => s.trim());
      const a = Number.parseInt(rawA, 10);
      const b = Number.parseInt(rawB, 10);
      if (Number.isNaN(a) || Number.isNaN(b)) throw new Error(`Invalid range: ${part}`);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) {
        if (i < 1 || i > pageCount) throw new Error(`Page ${i} is out of range (1–${pageCount}).`);
        pages.add(i);
      }
    } else {
      const n = Number.parseInt(part, 10);
      if (Number.isNaN(n) || n < 1 || n > pageCount) {
        throw new Error(`Page ${part} is out of range (1–${pageCount}).`);
      }
      pages.add(n);
    }
  }

  return Array.from(pages).sort((x, y) => x - y);
}
