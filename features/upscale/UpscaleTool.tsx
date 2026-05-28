"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { LuUpload, LuDownload, LuRefreshCw, LuZoomIn, LuSparkles, LuLock } from "react-icons/lu";
import { saveAs } from "@/lib/download";
import { loadImageFile, type LoadedImage } from "@/lib/files";
import { useAuth } from "@/context/AuthContext";

type Scale = 2 | 3 | 4;
type Mode = "smooth" | "crisp" | "ai";

const CANVAS_SCALES: Scale[] = [2, 3, 4];
const AI_SCALES: (2 | 4)[] = [2, 4];

function upscaleOnCanvas(img: HTMLImageElement, srcW: number, srcH: number, scale: Scale, mode: "smooth" | "crisp"): HTMLCanvasElement {
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
  const { isPro } = useAuth();
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

  const runCanvas = async (file: File) => {
    if (!loaded) return;
    setProcessing(true);
    setError(null);
    try {
      const canvas = upscaleOnCanvas(loaded.img, loaded.width, loaded.height, scale, mode as "smooth" | "crisp");
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

  const runAI = async (file: File) => {
    setProcessing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("scale", String(scale === 3 ? 4 : scale)); // AI only supports 2x and 4x
      const res = await fetch("/api/v1/upscale", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "AI upscaling failed");
      }
      const blob = await res.blob();
      if (lastResultUrlRef.current) URL.revokeObjectURL(lastResultUrlRef.current);
      const url = URL.createObjectURL(blob);
      lastResultUrlRef.current = url;
      resultBlobRef.current = blob;
      setResultUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI upscaling failed");
    } finally {
      setProcessing(false);
    }
  };

  const run = () => {
    if (!loaded) return;
    // Reconstruct the original File from the loaded image URL
    fetch(loaded.url)
      .then((r) => r.blob())
      .then((b) => {
        const file = new File([b], loaded.name, { type: b.type || "image/png" });
        return mode === "ai" ? runAI(file) : runCanvas(file);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"));
  };

  const download = async () => {
    if (!resultBlobRef.current || !loaded) return;
    const blob = resultBlobRef.current;
    const base = loaded.name.replace(/\.[^.]+$/, "") || "image";
    const name = `${base}-${scale}x.png`;
    await saveAs({ suggestedName: name, description: "PNG Image", mime: "image/png", ext: ".png", getBlob: () => blob, toolName: "upscale-image" });
  };

  const reset = () => {
    setLoaded(null);
    setResultUrl(null);
    resultBlobRef.current = null;
    setError(null);
  };

  const btnStyle = (active: boolean) => ({
    padding: "0.3rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
    background: active ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--card)",
    color: "var(--foreground)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
  } as React.CSSProperties);

  const availableScales = mode === "ai" ? AI_SCALES : CANVAS_SCALES;

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
            <button onClick={reset} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: "13px", color: "var(--foreground)" }}>
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
                {processing ? (mode === "ai" ? "AI upscaling… (30–60s)" : "Upscaling…") : `Upscale ${scale}×`}
              </button>
            )}
          </div>

          <section className="card settings">
            <div className="field">
              <span className="field-label">Upscale mode</span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={() => { setMode("smooth"); setResultUrl(null); if (scale === 3) {} }} style={btnStyle(mode === "smooth")}>
                  Smooth — photos
                </button>
                <button onClick={() => { setMode("crisp"); setResultUrl(null); }} style={btnStyle(mode === "crisp")}>
                  Crisp — pixel art
                </button>
                {isPro ? (
                  <button onClick={() => { setMode("ai"); setResultUrl(null); if (scale === 3) setScale(4); }} style={{ ...btnStyle(mode === "ai"), display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <LuSparkles size={12} /> AI (ESRGAN) — Pro
                  </button>
                ) : (
                  <Link href="/pricing" style={{ ...btnStyle(false), display: "flex", alignItems: "center", gap: "0.3rem", textDecoration: "none" }}>
                    <LuLock size={12} /> AI (ESRGAN) — <span style={{ opacity: 0.6 }}>Pro</span>
                  </Link>
                )}
              </div>
              {mode === "ai" && (
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "0.35rem" }}>
                  Uses Real-ESRGAN neural network via Replicate. Processing takes 30–60 seconds.
                </p>
              )}
            </div>

            <label className="field">
              <span className="field-label">Scale factor</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(mode === "ai" ? AI_SCALES : CANVAS_SCALES).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setScale(s); setResultUrl(null); }}
                    style={btnStyle(scale === s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                Output: {loaded.width * scale} × {loaded.height * scale} px
              </span>
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
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "0.35rem" }}>Upscaled {scale}×{mode === "ai" ? " (AI)" : ""}</p>
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
