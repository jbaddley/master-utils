import type { Metadata } from "next";
import CropTool from "@/features/crop/CropTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Crop Image — free online photo cropper",
  description:
    "Free online image cropper. Drag an adjustable box (or pick an aspect ratio like 1:1 or 16:9) to crop PNG, JPG and WebP — private, in your browser.",
  path: "crop-image",
});

export default function Page() {
  return (
    <ToolPage
      slug="crop-image"
      h1="Crop Image"
      appName="Image Cropper"
      lede="Crop an image to any size or aspect ratio with a draggable selection box. Move and resize the box, then apply and download — all in your browser."
      steps={[
        "Drop or select an image.",
        "Drag the crop box and handles, or choose an aspect-ratio preset.",
        "Click Apply crop, then download the result.",
      ]}
      faqs={[
        {
          q: "Can I crop to a specific aspect ratio?",
          a: "Yes — use the 1:1, 4:3, 3:2 or 16:9 presets to start a centered box, or crop freely.",
        },
        {
          q: "What format is the cropped image?",
          a: "The crop is exported as a PNG, which preserves transparency.",
        },
        {
          q: "Are my images uploaded?",
          a: "No — cropping happens entirely in your browser; nothing is uploaded.",
        },
      ]}
      related={[
        { href: "/resize-image", label: "Resize image" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/favicon-generator", label: "Favicon generator" },
      ]}
    >
      <CropTool />
    </ToolPage>
  );
}
