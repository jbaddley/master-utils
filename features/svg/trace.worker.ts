import ImageTracer, { type PaletteColor, type TracerOptions } from "imagetracerjs";
import { ensureViewBox } from "@/lib/tracer";
import { hasTransparency, quantizeToPalette } from "@/lib/palette";
import { optimizeSvg } from "@/lib/optimize";

export type TraceRequest = {
  imageData: ImageData;
  options: TracerOptions;
  cleanup: boolean;
};
export type TraceResponse =
  | { ok: true; svg: string; rawBytes: number; cleaned: boolean }
  | { ok: false; error: string };

const byteSize = (s: string) => new Blob([s]).size;

self.onmessage = (e: MessageEvent<TraceRequest>) => {
  const { imageData, options, cleanup } = e.data;
  try {
    const pal = options.pal as PaletteColor[] | undefined;
    let data = imageData;
    let opts = options;
    if (Array.isArray(pal) && pal.length > 0) {
      data = quantizeToPalette(imageData, pal);
      // Give the tracer a fully-transparent color so background pixels map to
      // it (and render invisibly) instead of snapping to the nearest opaque one.
      if (hasTransparency(imageData)) {
        opts = { ...options, pal: [...pal, { r: 0, g: 0, b: 0, a: 0 }] };
      }
    }
    const traced = ensureViewBox(ImageTracer.imagedataToSVG(data, opts));
    const rawBytes = byteSize(traced);
    // SVGO drops the viewBox, so re-add it after optimizing.
    const svg = cleanup ? ensureViewBox(optimizeSvg(traced)) : traced;
    const res: TraceResponse = { ok: true, svg, rawBytes, cleaned: cleanup };
    (self as unknown as Worker).postMessage(res);
  } catch (err) {
    const res: TraceResponse = {
      ok: false,
      error: err instanceof Error ? err.message : "Conversion failed.",
    };
    (self as unknown as Worker).postMessage(res);
  }
};
