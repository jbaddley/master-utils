import type { Metadata } from "next";
import SvgToImageTool from "@/features/svg-export/SvgToImageTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "SVG to Image — convert SVG to PNG, JPG, WebP or AVIF free",
  description:
    "Convert any SVG to PNG, JPG, WebP or AVIF in your browser. Set the output size, rename the file, and download — no upload, no sign-up, completely private.",
  path: "svg-to-image",
});

export default function Page() {
  return (
    <ToolPage
      slug="svg-to-image"
      h1="SVG to Image"
      appName="SVG to Image Converter"
      lede="Convert any SVG to PNG, JPG, WebP or AVIF. Pick your output format, scale up or set a custom size, rename the file, and download — all in your browser."
      steps={[
        "Drop or select an SVG file.",
        "Choose an output format (PNG, JPG, WebP, or AVIF) and a scale.",
        "Edit the filename if needed, then download.",
      ]}
      faqs={[
        {
          q: "What is the difference between PNG and JPG output?",
          a: "PNG is lossless and supports transparency — ideal for logos and icons. JPG is smaller but lossy and has a white background. WebP offers the best compression while keeping transparency.",
        },
        {
          q: "Can I make the output larger than the original SVG?",
          a: "Yes — SVGs are infinitely scalable vectors, so you can export at 2×, 4×, or any custom pixel size with no quality loss.",
        },
        {
          q: "Will it work with SVGs that use custom fonts?",
          a: "SVGs that reference external fonts or images may not render correctly because the browser can't load those resources from a local object URL. Self-contained SVGs with embedded or system fonts work fine.",
        },
        {
          q: "Are my files uploaded to a server?",
          a: "No — the entire conversion runs in your browser. Your SVG never leaves your device.",
        },
      ]}
      related={[
        { href: "/image-to-svg/", label: "Image to SVG" },
        { href: "/convert-image/", label: "Convert image format" },
        { href: "/compress-image/", label: "Compress image" },
        { href: "/resize-image/", label: "Crop & resize image" },
      ]}
    >
      <SvgToImageTool />
    </ToolPage>
  );
}
