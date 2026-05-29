import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { WORKFLOWS } from "@/lib/workflows";
import WorkflowRunner from "@/features/workflow/WorkflowRunner";

const workflow = WORKFLOWS.find((w) => w.id === "shopify-product")!;

export const metadata: Metadata = buildMetadata({
  title: "Optimize Shopify Product Images — resize & compress free",
  description:
    "Automatically fit product photos to 2000×2000 on a white background and compress as WebP at 80% — fast-loading, professional images ready for Shopify listings.",
  path: "optimize-shopify-product-images",
});

export default function Page() {
  return (
    <ToolPage
      slug="optimize-shopify-product-images"
      h1="Optimize Shopify Product Images"
      appName="Shopify Product Image Optimizer"
      lede="Prepare product photos for Shopify in one step. Fits your image inside a 2000×2000 white canvas and exports as WebP at 80% quality — fast, professional product images without manual resizing."
      steps={[
        "Drop or select your product photo (PNG, JPG, or WebP).",
        "The tool fits it inside a 2000×2000 white canvas, preserving the aspect ratio.",
        "The image is compressed to WebP at 80% quality.",
        "Download and upload directly to your Shopify product listing.",
      ]}
      faqs={[
        {
          q: "What image size does Shopify recommend?",
          a: "Shopify recommends product images of 2048×2048 pixels to support the zoom feature. 2000×2000 is the optimal working size that keeps file sizes manageable while maintaining visual quality.",
        },
        {
          q: "Why use 'contain' mode instead of stretching?",
          a: "Contain mode preserves your product's proportions. Stretching would distort the product, which looks unprofessional and can mislead customers.",
        },
        {
          q: "Does Shopify support WebP?",
          a: "Yes. Shopify's CDN automatically serves WebP to browsers that support it and falls back to JPEG for older browsers. You benefit from smaller file sizes without any extra configuration.",
        },
        {
          q: "Will the white background look right on my Shopify theme?",
          a: "Most Shopify themes display products on a white or light background. A white canvas background ensures a clean, consistent look across all your listings.",
        },
        {
          q: "Are my product images uploaded to the cloud?",
          a: "No. The optimization happens entirely in your browser using the Canvas API. Your images never leave your device during processing.",
        },
      ]}
      related={[
        { href: "/workflow/shopify-product", label: "Shopify Product workflow" },
        { href: "/compress-image-for-shopify", label: "Compress for Shopify" },
        { href: "/resize-image", label: "Crop & resize image" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/workflow", label: "All workflow templates" },
      ]}
      showAds
    >
      <WorkflowRunner workflow={workflow} />
    </ToolPage>
  );
}
