import type { Metadata } from "next";
import CompressTool from "@/features/compress/CompressTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compress Image — reduce JPG, PNG & WebP file size free",
  description:
    "Free online image compressor. Shrink JPG, PNG and WebP file sizes with a live quality preview — fast and private, right in your browser.",
  path: "compress-image",
});

export default function Page() {
  return (
    <ToolPage
      slug="compress-image"
      h1="Compress Image"
      appName="Image Compressor"
      lede="Reduce image file size with a live before/after preview. Choose WebP or JPEG and dial in the quality, then download — all in your browser."
      steps={[
        "Drop or select a JPG, PNG or WebP image.",
        "Pick an output format and drag the quality slider while watching the size.",
        "Download the compressed image.",
      ]}
      faqs={[
        {
          q: "How much smaller will my image get?",
          a: "It depends on the image and quality, but WebP at 70% typically cuts file size by 50–80% versus PNG with little visible loss.",
        },
        {
          q: "Is the compression lossless?",
          a: "PNG output is lossless. JPEG and WebP are lossy but the quality slider lets you balance size and fidelity.",
        },
        {
          q: "Are my images uploaded?",
          a: "No — compression runs entirely in your browser, so files are not uploaded to Utilio servers for this tool.",
        },
      ]}
      related={[
        { href: "/png-to-jpg", label: "Convert image" },
        { href: "/resize-image", label: "Crop & resize image" },
        { href: "/image-to-svg", label: "Image to SVG" },
      ]}
    >
      <CompressTool />
    </ToolPage>
  );
}
