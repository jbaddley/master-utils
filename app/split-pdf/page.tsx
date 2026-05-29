import type { Metadata } from "next";
import PdfSplitTool from "@/features/pdf/PdfSplitTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Split PDF — extract pages free, no upload",
  description:
    "Extract page ranges from a PDF in your browser. Enter pages like 1-3,5 and download a new PDF — private, client-side only.",
  path: "split-pdf",
});

const PRIVACY =
  "Private by design — PDF splitting runs in your browser. Your document is never uploaded to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="split-pdf"
      h1="Split PDF"
      appName="PDF Splitter"
      privacyNote={PRIVACY}
      lede="Extract specific pages from a PDF using ranges like 1-3, 5, or 7-9. Download a new PDF with only the pages you need."
      steps={[
        "Drop or select a PDF file.",
        "Enter page numbers or ranges to extract (e.g. 1-3, 5).",
        "Click Extract pages and download the new PDF.",
      ]}
      faqs={[
        {
          q: "How do I specify pages?",
          a: "Use comma-separated values: single pages (5), ranges (1-3), or a mix (1-3, 5, 7-9). Pages are 1-based.",
        },
        {
          q: "Can I split into separate files per page?",
          a: "This tool exports one PDF with your selected pages. Use PDF to Image if you need each page as an image.",
        },
      ]}
      related={[
        { href: "/merge-pdf", label: "Merge PDF" },
        { href: "/pdf-to-image", label: "PDF to image" },
      ]}
    >
      <PdfSplitTool />
    </ToolPage>
  );
}
