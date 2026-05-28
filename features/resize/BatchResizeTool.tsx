"use client";

import { useRef, useState } from "react";
import { LuImagePlus, LuDownload, LuTrash2, LuPlus, LuLink, LuLink2Off } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCEPT_ATTR, isSupportedImage, loadImageFile, baseName } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import JSZip from "jszip";

type Fmt = "image/png" | "image/jpeg" | "image/webp";

const EXT: Record<Fmt, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const SOCIAL_PRESETS = [
  { id: "ig-post",   label: "Instagram Post",      w: 1080, h: 1080 },
  { id: "ig-story",  label: "Instagram Story/Reel", w: 1080, h: 1920 },
  { id: "yt-thumb",  label: "YouTube Thumbnail",    w: 1280, h: 720  },
  { id: "yt-banner", label: "YouTube Channel Art",  w: 2560, h: 1440 },
  { id: "li-banner", label: "LinkedIn Banner",      w: 1584, h: 396  },
  { id: "li-post",   label: "LinkedIn Post",        w: 1200, h: 627  },
  { id: "tt-video",  label: "TikTok/Reel",          w: 1080, h: 1920 },
  { id: "fb-cover",  label: "Facebook Cover",       w: 820,  h: 312  },
  { id: "tw-header", label: "X (Twitter) Header",   w: 1500, h: 500  },
  { id: "og-image",  label: "Open Graph / Meta",    w: 1200, h: 630  },
] as const;

type BatchFile = {
  file: File;
  status: "pending" | "done" | "error";
  outputSize?: number;
  outputW?: number;
  outputH?: number;
};

export default function BatchResizeTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [w, setW] = useState(1280);
  const [h, setH] = useState(720);
  const [lock, setLock] = useState(true);
  const [fmt, setFmt] = useState<Fmt>("image/png");
  const [processing, setProcessing] = useState(false);

  const handleFiles = (incoming: File[]) => {
    const supported = incoming.filter(isSupportedImage);
    if (!supported.length) return;
    setFiles((prev) => [
      ...prev,
      ...supported.map((f) => ({ file: f, status: "pending" as const })),
    ]);
  };

  const removeAll = () => setFiles([]);

  const resizeAll = async () => {
    if (!files.length || processing) return;
    setProcessing(true);

    const results: { name: string; blob: Blob }[] = [];
    const updated: BatchFile[] = files.map((bf) => ({ ...bf, status: "pending" as const }));
    setFiles([...updated]);

    for (let i = 0; i < files.length; i++) {
      try {
        const loaded = await loadImageFile(files[i].file);

        let outW: number;
        let outH: number;

        if (lock) {
          // Scale to contain: fit within w×h maintaining aspect ratio
          const scale = Math.min(w / loaded.width, h / loaded.height);
          outW = Math.max(1, Math.round(loaded.width * scale));
          outH = Math.max(1, Math.round(loaded.height * scale));
        } else {
          outW = Math.max(1, w);
          outH = Math.max(1, h);
        }

        const canvas = drawToCanvas(
          loaded.img,
          outW,
          outH,
          isOpaqueFormat(fmt) ? "#ffffff" : undefined,
        );
        const blob = await canvasToBlob(canvas, fmt, fmt === "image/png" ? undefined : 0.92);
        URL.revokeObjectURL(loaded.url);

        const outputName = `${baseName(files[i].file.name)}-${outW}x${outH}${EXT[fmt]}`;
        results.push({ name: outputName, blob });

        updated[i] = { ...updated[i], status: "done", outputSize: blob.size, outputW: outW, outputH: outH };
        setFiles([...updated]);
      } catch {
        updated[i] = { ...updated[i], status: "error" };
        setFiles([...updated]);
      }
    }

    if (results.length > 0) {
      const zip = new JSZip();
      for (const { name, blob } of results) {
        zip.file(name, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resized-images.zip";
      a.click();
      URL.revokeObjectURL(url);
    }

    setProcessing(false);
  };

  return (
    <div className="tool-ui">
      <div
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={(e) => {
            handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <div className="dropzone-inner">
          <LuImagePlus className="dropzone-icon" />
          <strong>Drop multiple images here</strong>
          <span>or click to browse — JPG, PNG, WebP, AVIF, GIF, BMP, SVG</span>
        </div>
      </div>

      {files.length > 0 && (
        <>
          <div className="toolbar" style={{ marginTop: "1rem" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={processing}
            >
              <LuPlus />
              Add more
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={removeAll}
              disabled={processing}
            >
              <LuTrash2 />
              Remove all
            </Button>
            <div className="toolbar-spacer" />
            <Button onClick={resizeAll} disabled={processing}>
              <LuDownload />
              {processing ? "Resizing…" : "Resize All & Download ZIP"}
            </Button>
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Width (px)</span>
              <Input
                type="number"
                min={1}
                value={w}
                disabled={processing}
                onChange={(e) => setW(Math.max(1, Math.round(Number(e.target.value))))}
              />
            </label>
            <label className="field">
              <span className="field-label">Height (px)</span>
              <Input
                type="number"
                min={1}
                value={h}
                disabled={processing}
                onChange={(e) => setH(Math.max(1, Math.round(Number(e.target.value))))}
              />
            </label>
            <div className="field">
              <span className="field-label">Aspect</span>
              <Button
                variant={lock ? "default" : "outline"}
                onClick={() => setLock((v) => !v)}
                disabled={processing}
                title={lock ? "Maintain aspect ratio (scale to fit)" : "Resize to exact dimensions"}
              >
                {lock ? <LuLink /> : <LuLink2Off />}
                {lock ? "Locked" : "Free"}
              </Button>
            </div>
            <label className="field">
              <span className="field-label">Format</span>
              <select
                value={fmt}
                onChange={(e) => setFmt(e.target.value as Fmt)}
                disabled={processing}
              >
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/webp">WebP</option>
              </select>
            </label>
            <div className="field" style={{ flexBasis: "100%" }}>
              <span className="field-label">Social media presets</span>
              <div className="row" style={{ flexWrap: "wrap", gap: "0.375rem" }}>
                {SOCIAL_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    disabled={processing}
                    onClick={() => {
                      setW(preset.w);
                      setH(preset.h);
                      setLock(false);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <div className="batch-file-list">
            {files.map((bf, i) => (
              <div key={i} className="batch-file-row">
                <span className="batch-file-name">{bf.file.name}</span>
                <span className="batch-file-size">{formatBytes(bf.file.size)}</span>
                <span className={`batch-file-status${bf.status !== "pending" ? ` ${bf.status}` : ""}`}>
                  {bf.status === "pending" && (processing ? "…" : "—")}
                  {bf.status === "done" && bf.outputW != null && bf.outputH != null && (
                    <>
                      {bf.outputW}×{bf.outputH}
                      {bf.outputSize != null && <> · {formatBytes(bf.outputSize)}</>}
                    </>
                  )}
                  {bf.status === "error" && "Error"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {files.length === 0 && (
        <p className="batch-empty">No images added yet. Drop or browse to get started.</p>
      )}
    </div>
  );
}
