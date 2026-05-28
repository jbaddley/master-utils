// Raster formats the browser can reliably decode to a canvas.
export const ACCEPT_ATTR =
  "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
]);
const ALLOWED_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;

export function isSupportedImage(file: File): boolean {
  // Trust a known MIME type; fall back to extension when the OS supplies none.
  return ALLOWED_MIME.has(file.type) || (!file.type && ALLOWED_EXT.test(file.name));
}

export const UNSUPPORTED_MESSAGE =
  "Unsupported file. Choose a PNG, JPG, WebP, GIF, BMP, or AVIF image.";

export type LoadedImage = {
  img: HTMLImageElement;
  url: string;
  width: number;
  height: number;
  bytes: number;
  name: string;
  type: string;
};

/** Decode a File into an <img> (with object URL + metadata). */
export function loadImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({
        img,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        bytes: file.size,
        name: file.name,
        type: file.type,
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

/** Strip the extension to build a download filename. */
export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "image";
}
