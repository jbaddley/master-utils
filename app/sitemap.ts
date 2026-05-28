import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { TOOLS, CONVERSIONS } from "@/lib/tools";
import { PLATFORM_PAGES } from "@/lib/platform-pages";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const EXTRA_PAGES = [
    "pricing", "history", "api-docs", "embed", "workflow",
    // Audio tools
    "audio-converter", "mp4-to-mp3", "wav-to-mp3", "ogg-to-mp3", "m4a-to-mp3", "mp3-to-wav",
    "trim-audio", "normalize-audio", "remove-silence-from-audio",
    "change-audio-speed", "audio-fade", "change-audio-pitch", "merge-audio",
    "voice-recorder", "online-voice-recorder",
    // Image tools
    "upscale-image",
    // QR tools
    "qr-code-generator", "wifi-qr-code-generator", "qr-code-for-url", "restaurant-menu-qr-code", "vcard-qr-code", "dynamic-qr-code",
    // Video tools
    "video-converter", "trim-video", "mute-video", "remove-audio-from-video",
    "video-thumbnail-generator", "video-to-mp3", "video-to-gif",
    "compress-video", "compress-video-for-web", "compress-video-for-email",
    "mp4-to-webm", "webm-to-mp4", "mov-to-mp4",
  ];
  const paths = Array.from(
    new Set(["", ...TOOLS.map((t) => t.slug), ...CONVERSIONS, ...PLATFORM_PAGES.map((p) => p.slug), ...EXTRA_PAGES]),
  );
  return paths.map((p) => ({
    url: p ? `${SITE_URL}/${p}/` : `${SITE_URL}/`,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : PLATFORM_PAGES.some((pp) => pp.slug === p) ? 0.7 : 0.8,
  }));
}
