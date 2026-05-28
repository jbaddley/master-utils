"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LuImagePlus, LuDownload, LuTrash2, LuPlus, LuLock } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ACCEPT_ATTR, isSupportedImage, loadImageFile, baseName } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import JSZip from "jszip";

const FREE_FILE_LIMIT = 1;

type Fmt = "image/webp" | "image/jpeg" | "image/png";

const FMT_EXT: Record<Fmt, string> = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

type BatchFile = {
  file: File;
  status: "pending" | "done" | "error";
  outputSize?: number;
};

export default function BatchCompressTool() {
  const { isPro } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [fmt, setFmt] = useState<Fmt>("image/webp");
  const [quality, setQuality] = useState(0.7);
  const [processing, setProcessing] = useState(false);

  const canAddMore = isPro || files.length < FREE_FILE_LIMIT;

  const handleFiles = (incoming: File[]) => {
    const supported = incoming.filter(isSupportedImage);
    if (!supported.length) return;
    if (!isPro) {
      // Free users: only the first file(s) up to the limit
      const slots = Math.max(0, FREE_FILE_LIMIT - files.length);
      setFiles((prev) => [
        ...prev,
        ...supported.slice(0, slots).map((f) => ({ file: f, status: "pending" as const })),
      ]);
      return;
    }
    setFiles((prev) => [
      ...prev,
      ...supported.map((f) => ({ file: f, status: "pending" as const })),
    ]);
  };

  const removeAll = () => setFiles([]);

  const compressAll = async () => {
    if (!files.length || processing) return;
    setProcessing(true);

    const results: { name: string; blob: Blob }[] = [];
    const updated: BatchFile[] = files.map((bf) => ({ ...bf, status: "pending" as const }));
    setFiles([...updated]);

    for (let i = 0; i < files.length; i++) {
      try {
        const loaded = await loadImageFile(files[i].file);
        const lossy = fmt !== "image/png";
        const canvas = drawToCanvas(
          loaded.img,
          loaded.width,
          loaded.height,
          isOpaqueFormat(fmt) ? "#ffffff" : undefined,
        );
        const blob = await canvasToBlob(canvas, fmt, lossy ? quality : undefined);
        URL.revokeObjectURL(loaded.url);

        const outputName = `${baseName(files[i].file.name)}-compressed${FMT_EXT[fmt]}`;
        results.push({ name: outputName, blob });

        updated[i] = { ...updated[i], status: "done", outputSize: blob.size };
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
      a.download = "compressed-images.zip";
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
              disabled={processing || !canAddMore}
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
            <Button onClick={compressAll} disabled={processing}>
              <LuDownload />
              {processing ? "Compressing…" : "Compress All & Download ZIP"}
            </Button>
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Output format</span>
              <select
                value={fmt}
                onChange={(e) => setFmt(e.target.value as Fmt)}
                disabled={processing}
              >
                <option value="image/webp">WebP — best compression</option>
                <option value="image/jpeg">JPEG — photos</option>
                <option value="image/png">PNG — lossless</option>
              </select>
            </label>
            {fmt !== "image/png" && (
              <div className="field">
                <span className="field-label">Quality: {Math.round(quality * 100)}%</span>
                <Slider
                  className="mt-2"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[quality]}
                  onValueChange={(v) => setQuality(Array.isArray(v) ? v[0] : v)}
                  disabled={processing}
                />
              </div>
            )}
          </section>

          {!isPro && (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--muted)", marginTop: "0.75rem" }}>
              <LuLock style={{ flexShrink: 0, color: "var(--muted-foreground)" }} />
              <span className="text-sm text-muted-foreground">
                Free plan: 1 file at a time.{" "}
                <Link href="/pricing" className="underline underline-offset-2">Upgrade to Pro</Link>
                {" "}to batch-compress up to 50 files.
              </span>
            </div>
          )}

          <div className="batch-file-list">
            {files.map((bf, i) => (
              <div key={i} className="batch-file-row">
                <span className="batch-file-name">{bf.file.name}</span>
                <span className="batch-file-size">{formatBytes(bf.file.size)}</span>
                <span className={`batch-file-status${bf.status !== "pending" ? ` ${bf.status}` : ""}`}>
                  {bf.status === "pending" && (processing ? "…" : "—")}
                  {bf.status === "done" && bf.outputSize != null && (
                    <>
                      {formatBytes(bf.outputSize)}{" "}
                      <span
                        className={
                          bf.outputSize < bf.file.size ? "savings" : "bigger"
                        }
                      >
                        {bf.outputSize < bf.file.size
                          ? `−${Math.round((1 - bf.outputSize / bf.file.size) * 100)}%`
                          : `+${Math.round((bf.outputSize / bf.file.size - 1) * 100)}%`}
                      </span>
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
