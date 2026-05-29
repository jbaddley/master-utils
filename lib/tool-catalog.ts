import type { IconType } from "react-icons";
import {
  LuArchive,
  LuArrowRightLeft,
  LuBraces,
  LuClapperboard,
  LuCrop,
  LuFileText,
  LuImage,
  LuLayoutGrid,
  LuMic,
  LuMusic,
  LuQrCode,
  LuScanText,
  LuScaling,
  LuScissors,
  LuShapes,
  LuSparkles,
  LuStar,
  LuVideo,
  LuVolumeX,
  LuWorkflow,
  LuShield,
  LuEraser,
  LuKey,
  LuFingerprint,
  LuLink,
  LuBrain,
} from "react-icons/lu";
import { PLATFORM_PAGES } from "@/lib/platform-pages";
import { TOOLS } from "@/lib/tools";
import {
  MEDIA_CONVERSIONS,
  NAV_CONVERSION_SLUGS,
  getHubSlug,
  type MediaKind,
} from "@/lib/media-conversions";
import { WORKFLOWS } from "@/lib/workflows";

export type ToolCategory =
  | "image"
  | "format-conversions"
  | "video"
  | "audio"
  | "qr"
  | "workflows"
  | "platform-presets"
  | "ai"
  | "local-ai"
  | "document"
  | "data"
  | "security";

export type CatalogEntry = {
  slug: string;
  title: string;
  tagline: string;
  category: ToolCategory;
  icon?: IconType;
  keywords?: string[];
  featured?: boolean;
  /** If false, hidden from category nav menus (still searchable and in sitemap). */
  inNav?: boolean;
};

export type ToolCategoryInfo = {
  id: ToolCategory;
  label: string;
  description: string;
  icon: IconType;
};

export const TOOL_CATEGORIES: ToolCategoryInfo[] = [
  {
    id: "image",
    label: "Image",
    description: "Compress, resize, crop, convert, and enhance images.",
    icon: LuImage,
  },
  {
    id: "format-conversions",
    label: "Format Conversions",
    description: "Convert images in one tool — output formats depend on input.",
    icon: LuArrowRightLeft,
  },
  {
    id: "video",
    label: "Video",
    description: "Convert video in one tool, then trim, compress, or extract frames.",
    icon: LuVideo,
  },
  {
    id: "audio",
    label: "Audio",
    description: "Convert audio in one tool, then trim, merge, normalize, and more.",
    icon: LuMusic,
  },
  {
    id: "qr",
    label: "QR Codes",
    description: "Generate QR codes for URLs, WiFi, contacts, and menus.",
    icon: LuQrCode,
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Multi-step image processing in one click.",
    icon: LuWorkflow,
  },
  {
    id: "ai",
    label: "AI Tools",
    description: "AI-powered upscaling, enhancement, and background removal.",
    icon: LuSparkles,
  },
  {
    id: "document",
    label: "PDF & OCR",
    description: "Merge, split, convert PDFs and extract text from images.",
    icon: LuFileText,
  },
  {
    id: "data",
    label: "Developer Tools",
    description: "JSON, CSV, and Base64 utilities — instant, in-browser.",
    icon: LuBraces,
  },
  {
    id: "security",
    label: "Security & Privacy",
    description: "Strip metadata, redact images, generate passwords, and inspect URLs.",
    icon: LuShield,
  },
  {
    id: "local-ai",
    label: "Local AI",
    description: "Run open-source LLMs locally — chat, summarize, rewrite, translate, code, and more.",
    icon: LuBrain,
  },
];

const CATEGORY_BY_TOOL_SLUG: Record<string, ToolCategory> = {
  "image-to-svg": "image",
  "compress-image": "image",
  "convert-image": "image",
  "resize-image": "image",
  "crop-image": "image",
  "favicon-generator": "image",
  "remove-background": "image",
  "batch-compress": "image",
  "batch-resize": "image",
  "upscale-image": "image",
  "svg-to-image": "image",
  "convert-audio": "audio",
  "voice-recorder": "audio",
  "convert-video": "video",
  "video-to-gif": "video",
  "qr-code-generator": "qr",
  workflow: "workflows",
  "merge-pdf": "document",
  "split-pdf": "document",
  "pdf-to-image": "document",
  "image-to-pdf": "document",
  "image-to-text": "document",
  "json-formatter": "data",
  "csv-to-json": "data",
  "json-to-csv": "data",
  "base64-encoder": "data",
  "remove-exif": "security",
  "redact-image": "security",
  "password-generator": "security",
  "uuid-generator": "security",
  "url-encoder": "security",
  "url-unshortener": "security",
  "url-parser": "security",
  // Local AI
  "ai-chat":     "local-ai",
  "ai-summarize":"local-ai",
  "ai-rewrite":  "local-ai",
  "ai-translate":"local-ai",
  "ai-code":     "local-ai",
  "ai-extract":  "local-ai",
  "ai-qa":       "local-ai",
  "ai-grammar":  "local-ai",
};

