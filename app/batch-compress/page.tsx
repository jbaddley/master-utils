import type { Metadata } from "next";
import BatchCompressTool from "@/features/compress/BatchCompressTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Batch Image Compressor — compress multiple images at once",
  description:
    "Compress multiple images at once and download a ZIP. Supports JPG, PNG, WebP, AVIF — free, private, runs in your browser.",
  path: "batch-compress",
});

export default function Page() {
  return (
    <ToolPage
      slug="batch-compress"
      h1="Batch Image Compressor"
      appName="Batch Image Compressor"
      lede="Drop multiple images, choose your output format and quality, then download a single ZIP of all compressed files — entirely in your browser."
      steps={[
        "Drop or select multiple images (JPG, PNG, WebP, AVIF, GIF, BMP, SVG).",
        "Choose output format (WebP recommended) and adjust quality.",
        "Click “Compress All & Download ZIP”.",
      ]}
      faqs={[
        {
          q: "How many files can I compress at once?",
          a: "There is no hard limit — all processing runs in your browser using your device's resources. Batches of 20–50 files work well for most devices.",
        },
        {
          q: "Are my images uploaded?",
          a: "No — every image is processed locally in your browser. Nothing is ever sent to a server.",
        },
        {
          q: "What formats are supported?",
          a: "Input: JPG, PNG, WebP, AVIF, GIF, BMP, SVG. Output: WebP (best compression), JPEG, or PNG.",
        },
      ]}
      related={[
        { href: "/compress-image", label: "Compress single image" },
        { href: "/batch-resize", label: "Batch resize" },
        { href: "/png-to-webp", label: "PNG to WebP" },
      ]}
    >
      <BatchCompressTool />
    </ToolPage>
  );
}
