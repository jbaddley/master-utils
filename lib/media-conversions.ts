export type MediaKind = "image" | "audio" | "video";

export type MediaConversionInfo = {
  slug: string;
  media: MediaKind;
  fromKey: string;
  toKey: string;
  fromLabel: string;
  toLabel: string;
  /** MIME for image outputs; extension key for audio/video */
  toMime?: string;
  toExt: string;
  /** Narrow accepted inputs on SEO landings (default: all for that media) */
  acceptedInputs?: string[];
  /** Video → audio extraction (no video track in output) */
  extractAudio?: boolean;
};

// —— Image ——
export const IMAGE_LABEL: Record<string, string> = {
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPG",
  webp: "WebP",
  gif: "GIF",
  bmp: "BMP",
  avif: "AVIF",
  svg: "SVG",
};
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};
const IMAGE_EXT: Record<string, string> = {
  png: ".png",
  jpg: ".jpg",
  webp: ".webp",
  avif: ".avif",
};

/** Valid output keys per input format */
export const IMAGE_OUTPUT_BY_INPUT: Record<string, string[]> = {
  png: ["jpg", "webp", "avif", "png"],
  jpg: ["png", "webp", "avif", "jpg"],
  jpeg: ["png", "webp", "avif", "jpg"],
  webp: ["png", "jpg", "avif", "webp"],
  gif: ["png", "jpg", "webp"],
  bmp: ["png", "jpg", "webp"],
  avif: ["png", "jpg", "webp"],
  svg: ["png", "jpg", "webp"],
};

export const IMAGE_INPUT_FORMATS = ["png", "jpg", "webp", "gif", "bmp", "avif", "svg"] as const;

// SVG→* conversions are handled by the dedicated /svg-to-image/ page
const SKIP_FROM_FORMATS = new Set(["svg"]);

function buildImageConversions(): MediaConversionInfo[] {
  const slugs: MediaConversionInfo[] = [];
  for (const [from, outputs] of Object.entries(IMAGE_OUTPUT_BY_INPUT)) {
    if (SKIP_FROM_FORMATS.has(from)) continue;
    for (const to of outputs) {
      if (from === to) continue;
      if (!IMAGE_MIME[to]) continue;
      const fromKey = from === "jpeg" ? "jpg" : from;
      const toKey = to === "jpeg" ? "jpg" : to;
      slugs.push({
        slug: `${fromKey}-to-${toKey}`,
        media: "image",
        fromKey,
        toKey,
        fromLabel: IMAGE_LABEL[fromKey] ?? fromKey.toUpperCase(),
        toLabel: IMAGE_LABEL[toKey] ?? toKey.toUpperCase(),
        toMime: IMAGE_MIME[toKey],
        toExt: IMAGE_EXT[toKey]!,
        acceptedInputs: [fromKey === "jpg" ? "jpg" : fromKey, ...(fromKey === "jpg" ? ["jpeg"] : [])],
      });
    }
  }
  return slugs;
}

// —— Audio ——
export const AUDIO_LABEL: Record<string, string> = {
  mp3: "MP3",
  wav: "WAV",
  ogg: "OGG",
  m4a: "M4A",
  flac: "FLAC",
  aac: "AAC",
  mp4: "MP4",
};

export const AUDIO_OUTPUT_BY_INPUT: Record<string, string[]> = {
  mp3: ["wav", "ogg", "m4a", "flac", "aac"],
  wav: ["mp3", "ogg", "m4a", "flac", "aac"],
  ogg: ["mp3", "wav", "m4a", "flac", "aac"],
  m4a: ["mp3", "wav", "ogg", "flac", "aac"],
  flac: ["mp3", "wav", "ogg", "m4a", "aac"],
  aac: ["mp3", "wav", "ogg", "m4a", "flac"],
  mp4: ["mp3", "wav", "ogg", "m4a", "flac", "aac"],
  video: ["mp3", "wav", "ogg", "m4a", "flac", "aac"],
};

export const AUDIO_INPUT_FORMATS = Object.keys(AUDIO_OUTPUT_BY_INPUT);

export const VIDEO_AS_AUDIO_INPUTS = ["mp4", "webm", "mov", "avi", "mkv", "ogg", "m4v"];