const ORPHAN_ENTRIES: CatalogEntry[] = [
  // Video
  {
    slug: "trim-video",
    title: "Trim Video",
    tagline: "Cut video clips by setting start and end times.",
    category: "video",
    icon: LuVideo,
    keywords: ["cut", "clip"],
  },
  {
    slug: "mute-video",
    title: "Mute Video",
    tagline: "Remove audio from any video file.",
    category: "video",
    icon: LuVolumeX,
    keywords: ["silent", "no audio"],
  },
  {
    slug: "remove-audio-from-video",
    title: "Remove Audio from Video",
    tagline: "Strip the sound track from a video file.",
    category: "video",
    icon: LuVolumeX,
    keywords: ["mute", "silent"],
    inNav: false,
  },
  {
    slug: "video-thumbnail-generator",
    title: "Video Thumbnail Generator",
    tagline: "Extract still frames from video as images.",
    category: "video",
    icon: LuClapperboard,
    keywords: ["frame", "screenshot"],
  },
  {
    slug: "compress-video",
    title: "Compress Video",
    tagline: "Reduce video file size with quality controls.",
    category: "video",
    icon: LuVideo,
    keywords: ["shrink", "reduce"],
  },
  {
    slug: "compress-video-for-web",
    title: "Compress Video for Web",
    tagline: "Optimize video for fast website loading.",
    category: "video",
    icon: LuVideo,
    keywords: ["web", "website"],
  },
  {
    slug: "compress-video-for-email",
    title: "Compress Video for Email",
    tagline: "Shrink video small enough to send by email.",
    category: "video",
    icon: LuVideo,
    keywords: ["email", "attachment"],
  },
  {
    slug: "trim-audio",
    title: "Trim Audio",
    tagline: "Cut audio clips by setting start and end times.",
    category: "audio",
    icon: LuMusic,
    keywords: ["cut", "clip"],
  },
  {
    slug: "normalize-audio",
    title: "Normalize Audio",
    tagline: "Even out volume levels across an audio file.",
    category: "audio",
    icon: LuMusic,
    keywords: ["volume", "loudness"],
  },
  {
    slug: "remove-silence-from-audio",
    title: "Remove Silence from Audio",
    tagline: "Strip silent gaps from audio recordings.",
    category: "audio",
    icon: LuMusic,
    keywords: ["silence", "trim"],
  },
  {
    slug: "change-audio-speed",
    title: "Change Audio Speed",
    tagline: "Speed up or slow down audio without changing pitch.",
    category: "audio",
    icon: LuMusic,
    keywords: ["tempo", "fast", "slow"],
  },
  {
    slug: "change-audio-pitch",
    title: "Change Audio Pitch",
    tagline: "Shift audio pitch up or down.",
    category: "audio",
    icon: LuMusic,
    keywords: ["pitch", "tone"],
  },
  {
    slug: "audio-fade",
    title: "Audio Fade In/Out",
    tagline: "Add smooth fade-in and fade-out effects.",
    category: "audio",
    icon: LuMusic,
    keywords: ["fade", "effect"],
  },
  {
    slug: "merge-audio",
    title: "Merge Audio",
    tagline: "Join multiple audio files into one.",
    category: "audio",
    icon: LuMusic,
    keywords: ["join", "combine", "concatenate"],
  },
  {
    slug: "online-voice-recorder",
    title: "Online Voice Recorder",
    tagline: "Record audio in your browser — no software needed.",
    category: "audio",
    icon: LuMic,
    keywords: ["record", "microphone", "voice"],
    inNav: false,
  },
  // QR
  {
    slug: "qr-code-for-url",
    title: "QR Code for URL",
    tagline: "Generate a scannable QR code for any link.",
    category: "qr",
    icon: LuQrCode,
    keywords: ["link", "url"],
  },
  {
    slug: "wifi-qr-code-generator",
    title: "WiFi QR Code Generator",
    tagline: "Share WiFi credentials as a scannable QR code.",
    category: "qr",
    icon: LuQrCode,
    keywords: ["wifi", "password", "network"],
  },
  {
    slug: "vcard-qr-code",
    title: "vCard QR Code",
    tagline: "Share contact info as a scannable QR code.",
    category: "qr",
    icon: LuQrCode,
    keywords: ["contact", "vcard", "business card"],
  },
  {
    slug: "restaurant-menu-qr-code",
    title: "Restaurant Menu QR Code",
    tagline: "Create a QR code linking to your digital menu.",
    category: "qr",
    icon: LuQrCode,
    keywords: ["menu", "restaurant"],
  },
  {
    slug: "dynamic-qr-code",
    title: "Dynamic QR Code",
    tagline: "Create editable QR codes that redirect to updatable URLs.",
    category: "qr",
    icon: LuQrCode,
    keywords: ["dynamic", "pro", "redirect"],
  },
  {
    slug: "ai-artistic-qr-code-generator",
    title: "AI Artistic QR Code",
    tagline: "Generate stylized QR codes with AI artwork.",
    category: "ai",
    icon: LuSparkles,
    keywords: ["artistic", "qr", "ai"],
  },
  // AI
  {
    slug: "ai-image-upscaler",
    title: "AI Image Upscaler",
    tagline: "Enlarge photos 2× or 4× with Real-ESRGAN AI.",
    category: "ai",
    icon: LuSparkles,
    keywords: ["upscale", "enhance", "esrgan"],
  },
  {
    slug: "ai-photo-enhancer",
    title: "AI Photo Enhancer",
    tagline: "Restore and sharpen images with AI enhancement.",
    category: "ai",
    icon: LuSparkles,
    keywords: ["enhance", "restore", "sharpen"],
  },
  {
    slug: "ai-background-remover",
    title: "AI Background Remover",
    tagline: "Remove and replace image backgrounds with AI.",
    category: "ai",
    icon: LuScissors,
    keywords: ["background", "remove", "transparent"],
  },
  // Workflow aliases
  {
    slug: "prepare-podcast-cover-art",
    title: "Prepare Podcast Cover Art",
    tagline: "Resize to 3000×3000 and compress as WebP for podcast platforms.",
    category: "workflows",
    icon: LuWorkflow,
    keywords: ["podcast", "cover", "spotify"],
  },
  {
    slug: "optimize-shopify-product-images",
    title: "Optimize Shopify Product Images",
    tagline: "Resize and compress product photos for Shopify listings.",
    category: "workflows",
    icon: LuWorkflow,
    keywords: ["shopify", "product", "ecommerce"],
  },
  {
    slug: "strip-metadata",
    title: "Strip Image Metadata",
    tagline: "Remove EXIF and GPS from photos — same as Remove EXIF.",
    category: "security",
    icon: LuShield,
    keywords: ["exif", "gps", "metadata"],
    inNav: false,
  },
  {
    slug: "blackout-tool",
    title: "Blackout Tool",
    tagline: "Redact sensitive areas on images — same as Privacy Redactor.",
    category: "security",
    icon: LuEraser,
    keywords: ["redact", "blackout", "privacy"],
    inNav: false,
  },
];

