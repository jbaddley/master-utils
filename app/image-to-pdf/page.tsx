import type { Metadata } from "next";
import ImageToPdfTool from "@/features/pdf/ImageToPdfTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Image to PDF — create PDF from images free, no upload",
  description:
    "Combine JPG, PNG, and WebP images into one PDF in your browser. Reorder images, pick A4 or Letter, download — private and fast.",
  path: "image-to-pdf",
});

const PRIVACY =
  "Private by design — your images are packed into a PDF locally. Nothing is uploaded to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="image-to-pdf"
      h1="Image to PDF"
      appName="Image to PDF Converter"
      privacyNote={PRIVACY}
      lede="Turn one or more images into a single PDF. Reorder files, choose page size (fit, A4, or US Letter), and download."
      steps={[
        "Drop or select image files (JPG, PNG, WebP, etc.).",
        "Reorder images and pick a page size.",
        "Create PDF and download.",
      ]}
      faqs={[
        {
          q: "Which image formats are supported?",
          a: "Common formats including JPG, PNG, and WebP. Other browser-readable images are converted to PNG internally before embedding.",
        },
        {
          q: "One image per page?",
          a: "Yes — each image becomes its own page in the output PDF.",
        },
      ]}
      related={[
        { href: "/pdf-to-image", label: "PDF to image" },
        { href: "/merge-pdf", label: "Merge PDF" },
      ]}
    >
      <ImageToPdfTool />
    </ToolPage>
  );
}
