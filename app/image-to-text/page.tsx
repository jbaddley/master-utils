import type { Metadata } from "next";
import OcrTool from "@/features/ocr/OcrTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Image to Text (OCR) — extract text from images free online",
  description:
    "Free OCR online: extract text from JPG, PNG, WebP, or single-page PDFs in your browser. Copy or download as .txt — no upload.",
  path: "image-to-text",
});

const PRIVACY =
  "Private by design — OCR runs with Tesseract.js in your browser. Your images and PDFs are never uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="image-to-text"
      h1="Image to Text (OCR)"
      appName="OCR Text Extractor"
      privacyNote={PRIVACY}
      lede="Extract readable text from photos, scans, or a single-page PDF. Choose a language, wait a few seconds, then copy or download the result."
      steps={[
        "Select the document language.",
        "Drop an image or single-page PDF.",
        "Copy the extracted text or download it as a .txt file.",
      ]}
      body={
        <>
          <h2>How to extract text from an image without uploading it</h2>
          <p>
            Drop a photo, scan, or screenshot — or a one-page PDF. Tesseract.js loads on first use and
            processes pixels locally, so sensitive documents are not uploaded to Utilio servers for this tool.
          </p>
        </>
      }
      faqs={[
        {
          q: "How long does OCR take?",
          a: "Usually 5–15 seconds depending on image size and your device. The first run also loads the Tesseract engine.",
        },
        {
          q: "Which languages are supported?",
          a: "English, Spanish, French, and German are included. Accuracy depends on image quality and font clarity.",
        },
        {
          q: "Can I OCR a multi-page PDF?",
          a: "Use Split PDF or PDF to Image first, then run OCR on each page image.",
        },
      ]}
      related={[
        { href: "/pdf-to-image", label: "PDF to image" },
        { href: "/split-pdf", label: "Split PDF" },
      ]}
    >
      <OcrTool />
    </ToolPage>
  );
}
