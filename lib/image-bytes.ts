/**
 * Convert any image file (PNG, JPEG, WebP, GIF, BMP, SVG, HEIC/HEIF, …)
 * to either raw JPEG bytes or raw PNG bytes, ready to embed in pdf-lib.
 *
 * Strategy:
 *  1. HEIC/HEIF — decode with heic2any (lazy import) → PNG blob → canvas → bytes
 *  2. SVG       — draw into a sized canvas (handles missing width/height via viewBox)
 *  3. Everything else — draw into a canvas via <img>
 */

/** True when the filename/mime looks like HEIC/HEIF. */
function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

/** True when the filename/mime looks like SVG. */
function isSvg(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".svg") ||
    file.type === "image/svg+xml"
  );
}

/**
 * Parse an SVG file's natural dimensions from its root element.
 * Falls back to the viewBox if width/height aren't explicit integers.
 */
async function svgDimensions(blob: Blob): Promise<{ w: number; h: number }> {
  const text = await blob.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const root = doc.querySelector("svg");
  if (!root) return { w: 1200, h: 900 };

  const wAttr = root.getAttribute("width");
  const hAttr = root.getAttribute("height");
  const vb = root.getAttribute("viewBox");

  const pw = wAttr ? parseFloat(wAttr) : NaN;
  const ph = hAttr ? parseFloat(hAttr) : NaN;
  if (!isNaN(pw) && pw > 0 && !isNaN(ph) && ph > 0) return { w: pw, h: ph };

  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { w: parts[2], h: parts[3] };
    }
  }

  return { w: 1200, h: 900 }; // safe fallback
}

/** Draw a File into an offscreen canvas, return the canvas. */
async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  // ── HEIC / HEIF ──────────────────────────────────────────────────────────
  if (isHeic(file)) {
    // heic2any converts to a PNG/JPEG Blob usable in <img>
    const { default: heic2any } = await import("heic2any");
    const result = await heic2any({ blob: file, toType: "image/png" });
    const pngBlob = Array.isArray(result) ? result[0] : result;
    return blobToCanvas(pngBlob);
  }

  // ── SVG ──────────────────────────────────────────────────────────────────
  if (isSvg(file)) {
    const { w, h } = await svgDimensions(file);
    const url = URL.createObjectURL(file);
    try {
      return await urlToCanvas(url, w, h);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ── Everything else (PNG, JPEG, WebP, GIF, BMP, AVIF, …) ─────────────
  const url = URL.createObjectURL(file);
  try {
    return await urlToCanvas(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Load a URL into an <img>, draw it to a canvas with optional forced size. */
async function urlToCanvas(
  url: string,
  forceW?: number,
  forceH?: number,
): Promise<HTMLCanvasElement> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image"));
    el.src = url;
  });
  const w = forceW ?? img.naturalWidth;
  const h = forceH ?? img.naturalHeight;
  if (!w || !h) throw new Error("Image has zero dimensions — is it a valid image?");
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** Load a Blob via an object URL into a canvas. */
async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await urlToCanvas(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns raw PNG bytes suitable for pdf-lib.embedPng(). */
export async function imageFileToPngBytes(file: File): Promise<Uint8Array> {
  const canvas = await fileToCanvas(file);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Encode failed"))), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/** Returns raw JPEG bytes suitable for pdf-lib.embedJpg(). */
export async function imageFileToJpegBytes(
  file: File,
  quality = 0.92,
): Promise<Uint8Array> {
  const canvas = await fileToCanvas(file);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("Encode failed"))),
      "image/jpeg",
      quality,
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
}
