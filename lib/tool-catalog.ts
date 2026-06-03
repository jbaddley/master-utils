import type { IconType } from "react-icons";
import {
  LuImage,
  LuMusic,
  LuQrCode,
  LuWrench,
} from "react-icons/lu";
import { TOOLS, type Tool } from "@/lib/tools";

export type ToolCategory = "image" | "audio" | "utilities";

export type CatalogEntry = {
  slug: string;
  title: string;
  tagline: string;
  category: ToolCategory;
  icon?: IconType;
  keywords?: string[];
  featured?: boolean;
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
    id: "audio",
    label: "Audio",
    description: "Convert and process audio files in your browser.",
    icon: LuMusic,
  },
  {
    id: "utilities",
    label: "Utilities",
    description: "QR codes, favicons, workflow templates, and more.",
    icon: LuWrench,
  },
];

const CATEGORY_MAP: Record<string, ToolCategory> = {
  "image-to-svg": "image",
  "compress-image": "image",
  "png-to-jpg": "image",
  "resize-image": "image",
  "crop-image": "image",
  "remove-background": "image",
  "batch-compress": "image",
  "batch-resize": "image",
  "upscale-image": "image",
  "print-prep": "image",
  "audio-converter": "audio",
  "favicon-generator": "utilities",
  "qr-code-generator": "utilities",
  workflow: "utilities",
};

const FEATURED_SLUGS = new Set([
  "compress-image",
  "resize-image",
  "remove-background",
  "image-to-svg",
  "audio-converter",
  "qr-code-generator",
]);

function toolToCatalogEntry(tool: Tool): CatalogEntry {
  return {
    slug: tool.slug,
    title: tool.title,
    tagline: tool.tagline,
    category: CATEGORY_MAP[tool.slug] ?? "utilities",
    icon: tool.icon,
    featured: FEATURED_SLUGS.has(tool.slug),
  };
}

export const TOOL_CATALOG: CatalogEntry[] = TOOLS.map(toolToCatalogEntry);

export function getCategoryLabel(category: ToolCategory): string {
  return TOOL_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function getToolsByCategory(category: ToolCategory): CatalogEntry[] {
  return TOOL_CATALOG.filter((e) => e.category === category);
}

export function getMenuToolsByCategory(category: ToolCategory): CatalogEntry[] {
  return getToolsByCategory(category);
}

export function getMenuCategoryCount(category: ToolCategory): number {
  return getMenuToolsByCategory(category).length;
}

export function searchTools(query: string): CatalogEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = TOOL_CATALOG.map((entry) => {
    let score = 0;
    const title = entry.title.toLowerCase();
    const tagline = entry.tagline.toLowerCase();
    const cat = entry.category.toLowerCase();

    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 60;
    else if (title.includes(q)) score += 30;

    if (tagline.includes(q)) score += 10;
    if (cat.includes(q)) score += 5;
    if (entry.featured) score += 3;

    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);
}

export function getCatalogHref(slug: string): string {
  return `/${slug}`;
}
