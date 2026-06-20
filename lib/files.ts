// Raster formats the browser can reliably decode to a canvas.
// HEIC/HEIF (iPhone photos) are accepted too — they're transcoded to PNG
// via heic2any before ever touching an <img>, since no browser decodes them natively.
export const ACCEPT_ATTR =
  "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,image/svg+xml,image/heic,image/heif,.heic,.heif";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXT = /\.(png|jpe?g|webp|gif|bmp|avif|svg|heic|heif)$/i;

export function isHeic(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.hei[cf]$/i.test(file.name)
  );
}

export function isSupportedImage(file: File): boolean {
  // Trust a known MIME type; fall back to extension when the OS supplies none.
  return ALLOWED_MIME.has(file.type) || (!file.type && ALLOWED_EXT.test(file.name));
}

export const UNSUPPORTED_MESSAGE =
  "Unsupported file. Choose a PNG, JPG, WebP, GIF, BMP, AVIF, HEIC, or SVG image.";

export type LoadedImage = {
  img: HTMLImageElement;
  url: string;
  width: number;
  height: number;
  bytes: number;
  name: string;
  type: string;
};

function decodeToImg(blob: Blob): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

/** Decode a File into an <img> (with object URL + metadata). HEIC/HEIF is transcoded to PNG first. */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  let source: Blob = file;
  if (isHeic(file)) {
    const { default: heic2any } = await import("heic2any");
    const result = await heic2any({ blob: file, toType: "image/png" });
    source = Array.isArray(result) ? result[0] : result;
  }
  const { img, url } = await decodeToImg(source);
  return {
    img,
    url,
    width: img.naturalWidth,
    height: img.naturalHeight,
    bytes: file.size,
    name: file.name,
    type: file.type,
  };
}

/** Strip the extension to build a download filename. */
export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "image";
}
