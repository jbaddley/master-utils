import type { IconType } from "react-icons";
import {
  LuBraces,
  LuFileText,
  LuImage,
  LuMusic,
  LuVideo,
} from "react-icons/lu";
import {
  TOOL_CATALOG,
  TOOL_CATEGORIES,
  getMenuToolsByCategory,
  type CatalogEntry,
  type ToolCategory,
} from "@/lib/tool-catalog";
import { resolveToolHref } from "@/lib/studio-links";

export type NavGroupId =
  | "image-studio"
  | "audio-studio"
  | "video-studio"
  | "document-tools"
  | "dev-tools";

export type NavGroup = {
  id: NavGroupId;
  label: string;
  description: string;
  href: string;
  primaryHref: string;
  icon: IconType;
  categories: ToolCategory[];
  searchPlaceholder: string;
  primaryLabel: string;
  primaryDescription: string;
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "image-studio",
    label: "Image Studio",
    description:
      "Edit, compress, resize, convert, and enhance images — all in your browser.",
    href: "/image-studio/",
    primaryHref: "/image-studio/",
    icon: LuImage,
    categories: ["image", "format-conversions", "platform-presets", "ai"],
    searchPlaceholder: "Search image tools... e.g. crop, compress, instagram",
    primaryLabel: "Open Image Studio",
    primaryDescription:
      "Best for chaining image operations: crop, resize, convert, compress, redact, remove background, and export once.",
  },
  {
    id: "audio-studio",
    label: "Audio Studio",
    description:
      "Trim, fade, merge, normalize, and convert audio in one studio.",
    href: "/audio-studio/",
    primaryHref: "/audio-studio/",
    icon: LuMusic,
    categories: ["audio"],
    searchPlaceholder: "Search audio tools... e.g. trim, normalize, mp3",
    primaryLabel: "Open Audio Studio",
    primaryDescription:
      "Best for chaining audio operations: trim, fade, normalize, mix lanes, change speed or pitch, and export once.",
  },
  {
    id: "video-studio",
    label: "Video Studio",
    description: "Convert, trim, compress, and extract audio from video.",
    href: "/video-studio/",
    primaryHref: "/convert-video/",
    icon: LuVideo,
    categories: ["video"],
    searchPlaceholder: "Search video tools... e.g. trim, compress, convert",
    primaryLabel: "Browse video utilities",
    primaryDescription:
      "Video work is organized by task so you can convert, trim, compress, extract audio, or make a GIF from the right tool.",
  },
  {
    id: "document-tools",
    label: "Document Tools",
    description: "Merge, split, and convert PDFs — plus OCR and image-to-text.",
    href: "/document-tools/",
    primaryHref: "/merge-pdf/",
    icon: LuFileText,
    categories: ["document"],
    searchPlaceholder: "Search document tools... e.g. merge, split, ocr",
    primaryLabel: "Browse document utilities",
    primaryDescription:
      "PDF and OCR utilities stay grouped by document task: merge, split, reorder, convert, or extract text.",
  },
  {
    id: "dev-tools",
    label: "Dev Tools",
    description:
      "JSON, CSV, Base64, URL tools, QR codes, passwords, and local AI utilities.",
    href: "/dev-tools/",
    primaryHref: "/json-formatter/",
    icon: LuBraces,
    categories: ["data", "local-ai", "qr", "security", "workflows"],
    searchPlaceholder: "Search dev tools... e.g. json, qr, password",
    primaryLabel: "Browse dev utilities",
    primaryDescription:
      "Developer, QR, privacy, workflow, and local AI helpers stay grouped by the kind of input you are working with.",
  },
];

const groupById = new Map(NAV_GROUPS.map((g) => [g.id, g]));

export function getNavGroup(id: string): NavGroup | undefined {
  return groupById.get(id as NavGroupId);
}

export function getToolsByNavGroup(groupId: NavGroupId): CatalogEntry[] {
  const group = groupById.get(groupId);
  if (!group) return [];
  const cats = new Set(group.categories);
  return TOOL_CATALOG.filter((e) => cats.has(e.category)).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

export function getNavGroupSections(groupId: NavGroupId) {
  const group = groupById.get(groupId);
  if (!group) return [];

  return TOOL_CATEGORIES.filter((cat) => group.categories.includes(cat.id))
    .map((cat) => ({
      ...cat,
      tools: dedupeResolvedTools(getMenuToolsByCategory(cat.id)).sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    }))
    .filter((section) => section.tools.length > 0);
}

export function getNavGroupForToolCategory(
  category: ToolCategory,
): NavGroup | undefined {
  return NAV_GROUPS.find((g) => g.categories.includes(category));
}

function dedupeResolvedTools(entries: CatalogEntry[]): CatalogEntry[] {
  const byHref = new Map<string, CatalogEntry>();

  for (const entry of entries) {
    const href = resolveToolHref(entry.slug);
    const existing = byHref.get(href);
    if (!existing || isBetterRepresentative(entry, existing, href)) {
      byHref.set(href, entry);
    }
  }

  return Array.from(byHref.values());
}

function isBetterRepresentative(
  candidate: CatalogEntry,
  existing: CatalogEntry,
  href: string,
): boolean {
  const hrefSlug = href.replace(/^\/|\/$/g, "");
  if (candidate.slug === hrefSlug && existing.slug !== hrefSlug) return true;
  if (candidate.featured && !existing.featured) return true;
  if (candidate.inNav !== false && existing.inNav === false) return true;
  return false;
}
