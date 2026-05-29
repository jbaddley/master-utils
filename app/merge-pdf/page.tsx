import type { Metadata } from "next";
import PdfMergeTool from "@/features/pdf/PdfMergeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Merge PDF — combine PDF files free, no upload",
  description:
    "Merge multiple PDF files into one document in your browser. Reorder files, combine pages, and download — private, no server upload.",
  path: "merge-pdf",
});

const PRIVACY =
  "Private by design — PDF merging runs entirely in your browser. Your files are never uploaded to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="merge-pdf"
      h1="Merge PDF"
      appName="PDF Merger"
      privacyNote={PRIVACY}
      lede="Combine two or more PDFs into a single file. Drag to reorder, merge, and download — all processing stays on your device."
      steps={[
        "Drop or select two or more PDF files.",
        "Drag files to set the merge order.",
        "Click Merge PDFs, then download the combined file.",
      ]}
      faqs={[
        {
          q: "Is there a file size limit?",
          a: "Very large PDFs may be slow or hit browser memory limits. For huge documents, split them first or merge in smaller batches.",
        },
        {
          q: "Are my PDFs uploaded?",
          a: "No — merging uses pdf-lib in your browser. Files never leave your computer.",
        },
      ]}
      related={[
        { href: "/split-pdf", label: "Split PDF" },
        { href: "/pdf-to-image", label: "PDF to image" },
        { href: "/image-to-pdf", label: "Image to PDF" },
      ]}
    >
      <PdfMergeTool />
    </ToolPage>
  );
}
