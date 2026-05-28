"use client";

import { useState, useCallback, useRef } from "react";
import { LuArrowRight, LuUpload, LuDownload, LuLoader } from "react-icons/lu";
import { loadImageFile, type LoadedImage } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { saveAs } from "@/lib/download";

type Step = {
  id: string;
  label: string;
  description: string;
};

type WorkflowConfig = {
  id: string;
  title: string;
  description: string;
  steps: Step[];
  run: (file: File, onProgress: (msg: string) => void) => Promise<{ blob: Blob; name: string }>;
};

async function compressToWebP(img: HTMLImageElement, w: number, h: number, quality: number): Promise<Blob> {
  const canvas = drawToCanvas(img, w, h);
  return canvasToBlob(canvas, "image/webp", quality);
}

const WORKFLOWS: WorkflowConfig[] = [
  {
    id: "optimize-for-web",
    title: "Optimize for Web",
    description: "Resize to 1200px wide, convert to WebP at 80% quality.",
    steps: [
      { id: "load", label: "Load image", description: "Read the source file" },
      { id: "resize", label: "Resize to 1200px", description: "Scale proportionally, max 1200px width" },
      { id: "convert", label: "Convert to WebP", description: "Encode at 80% quality for best size/quality" },
      { id: "done", label: "Download", description: "Save the optimized file" },
    ],
    async run(file, onProgress) {
      onProgress("Loading image…");
      const loaded = await loadImageFile(file);
      onProgress("Resizing to 1200px…");
      const maxW = 1200;
      const scale = loaded.width > maxW ? maxW / loaded.width : 1;
      const w = Math.round(loaded.width * scale);
      const h = Math.round(loaded.height * scale);
      onProgress("Converting to WebP…");
      const blob = await compressToWebP(loaded.img, w, h, 0.8);
      const name = file.name.replace(/\.[^.]+$/, "") + "-optimized.webp";
      return { blob, name };
    },
  },
  {
    id: "shopify-product",
    title: "Shopify Product Image",
    description: "Square-crop to 2048×2048, export as JPEG at 85% for Shopify listings.",
    steps: [
      { id: "load", label: "Load image", description: "Read the source file" },
      { id: "crop", label: "Square crop", description: "Center-crop to square" },
      { id: "resize", label: "Resize to 2048×2048", description: "Scale to Shopify recommended size" },
      { id: "convert", label: "Export as JPEG", description: "85% quality JPEG" },
      { id: "done", label: "Download", description: "Save the product image" },
    ],
    async run(file, onProgress) {
      onProgress("Loading image…");
      const loaded = await loadImageFile(file);
      onProgress("Square-cropping…");
      const size = Math.min(loaded.width, loaded.height);
      const sx = (loaded.width - size) / 2;
      const sy = (loaded.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 2048, 2048);
      ctx.drawImage(loaded.img, sx, sy, size, size, 0, 0, 2048, 2048);
      onProgress("Exporting as JPEG…");
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
      const name = file.name.replace(/\.[^.]+$/, "") + "-shopify.jpg";
      return { blob, name };
    },
  },
  {
    id: "social-thumbnail",
    title: "YouTube Thumbnail",
    description: "Resize to 1280×720 (16:9), export as JPEG at 90% quality.",
    steps: [
      { id: "load", label: "Load image", description: "Read the source file" },
      { id: "crop", label: "Crop to 16:9", description: "Center-crop to widescreen aspect ratio" },
      { id: "resize", label: "Resize to 1280×720", description: "Scale to YouTube thumbnail dimensions" },
      { id: "convert", label: "Export as JPEG", description: "90% quality JPEG" },
      { id: "done", label: "Download", description: "Save the thumbnail" },
    ],
    async run(file, onProgress) {
      onProgress("Loading image…");
      const loaded = await loadImageFile(file);
      onProgress("Cropping to 16:9…");
      const targetRatio = 1280 / 720;
      const srcRatio = loaded.width / loaded.height;
      let sx = 0, sy = 0, sw = loaded.width, sh = loaded.height;
      if (srcRatio > targetRatio) {
        sw = Math.round(loaded.height * targetRatio);
        sx = Math.round((loaded.width - sw) / 2);
      } else {
        sh = Math.round(loaded.width / targetRatio);
        sy = Math.round((loaded.height - sh) / 2);
      }
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(loaded.img, sx, sy, sw, sh, 0, 0, 1280, 720);
      onProgress("Exporting as JPEG…");
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
      const name = file.name.replace(/\.[^.]+$/, "") + "-youtube-thumb.jpg";
      return { blob, name };
    },
  },
  {
    id: "instagram-post",
    title: "Instagram Post",
    description: "Square-crop to 1080×1080, export as JPEG at 85% quality.",
    steps: [
      { id: "load", label: "Load image", description: "Read the source file" },
      { id: "crop", label: "Square crop", description: "Center-crop to 1:1 aspect ratio" },
      { id: "resize", label: "Resize to 1080×1080", description: "Scale to Instagram post size" },
      { id: "convert", label: "Export as JPEG", description: "85% quality JPEG" },
      { id: "done", label: "Download", description: "Save for Instagram" },
    ],
    async run(file, onProgress) {
      onProgress("Loading image…");
      const loaded = await loadImageFile(file);
      onProgress("Square-cropping…");
      const size = Math.min(loaded.width, loaded.height);
      const sx = (loaded.width - size) / 2;
      const sy = (loaded.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.drawImage(loaded.img, sx, sy, size, size, 0, 0, 1080, 1080);
      onProgress("Exporting as JPEG…");
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
      const name = file.name.replace(/\.[^.]+$/, "") + "-instagram.jpg";
      return { blob, name };
    },
  },
];

export default function WorkflowLauncher({ workflowId }: { workflowId?: string }) {
  const [selectedId, setSelectedId] = useState<string>(workflowId ?? WORKFLOWS[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = WORKFLOWS.find((w) => w.id === selectedId) ?? WORKFLOWS[0];

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) { setFile(f); setResult(null); setError(null); }
  }, []);

  const runWorkflow = async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const { blob, name } = await selected.run(file, setStatus);
      const url = URL.createObjectURL(blob);
      setResult({ url, name });
      setStatus("Done!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Workflow failed");
    } finally {
      setRunning(false);
    }
  };

  const download = async () => {
    if (!result || !file) return;
    const ext = result.name.split(".").pop()!;
    const mime = ext === "webp" ? "image/webp" : ext === "jpg" ? "image/jpeg" : "image/png";
    await saveAs({ suggestedName: result.name, description: "Image", mime, ext: `.${ext}`, getBlob: () => fetch(result.url).then((r) => r.blob()) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Workflow selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {WORKFLOWS.map((w) => (
          <button
            key={w.id}
            onClick={() => { setSelectedId(w.id); setResult(null); setStatus(""); }}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius)",
              border: `2px solid ${w.id === selectedId ? "var(--primary)" : "var(--border)"}`,
              background: w.id === selectedId ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "var(--card)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "0.25rem", color: "var(--foreground)" }}>{w.title}</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.4 }}>{w.description}</div>
          </button>
        ))}
      </div>

      {/* Steps preview */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", padding: "0.75rem 1rem", background: "var(--muted)", borderRadius: "var(--radius)", fontSize: "13px" }}>
        {selected.steps.map((step, i) => (
          <span key={step.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{step.label}</span>
            {i < selected.steps.length - 1 && <LuArrowRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
          </span>
        ))}
      </div>

      {/* Drop zone */}
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
          background: file ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent",
        }}
      >
        <LuUpload size={28} style={{ margin: "0 auto 0.75rem", color: "var(--muted-foreground)" }} />
        {file ? (
          <p style={{ fontSize: "14px", color: "var(--foreground)" }}>{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
        ) : (
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Drop an image here, or click to select</p>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); setError(null); } }} />
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
          {running && <LuLoader size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {running ? status || "Processing…" : `Run: ${selected.title}`}
        </button>

        {result && (
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
            Download {result.name}
          </button>
        )}
      </div>

      {error && <p style={{ color: "var(--destructive)", fontSize: "14px" }}>{error}</p>}

      {result && (
        <div style={{ borderRadius: "var(--radius)", overflow: "hidden", maxHeight: 300, display: "flex", justifyContent: "center", background: "var(--muted)", padding: "0.5rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Result preview" style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}
