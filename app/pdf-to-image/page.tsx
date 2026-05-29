import type { Metadata } from "next";
import PdfToImageTool from "@/features/pdf/PdfToImageTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "PDF to Image — convert PDF pages to PNG or JPG free",
  description:
    "Convert PDF pages to PNG or JPEG images in your browser. Multi-page PDFs download as a ZIP — no upload, private processing.",
  path: "pdf-to-image",
});

const PRIVACY =
  "Private by design — PDF rendering uses PDF.js in your browser. Your PDF is never sent to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="pdf-to-image"
      h1="PDF to Image"
      appName="PDF to Image Converter"
      privacyNote={PRIVACY}
      lede="Render every page of a PDF as PNG or JPEG. Adjust JPEG quality, then download a single image or a ZIP for multi-page files."
      steps={[
        "Drop or select a PDF.",
        "Choose PNG or JPEG and set quality if using JPEG.",
        "Convert and download images (ZIP when there are multiple pages).",
      ]}
      faqs={[
        {
          q: "What resolution are the images?",
          a: "Pages render at 2× scale for sharp text and graphics. For print-ready output, open the images in an editor to upscale further.",
        },
        {
          q: "Are files uploaded?",
          a: "No — PDF.js runs locally in your browser.",
        },
      ]}
      related={[
        { href: "/image-to-pdf", label: "Image to PDF" },
        { href: "/split-pdf", label: "Split PDF" },
        { href: "/image-to-text", label: "Image to text (OCR)" },
      ]}
    >
      <PdfToImageTool />
    </ToolPage>
  );
}
