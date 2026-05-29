import type { Metadata } from "next";
import BackgroundTool from "@/features/background/BackgroundTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Remove Image Background — free solid-color background eraser",
  description:
    "Free online background remover for solid-color backgrounds. Make the background transparent and download a PNG — fast and private, in your browser.",
  path: "remove-background",
});

export default function Page() {
  return (
    <ToolPage
      slug="remove-background"
      h1="Remove Background"
      appName="Background Remover"
      lede="Erase a solid or near-solid background to transparent and download a clean PNG. Tune the tolerance to control how much is removed — all in your browser."
      steps={[
        "Drop or select an image with a solid background.",
        "Adjust the tolerance until the background is gone.",
        "Download the transparent PNG.",
      ]}
      body={
        <p>
          This tool uses an edge flood-fill, so it shines on logos, product
          shots and graphics with a flat backdrop. For cutting a subject out of
          a busy photographic background you&apos;ll want an AI matting tool —
          that&apos;s on our roadmap.
        </p>
      }
      faqs={[
        {
          q: "What kind of backgrounds does this remove?",
          a: "Solid or near-solid color backgrounds. It floods inward from the edges, clearing connected pixels within the tolerance you set.",
        },
        {
          q: "Does it work on photos with busy backgrounds?",
          a: "Not well — those need an AI segmentation model. This tool is best for flat, single-color backgrounds.",
        },
        {
          q: "Is it free and private?",
          a: "Yes — everything runs in your browser and your image is never uploaded.",
        },
      ]}
      related={[
        { href: "/image-to-svg", label: "Image to SVG" },
        { href: "/resize-image", label: "Crop & resize image" },
        { href: "/compress-image", label: "Compress image" },
      ]}
    >
      <BackgroundTool />
    </ToolPage>
  );
}
