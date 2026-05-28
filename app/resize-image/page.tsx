import type { Metadata } from "next";
import ResizeTool from "@/features/resize/ResizeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Resize Image — change dimensions online free",
  description:
    "Free online image resizer. Resize PNG, JPG and WebP by pixels or percent with aspect-ratio lock — fast, private, in your browser.",
  path: "resize-image",
});

export default function Page() {
  return (
    <ToolPage
      slug="resize-image"
      h1="Resize Image"
      appName="Image Resizer"
      lede="Resize an image to exact pixel dimensions or by percentage, with optional aspect-ratio lock, then download as PNG, JPG or WebP — all in your browser."
      steps={[
        "Drop or select an image.",
        "Enter a new width or height (keep aspect locked), or use a scale preset.",
        "Download the resized image.",
      ]}
      faqs={[
        {
          q: "Will resizing distort my image?",
          a: "Not if you keep the aspect lock on — width and height stay proportional. Unlock it to stretch to exact dimensions.",
        },
        {
          q: "Does enlarging reduce quality?",
          a: "Scaling up can look soft since there's no extra detail to add. Downscaling stays crisp.",
        },
        {
          q: "Are my images uploaded?",
          a: "No — resizing happens entirely in your browser; files never leave your device.",
        },
      ]}
      related={[
        { href: "/crop-image", label: "Crop image" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/png-to-jpg", label: "Convert image" },
      ]}
    >
      <ResizeTool />
    </ToolPage>
  );
}
