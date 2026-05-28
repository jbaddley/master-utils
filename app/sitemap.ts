import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { TOOLS, CONVERSIONS } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = Array.from(
    new Set(["", ...TOOLS.map((t) => t.slug), ...CONVERSIONS]),
  );
  return paths.map((p) => ({
    url: p ? `${SITE_URL}/${p}/` : `${SITE_URL}/`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : 0.8,
  }));
}
