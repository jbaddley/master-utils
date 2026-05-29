"use client";

import { useRef, useState } from "react";
import { PDFDocument, PageSizes } from "pdf-lib";
import { LuDownload, LuGripVertical, LuPlus, LuX } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { imageFileToPngBytes } from "@/lib/image-bytes";
import { saveAs } from "@/lib/download";

type PageSize = "fit" | "a4" | "letter";

const PAGE_DIMS: Record<"a4" | "letter", [number, number]> = {
  a4: PageSizes.A4,
  letter: PageSizes.Letter,
};

export default function ImageToPdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  /** Returns true for any image file we can handle, including HEIC/HEIF and SVG. */
  const isImageFile = (f: File): boolean => {
    if (f.type.startsWith("image/")) return true;
    const name = f.name.toLowerCase();
    return (
      name.endsWith(".heic") ||
      name.endsWith(".heif") ||
      name.endsWith(".svg") ||
      name.endsWith(".avif") ||
      name.endsWith(".webp")
    );
  };

  const addFiles = (incoming: File[]) => {
    const images = incoming.filter(isImageFile);
    if (images.length === 0) {
      setError("Please add image files (JPG, PNG, WebP, SVG, HEIC, etc.).");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...images]);
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

  const build = async () => {
    if (files.length === 0) {
      setError("Add at least one image.");
      return;
    }
    setError(null);
    setStatus("working");
    try {
      const pdf = await PDFDocument.create();
      for (const file of files) {
        const isJpg =
          file.type === "image/jpeg" ||
          file.name.toLowerCase().endsWith(".jpg") ||
          file.name.toLowerCase().endsWith(".jpeg");
        const bytes = isJpg
          ? new Uint8Array(await file.arrayBuffer())
          : await imageFileToPngBytes(file);
        const embedded = isJpg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
        const dims = embedded.scale(1);
        let w = dims.width;
        let h = dims.height;
        if (pageSize !== "fit") {
          const [pw, ph] = PAGE_DIMS[pageSize];
          const page = pdf.addPage([pw, ph]);
          const scale = Math.min(pw / w, ph / h);
          w *= scale;
          h *= scale;
          page.drawImage(embedded, {
            x: (pw - w) / 2,
            y: (ph - h) / 2,
            width: w,
            height: h,
          });
        } else {
          const page = pdf.addPage([w, h]);
          page.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
        }
      }
      const out = await pdf.save();
      setResult(out);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not create PDF. Try JPG or PNG.");
    }
  };

  const download = () => {
    if (!result) return;
    const bytes = result;
    void saveAs({
      suggestedName: "images.pdf",
      description: "PDF",
      mime: "application/pdf",
      ext: ".pdf",
      getBlob: () => new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      toolName: "image-to-pdf",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <FileDropzone
        label="Drop images to pack into a PDF"
        accept="image/*,.heic,.heif,.svg"
        multiple
        onFiles={addFiles}
        onError={setError}
      />

      {files.length > 0 && (
        <div className="settings">
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
              <LuPlus size={16} /> Add more images
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif,.svg"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
          </div>

          <div className="field">
            <Label>Page size</Label>
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)}>
              <option value="fit">Fit to image</option>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
            </select>
          </div>

          <div className="actionbar">
            <Button type="button" onClick={() => void build()} disabled={status === "working"}>
              {status === "working" ? "Building…" : "Create PDF"}
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
