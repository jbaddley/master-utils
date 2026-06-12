/** Canonical paths for unified editors. */
export const IMAGE_STUDIO_PATH = "/image-studio";
export const AUDIO_STUDIO_PATH = "/audio-studio";

/** Legacy tool slugs consolidated into Image Studio. */
const IMAGE_STUDIO_SLUGS = new Set([
  "compress-image",
  "resize-image",
  "crop-image",
  "convert-image",
  "remove-background",
  "redact-image",
  "remove-exif",
  "strip-metadata",
  "upscale-image",
  "favicon-generator",
  "blackout-tool",
  "ai-background-remover",
  "ai-image-upscaler",
  "ai-photo-enhancer",
]);

/** Legacy tool slugs consolidated into Audio Studio. */
const AUDIO_STUDIO_SLUGS = new Set([
  "convert-audio",
  "trim-audio",
  "merge-audio",
  "normalize-audio",
  "remove-silence-from-audio",
  "change-audio-speed",
  "change-audio-pitch",
  "audio-fade",
  "audio-pitch-and-speed",
  "video-to-mp3",
]);

export function isImageStudioSlug(slug: string): boolean {
  return slug === "image-studio" || IMAGE_STUDIO_SLUGS.has(slug);
}

export function isAudioStudioSlug(slug: string): boolean {
  return slug === "audio-studio" || AUDIO_STUDIO_SLUGS.has(slug);
}

/** Resolve a tool slug to its public href (studios for consolidated tools). */
export function resolveToolHref(slug: string): string {
  if (IMAGE_STUDIO_SLUGS.has(slug)) return `${IMAGE_STUDIO_PATH}/`;
  if (AUDIO_STUDIO_SLUGS.has(slug)) return `${AUDIO_STUDIO_PATH}/`;
  return `/${slug}/`;
}

/** Affiliate lookup: map legacy slugs to studio keys. */
export function resolveAffiliateSlug(slug: string): string {
  if (IMAGE_STUDIO_SLUGS.has(slug)) return "image-studio";
  if (AUDIO_STUDIO_SLUGS.has(slug)) return "audio-studio";
  return slug;
}
