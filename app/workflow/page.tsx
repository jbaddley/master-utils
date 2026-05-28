import type { Metadata } from "next";
import WorkflowLauncher from "@/features/workflow/WorkflowLauncher";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Image Workflow Templates — one-click multi-step processing",
  description:
    "Apply multi-step image workflows in one click: optimize for web, prepare Shopify product images, create YouTube thumbnails, resize for Instagram — all in your browser.",
  path: "workflow",
});

export default function Page() {
  return (
    <ToolPage
      slug="workflow"
      h1="Image Workflow Templates"
      appName="Image Workflow Tool"
      lede="Run a full image editing workflow in one click. Choose a preset, upload your image, and download the result — no account needed."
      steps={[
        "Choose a workflow preset that matches your goal (web optimization, Shopify, YouTube, Instagram).",
        "Drop or select your source image.",
        "Click Run to apply all processing steps automatically.",
        "Download the finished image, ready to use.",
      ]}
      faqs={[
        {
          q: "What is an image workflow template?",
          a: "A workflow template chains multiple image processing steps together — like crop, resize, and compress — and runs them automatically in the right order.",
        },
        {
          q: "Which formats are supported?",
          a: "All common image formats including JPG, PNG, WebP, AVIF, BMP, and GIF.",
        },
        {
          q: "Are my images uploaded anywhere?",
          a: "No. All processing happens locally in your browser using JavaScript and Canvas. Your files never leave your device.",
        },
        {
          q: "Can I create custom workflows?",
          a: "Not yet — custom workflows are on the roadmap for the Pro plan. For now, choose the preset that best matches your use case.",
        },
        {
          q: "Why does Shopify recommend 2048×2048 images?",
          a: "Shopify's CDN automatically resizes images on delivery, so uploading at maximum resolution ensures crisp display on all screens including Retina.",
        },
      ]}
      related={[
        { href: "/compress-image", label: "Compress image" },
        { href: "/resize-image", label: "Resize image" },
        { href: "/crop-image", label: "Crop image" },
        { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
        { href: "/resize-image-for-youtube", label: "Resize for YouTube" },
      ]}
      showAds
    >
      <WorkflowLauncher />
    </ToolPage>
  );
}
