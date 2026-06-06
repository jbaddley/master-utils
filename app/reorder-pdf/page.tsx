import type { Metadata } from "next";
import PdfReorderTool from "@/features/pdf/PdfReorderTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reorder PDF Pages — drag to rearrange and download free",
  description:
    "Drag and drop PDF pages to reorder them, delete unwanted pages, then download a new PDF — all in your browser, no upload needed.",
  path: "reorder-pdf",
});

const PRIVACY =
  "Private by design — PDF pages are rendered and reordered entirely in your browser. Your file is never uploaded to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="reorder-pdf"
      h1="Reorder PDF Pages"
      appName="PDF Page Reorder"
      privacyNote={PRIVACY}
      lede="Drag and drop PDF page thumbnails to rearrange them in any order, delete pages you don't need, then download the resulting PDF instantly."
      steps={[
        "Drop or select a PDF file.",
        "Wait for page thumbnails to render.",
        "Drag thumbnails to reorder pages — the new position is shown in the badge.",
        "Click × on any thumbnail to delete that page.",
        'Click "Download reordered PDF" to save the result.',
      ]}
      body={<h2>How to reorder PDF pages without uploading</h2>}
      faqs={[
        {
          q: "Does this work for large PDFs?",
          a: "Yes, but thumbnails are rendered one by one — large PDFs with many pages may take a moment to fully render.",
        },
        {
          q: "Is my PDF safe?",
          a: "For this tool, the file is processed in your browser and is not uploaded to Utilio servers. All processing uses pdf-lib and PDF.js running in your browser.",
        },
        {
          q: "Can I undo a deleted page?",
          a: "Not currently — reload the page and drop your PDF again to start fresh.",
        },
      ]}
      related={[
        { href: "/merge-pdf", label: "Merge PDF" },
        { href: "/split-pdf", label: "Split PDF" },
        { href: "/pdf-to-image", label: "PDF to Image" },
        { href: "/image-to-pdf", label: "Image to PDF" },
      ]}
    >
      <PdfReorderTool />
    </ToolPage>
  );
}
