/** Draw an image or canvas "contained" (no distortion) onto a transparent square. */
export function renderSquare(
  img: HTMLImageElement | HTMLCanvasElement,
  size: number,
): HTMLCanvasElement {
  const sw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const sh = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");
  const scale = Math.min(size / sw, size / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

export async function canvasPngBytes(c: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not encode PNG.");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Assemble a multi-resolution .ico from PNG-encoded entries. Modern browsers
 * read PNG data embedded in ICO, so we store each size as PNG.
 */
export function buildIco(entries: { size: number; png: Uint8Array }[]): Blob {
  const count = entries.length;
  const header = new Uint8Array(6 + 16 * count);
  const dv = new DataView(header.buffer);
  dv.setUint16(0, 0, true); // reserved
  dv.setUint16(2, 1, true); // type: icon
  dv.setUint16(4, count, true);

  let offset = 6 + 16 * count;
  entries.forEach((e, i) => {
    const o = 6 + 16 * i;
    header[o] = e.size >= 256 ? 0 : e.size; // width (0 means 256)
    header[o + 1] = e.size >= 256 ? 0 : e.size; // height
    header[o + 2] = 0; // palette count
    header[o + 3] = 0; // reserved
    dv.setUint16(o + 4, 1, true); // color planes
    dv.setUint16(o + 6, 32, true); // bits per pixel
    dv.setUint32(o + 8, e.png.length, true); // size of data
    dv.setUint32(o + 12, offset, true); // offset of data
    offset += e.png.length;
  });

  const parts = [header, ...entries.map((e) => e.png)] as unknown as BlobPart[];
  return new Blob(parts, { type: "image/x-icon" });
}

export const HTML_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

export const WEBMANIFEST = JSON.stringify(
  {
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  null,
  2,
);

/** Generate an HTML <head> snippet using custom filenames. */
export function generateHtmlSnippet(icoName: string, pngBase: string): string {
  return `<link rel="icon" href="/${icoName}" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/${pngBase}-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/${pngBase}-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;
}

/** Generate a site.webmanifest JSON string. */
export function generateWebmanifest(): string {
  return JSON.stringify(
    {
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2,
  );
}
