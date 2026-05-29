import type { Metadata } from "next";
import FaviconTool from "@/features/favicon/FaviconTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Favicon Generator — make a favicon.ico & app icons free",
  description:
    "Free favicon generator. Turn any PNG, JPG or WebP into a multi-size favicon.ico plus Apple touch and Android icons and a ready-to-paste HTML snippet — in your browser.",
  path: "favicon-generator",
});

export default function Page() {
  return (
    <ToolPage
      slug="favicon-generator"
      h1="Favicon Generator"
      appName="Favicon Generator"
      lede="Turn any image into a complete favicon set: a multi-size favicon.ico, Apple touch icon, Android icons, a web manifest and the HTML snippet — generated in your browser."
      steps={[
        "Drop or select an image (a square logo works best).",
        "Preview the icon at common sizes.",
        "Download favicon.ico, or the full icon pack as a .zip, and paste the snippet into your <head>.",
      ]}
      faqs={[
        {
          q: "What sizes are included?",
          a: "The .ico bundles 16, 32 and 48 px. The zip also adds 16/32 PNGs, a 180 px Apple touch icon, 192/512 Android icons, a web manifest and an HTML snippet.",
        },
        {
          q: "Does my image need to be square?",
          a: "No — non-square images are centered on a transparent square so they aren't distorted, but a square source looks best.",
        },
        {
          q: "Is it free and private?",
          a: "Yes. Everything is generated in your browser; your image is never uploaded.",
        },
      ]}
      related={[
        { href: "/resize-image", label: "Crop & resize image" },
        { href: "/png-to-webp", label: "Convert image" },
      ]}
    >
      <FaviconTool />
    </ToolPage>
  );
}
