import type { Metadata } from "next";

// TODO: set the real production domain before deploy.
export const SITE_URL = "https://imagetools.example";
export const SITE_NAME = "Image Tools";

export function canonical(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return clean ? `${SITE_URL}/${clean}/` : `${SITE_URL}/`;
}

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = canonical(opts.path);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}
