export type WorkflowStep =
  | { type: "resize"; w: number; h: number; mode: "exact" | "contain" }
  | { type: "compress"; fmt: "image/jpeg" | "image/webp" | "image/png"; quality: number }
  | { type: "favicon-pack" };

export type PresetWorkflow = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  outputExt: string;
  outputMime: string;
};

export const WORKFLOWS: PresetWorkflow[] = [
  {
    id: "podcast-cover-art",
    name: "Podcast Cover Art",
    description: "Resize to 3000×3000 (exact) then compress as WebP at 85% — meets Apple Podcasts & Spotify artwork specs.",
    steps: [
      { type: "resize", w: 3000, h: 3000, mode: "exact" },
      { type: "compress", fmt: "image/webp", quality: 0.85 },
    ],
    outputExt: ".webp",
    outputMime: "image/webp",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    description: "Resize to 1080×1080 (exact) then compress as JPEG at 90% — ideal square format for Instagram feed posts.",
    steps: [
      { type: "resize", w: 1080, h: 1080, mode: "exact" },
      { type: "compress", fmt: "image/jpeg", quality: 0.9 },
    ],
    outputExt: ".jpg",
    outputMime: "image/jpeg",
  },
  {
    id: "shopify-product",
    name: "Shopify Product",
    description: "Fit to 2000×2000 (contain, white background) then compress as WebP at 80% — optimized for Shopify product listings.",
    steps: [
      { type: "resize", w: 2000, h: 2000, mode: "contain" },
      { type: "compress", fmt: "image/webp", quality: 0.8 },
    ],
    outputExt: ".webp",
    outputMime: "image/webp",
  },
  {
    id: "favicon-pack",
    name: "Favicon Pack",
    description: "Resize to 512×512 then export a full favicon pack (512, 256, 192, 180, 32, 16 px) as a ZIP.",
    steps: [
      { type: "resize", w: 512, h: 512, mode: "exact" },
      { type: "favicon-pack" },
    ],
    outputExt: ".zip",
    outputMime: "application/zip",
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube Thumbnail",
    description: "Resize to 1280×720 (exact) then compress as JPEG at 92% — the recommended YouTube thumbnail size.",
    steps: [
      { type: "resize", w: 1280, h: 720, mode: "exact" },
      { type: "compress", fmt: "image/jpeg", quality: 0.92 },
    ],
    outputExt: ".jpg",
    outputMime: "image/jpeg",
  },
];
