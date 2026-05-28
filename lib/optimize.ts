import { optimize } from "svgo/browser";

/**
 * Run SVGO's default optimizations (merge paths, simplify curves, snap
 * coordinates, drop redundant data). The default preset strips the viewBox, so
 * the caller must re-add it afterward (see ensureViewBox) — our responsive
 * scaling depends on it.
 */
export function optimizeSvg(svg: string): string {
  return optimize(svg, { multipass: true }).data;
}
