import type { MetadataRoute } from "next";
import { getSitemapPaths } from "@/lib/sitemap-paths";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return getSitemapPaths().map(({ path, priority }) => ({
    url: path ? `${SITE_URL}/${path}/` : `${SITE_URL}/`,
    changeFrequency: "monthly" as const,
    priority,
  }));
}
