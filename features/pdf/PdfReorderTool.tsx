"use client";

import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { LuDownload, LuX } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { getPdfJs } from "@/lib/pdfjs";

type PageThumb = {
  /** original 1-based index */
  originalIndex: number;
  /** data URL of the thumbnail */
  dataUrl: string;
};

const THUMB_WIDTH = 160;
const THUMB_SCALE = 0.3;

async function renderThumbnail(
  pdfJs: Awaited<ReturnType<typeof getPdfJs>>,
  data: Uint8Array,
  pageNum: number,
): Promise<string> {
  const doc = await pdfJs.getDocument({ data }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: THUMB_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  page.cleanup();
  await doc.destroy();
  return dataUrl;
}

export default function PdfReorderTool() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageThumb[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);

  const loadFile = useCallback(async (files: File[]) => {
    const file = files[0];
    setError(null);
    setStatus("loading");
    setPages([]);
    try {
      const pdfJs = await getPdfJs();
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);

      const doc = await pdfJs.getDocument({ data: bytes }).promise;
      const count = doc.numPages;
      await doc.destroy();

      const thumbs: PageThumb[] = [];
      setRenderProgress({ current: 0, total: count });
      for (let i = 1; i <= count; i++) {
        setRenderProgress({ current: i, total: count });
        const dataUrl = await renderThumbnail(pdfJs, bytes, i);
        thumbs.push({ originalIndex: i, dataUrl });
      }
      setRenderProgress(null);
      setPages(thumbs);
      setStatus("ready");
    } catch (e) {
      setRenderProgress(null);
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not load PDF.");
    }
  }, []);

  const removePage = (idx: number) => {
    setPages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIdx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const downloadReordered = async () => {
    if (!pdfBytes || pages.length === 0) return;
    setStatus("saving");
    setError(null);
    try {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const outDoc = await PDFDocument.create();
      // pages array holds 1-based originalIndex values
      const indices = pages.map((p) => p.originalIndex - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      copied.forEach((page) => outDoc.addPage(page));
      const bytes = await outDoc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reordered.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to create PDF.");
    }
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {status === "idle" || status === "error" ? (
        <FileDropzone
          label="Drop a PDF to reorder pages"
          accept="application/pdf,.pdf"
          onFiles={(fs) => void loadFile(fs)}
          onError={setError}
        />
      ) : null}

      {status === "loading" && (
        <div className="placeholder">
          {renderProgress
            ? `Rendering page ${renderProgress.current} of ${renderProgress.total}…`
            : "Rendering page thumbnails…"}
        </div>
      )}

      {(status === "ready" || status === "saving") && pages.length > 0 && (
        <>
          <div className="actionbar">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setStatus("idle"); setPages([]); setPdfBytes(null); }}
            >
              Load different PDF
            </Button>
            <div style={{ flex: 1 }} />
            <Button
              type="button"
              onClick={() => void downloadReordered()}
              disabled={status === "saving" || pages.length === 0}
            >
              <LuDownload />
              {status === "saving" ? "Building PDF…" : "Download reordered PDF"}
            </Button>
          </div>

          <p className="field-label mb-3">
            {pages.length} page{pages.length !== 1 ? "s" : ""} — drag to reorder, × to delete
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_WIDTH}px, 1fr))`,
              gap: "0.75rem",
            }}
          >
            {pages.map((page, idx) => {
              const isDragging = dragIndex === idx;
              const isOver = dragOverIndex === idx && dragIndex !== idx;
              return (
                <div
                  key={`${page.originalIndex}-${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    position: "relative",
                    borderRadius: "var(--radius)",
                    border: isOver
                      ? "2px solid var(--ring)"
                      : "1px solid var(--border)",
                    background: "var(--card)",
                    opacity: isDragging ? 0.4 : 1,
                    cursor: "grab",
                    overflow: "hidden",
                    userSelect: "none",
                    transition: "border-color 0.1s, opacity 0.15s",
                  }}
                >
                  {/* Thumbnail image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.dataUrl}
                    alt={`Page ${idx + 1}`}
                    style={{ display: "block", width: "100%", height: "auto" }}
                    draggable={false}
                  />

                  {/* Page number badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      fontSize: "11px",
                      textAlign: "center",
                      padding: "3px 0",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    {idx + 1} {page.originalIndex !== idx + 1 ? `(was ${page.originalIndex})` : ""}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePage(idx); }}
                    aria-label={`Delete page ${idx + 1}`}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      width: "36px",
                      height: "36px",
                      minWidth: "36px",
                      borderRadius: "50%",
                      background: "rgba(229,72,77,0.85)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                    }}
                  >
                    <LuX size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