const DEFAULT_ICONS: Partial<Record<ToolCategory, IconType>> = {
  image: LuImage,
  "format-conversions": LuArrowRightLeft,
  video: LuVideo,
  audio: LuMusic,
  qr: LuQrCode,
  workflows: LuWorkflow,
  ai: LuSparkles,
  document: LuFileText,
  data: LuBraces,
  security: LuShield,
};

function buildCatalog(): CatalogEntry[] {
  const bySlug = new Map<string, CatalogEntry>();

  for (const tool of TOOLS) {
    const category = CATEGORY_BY_TOOL_SLUG[tool.slug] ?? "image";
    bySlug.set(tool.slug, {
      slug: tool.slug,
      title: tool.title,
      tagline: tool.tagline,
      category,
      icon: tool.icon,
      featured: true,
    });
  }

  for (const conv of MEDIA_CONVERSIONS) {
    if (bySlug.has(conv.slug)) continue;
    const category =
      conv.media === "image" ? "format-conversions" : conv.media === "audio" ? "audio" : "video";
    const icon = conv.media === "image" ? LuArrowRightLeft : conv.media === "audio" ? LuMusic : LuVideo;
    bySlug.set(conv.slug, {
      slug: conv.slug,
      title: `${conv.fromLabel} to ${conv.toLabel}`,
      tagline: `Convert ${conv.fromLabel} to ${conv.toLabel} in your browser — private, no upload.`,
      category,
      icon,
      keywords: [conv.fromKey, conv.toKey, conv.fromLabel.toLowerCase(), conv.toLabel.toLowerCase()],
      inNav: NAV_CONVERSION_SLUGS.has(conv.slug),
      featured: false,
    });
  }

  for (const page of PLATFORM_PAGES) {
    bySlug.set(page.slug, {
      slug: page.slug,
      title: page.h1,
      tagline: page.lede.length > 120 ? `${page.lede.slice(0, 117)}…` : page.lede,
      category: "platform-presets",
      icon: page.tool === "resize" ? LuScaling : LuArchive,
      keywords: [page.tool, ...page.slug.split("-").filter((w) => w.length > 3)],
    });
  }

  for (const wf of WORKFLOWS) {
    const slug = `workflow/${wf.id}`;
    bySlug.set(slug, {
      slug,
      title: wf.name,
      tagline: wf.description,
      category: "workflows",
      icon: LuWorkflow,
      keywords: [wf.id.replace(/-/g, " ")],
    });
  }

  for (const entry of ORPHAN_ENTRIES) {
    if (!bySlug.has(entry.slug)) {
      bySlug.set(entry.slug, {
        ...entry,
        icon: entry.icon ?? DEFAULT_ICONS[entry.category],
      });
    }
  }

  return Array.from(bySlug.values());
}

