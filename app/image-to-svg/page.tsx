import type { Metadata } from "next";
import SvgTool from "@/features/svg/SvgTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Image to SVG Converter — vectorize PNG, JPG & WebP free",
  description:
    "Free online image-to-SVG vectorizer. Convert PNG, JPG, GIF, WebP or BMP into clean, scalable SVG with editable colors — in your browser, no upload.",
  path: "image-to-svg",
});

export default function Page() {
  return (
    <ToolPage
      slug="image-to-svg"
      h1="Image to SVG Converter"
      appName="Image to SVG Converter"
      lede="Turn a raster image (PNG, JPG, WebP, GIF or BMP) into a clean, scalable SVG. Tune colors and detail, clean up artifacts, then download — all in your browser."
      steps={[
        "Select or drop a PNG, JPG, WebP, GIF or BMP image.",
        "Choose a style and simplify level, and fine-tune the color palette if needed.",
        "Click “Convert to SVG”, then download the vector file.",
      ]}
      faqs={[
        {
          q: "Is the image-to-SVG converter free?",
          a: "Yes — free for single-file use, with no sign-up, no watermark and no file-size limits.",
        },
        {
          q: "Do my images get uploaded to a server?",
          a: "No. Tracing runs entirely in your browser, so your image is not uploaded to Utilio servers for this tool.",
        },
        {
          q: "Which formats can I convert to SVG?",
          a: "PNG, JPG/JPEG, WebP, GIF and BMP. The output is an optimized SVG you can download.",
        },
        {
          q: "Do photos convert well to SVG?",
          a: "Vectorization works best on logos, icons and flat illustrations. Photos produce large, posterized SVGs, so use the simplify and palette controls.",
        },
      ]}
      related={[
        { href: "/image-studio", label: "Image Studio" },
        { href: "/png-to-jpg", label: "Convert image" },
        { href: "/svg-to-image", label: "SVG to Image" },
      ]}
    >
      <SvgTool />
    </ToolPage>
  );
}
