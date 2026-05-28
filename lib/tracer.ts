import ImageTracer, { type TracerOptions } from "imagetracerjs";
import type { RGBA } from "./palette";

export type PresetKey =
  | "default"
  | "detailed"
  | "posterized2"
  | "smoothed"
  | "sharp"
  | "grayscale";

export type SimplifyLevel = "none" | "light" | "medium" | "strong";

export const PRESETS: { key: PresetKey; label: string; hint: string }[] = [
  { key: "default", label: "Default", hint: "Balanced color tracing" },
  { key: "detailed", label: "Detailed", hint: "More paths, finer edges" },
  { key: "posterized2", label: "Posterized", hint: "Flat color regions" },
  { key: "smoothed", label: "Smoothed", hint: "Rounded, fewer nodes" },
  { key: "sharp", label: "Sharp", hint: "Hard, angular edges" },
  { key: "grayscale", label: "Grayscale", hint: "Trace as gray tones" },
];

export const SIMPLIFY_LEVELS: { key: SimplifyLevel; label: string; hint: string }[] = [
  { key: "none", label: "None", hint: "Full preset detail" },
  { key: "light", label: "Light", hint: "Drop specks" },
  { key: "medium", label: "Medium", hint: "Fewer colors & nodes" },
  { key: "strong", label: "Strong", hint: "Smallest, blockiest" },
];

// Overrides layered on top of a style preset. Higher values = fewer paths,
// fewer nodes per path, fewer colors → smaller, cleaner SVG.
const SIMPLIFY_OVERRIDES: Record<SimplifyLevel, TracerOptions> = {
  none: {},
  light: { pathomit: 8, ltres: 1, qtres: 1 },
  medium: { pathomit: 16, ltres: 2, qtres: 2, numberofcolors: 12, roundcoords: 1 },
  strong: {
    pathomit: 32,
    ltres: 4,
    qtres: 4,
    numberofcolors: 8,
    roundcoords: 0,
    blurradius: 2,
  },
};

export function buildOptions(
  preset: PresetKey,
  simplify: SimplifyLevel,
  palette?: RGBA[],
): TracerOptions {
  const base = ImageTracer.optionpresets[preset] ?? {};
  // desc:0 strips per-path description attributes that only bloat the file.
  const options: TracerOptions = { ...base, desc: 0, ...SIMPLIFY_OVERRIDES[simplify] };
  if (palette && palette.length > 0) {
    // Trace against the image's real colors. colorsampling:0 tells the tracer
    // to use this fixed palette verbatim instead of generating its own.
    options.pal = palette;
    options.colorsampling = 0;
    // The worker pre-quantizes to this palette, so clusters are already pure —
    // one assignment pass is enough and keeps the colors from drifting.
    options.colorquantcycles = 1;
    delete options.numberofcolors;
  }
  return options;
}

/**
 * imagetracerjs emits width/height but no viewBox, so the SVG clips instead of
 * scaling when sized down with CSS. Inject a matching viewBox (keeping
 * width/height for an intrinsic size) so it scales like a normal image.
 */
export function ensureViewBox(svg: string): string {
  if (svg.includes("viewBox")) return svg;
  const w = svg.match(/width="(\d+(?:\.\d+)?)"/);
  const h = svg.match(/height="(\d+(?:\.\d+)?)"/);
  if (w && h) {
    return svg.replace("<svg ", `<svg viewBox="0 0 ${w[1]} ${h[1]}" `);
  }
  return svg;
}

export function countPaths(svg: string): number {
  return (svg.match(/<path/g) ?? []).length;
}

/** Draw a loaded image onto a canvas and pull out its pixel data. */
export function imageToImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
