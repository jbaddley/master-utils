import type { Metadata } from "next";
import UpscaleTool from "@/features/upscale/UpscaleTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Upscale Image — enlarge photos 2×, 3×, 4× free",
  description:
    "Upscale images 2×, 3×, or 4× without losing quality. Free, browser-based image enlarger — your files never leave your device.",
  path: "upscale-image",
});

export default function Page() {
  return (
    <ToolPage
      slug="upscale-image"
      h1="Upscale Image"
      appName="Image Upscaler"
      lede="Enlarge any image 2×, 3×, or 4× in your browser. Choose Smooth mode for photos (bicubic) or Crisp mode for pixel art (nearest-neighbor)."
      steps={[
        "Drop or select any image (JPG, PNG, WebP, AVIF, GIF).",
        "Pick a scale factor: 2×, 3×, or 4×.",
        "Choose Smooth for photos or Crisp for pixel art.",
        "Click Upscale and download the enlarged PNG.",
      ]}
      faqs={[
        {
          q: "Does upscaling improve image quality?",
          a: "Upscaling adds pixels but cannot recover detail that was never in the original. Smooth mode (bicubic) reduces visible pixelation in photos. Crisp mode (nearest-neighbor) preserves sharp edges in pixel art and icons.",
        },
        {
          q: "What is the maximum output size?",
          a: "A 4× upscale of a 4000×3000 image produces a 16000×12000 px PNG (~192 MP). Very large outputs may be slow depending on your device, as the processing happens locally in your browser.",
        },
        {
          q: "What output format does the upscaler use?",
          a: "The upscaler always outputs PNG for maximum quality and no additional compression artefacts.",
        },
        {
          q: "Are my images uploaded to a server?",
          a: "No. All processing runs in your browser using the Canvas API. Your images never leave your device.",
        },
        {
          q: "What is the difference between Smooth and Crisp mode?",
          a: "Smooth uses bicubic interpolation — the browser blends neighbouring pixels for a smooth result, ideal for photos. Crisp uses nearest-neighbor scaling — each original pixel becomes a solid block, ideal for pixel art, icons, and sprites.",
        },
      ]}
      related={[
        { href: "/resize-image", label: "Resize image" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/crop-image", label: "Crop image" },
        { href: "/png-to-jpg", label: "Convert image" },
      ]}
      showAds
    >
      <UpscaleTool />
    </ToolPage>
  );
}
