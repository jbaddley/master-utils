"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
  LuCheck,
  LuChevronRight,
  LuCloudUpload,
  LuDownload,
  LuImage,
  LuLock,
  LuPlus,
  LuRefreshCw,
  LuZap,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/context/AuthContext";
import { saveAs } from "@/lib/download";

// ── Types ────────────────────────────────────────────────────────────────────

type FilterName =
  | "none"
  | "blackwhite"
  | "sepia"
  | "warm"
  | "cool"
  | "retro"
  | "cinematic"
  | "bright";

interface PrintSizeDef {
  label: string;
  w: number; // inches (shorter dim)
  h: number; // inches (longer dim)
}

interface PrepImage {
  id: string;
  file: File;
  url: string;
  naturalW: number;
  naturalH: number;
  filter: FilterName;
  sizeKey: string | null;
  brightness: number; // 0.5–1.5
  contrast: number;   // 0.5–1.5
  done: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FILTER_CSS: Record<FilterName, string> = {
  none: "none",
  blackwhite: "grayscale(100%)",
  sepia: "sepia(100%)",
  warm: "saturate(1.3) hue-rotate(-15deg) brightness(1.05)",
  cool: "saturate(0.8) hue-rotate(15deg) brightness(1.05)",
  retro: "sepia(40%) saturate(0.9) contrast(1.15) brightness(0.92)",
  cinematic: "saturate(1.4) contrast(1.25) brightness(0.88) hue-rotate(-5deg)",
  bright: "brightness(1.3) saturate(1.15)",
};

const FILTERS: { name: FilterName; label: string }[] = [
  { name: "none", label: "Original" },
  { name: "blackwhite", label: "B&W" },
  { name: "sepia", label: "Sepia" },
  { name: "warm", label: "Warm" },
  { name: "cool", label: "Cool" },
  { name: "retro", label: "Retro" },
  { name: "cinematic", label: "Cinematic" },
  { name: "bright", label: "Bright" },
];

const PRINT_SIZES: Record<string, PrintSizeDef> = {
  "4x6":   { label: '4×6"',   w: 4,    h: 6  },
  "5x7":   { label: '5×7"',   w: 5,    h: 7  },
  "4x4":   { label: '4×4"',   w: 4,    h: 4  },
  "8x10":  { label: '8×10"',  w: 8,    h: 10 },
  "5x5":   { label: '5×5"',   w: 5,    h: 5  },
  "3.5x5": { label: '3.5×5"', w: 3.5,  h: 5  },
  "11x14": { label: '11×14"', w: 11,   h: 14 },
  "12x12": { label: '12×12"', w: 12,   h: 12 },
};

const PRINT_DPI = 300;
const MIN_DPI   = 200; // threshold for "grainy"

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2);
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "image";
}

function buildCssFilter(img: Pick<PrepImage, "filter" | "brightness" | "contrast">): string {
  const parts: string[] = [];
  const base = FILTER_CSS[img.filter];
  if (base !== "none") parts.push(base);
  if (img.brightness !== 1) parts.push(`brightness(${img.brightness.toFixed(2)})`);
  if (img.contrast !== 1) parts.push(`contrast(${img.contrast.toFixed(2)})`);
  return parts.length ? parts.join(" ") : "none";
}

/** Returns the CSS aspect-ratio string for the preview given the selected print size and image orientation. */
function printAspect(img: PrepImage): string | undefined {
  if (!img.sizeKey) return undefined;
  const sz = PRINT_SIZES[img.sizeKey];
  if (!sz) return undefined;
  if (sz.w === sz.h) return "1/1"; // square
  const isLandscape = img.naturalW >= img.naturalH;
  const pw = isLandscape ? Math.max(sz.w, sz.h) : Math.min(sz.w, sz.h);
  const ph = isLandscape ? Math.min(sz.w, sz.h) : Math.max(sz.w, sz.h);
  return `${pw}/${ph}`;
}

/** Human-readable max print size label shown under each thumbnail. */
function maxPrintLabel(w: number, h: number): string {
  const wIn = (w / MIN_DPI).toFixed(1);
  const hIn = (h / MIN_DPI).toFixed(1);
  return `Up to ${wIn}×${hIn}"`;
}

