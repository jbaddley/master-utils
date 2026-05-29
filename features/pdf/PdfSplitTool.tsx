"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { LuDownload } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePageRanges } from "@/lib/page-ranges";
import { saveAs } from "@/lib/download";

export default function PdfSplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState("1");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);

  const loadFile = async (f: File) => {
    setError(null);
    setResult(null);
    setStatus("idle");
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      setFile(f);
      setPageCount(doc.getPageCount());
      setRanges(`1-${doc.getPageCount()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read PDF.");
    }
  };

  const split = async () => {
    if (!file) return;
    setError(null);
    setStatus("working");
    try {
      const indices = parsePageRanges(ranges, pageCount).map((p) => p - 1);
      const src = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, indices);
      copied.forEach((page) => out.addPage(page));
      const bytes = await out.save();
      setResult(bytes);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Split failed.");
    }
  };

  const download = () => {
    if (!result) return;
    const bytes = result;
    void saveAs({
      suggestedName: "split.pdf",
      description: "PDF",
      mime: "application/pdf",
      ext: ".pdf",
      getBlob: () => new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      toolName: "split-pdf",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!file ? (
        <FileDropzone
          label="Drop a PDF to split"
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
            <Label htmlFor="ranges">Pages to extract (e.g. 1-3, 5)</Label>
            <Input id="ranges" value={ranges} onChange={(e) => setRanges(e.target.value)} />
          </div>
          <div className="actionbar">
            <Button type="button" variant="outline" onClick={() => { setFile(null); setResult(null); }}>
              Change file
            </Button>
            <Button type="button" onClick={() => void split()} disabled={status === "working"}>
              {status === "working" ? "Extracting…" : "Extract pages"}
            </Button>
            {result && (
              <Button type="button" onClick={download}>
                <LuDownload /> Download PDF
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
