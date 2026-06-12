import { CONVERSION_SLUGS } from "@/lib/media-conversions";
import { PLATFORM_PAGES } from "@/lib/platform-pages";
import { TOOLS } from "@/lib/tools";

const HUB_SLUGS = new Set(["image-studio", "audio-studio", "convert-image", "convert-audio", "convert-video"]);

/** Pages not in TOOLS, conversions, or platform presets (workflows, aliases, account). */
const EXTRA_PATHS = [
  "",
  "pricing",
  "why-utilio",
  "history",
  "account",
  "api-docs",
  "embed",
  "workflow",
  "workflow/podcast-cover-art",
  "workflow/instagram-post",
  "workflow/shopify-product",
  "workflow/favicon-pack",
  "workflow/youtube-thumbnail",
  "prepare-podcast-cover-art",
  "optimize-shopify-product-images",
  // Redirect aliases (still indexable)
  "ocr",
  "strip-metadata",
  "blackout-tool",
  "audio-pitch-and-speed",
  "browse/media",
  "browse/documents",
  "browse/ai",
  "browse/utilities",
] as const;

export type SitemapPath = {
  path: string;
  priority: number;
};

function priorityFor(path: string): number {
  if (path === "") return 1;
  if (HUB_SLUGS.has(path)) return 0.95;
  if (TOOLS.some((t) => t.slug === path)) return 0.9;
  if ((CONVERSION_SLUGS as readonly string[]).includes(path)) return 0.85;
  if (PLATFORM_PAGES.some((p) => p.slug === path)) return 0.7;
  return 0.75;
}

/** Deduplicated sitemap paths with SEO priority tiers. */
export function getSitemapPaths(): SitemapPath[] {
  const paths = new Set<string>(EXTRA_PATHS);
  for (const t of TOOLS) paths.add(t.slug);
  for (const slug of CONVERSION_SLUGS) paths.add(slug);
  for (const p of PLATFORM_PAGES) paths.add(p.slug);

  return Array.from(paths)
    .sort((a, b) => {
      if (a === "") return -1;
      if (b === "") return 1;
      return a.localeCompare(b);
    })
    .map((path) => ({ path, priority: priorityFor(path) }));
}
