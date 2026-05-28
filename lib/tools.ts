import type { IconType } from "react-icons";
import {
  LuShapes,
  LuArchive,
  LuArrowRightLeft,
  LuScaling,
  LuCrop,
  LuStar,
  LuScissors,
} from "react-icons/lu";

export type Tool = {
  slug: string; // route path, no leading slash
  title: string; // card title / H1 seed
  nav: string; // short nav label
  tagline: string; // card description
  icon: IconType;
};

/** Every top-level utility, used for nav, the home grid, and the sitemap. */
export const TOOLS: Tool[] = [
  {
    slug: "image-to-svg",
    title: "Image to SVG",
    nav: "Image to SVG",
    tagline: "Trace PNG, JPG & WebP into clean, scalable vector SVG.",
    icon: LuShapes,
  },
  {
    slug: "compress-image",
    title: "Compress Image",
    nav: "Compress",
    tagline: "Shrink JPG, PNG & WebP file size with a live quality preview.",
    icon: LuArchive,
  },
  {
    slug: "png-to-jpg",
    title: "Convert Image",
    nav: "Convert",
    tagline: "Convert between PNG, JPG and WebP — any format pair.",
    icon: LuArrowRightLeft,
  },
  {
    slug: "resize-image",
    title: "Resize Image",
    nav: "Resize",
    tagline: "Resize by pixels or percent, with aspect-ratio lock.",
    icon: LuScaling,
  },
  {
    slug: "crop-image",
    title: "Crop Image",
    nav: "Crop",
    tagline: "Crop to any size or aspect ratio with a draggable box.",
    icon: LuCrop,
  },
  {
    slug: "favicon-generator",
    title: "Favicon Generator",
    nav: "Favicon",
    tagline: "Turn any image into a multi-size favicon .ico + app icons.",
    icon: LuStar,
  },
  {
    slug: "remove-background",
    title: "Remove Background",
    nav: "Remove BG",
    tagline: "Erase a solid background to transparent in one click.",
    icon: LuScissors,
  },
];

/** Format-conversion pairs that each get their own SEO landing page. */
export const CONVERSIONS = [
  "png-to-jpg",
  "jpg-to-png",
  "png-to-webp",
  "webp-to-png",
  "jpg-to-webp",
  "webp-to-jpg",
  "gif-to-png",
  "bmp-to-png",
] as const;

export type Conversion = (typeof CONVERSIONS)[number];

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};
const LABEL: Record<string, string> = {
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPG",
  webp: "WebP",
  gif: "GIF",
  bmp: "BMP",
};
const EXT: Record<string, string> = {
  png: ".png",
  jpg: ".jpg",
  jpeg: ".jpg",
  webp: ".webp",
  gif: ".gif",
  bmp: ".bmp",
};

export type ConversionInfo = {
  fromKey: string;
  toKey: string;
  fromLabel: string;
  toLabel: string;
  toMime: string;
  toExt: string;
};

/** Parse a slug like "png-to-jpg" into source/target format info. */
export function parseConversion(slug: string): ConversionInfo | null {
  const m = slug.match(/^([a-z]+)-to-([a-z]+)$/);
  if (!m) return null;
  const [, from, to] = m;
  if (!LABEL[from] || !LABEL[to] || !MIME[to]) return null;
  return {
    fromKey: from,
    toKey: to,
    fromLabel: LABEL[from],
    toLabel: LABEL[to],
    toMime: MIME[to],
    toExt: EXT[to],
  };
}
