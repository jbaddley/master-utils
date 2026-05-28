import type { QA, RelatedLink } from "@/components/ToolPage";

export type PlatformPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  tool: "resize" | "compress";
  defaultPresetId?: string;
  presetW?: number;
  presetH?: number;
  steps: string[];
  faqs: QA[];
  related: RelatedLink[];
};

export const PLATFORM_PAGES: PlatformPage[] = [
  {
    slug: "resize-image-for-instagram",
    tool: "resize",
    defaultPresetId: "ig-post",
    title: "Resize Image for Instagram — free online tool",
    description:
      "Resize images to perfect Instagram dimensions: 1080×1080 posts, 1080×1920 stories and reels. Free, private, runs in your browser.",
    h1: "Resize Image for Instagram",
    lede:
      "Get pixel-perfect dimensions for every Instagram format — square posts (1080×1080), portrait posts (1080×1350), and Stories/Reels (1080×1920) — all resized locally in your browser.",
    steps: [
      "Drop or select your image.",
      "Choose an Instagram preset (Post, Story, Reel) from the Social Media Presets panel.",
      "Download the resized image.",
    ],
    faqs: [
      {
        q: "What size should Instagram posts be?",
        a: "Instagram recommends 1080×1080 px for square posts, 1080×1350 px for portrait, and 1080×566 px for landscape.",
      },
      {
        q: "What size is an Instagram Story or Reel?",
        a: "Stories and Reels should be 1080×1920 px (9:16 aspect ratio).",
      },
      {
        q: "Are my images uploaded anywhere?",
        a: "No — all resizing runs entirely in your browser. Your files never leave your device.",
      },
    ],
    related: [
      { href: "/compress-image", label: "Compress image" },
      { href: "/crop-image", label: "Crop image" },
      { href: "/png-to-jpg", label: "Convert image" },
    ],
  },
  {
    slug: "resize-image-for-youtube",
    tool: "resize",
    defaultPresetId: "yt-thumb",
    title: "Resize Image for YouTube — thumbnail & banner sizes",
    description:
      "Resize images to YouTube thumbnail (1280×720) and channel art (2560×1440) dimensions. Free, private, runs in your browser.",
    h1: "Resize Image for YouTube",
    lede:
      "Create YouTube-ready thumbnails at 1280×720 px and channel art at 2560×1440 px — resize in your browser instantly, no upload needed.",
    steps: [
      "Drop or select your image.",
      "Pick YouTube Thumbnail (1280×720) or Channel Art (2560×1440) from the presets.",
      "Download the resized file.",
    ],
    faqs: [
      {
        q: "What size is a YouTube thumbnail?",
        a: "YouTube recommends 1280×720 px (16:9 aspect ratio) with a maximum file size of 2 MB.",
      },
      {
        q: "What size is YouTube channel art?",
        a: "YouTube channel banner should be 2560×1440 px. The safe area that shows on all devices is the central 1546×423 px.",
      },
      {
        q: "What format should YouTube thumbnails be?",
        a: "JPG, PNG, or WebP all work. JPG is the most widely used — use our converter if you need to change format.",
      },
    ],
    related: [
      { href: "/crop-image", label: "Crop image" },
      { href: "/compress-image", label: "Compress image" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
    ],
  },
  {
    slug: "resize-image-for-linkedin",
    tool: "resize",
    defaultPresetId: "li-banner",
    title: "Resize Image for LinkedIn — banner & post sizes",
    description:
      "Resize images to correct LinkedIn dimensions: 1584×396 banner, 1200×627 posts. Free, private, runs in your browser.",
    h1: "Resize Image for LinkedIn",
    lede:
      "Resize to LinkedIn's exact dimensions — profile banner (1584×396 px) or link preview posts (1200×627 px) — right in your browser.",
    steps: [
      "Drop or select your image.",
      "Choose LinkedIn Banner or LinkedIn Post from the Social Media Presets panel.",
      "Download the resized image.",
    ],
    faqs: [
      {
        q: "What size is a LinkedIn banner?",
        a: "The LinkedIn profile/company page banner should be 1584×396 px.",
      },
      {
        q: "What size are LinkedIn post images?",
        a: "LinkedIn displays shared link images at 1200×627 px (1.91:1 aspect ratio).",
      },
      {
        q: "Does this tool upload my image?",
        a: "No — resizing is 100% local in your browser. Nothing is sent to a server.",
      },
    ],
    related: [
      { href: "/compress-image", label: "Compress image" },
      { href: "/crop-image", label: "Crop image" },
      { href: "/png-to-jpg", label: "PNG to JPG" },
    ],
  },
  {
    slug: "compress-image-for-shopify",
    tool: "compress",
    title: "Compress Image for Shopify — optimize product photos",
    description:
      "Compress product images for Shopify. Smaller files load faster, improve SEO, and reduce bounce rate. Free, private, browser-based.",
    h1: "Compress Image for Shopify",
    lede:
      "Shopify's image CDN re-compresses uploads anyway — but starting with an optimized file gives you faster load times and a better Lighthouse score. Compress your product photos here, free, with no upload.",
    steps: [
      "Drop or select your product image.",
      "Choose WebP or JPEG output and adjust quality until the file size is under 500 KB.",
      "Download and upload the optimized image to Shopify.",
    ],
    faqs: [
      {
        q: "What is the ideal image size for Shopify?",
        a: "Shopify recommends keeping product images under 70 KB for fastest load times, but under 500 KB is acceptable. Use WebP format for the best compression-to-quality ratio.",
      },
      {
        q: "Will compressing reduce my image quality?",
        a: "At 70–85% quality, compression is nearly invisible to the human eye. Use the live preview to find the right balance.",
      },
      {
        q: "What format should Shopify images be?",
        a: "WebP is best — it's 25–35% smaller than JPEG at the same quality. Shopify supports WebP in all modern browsers.",
      },
    ],
    related: [
      { href: "/resize-image", label: "Resize image" },
      { href: "/png-to-webp", label: "PNG to WebP" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
    ],
  },
  {
    slug: "compress-image-for-web",
    tool: "compress",
    title: "Compress Image for Web — optimize for fast load times",
    description:
      "Compress images for faster web pages. Reduce file size without visible quality loss. Free, private, runs entirely in your browser.",
    h1: "Compress Image for Web",
    lede:
      "Images are the #1 cause of slow web pages. Compress your images to WebP or JPEG here — no upload, no server, just fast local processing that runs in your browser.",
    steps: [
      "Drop or select your image.",
      "Choose WebP for best compression, or JPEG for widest compatibility.",
      "Adjust the quality slider until the file size meets your target.",
      "Download and replace the original on your site.",
    ],
    faqs: [
      {
        q: "What image format is best for the web?",
        a: "WebP is the modern standard — 25–35% smaller than JPEG at the same quality, with alpha transparency support. Use JPEG as a fallback for older browsers.",
      },
      {
        q: "What file size should web images be?",
        a: "Hero images: under 200 KB. Thumbnails and icons: under 30 KB. Product photos: under 100 KB. These are general guidelines — use the smallest size that looks good.",
      },
      {
        q: "Does this affect Core Web Vitals?",
        a: "Yes — LCP (Largest Contentful Paint) is often caused by a large image. Reducing the hero image size can meaningfully improve your Lighthouse score.",
      },
    ],
    related: [
      { href: "/png-to-webp", label: "PNG to WebP" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
      { href: "/resize-image", label: "Resize image" },
    ],
  },
  {
    slug: "compress-image-for-wordpress",
    tool: "compress",
    title: "Compress Image for WordPress — smaller uploads, faster sites",
    description:
      "Compress images before uploading to WordPress. Reduce file size to improve page speed and SEO rankings. Free, private, browser-based.",
    h1: "Compress Image for WordPress",
    lede:
      "Large images are a top cause of slow WordPress sites. Compress before uploading — this tool runs in your browser so your images never leave your device.",
    steps: [
      "Drop or select your image.",
      "Choose WebP or JPEG and dial in the quality slider.",
      "Download the compressed image and upload it to your WordPress Media Library.",
    ],
    faqs: [
      {
        q: "Does WordPress support WebP?",
        a: "Yes — WordPress 5.8+ natively supports WebP uploads. It is the recommended format for smaller file sizes.",
      },
      {
        q: "What image size is best for WordPress?",
        a: "For full-width blog images, aim for 1200–1600 px wide and under 200 KB. For thumbnails, 300–600 px and under 50 KB.",
      },
      {
        q: "Should I use a plugin instead?",
        a: "Plugins like Smush or ShortPixel compress after upload, but compressing before upload is faster and avoids storing the original bloated file.",
      },
    ],
    related: [
      { href: "/resize-image", label: "Resize image" },
      { href: "/png-to-webp", label: "PNG to WebP" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
    ],
  },
];
