import type { Metadata } from "next";
import BatchResizeTool from "@/features/resize/BatchResizeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Batch Image Resizer — resize multiple images at once",
  description:
    "Resize multiple images to the same dimensions at once and download a ZIP. Free, private, runs in your browser.",
  path: "batch-resize",
});

export default function Page() {
  return (
    <ToolPage
      slug="batch-resize"
      h1="Batch Image Resizer"
      appName="Batch Image Resizer"
      lede="Resize multiple images to the same dimensions in one go — perfect for social media batches. Downloads as a ZIP, entirely in your browser."
      steps={[
        "Drop or select multiple images.",
        "Enter target width and height (or pick a social media preset).",
        "Click “Resize All & Download ZIP”.",
      ]}
      faqs={[
        {
          q: "Does batch resize maintain aspect ratio?",
          a: "With the aspect lock on, images are scaled to fit within the target dimensions without cropping. Unlock it to force exact dimensions.",
        },
        {
          q: "Can I resize to Instagram or YouTube sizes?",
          a: "Yes — use the Social Media Presets buttons to instantly set the right dimensions.",
        },
        {
          q: "Are my images uploaded?",
          a: "No — everything runs locally in your browser.",
        },
      ]}
      related={[
        { href: "/image-studio", label: "Image Studio" },
        { href: "/batch-compress", label: "Batch compress" },
        { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
      ]}
    >
      <BatchResizeTool />
    </ToolPage>
  );
}
