"use client";

import { useState } from "react";
import JSZip from "jszip";
import { LuDownload } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { getPdfJs } from "@/lib/pdfjs";
import { saveAs } from "@/lib/download";

type Fmt = "image/png" | "image/jpeg";

export default function PdfToImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fmt, setFmt] = useState<Fmt>("image/png");
  const [quality, setQuality] = useState(0.85);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [blobs, setBlobs] = useState<Blob[]>([]);

  const loadFile = async (f: File) => {
    setError(null);
    setBlobs([]);
    setStatus("idle");
    try {
      const pdfjs = await getPdfJs();
      const data = new Uint8Array(await f.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      setFile(f);
      setPageCount(doc.numPages);
      await doc.destroy();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read PDF.");
    }
  };

  const convert = async () => {
    if (!file) return;
    setError(null);
    setStatus("working");
    try {
      const pdfjs = await getPdfJs();
      const data = new Uint8Array(await file.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      const out: Blob[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not available");
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob(
            (b) => (b ? res(b) : rej(new Error("Export failed"))),
            fmt,
            fmt === "image/jpeg" ? quality : undefined,
          );
        });
        out.push(blob);
        page.cleanup();
      }
      await doc.destroy();
      setBlobs(out);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  const download = async () => {
    if (blobs.length === 0) return;
    const ext = fmt === "image/png" ? ".png" : ".jpg";
    if (blobs.length === 1) {
      const blob = blobs[0];
      void saveAs({
        suggestedName: `page-1${ext}`,
        description: "Image",
        mime: fmt,
        ext,
        getBlob: () => blob,
        toolName: "pdf-to-image",
      });
      return;
    }
    const zip = new JSZip();
    blobs.forEach((b, i) => zip.file(`page-${i + 1}${ext}`, b));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    void saveAs({
      suggestedName: "pdf-pages.zip",
      description: "ZIP archive",
      mime: "application/zip",
      ext: ".zip",
      getBlob: () => zipBlob,
      toolName: "pdf-to-image",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!file ? (
        <FileDropzone
          label="Drop a PDF to convert to images"
          accept="application/pdf,.pdf"
          onFiles={(fs) => void loadFile(fs[0])}
          onError={setError}
        />
      ) : (
        <div className="settings">
          <p className="field-label">
            {file.name} — {pageCount} page{pageCount === 1 ? "" : "s"}
          </p>
          <div className="field">
            <Label>Output format</Label>
            <select
              value={fmt}
              onChange={(e) => setFmt(e.target.value as Fmt)}
              disabled={status === "working"}
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
            </select>
          </div>
          {fmt === "image/jpeg" && (
            <div className="field">
              <Label>JPEG quality</Label>
              <Slider value={[Math.round(quality * 100)]} onValueChange={(v) => setQuality((Array.isArray(v) ? v[0] : v) / 100)} min={30} max={100} />
            </div>
          )}
          <div className="actionbar">
            <Button type="button" variant="outline" onClick={() => { setFile(null); setBlobs([]); }}>
              Change file
            </Button>
            <Button type="button" onClick={() => void convert()} disabled={status === "working"}>
              {status === "working" ? "Converting…" : "Convert to images"}
            </Button>
            {blobs.length > 0 && (
              <Button type="button" onClick={() => void download()}>
                <LuDownload /> Download {blobs.length > 1 ? "ZIP" : "image"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
