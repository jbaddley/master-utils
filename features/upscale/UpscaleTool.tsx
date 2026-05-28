"use client";

import { useRef, useState, useCallback } from "react";
import { LuUpload, LuDownload, LuRefreshCw, LuZoomIn } from "react-icons/lu";
import { saveAs } from "@/lib/download";
import { loadImageFile, type LoadedImage } from "@/lib/files";

type Scale = 2 | 3 | 4;
type Mode = "smooth" | "crisp";

const SCALES: Scale[] = [2, 3, 4];

function upscaleOnCanvas(img: HTMLImageElement, srcW: number, srcH: number, scale: Scale, mode: Mode): HTMLCanvasElement {
  const outW = srcW * scale;
  const outH = srcH * scale;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = mode === "smooth";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outW, outH);
  return canvas;
}

export default function UpscaleTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [scale, setScale] = useState<Scale>(2);
  const [mode, setMode] = useState<Mode>("smooth");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const lastResultUrlRef = useRef<string | null>(null);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setResultUrl(null);
    resultBlobRef.current = null;
    try {
      const img = await loadImageFile(file);
      setLoaded(img);
    } catch {
      setError("Could not load that image.");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) onFile(f);
  }, [onFile]);

  const run = async () => {
    if (!loaded) return;
    setProcessing(true);
    setError(null);
    try {
      const canvas = upscaleOnCanvas(loaded.img, loaded.width, loaded.height, scale, mode);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("Canvas toBlob failed")), "image/png")
      );
      if (lastResultUrlRef.current) URL.revokeObjectURL(lastResultUrlRef.current);
      const url = URL.createObjectURL(blob);
      lastResultUrlRef.current = url;
      resultBlobRef.current = blob;
      setResultUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upscaling failed");
    } finally {
      setProcessing(false);
    }
  };

  const download = async () => {
    if (!resultBlobRef.current || !loaded) return;
    const blob = resultBlobRef.current;
    const base = loaded.name.replace(/\.[^.]+$/, "") || "image";
    const name = `${base}-${scale}x.png`;
    await saveAs({ suggestedName: name, description: "PNG Image", mime: "image/png", ext: ".png", getBlob: () => blob });
  };

  const reset = () => {
    setLoaded(null);
    setResultUrl(null);
    resultBlobRef.current = null;
    setError(null);
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!loaded ? (
        <div
          className="dropzone"
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
          />
          <div className="dropzone-inner">
            <LuZoomIn className="dropzone-icon" />
            <strong>Drop an image or click to select</strong>
            <span>JPG, PNG, WebP, AVIF, GIF — all formats accepted</span>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <button
              onClick={reset}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: "13px", color: "var(--foreground)" }}
            >
              <LuRefreshCw size={13} /> Change image
            </button>
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              {loaded.width} × {loaded.height} px
            </span>
            <div className="toolbar-spacer" />
            {resultUrl ? (
              <button onClick={download} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
                <LuDownload size={14} /> Download {scale}× PNG
              </button>
            ) : (
              <button
                onClick={run}
                disabled={processing}
                style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: processing ? "var(--muted)" : "var(--primary)", color: processing ? "var(--muted-foreground)" : "var(--primary-foreground)", cursor: processing ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px" }}
              >
                {processing ? "Upscaling…" : `Upscale ${scale}×`}
              </button>
            )}
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Scale factor</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {SCALES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setScale(s); setResultUrl(null); }}
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${scale === s ? "var(--primary)" : "var(--border)"}`,
                      background: scale === s ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--card)",
                      color: "var(--foreground)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: scale === s ? 600 : 400,
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <span className="field-hint" style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                Output: {loaded.width * scale} × {loaded.height * scale} px
              </span>
            </label>

            <label className="field">
              <span className="field-label">Upscale mode</span>
              <select
                value={mode}
                onChange={(e) => { setMode(e.target.value as Mode); setResultUrl(null); }}
                style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "13px" }}
              >
                <option value="smooth">Smooth — best for photos (bicubic interpolation)</option>
                <option value="crisp">Crisp — best for pixel art (nearest-neighbor)</option>
              </select>
            </label>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: resultUrl ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "0.35rem" }}>Original</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loaded.url} alt="Original" style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)" }} />
            </div>
            {resultUrl && (
              <div>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "0.35rem" }}>Upscaled {scale}×</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt={`Upscaled ${scale}×`} style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)" }} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