function buildAudioConversions(): MediaConversionInfo[] {
  const list: MediaConversionInfo[] = [];
  for (const [from, outputs] of Object.entries(AUDIO_OUTPUT_BY_INPUT)) {
    for (const to of outputs) {
      list.push({
        slug: `${from}-to-${to}`,
        media: "audio",
        fromKey: from,
        toKey: to,
        fromLabel: AUDIO_LABEL[from] ?? from.toUpperCase(),
        toLabel: AUDIO_LABEL[to] ?? to.toUpperCase(),
        toExt: `.${to === "aac" ? "m4a" : to}`,
        acceptedInputs: from === "mp4" ? ["mp4"] : [from],
        extractAudio: from === "mp4",
      });
    }
  }
  // Broad video → audio SEO landings
  for (const to of ["mp3", "wav", "ogg", "m4a", "flac", "aac"] as const) {
    list.push({
      slug: `video-to-${to}`,
      media: "audio",
      fromKey: "video",
      toKey: to,
      fromLabel: "Video",
      toLabel: AUDIO_LABEL[to]!,
      toExt: `.${to === "aac" ? "m4a" : to}`,
      acceptedInputs: VIDEO_AS_AUDIO_INPUTS,
      extractAudio: true,
    });
  }
  return list;
}

// —— Video ——
export const VIDEO_LABEL: Record<string, string> = {
  mp4: "MP4",
  webm: "WebM",
  mov: "MOV",
  avi: "AVI",
  mkv: "MKV",
  ogg: "OGG",
};

export const VIDEO_OUTPUT_BY_INPUT: Record<string, string[]> = {
  mp4: ["webm", "ogg", "mp4"],
  webm: ["mp4", "ogg", "webm"],
  mov: ["mp4", "webm"],
  avi: ["mp4", "webm"],
  mkv: ["mp4", "webm"],
  ogg: ["mp4", "webm"],
};

export const VIDEO_INPUT_FORMATS = Object.keys(VIDEO_OUTPUT_BY_INPUT);

function buildVideoConversions(): MediaConversionInfo[] {
  const list: MediaConversionInfo[] = [];
  for (const [from, outputs] of Object.entries(VIDEO_OUTPUT_BY_INPUT)) {
    for (const to of outputs) {
      if (from === to) continue;
      list.push({
        slug: `${from}-to-${to}`,
        media: "video",
        fromKey: from,
        toKey: to,
        fromLabel: VIDEO_LABEL[from] ?? from.toUpperCase(),
        toLabel: VIDEO_LABEL[to] ?? to.toUpperCase(),
        toExt: `.${to}`,
        acceptedInputs: [from],
      });
    }
  }
  return list;
}

export const MEDIA_CONVERSIONS: MediaConversionInfo[] = [
  ...buildImageConversions(),
  ...buildAudioConversions(),
  ...buildVideoConversions(),
];

export const CONVERSION_SLUGS = MEDIA_CONVERSIONS.map((c) => c.slug);

const bySlug = new Map(MEDIA_CONVERSIONS.map((c) => [c.slug, c]));

export function getMediaConversion(slug: string): MediaConversionInfo | null {
  return bySlug.get(slug) ?? null;
}

export function getConversionsForMedia(media: MediaKind): MediaConversionInfo[] {
  return MEDIA_CONVERSIONS.filter((c) => c.media === media);
}

export function getHubSlug(media: MediaKind): string {
  return media === "image" ? "image-studio" : media === "audio" ? "audio-studio" : "convert-video";
}

/** Shown in nav menus alongside converter hubs (SEO pages stay in sitemap/search). */
export const POPULAR_CONVERSION_SLUGS: Record<MediaKind, readonly string[]> = {
  image: ["png-to-jpg", "jpg-to-png", "webp-to-png", "png-to-webp", "jpg-to-webp", "png-to-avif"],
  audio: ["mp4-to-mp3", "wav-to-mp3", "video-to-mp3", "mp3-to-wav", "m4a-to-mp3"],
  video: ["mp4-to-webm", "mov-to-mp4", "webm-to-mp4"],
};

export const NAV_CONVERSION_SLUGS = new Set([
  ...POPULAR_CONVERSION_SLUGS.image,
  ...POPULAR_CONVERSION_SLUGS.audio,
  ...POPULAR_CONVERSION_SLUGS.video,
]);

/** @deprecated Use getMediaConversion — kept for image-only call sites during migration */
export function parseConversion(slug: string): {
  fromKey: string;
  toKey: string;
  fromLabel: string;
  toLabel: string;
  toMime: string;
  toExt: string;
} | null {
  const info = getMediaConversion(slug);
  if (!info || info.media !== "image" || !info.toMime) return null;
  return {
    fromKey: info.fromKey,
    toKey: info.toKey,
    fromLabel: info.fromLabel,
    toLabel: info.toLabel,
    toMime: info.toMime,
    toExt: info.toExt,
  };
}

export const CONVERSIONS = CONVERSION_SLUGS.filter(
  (s) => getMediaConversion(s)?.media === "image",
) as readonly string[];
