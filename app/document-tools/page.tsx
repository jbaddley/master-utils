import type { Metadata } from "next";
import DocumentStudio from "@/features/studio/DocumentStudio";
import { ToolPage } from "@/components/ToolPage";
import {
  OtherUtilityHubs,
  UtilityHubSections,
} from "@/components/UtilityHubPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Document Studio — reorder, split, merge PDFs in one page",
  description:
    "Drop a PDF and reorder pages by dragging, extract a range with Split, append more files with Merge, then download — all in your browser.",
  path: "document-tools",
});

export default function DocumentToolsPage() {
  return (
    <ToolPage
      wide
      hideHero
      slug="document-tools"
      h1="Document Studio"
      appName="Document Studio"
      lede="Drop a PDF and edit it like a document — drag pages to reorder, extract a range with Split, append more PDFs with Merge, and download a single finished file. Everything runs in your browser."
      steps={[
        "Drop or select any PDF file.",
        "Pick a tool from the left rail — reorder pages by dragging, split out a page range, or merge with additional PDFs.",
        "Each operation stacks on the previous one with full undo history. Download your finished PDF when you're done.",
      ]}
      faqs={[
        {
          q: "Does this upload my PDF anywhere?",
          a: "No. All processing uses pdf-lib and PDF.js running entirely in your browser — your files never leave your device.",
        },
        {
          q: "Can I chain multiple edits?",
          a: "Yes. Reorder pages, then split out a range, then merge another document — each operation stacks with full undo.",
        },
        {
          q: "How does the Split tool work?",
          a: "Click pages in the viewport to select them, or type a range like '1-3, 5'. Click Extract to keep only those pages as a new document.",
        },
        {
          q: "How does Merge work?",
          a: "Select the Merge tool and add PDF files. They are appended after the current document in the order listed. Drag to reorder them before merging.",
        },
        {
          q: "How do I delete a single page?",
          a: "Select the Reorder tool and click the × button on any page thumbnail to remove it.",
        },
      ]}
      related={[
        { href: "/merge-pdf", label: "Merge PDF" },
        { href: "/split-pdf", label: "Split PDF" },
        { href: "/reorder-pdf", label: "Reorder PDF" },
        { href: "/pdf-to-image", label: "PDF to Image" },
        { href: "/image-to-pdf", label: "Image to PDF" },
      ]}
      afterTool={
        <div className="utility-hub-after-tool">
          <div className="tool-directory-header">
            <h2 className="tool-directory-title">
              Document utility categories
            </h2>
          </div>
          <p className="tool-directory-desc">
            Document Studio is the best place to chain edits. Use these links
            when you need a focused PDF converter or OCR tool.
          </p>
          <UtilityHubSections groupId="document-tools" />
          <OtherUtilityHubs currentGroupId="document-tools" />
        </div>
      }
    >
      <DocumentStudio />
    </ToolPage>
  );
}
