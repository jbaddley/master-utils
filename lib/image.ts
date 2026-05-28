export { imageToImageData } from "./tracer";

/** Encode a canvas to a Blob of the given MIME type / quality (0–1). */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
      mime,
      quality,
    ),
  );
}

/** Draw an image (or canvas) onto a canvas, optionally flattened onto a bg. */
export function drawToCanvas(
  src: CanvasImageSource,
  w: number,
  h: number,
  background?: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** True for formats that can't carry transparency (so we flatten onto white). */
export function isOpaqueFormat(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/bmp";
}

/** Encode raw pixels to a Blob, flattening onto white for opaque formats. */
export function imageDataToBlob(
  data: ImageData,
  mime: string,
  quality?: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");
  if (isOpaqueFormat(mime)) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.putImageData(data, 0, 0);
  return canvasToBlob(canvas, mime, quality);
}
