"use client";

import { useState, useCallback, useRef } from "react";
import { LuArrowRight, LuUpload, LuDownload, LuLoader, LuCheck } from "react-icons/lu";
import { loadImageFile, isSupportedImage, ACCEPT_ATTR, baseName } from "@/lib/files";
import { drawToCanvas, canvasToBlob, isOpaqueFormat } from "@/lib/image";
import { saveAs } from "@/lib/download";
import type { PresetWorkflow, WorkflowStep } from "@/lib/workflows";

// JSZip is loaded dynamically to keep the initial bundle small.
type JSZipType = import("jszip");

const FAVICON_SIZES = [512, 256, 192, 180, 32, 16] as const;

function stepLabel(step: WorkflowStep): string {
  if (step.type === "resize") {
    return `Resize ${step.w}×${step.h} (${step.mode})`;
  }
  if (step.type === "compress") {
    const fmtLabel =
      step.fmt === "image/jpeg" ? "JPEG" : step.fmt === "image/webp" ? "WebP" : "PNG";
    return `Compress ${fmtLabel} ${Math.round(step.quality * 100)}%`;
  }
  return "Favicon Pack";
}

async function runResize(
  src: HTMLCanvasElement | HTMLImageElement,
  w: number,
  h: number,
  mode: "exact" | "contain",
): Promise<HTMLCanvasElement> {
  if (mode === "exact") {
    return drawToCanvas(src, w, h);
  }
  // contain: fit inside w×h preserving aspect ratio, pad with white
  const srcW = src instanceof HTMLCanvasElement ? src.width : (src as HTMLImageElement).naturalWidth;
  const srcH = src instanceof HTMLCanvasElement ? src.height : (src as HTMLImageElement).naturalHeight;
  const scale = Math.min(w / srcW, h / srcH);
  const drawW = Math.round(srcW * scale);
  const drawH = Math.round(srcH * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const offsetX = Math.round((w - drawW) / 2);
  const offsetY = Math.round((h - drawH) / 2);
  ctx.drawImage(src, offsetX, offsetY, drawW, drawH);
  return canvas;
}

async function runCompress(
  canvas: HTMLCanvasElement,
  fmt: "image/jpeg" | "image/webp" | "image/png",
  quality: number,
): Promise<Blob> {
  if (isOpaqueFormat(fmt)) {
    const flat = drawToCanvas(canvas, canvas.width, canvas.height, "#ffffff");
    return canvasToBlob(flat, fmt, quality);
  }
  return canvasToBlob(canvas, fmt, quality);
}

async function runFaviconPack(canvas: HTMLCanvasElement, base: string): Promise<Blob> {
  const { default: JSZip } = await import("jszip") as { default: new () => JSZipType };
  const zip = new JSZip();
  for (const size of FAVICON_SIZES) {
    const sized = drawToCanvas(canvas, size, size);
    const blob = await canvasToBlob(sized, "image/png");
    const buf = await blob.arrayBuffer();
    zip.file(`${base}-${size}x${size}.png`, buf);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

type StepState = "idle" | "active" | "done";

export default function WorkflowRunner({ workflow }: { workflow: PresetWorkflow }) {
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [stepStates, setStepStates] = useState<StepState[]>(
    () => workflow.steps.map(() => "idle"),
  );
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setError(null);
    setResultUrl(null);
    setResultName(null);
    setStepStates(workflow.steps.map(() => "idle"));
  }, [workflow.steps]);

  const onFileChange = useCallback(
    (f: File) => {
      if (!isSupportedImage(f)) {
        setError("Unsupported file. Please choose a PNG, JPG, WebP, GIF, BMP, or AVIF image.");
        return;
      }
      setFile(f);
      reset();
    },
    [reset],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) onFileChange(f);
    },
    [onFileChange],
  );

  const runWorkflow = async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setResultUrl(null);
    setResultName(null);
    setStepStates(workflow.steps.map(() => "idle"));

    const base = baseName(file.name);

    try {
      const loaded = await loadImageFile(file);
      let canvas: HTMLCanvasElement = drawToCanvas(
        loaded.img,
        loaded.img.naturalWidth,
        loaded.img.naturalHeight,
      );

      let finalBlob: Blob | null = null;

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        setStepStates((prev) => {
          const next = [...prev];
          next[i] = "active";
          return next;
        });

        if (step.type === "resize") {
          canvas = await runResize(canvas, step.w, step.h, step.mode);
        } else if (step.type === "compress") {
          const blob = await runCompress(canvas, step.fmt, step.quality);
          // Rebuild canvas from blob for any subsequent steps
          const url = URL.createObjectURL(blob);
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = url;
          });
          canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
          URL.revokeObjectURL(url);
          finalBlob = blob;
        } else if (step.type === "favicon-pack") {
          finalBlob = await runFaviconPack(canvas, base);
        }

        setStepStates((prev) => {
          const next = [...prev];
          next[i] = "done";
          return next;
        });
      }

      // If last step was a resize (no compress), encode as PNG
      if (finalBlob === null) {
        finalBlob = await canvasToBlob(canvas, "image/png");
      }

      const name = `${base}-${workflow.id}${workflow.outputExt}`;
      const url = URL.createObjectURL(finalBlob);
      setResultUrl(url);
      setResultName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setRunning(false);
    }
  };

  const download = async () => {
    if (!resultUrl || !resultName) return;
    const isFavicon = workflow.id === "favicon-pack";
    await saveAs({
      suggestedName: resultName,
      description: isFavicon ? "Favicon ZIP" : "Image",
      mime: workflow.outputMime,
      ext: workflow.outputExt,
      getBlob: () => fetch(resultUrl).then((r) => r.blob()),
      toolName: "workflow",
    });
  };

  const isImage = workflow.outputMime.startsWith("image/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Step badges */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
          padding: "0.75rem 1rem",
          background: "var(--muted)",
          borderRadius: "var(--radius)",
          fontSize: "13px",
        }}
      >
        {workflow.steps.map((step, i) => {
          const state = stepStates[i];
          return (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background:
                    state === "done"
                      ? "var(--primary)"
                      : state === "active"
                        ? "color-mix(in srgb, var(--primary) 30%, transparent)"
                        : "var(--card)",
                  color:
                    state === "done"
                      ? "var(--primary-foreground)"
                      : "var(--foreground)",
                  border: "1px solid var(--border)",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                {state === "done" ? (
                  <LuCheck size={11} />
                ) : state === "active" ? (
                  <LuLoader size={11} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--muted-foreground)",
                      color: "var(--muted)",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                {stepLabel(step)}
              </span>
              {i < workflow.steps.length - 1 && (
                <LuArrowRight
                  size={14}
                  style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
                />
              )}
            </span>
          );
        })}
      </div>

      {/* Dropzone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          border: "2px dashed var(--border)",
          borderRadius: "var(--radius)",
          padding: "2rem",
          textAlign: "center",
          cursor: "pointer",
          background: file
            ? "color-mix(in srgb, var(--primary) 5%, transparent)"
            : "transparent",
          transition: "background 0.15s",
        }}
      >
        <LuUpload
          size={28}
          style={{ margin: "0 auto 0.75rem", color: "var(--muted-foreground)", display: "block" }}
        />
        {file ? (
          <p style={{ fontSize: "14px", color: "var(--foreground)", margin: 0 }}>
            {file.name}{" "}
            <span style={{ color: "var(--muted-foreground)" }}>
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </p>
        ) : (
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", margin: 0 }}>
            Drop an image here, or click to select
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileChange(f);
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={runWorkflow}
          disabled={!file || running}
          style={{
            padding: "0.6rem 1.5rem",
            borderRadius: "var(--radius)",
            background: file && !running ? "var(--primary)" : "var(--muted)",
            color: file && !running ? "var(--primary-foreground)" : "var(--muted-foreground)",
            border: "none",
            cursor: file && !running ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {running && (
            <LuLoader size={14} style={{ animation: "spin 1s linear infinite" }} />
          )}
          {running ? "Processing…" : "Run Workflow"}
        </button>

        {resultUrl && resultName && (
          <button
            onClick={download}
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "var(--radius)",
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <LuDownload size={14} />
            Download {resultName}
          </button>
        )}
      </div>

      {error && (
        <p style={{ color: "var(--destructive)", fontSize: "14px", margin: 0 }}>{error}</p>
      )}

      {resultUrl && isImage && (
        <div
          style={{
            borderRadius: "var(--radius)",
            overflow: "hidden",
            maxHeight: 300,
            display: "flex",
            justifyContent: "center",
            background: "var(--muted)",
            padding: "0.5rem",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Workflow result preview"
            style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}
