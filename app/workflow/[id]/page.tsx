import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { WORKFLOWS } from "@/lib/workflows";
import WorkflowRunner from "@/features/workflow/WorkflowRunner";

export function generateStaticParams() {
  return WORKFLOWS.map((w) => ({ id: w.id }));
}

type Props = { params: Promise<{ id: string }> };

type WorkflowMeta = {
  title: string;
  description: string;
  appName: string;
  lede: string;
  steps: string[];
  faqs: { q: string; a: string }[];
  related: { href: string; label: string }[];
};

const WORKFLOW_META: Record<string, WorkflowMeta> = {
  "podcast-cover-art": {
    title: "Podcast Cover Art — resize & compress to 3000×3000 WebP",
    description:
      "Automatically resize and compress podcast artwork to 3000×3000 at 85% WebP quality — meets Apple Podcasts, Spotify, and Google Podcasts specs in one click.",
    appName: "Podcast Cover Art Optimizer",
    lede: "Prepare perfect podcast artwork in one click. Resizes to 3000×3000 and exports as WebP at 85% quality — compatible with Apple Podcasts, Spotify, and all major directories.",
    steps: [
      "Drop or select your artwork image (PNG, JPG, or WebP).",
      "The workflow resizes it to exactly 3000×3000 pixels.",
      "The image is then compressed as WebP at 85% quality to minimize file size.",
      "Click Download to save your optimized podcast cover art.",
    ],
    faqs: [
      {
        q: "Why 3000×3000 pixels for podcast cover art?",
        a: "Apple Podcasts requires artwork to be between 1400×1400 and 3000×3000 pixels. Uploading at 3000×3000 ensures your art looks sharp on all screens.",
      },
      {
        q: "Why WebP instead of JPEG?",
        a: "WebP produces smaller files at equivalent quality compared to JPEG, reducing bandwidth without sacrificing visual fidelity.",
      },
      {
        q: "Will the workflow crop my image?",
        a: "No — the 'exact' resize mode stretches the image to fill 3000×3000. If your artwork isn't already square, crop it first to avoid distortion.",
      },
      {
        q: "Is my artwork uploaded anywhere?",
        a: "No. The entire workflow runs in your browser using the Canvas API. Your files never leave your device.",
      },
    ],
    related: [
      { href: "/resize-image", label: "Resize image" },
      { href: "/compress-image", label: "Compress image" },
      { href: "/crop-image", label: "Crop image" },
      { href: "/workflow/instagram-post", label: "Instagram Post workflow" },
    ],
  },
  "instagram-post": {
    title: "Instagram Post — resize to 1080×1080 JPEG in one click",
    description:
      "Instantly resize any image to 1080×1080 pixels and compress as JPEG at 90% quality — the ideal format for Instagram feed posts.",
    appName: "Instagram Post Resizer",
    lede: "Get Instagram-ready images instantly. This workflow resizes your photo to 1080×1080 and exports as a 90% quality JPEG — exactly what Instagram recommends for feed posts.",
    steps: [
      "Drop or select any image file.",
      "The workflow resizes it to exactly 1080×1080 pixels.",
      "The image is compressed to JPEG at 90% quality.",
      "Download the result and upload directly to Instagram.",
    ],
    faqs: [
      {
        q: "Why 1080×1080 for Instagram?",
        a: "Instagram displays square feed posts at 1080×1080 pixels. Uploading at exactly this size avoids any re-compression by Instagram's servers.",
      },
      {
        q: "Will the image be cropped?",
        a: "No — the 'exact' mode stretches the image. If your source isn't square, use the Crop Image tool first to get a 1:1 ratio.",
      },
      {
        q: "Should I use JPEG or WebP for Instagram?",
        a: "Instagram recompresses uploads internally, so JPEG at 90% is the standard recommendation to preserve quality through that re-encoding.",
      },
      {
        q: "Is my image processed on a server?",
        a: "No. Everything runs locally in your browser. Your photos are never uploaded anywhere.",
      },
    ],
    related: [
      { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
      { href: "/crop-image", label: "Crop image" },
      { href: "/compress-image", label: "Compress image" },
      { href: "/workflow/shopify-product", label: "Shopify Product workflow" },
    ],
  },
  "shopify-product": {
    title: "Shopify Product Images — optimize to 2000×2000 WebP",
    description:
      "Fit product photos to 2000×2000 with a white background and compress as WebP at 80% — fast, SEO-friendly images ready for Shopify listings.",
    appName: "Shopify Product Image Optimizer",
    lede: "Optimize product photos for Shopify in one step. Fits your image inside a 2000×2000 white canvas and exports as WebP at 80% quality — fast-loading, professional-looking product images.",
    steps: [
      "Drop or select your product photo.",
      "The workflow fits it inside 2000×2000 pixels, preserving the aspect ratio on a white background.",
      "The image is compressed to WebP at 80% quality.",
      "Download and upload directly to your Shopify product listing.",
    ],
    faqs: [
      {
        q: "Why 2000×2000 for Shopify?",
        a: "Shopify recommends 2048×2048 pixels for product images to support zoom functionality. 2000×2000 is close to that standard and is the recommended size for most themes.",
      },
      {
        q: "What does 'contain' mode do?",
        a: "Contain mode fits your image within the 2000×2000 box without cropping, placing it on a white background. This is ideal for product images that aren't perfectly square.",
      },
      {
        q: "Is WebP supported by Shopify?",
        a: "Yes. Shopify's CDN serves WebP to browsers that support it and falls back to JPEG for older browsers automatically.",
      },
      {
        q: "Are my images uploaded to Shopify?",
        a: "No — this tool only creates the optimized file. You download it and upload it to Shopify yourself. No data leaves your browser.",
      },
    ],
    related: [
      { href: "/compress-image-for-shopify", label: "Compress for Shopify" },
      { href: "/resize-image", label: "Resize image" },
      { href: "/compress-image", label: "Compress image" },
      { href: "/workflow/instagram-post", label: "Instagram Post workflow" },
    ],
  },
  "favicon-pack": {
    title: "Favicon Pack — generate all favicon sizes as a ZIP",
    description:
      "Generate a complete favicon pack (512, 256, 192, 180, 32, and 16 px PNG files) from any image and download as a single ZIP file.",
    appName: "Favicon Pack Generator",
    lede: "Generate a complete set of favicons from any image. Outputs PNG files at 512, 256, 192, 180, 32, and 16 pixels — all sizes you need for browsers and PWA manifests, bundled in a ZIP.",
    steps: [
      "Drop or select a square image (ideally 512×512 or larger).",
      "The workflow resizes it to 512×512 as the base size.",
      "Six PNG files are generated: 512, 256, 192, 180, 32, and 16 pixels.",
      "Download the ZIP containing all favicon sizes.",
    ],
    faqs: [
      {
        q: "Which favicon sizes do I need?",
        a: "16×16 and 32×32 are standard browser tab favicons. 180×180 is the Apple Touch Icon. 192×192 and 512×512 are used for Android PWA home screen icons.",
      },
      {
        q: "Should my source image be square?",
        a: "Yes — favicons are always square. If your source isn't square, use the Crop Image tool first to get a 1:1 ratio before running this workflow.",
      },
      {
        q: "What format are the output files?",
        a: "All output files are PNG, which supports transparency and is universally supported for favicons.",
      },
      {
        q: "How do I use the downloaded files?",
        a: "Extract the ZIP and place the files in your website's root or /public folder. Reference them in your HTML <head> with the appropriate <link> tags.",
      },
    ],
    related: [
      { href: "/favicon-generator", label: "Favicon Generator" },
      { href: "/resize-image", label: "Resize image" },
      { href: "/image-to-svg", label: "Image to SVG" },
      { href: "/workflow/podcast-cover-art", label: "Podcast Cover Art workflow" },
    ],
  },
  "youtube-thumbnail": {
    title: "YouTube Thumbnail — resize to 1280×720 JPEG in one click",
    description:
      "Instantly resize any image to 1280×720 pixels and compress as JPEG at 92% quality — YouTube's recommended thumbnail dimensions.",
    appName: "YouTube Thumbnail Creator",
    lede: "Create the perfect YouTube thumbnail in one step. Resizes your image to 1280×720 (16:9) and exports as JPEG at 92% quality — exactly what YouTube recommends.",
    steps: [
      "Drop or select your thumbnail image.",
      "The workflow resizes it to exactly 1280×720 pixels.",
      "The image is compressed as JPEG at 92% quality.",
      "Download and upload directly to your YouTube video.",
    ],
    faqs: [
      {
        q: "Why 1280×720 for YouTube thumbnails?",
        a: "YouTube recommends 1280×720 pixels (16:9 aspect ratio) as the ideal thumbnail size, with a minimum width of 640 pixels.",
      },
      {
        q: "What file size limit does YouTube have for thumbnails?",
        a: "YouTube requires thumbnails to be under 2 MB. JPEG at 92% quality easily stays within this limit for typical photos.",
      },
      {
        q: "Will the image be cropped or stretched?",
        a: "The 'exact' mode fills the 1280×720 canvas exactly. If your source has a different aspect ratio, it will be stretched. Crop to 16:9 first if needed.",
      },
      {
        q: "Is my image processed in the cloud?",
        a: "No. All processing runs in your browser using the Canvas API. Nothing is uploaded anywhere.",
      },
    ],
    related: [
      { href: "/resize-image-for-youtube-thumbnail", label: "Resize for YouTube Thumbnail" },
      { href: "/resize-image-for-youtube", label: "Resize for YouTube" },
      { href: "/compress-image", label: "Compress image" },
      { href: "/workflow/instagram-post", label: "Instagram Post workflow" },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = WORKFLOW_META[id];
  if (!meta) return {};
  return buildMetadata({ title: meta.title, description: meta.description, path: `workflow/${id}` });
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const workflow = WORKFLOWS.find((w) => w.id === id);
  const meta = WORKFLOW_META[id];
  if (!workflow || !meta) notFound();

  return (
    <ToolPage
      slug={`workflow/${id}`}
      h1={workflow.name}
      appName={meta.appName}
      lede={meta.lede}
      steps={meta.steps}
      faqs={meta.faqs}
      related={meta.related}
      showAds
    >
      <WorkflowRunner workflow={workflow} />
    </ToolPage>
  );
}
