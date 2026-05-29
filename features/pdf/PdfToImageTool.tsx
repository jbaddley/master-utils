"use client";

import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { LuDownload, LuImage } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { getPdfJs } from "@/lib/pdfjs";
import { saveAs } from "@/lib/download";

type Fmt = "image/png" | "image/jpeg";

const THUMB_SCALE = 0.3;
const EXPORT_SCALE = 2;

/** Render one PDF page to a data URL (thumbnail) or a Blob (export). */
async function renderPage(
  pdfjs: Awaited<ReturnType<typeof getPdfJs>>,
  data: Uint8Array,
  pageNum: number,
  scale: number,
  fmt: Fmt,
  quality: number,
): Promise<{ dataUrl: string; blob: Blob }> {
  // Each call gets a fresh document so the transfer of the previous doesn't break us.
  // Caller passes a fresh .slice() to avoid detaching the stored bytes.
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL(fmt, fmt === "image/jpeg" ? quality : undefined);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("Export failed"))),
      fmt,
      fmt === "image/jpeg" ? quality : undefined,
    ),
  );
  page.cleanup();
  await doc.destroy();
  return { dataUrl, blob };
}

export default function PdfToImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);

  // Low-res thumbnail previews rendered on upload
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [thumbProgress, setThumbProgress] = useState<{ current: number; total: number } | null>(null);

  // High-res converted output
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [outputUrls, setOutputUrls] = useState<string[]>([]);

  const [fmt, setFmt] = useState<Fmt>("image/png");
  const [quality, setQuality] = useState(0.85);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [convertProgress, setConvertProgress] = useState<{ current: number; total: number } | null>(null);

  // Clean up object URLs when output changes or component unmounts
  useEffect(() => {
    return () => {
      outputUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [outputUrls]);

  // ── Load file & render thumbnails ─────────────────────────────────────────

  const loadFile = useCallback(async (f: File) => {
    setError(null);
    setBlobs([]);
    setOutputUrls((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
    setStatus("idle");
    setThumbs([]);
    setThumbProgress(null);

    try {
      const buffer = await f.arrayBuffer();
      const pdfjs = await getPdfJs();

      // Peek at page count without consuming the buffer
      const peekDoc = await pdfjs.getDocument({ data: new Uint8Array(buffer).slice() }).promise;
      const count = peekDoc.numPages;
      await peekDoc.destroy();

      setFile(f);
      setPageCount(count);

      // Render thumbnails progressively; each call gets its own .slice() copy
      const thumbArr: string[] = new Array(count).fill("");
      setThumbProgress({ current: 0, total: count });
      for (let i = 1; i <= count; i++) {
        setThumbProgress({ current: i, total: count });
        const { dataUrl } = await renderPage(
          pdfjs,
          new Uint8Array(buffer).slice(),
          i,
          THUMB_SCALE,
          "image/jpeg",
          0.7,
        );
        thumbArr[i - 1] = dataUrl;
        setThumbs([...thumbArr]);
      }
      setThumbProgress(null);
    } catch (e) {
      setThumbProgress(null);
      setError(e instanceof Error ? e.message : "Could not read PDF.");
    }
  }, []);

  // ── Convert at full resolution ────────────────────────────────────────────

  const convert = useCallback(async () => {
    if (!file) return;
    setError(null);
    setStatus("working");

    try {
      const buffer = await file.arrayBuffer();
      const pdfjs = await getPdfJs();

      const out: Blob[] = [];
      const urls: string[] = [];
      setConvertProgress({ current: 0, total: pageCount });

      for (let i = 1; i <= pageCount; i++) {
        setConvertProgress({ current: i, total: pageCount });
        const { blob } = await renderPage(
          pdfjs,
          new Uint8Array(buffer).slice(),
          i,
          EXPORT_SCALE,
          fmt,
          quality,
        );
        out.push(blob);
        urls.push(URL.createObjectURL(blob));
      }

      setConvertProgress(null);
      setBlobs(out);
      setOutputUrls(urls);
      setStatus("done");
    } catch (e) {
      setConvertProgress(null);
      setStatus("error");
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  }, [file, fmt, quality, pageCount]);

  // ── Download helpers ──────────────────────────────────────────────────────

  const ext = fmt === "image/png" ? ".png" : ".jpg";

  const downloadOne = useCallback(
    (index: number) => {
      const blob = blobs[index];
      if (!blob) return;
      void saveAs({
        suggestedName: `page-${index + 1}${ext}`,
        description: "Image",
        mime: fmt,
        ext,
        getBlob: () => blob,
        toolName: "pdf-to-image",
      });
    },
    [blobs, fmt, ext],
  );

  const downloadAll = useCallback(async () => {
    if (blobs.length === 0) return;
    if (blobs.length === 1) {
      downloadOne(0);
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
  }, [blobs, ext, downloadOne]);

  const reset = () => {
    outputUrls.forEach((u) => URL.revokeObjectURL(u));
    setFile(null);
    setBlobs([]);
    setOutputUrls([]);
    setThumbs([]);
    setStatus("idle");
    setThumbProgress(null);
    setConvertProgress(null);
  };

  // ── Grid: thumbnails before convert, full-res after ───────────────────────

  const gridUrls = outputUrls.length > 0 ? outputUrls : thumbs;
  const isConverted = outputUrls.length > 0;

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
        <>
          {/* Actionbar */}
          <div className="actionbar">
            <Button type="button" variant="outline" onClick={reset}>
              Change file
            </Button>
            <span className="field-label" style={{ margin: 0, flex: 1 }}>
              {file.name} — {pageCount} page{pageCount === 1 ? "" : "s"}
            </span>
            <div className="ab-actions">
              <Button
                type="button"
                disabled={status === "working"}
                onClick={() => void convert()}
              >
                {status === "working" && convertProgress
                  ? `Converting ${convertProgress.current}/${convertProgress.total}…`
                  : status === "working"
                    ? "Converting…"
                    : "Convert to images"}
              </Button>
              {blobs.length > 0 && (
                <Button type="button" variant="outline" onClick={() => void downloadAll()}>
                  <LuDownload />
                  {blobs.length > 1 ? "Download ZIP" : "Download image"}
                </Button>
              )}
            </div>
          </div>

          {/* Format / quality */}
          <section className="card settings">
            <div className="field">
              <Label>Output format</Label>
              <select
                value={fmt}
                onChange={(e) => { setFmt(e.target.value as Fmt); setBlobs([]); setOutputUrls([]); }}
                disabled={status === "working"}
              >
                <option value="image/png">PNG — lossless</option>
                <option value="image/jpeg">JPEG — smaller files</option>
              </select>
            </div>
            {fmt === "image/jpeg" && (
              <div className="field" style={{ flex: "1 1 200px" }}>
                <Label>Quality: {Math.round(quality * 100)}%</Label>
                <Slider
                  value={[Math.round(quality * 100)]}
                  onValueChange={(v) => {
                    setQuality((Array.isArray(v) ? v[0] : v) / 100);
                    setBlobs([]);
                    setOutputUrls([]);
                  }}
                  min={30}
                  max={100}
                  disabled={status === "working"}
                />
              </div>
            )}
          </section>

          {/* Thumbnail load progress */}
          {thumbProgress && thumbs.filter(Boolean).length === 0 && (
            <div style={{ padding: "0.5rem 0 0.75rem" }}>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "0.4rem" }}>
                Loading preview {thumbProgress.current}/{thumbProgress.total}…
              </p>
              <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
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

          {/* Convert progress bar */}
          {status === "working" && convertProgress && (
            <div style={{ padding: "0.5rem 0 0.75rem" }}>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "0.4rem" }}>
                Converting page {convertProgress.current} of {convertProgress.total}…
              </p>
              <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((convertProgress.current / convertProgress.total) * 100)}%`,
                    background: "var(--primary)",
                    transition: "width 0.1s",
                  }}
                />
              </div>
            </div>
          )}

          {/* Image grid */}
          {gridUrls.some(Boolean) && (
            <>
              {/* Column header */}
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "0.4rem" }}>
                {isConverted
                  ? `${blobs.length} page${blobs.length === 1 ? "" : "s"} converted — click a page to download individually`
                  : "Preview — click Convert to images to export at full resolution"}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              >
                {gridUrls.map((url, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
                  >
                    {/* Image thumbnail */}
                    <div
                      style={{
                        background: "var(--muted)",
                        borderRadius: "0.375rem",
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        minHeight: 80,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`Page ${i + 1}`}
                          style={{ display: "block", width: "100%", height: "auto" }}
                        />
                      ) : (
                        <LuImage size={28} style={{ opacity: 0.25 }} />
                      )}
                    </div>

                    {/* Label + per-page download */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.25rem",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                        {isConverted ? ext.slice(1).toUpperCase() + " · " : ""}p.{i + 1}
                      </span>
                      {isConverted && (
                        <button
                          type="button"
                          onClick={() => downloadOne(i)}
                          title={`Download page ${i + 1}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            padding: "0.2rem 0.4rem",
                            fontSize: "11px",
                            borderRadius: "0.3rem",
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--foreground)",
                            cursor: "pointer",
                            lineHeight: 1,
                          }}
                        >
                          <LuDownload size={11} />
                          Save
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