/** Whether the image meets the recommended DPI for the selected print size. */
function meetsQualityForSize(img: PrepImage): boolean {
  if (!img.sizeKey) return true;
  const sz = PRINT_SIZES[img.sizeKey];
  if (!sz) return true;
  const minPx = Math.min(sz.w, sz.h) * PRINT_DPI;
  return Math.min(img.naturalW, img.naturalH) >= minPx;
}

/** Export a single image (filter + center-crop to print size) as a JPEG blob. */
function exportImage(img: PrepImage): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const el = new Image();
    el.onload = () => {
      // Determine target pixel dimensions
      let tw: number, th: number;
      const sz = img.sizeKey ? PRINT_SIZES[img.sizeKey] : null;
      if (sz) {
        const isLandscape = img.naturalW >= img.naturalH;
        const pw = isLandscape ? Math.max(sz.w, sz.h) : Math.min(sz.w, sz.h);
        const ph = isLandscape ? Math.min(sz.w, sz.h) : Math.max(sz.w, sz.h);
        tw = Math.round(pw * PRINT_DPI);
        th = Math.round(ph * PRINT_DPI);
      } else {
        tw = img.naturalW;
        th = img.naturalH;
      }

      // Center-crop source rect to match target aspect ratio
      const srcRatio = img.naturalW / img.naturalH;
      const dstRatio = tw / th;
      let sx: number, sy: number, sw: number, sh: number;
      if (srcRatio > dstRatio) {
        sh = img.naturalH;
        sw = Math.round(sh * dstRatio);
        sx = Math.round((img.naturalW - sw) / 2);
        sy = 0;
      } else {
        sw = img.naturalW;
        sh = Math.round(sw / dstRatio);
        sx = 0;
        sy = Math.round((img.naturalH - sh) / 2);
      }

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No 2D context")); return; }
      ctx.filter = buildCssFilter(img);
      ctx.drawImage(el, sx, sy, sw, sh, 0, 0, tw, th);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
        "image/jpeg",
        0.93,
      );
    };
    el.onerror = () => reject(new Error("Failed to load image"));
    el.src = img.url;
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PrintPrepTool() {
  const { user, isPro, openAuthModal } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<Set<string>>(new Set());

  const [images, setImages] = useState<PrepImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zipStatus, setZipStatus] = useState<"idle" | "building">("idle");
  const [driveMsg, setDriveMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const selected = images.find((img) => img.id === selectedId) ?? null;
  const selectedIdx = images.findIndex((img) => img.id === selectedId);
  const doneCount = images.filter((img) => img.done).length;

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const loadFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setError(null);
    const newImgs: PrepImage[] = [];
    let pending = imageFiles.length;
    imageFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      urlsRef.current.add(url);
      const el = new Image();
      el.onload = () => {
        newImgs.push({
          id: uid(),
          file,
          url,
          naturalW: el.naturalWidth,
          naturalH: el.naturalHeight,
          filter: "none",
          sizeKey: null,
          brightness: 1,
          contrast: 1,
          done: false,
        });
        if (--pending === 0) {
          setImages((prev) => {
            const next = [...prev, ...newImgs];
            if (!prev.length && next.length) setSelectedId(next[0].id);
            return next;
          });
        }
      };
      el.onerror = () => {
        if (--pending === 0 && newImgs.length) {
          setImages((prev) => {
            const next = [...prev, ...newImgs];
            if (!prev.length && next.length) setSelectedId(next[0].id);
            return next;
          });
        }
      };
      el.src = url;
    });
  }, []);

  const updateSelected = useCallback((patch: Partial<PrepImage>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === selectedId ? { ...img, ...patch } : img)),
    );
  }, [selectedId]);

  const markDone = () => {
    setImages((prev) => {
      const next = prev.map((img) =>
        img.id === selectedId ? { ...img, done: true } : img,
      );
      // Auto-advance to next undone image
      const nextUndone = next.find((img, i) => i > selectedIdx && !img.done);
      if (nextUndone) setSelectedId(nextUndone.id);
      else {
        const anyUndone = next.find((img) => !img.done);
        if (anyUndone) setSelectedId(anyUndone.id);
      }
      return next;
    });
  };

  const downloadZip = async () => {
    if (!images.length || zipStatus === "building") return;
    setZipStatus("building");
    setError(null);
    try {
      const zip = new JSZip();
      await Promise.all(
        images.map(async (img) => {
          const blob = await exportImage(img);
          const suffix = img.sizeKey ? `_${img.sizeKey}` : "";
          zip.file(`${baseName(img.file.name)}${suffix}.jpg`, blob);
        }),
      );
      const zipBlob = await zip.generateAsync({ type: "blob" });
      void saveAs({
        suggestedName: "print-ready.zip",
        description: "Print-ready photos",
        mime: "application/zip",
        ext: ".zip",
        getBlob: () => zipBlob,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setZipStatus("idle");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    loadFiles(Array.from(e.dataTransfer.files));
  };

  // ── Render: empty state ───────────────────────────────────────────────────
  if (!images.length) {
    return (
      <div className="tool-ui">
        <div
          className="dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              loadFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <div className="dropzone-inner">
            <LuImage className="dropzone-icon" />
            <strong>Drop photos or click to select</strong>
            <span>JPEG, PNG, WebP — multiple files supported</span>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  // ── Render: main UI ───────────────────────────────────────────────────────
  const aspect = selected ? printAspect(selected) : undefined;
  const cssFilter = selected ? buildCssFilter(selected) : "none";
  const goodQuality = selected ? meetsQualityForSize(selected) : true;

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {/* Hidden file input for adding more */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          loadFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <div className="pp-layout">
        {/* ── Left sidebar ── */}
        <div className="pp-sidebar">
          {/* Sidebar header */}
          <div className="pp-sidebar-head">
            <span className="pp-sidebar-count">
              {images.length} photo{images.length !== 1 ? "s" : ""}
              {doneCount > 0 && (
                <span className="pp-done-badge">{doneCount} done</span>
              )}
            </span>
            <button
              className="pp-add-btn"
              onClick={() => inputRef.current?.click()}
              title="Add more photos"
            >
              <LuPlus size={14} /> Add
            </button>
          </div>

          {/* Thumbnail grid */}
          <div className="pp-grid">
            {images.map((img) => (
              <button
                key={img.id}
                className={`pp-thumb ${img.id === selectedId ? "selected" : ""} ${img.done ? "done" : ""}`}
                onClick={() => setSelectedId(img.id)}
                title={img.file.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.file.name}
                  className="pp-thumb-img"
                  style={{ filter: buildCssFilter(img) }}
                />
                {img.done && (
                  <span className="pp-check">
                    <LuCheck size={12} />
                  </span>
                )}
                <span className="pp-thumb-size">
                  {maxPrintLabel(img.naturalW, img.naturalH)}
                </span>
              </button>
            ))}
          </div>

          {/* Google Drive — logged-in only */}
          {user ? (
            <div className="pp-drive-section">
              <button
                className="pp-drive-btn"
                onClick={() => { setDriveMsg(true); setTimeout(() => setDriveMsg(false), 3000); }}
              >
                <LuCloudUpload size={14} />
                Import from Google Drive / Photos
              </button>
              {driveMsg && (
                <p className="pp-drive-note">
                  Google Drive integration coming soon — you&apos;ll be able to pull and push photos directly.
                </p>
              )}
            </div>
          ) : null}

          {/* Download ZIP */}
          <div className="pp-sidebar-foot">
            <Button
              className="w-full"
              onClick={() => void downloadZip()}
              disabled={zipStatus === "building"}
            >
              <LuDownload />
              {zipStatus === "building"
                ? "Building ZIP…"
                : `Download ZIP (${images.length} photo${images.length !== 1 ? "s" : ""})`}
            </Button>
          </div>
        </div>

        {/* ── Editor ── */}
        <div className="pp-editor">
          {selected ? (
            <>
              {/* Preview */}
              <div
                className={`pp-preview ${aspect ? "pp-preview--crop" : ""}`}
                style={aspect ? { aspectRatio: aspect } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.url}
                  alt={selected.file.name}
                  className="pp-preview-img"
                  style={{
                    filter: cssFilter,
                    objectFit: aspect ? "cover" : "contain",
                  }}
                />
                {!goodQuality && (
                  <div className="pp-quality-warn">
                    ⚠ Image may be too small for print-quality at this size
                  </div>
                )}
              </div>

              {/* Filename + max size */}
              <div className="pp-image-meta">
                <span className="pp-image-name">{selected.file.name}</span>
                <span className="pp-image-dims">
                  {selected.naturalW}×{selected.naturalH}px ·{" "}
                  {maxPrintLabel(selected.naturalW, selected.naturalH)} @ 300 DPI
                </span>
              </div>

              {/* Print Size */}
              <div className="card">
                <div className="field-label" style={{ marginBottom: "0.5rem" }}>
                  Print Size
                </div>
                <div className="pp-size-pills">
                  <button
                    className={`pp-size-btn ${!selected.sizeKey ? "active" : ""}`}
                    onClick={() => updateSelected({ sizeKey: null })}
                  >
                    Original
                  </button>
                  {Object.entries(PRINT_SIZES).map(([key, sz]) => (
                    <button
                      key={key}
                      className={`pp-size-btn ${selected.sizeKey === key ? "active" : ""}`}
                      onClick={() => updateSelected({ sizeKey: key })}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
                {selected.sizeKey && (
                  <p className="pp-size-note">
                    Preview shows the center crop. Export will be{" "}
                    {(() => {
                      const sz = PRINT_SIZES[selected.sizeKey];
                      const isLandscape = selected.naturalW >= selected.naturalH;
                      const pw = isLandscape ? Math.max(sz.w, sz.h) : Math.min(sz.w, sz.h);
                      const ph = isLandscape ? Math.min(sz.w, sz.h) : Math.max(sz.w, sz.h);
                      return `${pw * PRINT_DPI}×${ph * PRINT_DPI}px (${sz.label} @ 300 DPI)`;
                    })()}
                  </p>
                )}
              </div>

              {/* Filters */}
              <div className="card">
                <div className="field-label" style={{ marginBottom: "0.5rem" }}>
                  Color Style
                </div>
                <div className="pp-filters">
                  {FILTERS.map((f) => (
                    <button
                      key={f.name}
                      className={`pp-filter-btn ${selected.filter === f.name ? "active" : ""}`}
                      onClick={() => updateSelected({ filter: f.name })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selected.url}
                        alt={f.label}
                        className="pp-filter-thumb"
                        style={{ filter: FILTER_CSS[f.name] }}
                      />
                      <span className="pp-filter-label">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Adjustments */}
              <div className="card settings">
                <div className="field">
                  <span className="field-label">
                    Brightness {Math.round((selected.brightness - 1) * 100) >= 0 ? "+" : ""}
                    {Math.round((selected.brightness - 1) * 100)}%
                  </span>
                  <Slider
                    className="mt-2"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={[selected.brightness]}
                    onValueChange={(v) =>
                      updateSelected({ brightness: Array.isArray(v) ? v[0] : v })
                    }
                  />
                </div>
                <div className="field">
                  <span className="field-label">
                    Contrast {Math.round((selected.contrast - 1) * 100) >= 0 ? "+" : ""}
                    {Math.round((selected.contrast - 1) * 100)}%
                  </span>
                  <Slider
                    className="mt-2"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={[selected.contrast]}
                    onValueChange={(v) =>
                      updateSelected({ contrast: Array.isArray(v) ? v[0] : v })
                    }
                  />
                </div>
              </div>

              {/* AI Upscale (paid) */}
              <div className="card">
                <div className="field-label" style={{ marginBottom: "0.5rem" }}>
                  AI Upscale
                </div>
                {isPro ? (
                  <Button variant="outline" size="sm" onClick={() => {/* TODO: call upscale API */}}>
                    <LuZap size={14} /> Upscale 2× with AI
                  </Button>
                ) : (
                  <button className="pp-pro-gate" onClick={openAuthModal}>
                    <LuLock size={13} />
                    AI upscaling is a Pro feature — upgrade to unlock
                    <LuChevronRight size={13} />
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="pp-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSelected({ filter: "none", sizeKey: null, brightness: 1, contrast: 1 })
                  }
                >
                  <LuRefreshCw size={14} /> Reset
                </Button>
                <div style={{ flex: 1 }} />
                <Button
                  onClick={markDone}
                  disabled={selected.done}
                >
                  {selected.done ? (
                    <>
                      <LuCheck size={14} /> Done
                    </>
                  ) : (
                    <>
                      <LuCheck size={14} /> Mark Done
                      {selectedIdx < images.length - 1 && " →"}
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="placeholder">Select a photo from the grid to edit it.</div>
          )}
        </div>
      </div>
    </div>
  );
}
