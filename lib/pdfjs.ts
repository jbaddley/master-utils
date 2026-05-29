import type * as PdfJs from "pdfjs-dist";

let pdfjs: typeof PdfJs | null = null;

/** Lazy-load PDF.js and configure the worker (client-only). */
export async function getPdfJs(): Promise<typeof PdfJs> {
  if (typeof window === "undefined") {
    throw new Error("PDF.js is only available in the browser");
  }
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/pdf.worker.min.mjs";
  }
  return pdfjs;
}
