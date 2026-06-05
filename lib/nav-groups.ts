import type { IconType } from "react-icons";
import { LuFileText, LuImage, LuLayoutGrid, LuSparkles } from "react-icons/lu";
import {
  TOOL_CATALOG,
  TOOL_CATEGORIES,
  type CatalogEntry,
  type ToolCategory,
} from "@/lib/tool-catalog";

export type NavGroupId = "media" | "documents" | "ai" | "utilities";

export type NavGroup = {
  id: NavGroupId;
  label: string;
  description: string;
  href: string;
  icon: IconType;
  categories: ToolCategory[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "media",
    label: "Media",
    description: "Images, video, and audio — convert, compress, resize, and edit in your browser.",
    href: "/browse/media/",
    icon: LuImage,
    categories: ["image", "format-conversions", "video", "audio", "platform-presets"],
  },
  {
    id: "documents",
    label: "Documents",
    description: "PDF tools, OCR, and developer utilities for text and data.",
    href: "/browse/documents/",
    icon: LuFileText,
    categories: ["document", "data"],
  },
  {
    id: "ai",
    label: "AI",
    description: "Cloud AI enhancement and private local LLM tools.",
    href: "/browse/ai/",
    icon: LuSparkles,
    categories: ["ai", "local-ai"],
  },
  {
    id: "utilities",
    label: "Utilities",
    description: "QR codes, workflows, passwords, and privacy tools.",
    href: "/browse/utilities/",
    icon: LuLayoutGrid,
    categories: ["qr", "workflows", "security"],
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
      tools: TOOL_CATALOG.filter((e) => e.category === cat.id).sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    }))
    .filter((section) => section.tools.length > 0);
}

export function getNavGroupForToolCategory(category: ToolCategory): NavGroup | undefined {
  return NAV_GROUPS.find((g) => g.categories.includes(category));
}
