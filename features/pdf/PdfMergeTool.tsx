"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { LuDownload, LuGripVertical, LuPlus, LuX } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

export default function PdfMergeTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const addFiles = (incoming: File[]) => {
    const pdfs = incoming.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) {
      setError("Please add PDF files only.");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...pdfs]);
    setResult(null);
    setStatus("idle");
  };

  const remove = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const merge = async () => {
    if (files.length < 2) {
      setError("Add at least two PDF files to merge.");
      return;
    }
    setError(null);
    setStatus("working");
    try {
      const merged = await PDFDocument.create();
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        const copied = await merged.copyPages(doc, doc.getPageIndices());
        copied.forEach((page) => merged.addPage(page));
      }
      const out = await merged.save();
      setResult(out);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Merge failed.");
    }
  };

  const download = () => {
    if (!result) return;
    const bytes = result;
    void saveAs({
      suggestedName: "merged.pdf",
      description: "PDF",
      mime: "application/pdf",
      ext: ".pdf",
      getBlob: () => new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      toolName: "merge-pdf",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <FileDropzone
        label="Drop PDF files to merge"
        accept="application/pdf,.pdf"
        multiple
        onFiles={addFiles}
        onError={setError}
      />

      {files.length > 0 && (
        <div className="settings">
          <p className="field-label">Order (drag to reorder)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null) reorder(dragIdx, i);
                  setDragIdx(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: "13px",
                }}
              >
                <LuGripVertical aria-hidden />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Remove">
                  <LuX />
                </Button>
              </div>
            ))}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(Array.from(e.dataTransfer.files));
              }}
              style={{
                border: "2px dashed var(--border)",
                borderRadius: "var(--radius)",
                padding: "1rem",
                textAlign: "center",
                cursor: "pointer",
                fontSize: "13px",
                color: "var(--muted-foreground)",
              }}
            >
              <LuPlus size={16} /> Add more PDFs
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
          </div>
          <div className="actionbar">
            <Button type="button" onClick={() => void merge()} disabled={status === "working" || files.length < 2}>
              {status === "working" ? "Merging…" : "Merge PDFs"}
            </Button>
            {result && (
              <Button type="button" onClick={download}>
                <LuDownload /> Download
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