export const TOOL_CATALOG: CatalogEntry[] = buildCatalog();

const categoryLabelById = new Map(TOOL_CATEGORIES.map((c) => [c.id, c.label]));

export function getCategoryLabel(category: ToolCategory): string {
  return categoryLabelById.get(category) ?? category;
}

export function getToolsByCategory(category: ToolCategory): CatalogEntry[] {
  return TOOL_CATALOG.filter((e) => e.category === category).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

const HUB_BY_MEDIA: Record<"format-conversions" | "audio" | "video", MediaKind> = {
  "format-conversions": "image",
  audio: "audio",
  video: "video",
};

/** Tools listed in header/mobile category menus (hubs + popular conversions, not every SEO pair). */
export function getMenuToolsByCategory(category: ToolCategory): CatalogEntry[] {
  const catalogBySlug = new Map(TOOL_CATALOG.map((e) => [e.slug, e]));

  if (category in HUB_BY_MEDIA) {
    const media = HUB_BY_MEDIA[category as keyof typeof HUB_BY_MEDIA];
    const hubSlug = getHubSlug(media);
    const hub = catalogBySlug.get(hubSlug);
    const items: CatalogEntry[] = [];

    if (hub) {
      items.push({ ...hub, category });
    }

    for (const entry of TOOL_CATALOG) {
      if (entry.category !== category) continue;
      if (entry.inNav === false) continue;
      if (entry.slug === hubSlug) continue;
      items.push(entry);
    }

    return items;
  }

  return TOOL_CATALOG.filter((e) => e.category === category && e.inNav !== false).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

/** Count for category pills (menu-visible items). */
export function getMenuCategoryCount(category: ToolCategory): number {
  return getMenuToolsByCategory(category).length;
}

export function getFeaturedByCategory(): Partial<Record<ToolCategory, CatalogEntry[]>> {
  const result: Partial<Record<ToolCategory, CatalogEntry[]>> = {};
  for (const cat of TOOL_CATEGORIES) {
    const featured = TOOL_CATALOG.filter((e) => e.category === cat.id && e.featured);
    if (featured.length > 0) {
      result[cat.id] = featured;
    }
  }
  return result;
}

export function searchTools(query: string): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = TOOL_CATALOG.map((entry) => {
    const haystack = [
      entry.title,
      entry.tagline,
      entry.slug.replace(/\//g, " "),
      getCategoryLabel(entry.category),
      ...(entry.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();

    const titleMatch = entry.title.toLowerCase().includes(q);
    const slugMatch = entry.slug.toLowerCase().includes(q);
    const haystackMatch = haystack.includes(q);
    if (!titleMatch && !slugMatch && !haystackMatch) return null;

    let score = 0;
    if (entry.title.toLowerCase().startsWith(q)) score += 100;
    else if (titleMatch) score += 50;
    if (slugMatch) score += 30;
    if (haystackMatch) score += 10;
    if (entry.featured) score += 5;

    return { entry, score };
  }).filter((x): x is { entry: CatalogEntry; score: number } => x !== null);

  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((x) => x.entry);
}

export function getCatalogHref(slug: string): string {
  return `/${slug}/`;
}
