import type { Metadata } from "next";
import ConvertTool from "@/features/convert/ConvertTool";
import { ToolPage } from "@/components/ToolPage";
import { ConversionHubSeoContent } from "@/components/ConversionSeoContent";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Convert Image — PNG, JPG, WebP, AVIF & more free online",
  description:
    "Free online image converter. Convert between PNG, JPG, WebP, AVIF, GIF, BMP, and SVG — output formats depend on your input. Private, in-browser, no upload.",
  path: "convert-image",
});

export default function Page() {
  return (
    <ToolPage
      slug="convert-image"
      h1="Convert Image"
      appName="Image Converter"
      lede="Pick an input format and a compatible output, drop your image, and download. Only valid conversions are offered for each format."
      steps={[
        "Choose input and output formats (or drop a file to auto-detect).",
        "Drop or select your image.",
        "Download the converted file.",
      ]}
      body={<ConversionHubSeoContent media="image" />}
      faqs={[
        {
          q: "Which conversions are supported?",
          a: "It depends on the input — for example PNG can convert to JPG, WebP, or AVIF, while GIF can export to PNG, JPG, or WebP. The output dropdown updates automatically.",
        },
        {
          q: "Are my images uploaded?",
          a: "No. Conversion uses canvas encoding in your browser.",
        },
      ]}
      related={[
        { href: "/png-to-jpg", label: "PNG to JPG" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/image-to-svg", label: "Image to SVG" },
      ]}
    >
      <ConvertTool />
    </ToolPage>
  );
}
