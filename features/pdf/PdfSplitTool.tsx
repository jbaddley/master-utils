"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { LuDownload, LuCheck } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePageRanges } from "@/lib/page-ranges";
import { getPdfJs } from "@/lib/pdfjs";
import { saveAs } from "@/lib/download";

const THUMB_SCALE = 0.28;

/** Render all pages of a PDF into data-URL thumbnails, calling onThumb after each. */
async function renderAllThumbs(
  pdfJs: Awaited<ReturnType<typeof getPdfJs>>,
  data: Uint8Array,
  onThumb: (pageNum: number, url: string) => void,
): Promise<void> {
  const doc = await pdfJs.getDocument({ data }).promise;
  const count = doc.numPages;
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: THUMB_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }
    onThumb(i, canvas.toDataURL("image/jpeg", 0.7));
    page.cleanup();
  }
  await doc.destroy();
}

/** Parse a range string and return a Set of 1-based page numbers, or empty set on error. */
function parseToSet(val: string, count: number): Set<number> | null {
  if (!val.trim()) return new Set();
  try {
    const nums = parsePageRanges(val, count);
    if (nums.some((n) => n < 1 || n > count)) return null;
    return new Set(nums);
  } catch {
    return null;
  }
}

/** Build a compact "1-3, 5" string from a sorted list of page numbers. */
function buildRangeString(pages: number[]): string {
  if (pages.length === 0) return "";
  const sorted = [...pages].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      parts.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  parts.push(start === end ? `${start}` : `${start}-${end}`);
  return parts.join(", ");
}

export default function PdfSplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [thumbProgress, setThumbProgress] = useState<{ current: number; total: number } | null>(null);

  const [ranges, setRanges] = useState("1");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([1]));

  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);

  // ── Range helpers ─────────────────────────────────────────────────────────

  const applyRangeString = useCallback((val: string, count: number) => {
    setRanges(val);
    const parsed = parseToSet(val, count);
    if (parsed === null) {
      setRangeError(`Invalid range — use numbers 1–${count}, e.g. "1-3, 5".`);
      setSelectedPages(new Set());
    } else {
      setRangeError(null);
      setSelectedPages(parsed);
    }
  }, []);

  const togglePage = useCallback(
    (pageNum: number) => {
      setSelectedPages((prev) => {
        const next = new Set(prev);
        if (next.has(pageNum)) {
          next.delete(pageNum);
        } else {
          next.add(pageNum);
        }
        setRanges(buildRangeString(Array.from(next)));
        setRangeError(null);
        return next;
      });
      setResult(null);
    },
    [],
  );

  // ── File loading ──────────────────────────────────────────────────────────

  const loadFile = useCallback(
    async (f: File) => {
      setError(null);
      setResult(null);
      setStatus("idle");
      setThumbs([]);
      setThumbProgress(null);
      try {
        const buffer = await f.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Page count via pdf-lib (fast, no rendering)
        const plDoc = await PDFDocument.load(bytes);
        const count = plDoc.getPageCount();

        setFile(f);
        setPdfBytes(bytes);
        setPageCount(count);
        applyRangeString(`1-${count}`, count);

        // Render thumbnails progressively using pdfjs.
        // IMPORTANT: pdfjs transfers the Uint8Array's ArrayBuffer to its worker,
        // detaching the original. Pass bytes.slice() (a copy) so `bytes` — and
        // the `pdfBytes` state referencing it — stay intact for pdf-lib in split().
        const pdfJs = await getPdfJs();
        const thumbArr: string[] = new Array(count).fill("");
        setThumbProgress({ current: 0, total: count });
        await renderAllThumbs(pdfJs, bytes.slice(), (pageNum, url) => {
          thumbArr[pageNum - 1] = url;
          setThumbs([...thumbArr]);
          setThumbProgress({ current: pageNum, total: count });
        });
        setThumbProgress(null);
      } catch (e) {
        setThumbProgress(null);
        setError(e instanceof Error ? e.message : "Could not read PDF.");
      }
    },
    [applyRangeString],
  );

  // ── Extract ───────────────────────────────────────────────────────────────

  const split = async () => {
    if (!file || !pdfBytes) return;
    setError(null);
    setStatus("working");
    try {
      const indices = parsePageRanges(ranges, pageCount).map((p) => p - 1);
      const src = await PDFDocument.load(pdfBytes);
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

  // ── Render ────────────────────────────────────────────────────────────────

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
        <>
          {/* Controls */}
          <section className="card settings">
            <div className="field" style={{ flex: "1 1 300px" }}>
              <Label htmlFor="ranges">Pages to extract (e.g. 1-3, 5)</Label>
              <Input
                id="ranges"
                value={ranges}
                placeholder={`1-${pageCount}`}
                onChange={(e) => applyRangeString(e.target.value, pageCount)}
              />
              {rangeError ? (
                <p style={{ color: "var(--destructive)", fontSize: "13px", marginTop: "0.25rem" }}>
                  {rangeError}
                </p>
              ) : selectedPages.size > 0 ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: "0.25rem" }}>
                  {selectedPages.size} of {pageCount} page{selectedPages.size === 1 ? "" : "s"} selected
                  {pageCount <= 40 ? " · click thumbnails below to toggle" : ""}
                </p>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexShrink: 0 }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPdfBytes(null);
                  setThumbs([]);
                  setResult(null);
                }}
              >
                Change file
              </Button>
              <Button
                type="button"
                disabled={status === "working" || selectedPages.size === 0 || !!rangeError}
                onClick={() => void split()}
              >
                {status === "working" ? "Extracting…" : "Extract pages"}
              </Button>
              {result && (
                <Button type="button" onClick={download}>
                  <LuDownload />
                  Download PDF
                </Button>
              )}
            </div>
          </section>

          {/* Thumbnail progress */}
          {thumbProgress && thumbs.filter(Boolean).length === 0 && (
            <div style={{ padding: "1rem 0" }}>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>
                Rendering page {thumbProgress.current} of {thumbProgress.total}…
              </p>
              <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((thumbProgress.current / thumbProgress.total) * 100)}%`,
                    background: "var(--primary)",
                    transition: "width 0.1s",
                  }}
                />
              </div>
            </div>
          )}

          {/* Thumbnails grid */}
          {thumbs.some(Boolean) && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.625rem",
                padding: "1rem",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              {thumbs.map((url, i) => {
                const pageNum = i + 1;
                const isSelected = selectedPages.has(pageNum);
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => togglePage(pageNum)}
                    title={`Page ${pageNum}${isSelected ? " — selected" : " — click to add"}`}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.3rem",
                      borderRadius: "0.4rem",
                      border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                      background: isSelected
                        ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                        : "transparent",
                      cursor: "pointer",
                      transition: "border-color 0.12s, background 0.12s",
                    }}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Page ${pageNum}`}
                        style={{
                          display: "block",
                          width: 72,
                          height: "auto",
                          borderRadius: "0.2rem",
                          filter: isSelected ? "none" : "opacity(0.4) grayscale(0.4)",
                          transition: "filter 0.12s",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 72,
                          height: 96,
                          background: "var(--muted)",
                          borderRadius: "0.2rem",
                          opacity: 0.4,
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        lineHeight: 1,
                        color: isSelected ? "var(--primary)" : "var(--muted-foreground)",
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {pageNum}
                    </span>

                    {isSelected && (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <LuCheck size={11} color="white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
