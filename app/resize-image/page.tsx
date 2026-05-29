import type { Metadata } from "next";
import CropResizeTool from "@/features/resize/CropResizeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Crop & Resize Image — free online photo editor",
  description:
    "Free online image cropper and resizer. Crop to any aspect ratio, resize by pixels or percent, and export as PNG, JPG or WebP — private, in your browser.",
  path: "resize-image",
});

export default function Page() {
  return (
    <ToolPage
      slug="resize-image"
      h1="Crop & Resize Image"
      appName="Image Cropper & Resizer"
      lede="Crop an image with a draggable selection box, then resize to exact pixel dimensions or a social-media preset. Preview the result and download as PNG, JPG or WebP — all in your browser."
      steps={[
        "Drop or select an image.",
        "Drag the crop box and handles, or choose an aspect-ratio preset.",
        "Set output width and height (or pick a social preset), then download.",
      ]}
      faqs={[
        {
          q: "Can I crop to a specific aspect ratio?",
          a: "Yes — use the 1:1, 4:3, 3:2 or 16:9 crop presets, or crop freely with the draggable box.",
        },
        {
          q: "Will resizing distort my image?",
          a: "Not if you keep the output aspect lock on — width and height stay proportional. Unlock it to stretch to exact dimensions.",
        },
        {
          q: "Are my images uploaded?",
          a: "No — cropping and resizing happen entirely in your browser; nothing is uploaded.",
        },
      ]}
      related={[
        { href: "/compress-image", label: "Compress image" },
        { href: "/png-to-jpg", label: "Convert image" },
        { href: "/favicon-generator", label: "Favicon generator" },
      ]}
    >
      <CropResizeTool />
    </ToolPage>
  );
}
