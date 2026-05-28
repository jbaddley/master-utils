import type { Metadata } from "next";
import Link from "next/link";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { WORKFLOWS } from "@/lib/workflows";

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
        "Choose a workflow preset that matches your goal (podcast art, Shopify, YouTube, Instagram, favicons).",
        "Drop or select your source image on the workflow page.",
        "Click Run Workflow to apply all processing steps automatically.",
        "Download the finished image or ZIP, ready to use.",
      ]}
      faqs={[
        {
          q: "What is an image workflow template?",
          a: "A workflow template chains multiple image processing steps together — like resize and compress — and runs them automatically in the right order.",
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
          q: "Why does Shopify recommend large product images?",
          a: "Shopify's CDN automatically resizes images on delivery, so uploading at high resolution ensures crisp display on all screens including Retina displays.",
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {WORKFLOWS.map((w) => (
          <div
            key={w.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1.25rem",
              background: "var(--card)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--foreground)",
                  marginBottom: "0.35rem",
                }}
              >
                {w.name}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--muted-foreground)",
                  lineHeight: 1.5,
                }}
              >
                {w.description}
              </div>
            </div>
            <Link
              href={`/workflow/${w.id}/`}
              style={{
                display: "inline-block",
                padding: "0.45rem 1rem",
                borderRadius: "var(--radius)",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                alignSelf: "flex-start",
              }}
            >
              Run →
            </Link>
          </div>
        ))}
      </div>
    </ToolPage>
  );
}
