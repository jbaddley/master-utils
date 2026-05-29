"use client";

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { LuDownload, LuCheck, LuLink, LuLink2Off, LuRotateCcw, LuZoomIn, LuZoomOut, LuCopy } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { imageToImageData, canvasToBlob, isOpaqueFormat } from "@/lib/image";
import { extendedCropImageData } from "@/lib/crop";
import { formatBytes } from "@/lib/format";
import { saveAs } from "@/lib/download";

type Box = { x: number; y: number; w: number; h: number };
type Fmt = "image/png" | "image/jpeg" | "image/webp";

const EXT: Record<Fmt, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const CROP_ASPECTS: { label: string; ratio: number | null }[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "16:9", ratio: 16 / 9 },
];

const SOCIAL_PRESETS = [
  { id: "ig-post", label: "Instagram Post", w: 1080, h: 1080 },
  { id: "ig-story", label: "Instagram Story/Reel", w: 1080, h: 1920 },
  { id: "yt-thumb", label: "YouTube Thumbnail", w: 1280, h: 720 },
  { id: "yt-banner", label: "YouTube Channel Art", w: 2560, h: 1440 },
  { id: "li-banner", label: "LinkedIn Banner", w: 1584, h: 396 },
  { id: "li-post", label: "LinkedIn Post", w: 1200, h: 627 },
  { id: "tt-video", label: "TikTok/Reel", w: 1080, h: 1920 },
  { id: "fb-cover", label: "Facebook Cover", w: 820, h: 312 },
  { id: "tw-header", label: "X (Twitter) Header", w: 1500, h: 500 },
  { id: "og-image", label: "Open Graph / Meta", w: 1200, h: 630 },
] as const;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const WORKSPACE_PAD_RATIO = 1;
const MIN_CROP_FRAC = 0.02;

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function imageDataToCanvas(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.getContext("2d")?.putImageData(data, 0, 0);
  return canvas;
}

function resizeImageData(data: ImageData, w: number, h: number, background?: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imageDataToCanvas(data), 0, 0, canvas.width, canvas.height);
  return canvas;
}

export default function CropResizeTool({ defaultPresetId }: { defaultPresetId?: string }) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [sourceData, setSourceData] = useState<ImageData | null>(null);
  const baseRef = useRef<ImageData | null>(null);
  const [cropBox, setCropBox] = useState<Box | null>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [lock, setLock] = useState(true);
  const [fmt, setFmt] = useState<Fmt>("image/png");
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  // Fix #1: track drag state for rule-of-thirds grid
  const [isDragging, setIsDragging] = useState(false);
  // Fix #4: active aspect ratio button state
  const [selectedAspect, setSelectedAspect] = useState<number | null>(null);
  // Fix #6: flash message when crop covers full image
  const [cropFullMsg, setCropFullMsg] = useState(false);
  // Fix #7: encoding/download loading state
  const [isEncoding, setIsEncoding] = useState(false);
  const [copiedB64, setCopiedB64] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastUrl = useRef<string | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollL: number;
    scrollT: number;
    pointerId: number;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{
    type: string;
    startX: number;
    startY: number;
    startBox: Box;
    wrapW: number;
    wrapH: number;
  } | null>(null);

  const applyAspect = useCallback((ratio: number | null, data = sourceData) => {
    if (!data || ratio === null) {
      setCropBox({ x: 0, y: 0, w: 1, h: 1 });
      return;
    }
    const W = data.width;
    const H = data.height;
    const imgAspect = W / H;
    let bw: number, bh: number;
    if (ratio >= imgAspect) {
      bw = 1;
      bh = W / ratio / H;
    } else {
      bh = 1;
      bw = (H * ratio) / W;
    }
    setCropBox({ x: (1 - bw) / 2, y: (1 - bh) / 2, w: bw, h: bh });
  }, [sourceData]);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const img = await loadImageFile(file);
      const data = imageToImageData(img.img);
      baseRef.current = data;
      setLoaded((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return img;
      });
      setSourceData(data);
      setCropBox({ x: 0, y: 0, w: 1, h: 1 });
      setZoom(1);
      setSelectedAspect(null);

      const preset = defaultPresetId ? SOCIAL_PRESETS.find((p) => p.id === defaultPresetId) : undefined;
      if (preset) {
        setW(preset.w);
        setH(preset.h);
        setLock(false);
        applyAspect(preset.w / preset.h, data);
      } else {
        setW(data.width);
        setH(data.height);
        setLock(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !sourceData) return;
    cv.width = sourceData.width;
    cv.height = sourceData.height;
    cv.getContext("2d")?.putImageData(sourceData, 0, 0);
  }, [sourceData]);

  const centerViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    requestAnimationFrame(() => {
      vp.scrollLeft = Math.max(0, (vp.scrollWidth - vp.clientWidth) / 2);
      vp.scrollTop = Math.max(0, (vp.scrollHeight - vp.clientHeight) / 2);
    });
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !sourceData) return;
    const updateFit = () => {
      const maxW = vp.clientWidth;
      const maxH = Math.min(window.innerHeight * 0.55, 520);
      if (maxW < 1) return;
      setViewportSize({ w: maxW, h: maxH });
      setFitScale(Math.min(maxW / sourceData.width, maxH / sourceData.height));
    };
    updateFit();
    const ro = new ResizeObserver(updateFit);
    ro.observe(vp);
    window.addEventListener("resize", updateFit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [sourceData]);

  useEffect(() => {
    centerViewport();
  }, [zoom, fitScale, sourceData, centerViewport]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !sourceData) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const oldZoom = zoomRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = clampZoom(oldZoom * factor);
      if (newZoom !== oldZoom) setZoom(newZoom);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [sourceData]);

  const boxPx = useCallback(() => {
    if (!cropBox || !sourceData) return null;
    const W = sourceData.width;
    const H = sourceData.height;
    return {
      x: Math.round(cropBox.x * W),
      y: Math.round(cropBox.y * H),
      w: Math.max(1, Math.round(cropBox.w * W)),
      h: Math.max(1, Math.round(cropBox.h * H)),
    };
  }, [cropBox, sourceData]);

  const croppedData = useCallback((): ImageData | null => {
    if (!sourceData) return null;
    const r = boxPx();
    if (!r) return null;
    const inside =
      r.x >= 0 &&
      r.y >= 0 &&
      r.x + r.w <= sourceData.width &&
      r.y + r.h <= sourceData.height;
    if (inside && r.w === sourceData.width && r.h === sourceData.height) return sourceData;
    return extendedCropImageData(sourceData, r.x, r.y, r.w, r.h);
  }, [sourceData, boxPx]);

  const encode = useCallback(async () => {
    const cropped = croppedData();
    if (!cropped || w < 1 || h < 1) throw new Error("Nothing to export.");
    const canvas = resizeImageData(
      cropped,
      w,
      h,
      isOpaqueFormat(fmt) ? "#ffffff" : undefined,
    );
    return canvasToBlob(canvas, fmt, fmt === "image/png" ? undefined : 0.92);
  }, [croppedData, w, h, fmt]);

  // Fix #7: set isEncoding around the encode effect
  useEffect(() => {
    if (!sourceData || w < 1 || h < 1) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setIsEncoding(true);
    encode().then((blob) => {
      if (cancelled) return;
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      const url = URL.createObjectURL(blob);
      lastUrl.current = url;
      setResult({ url, size: blob.size });
      setIsEncoding(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sourceData, cropBox, w, h, fmt, encode]);

  // Fix #5: clamp to 16384 max
  const setWidth = (val: number) => {
    const clamped = Math.min(val, 16384);
    setW(clamped);
    if (lock && h > 0) setH(Math.min(Math.max(1, Math.round((clamped * h) / w)), 16384));
  };
  const setHeight = (val: number) => {
    const clamped = Math.min(val, 16384);
    setH(clamped);
    if (lock && w > 0) setW(Math.min(Math.max(1, Math.round((clamped * w) / h)), 16384));
  };

  const scale = (pct: number) => {
    const cropped = croppedData();
    if (!cropped) return;
    setW(Math.max(1, Math.round((cropped.width * pct) / 100)));
    setH(Math.max(1, Math.round((cropped.height * pct) / 100)));
  };

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.wrapW;
    const dy = (e.clientY - d.startY) / d.wrapH;
    const min = MIN_CROP_FRAC;
    let { x, y, w: bw, h: bh } = d.startBox;
    if (d.type === "move") {
      x += dx;
      y += dy;
    } else {
      if (d.type.includes("w")) {
        const nx = x + dx;
        bw += x - nx;
        x = nx;
        if (bw < min) {
          x -= min - bw;
          bw = min;
        }
      }
      if (d.type.includes("e")) {
        bw = Math.max(min, bw + dx);
      }
      if (d.type.includes("n")) {
        const ny = y + dy;
        bh += y - ny;
        y = ny;
        if (bh < min) {
          y -= min - bh;
          bh = min;
        }
      }
      if (d.type.includes("s")) {
        bh = Math.max(min, bh + dy);
      }
    }
    setCropBox({ x, y, w: bw, h: bh });
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false); // Fix #1
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onDragMove]);

  const startDrag = useCallback(
    (type: string, e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = wrapRef.current?.getBoundingClientRect();
      if (!wrap || !cropBox) return;
      dragRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        startBox: cropBox,
        wrapW: wrap.width,
        wrapH: wrap.height,
      };
      setIsDragging(true); // Fix #1
      // Fix #4: free drag resets selected aspect
      if (type === "move") {
        setSelectedAspect(null);
      }
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", endDrag);
    },
    [cropBox, onDragMove, endDrag],
  );

  const onPanMove = useCallback((e: PointerEvent) => {
    const p = panRef.current;
    const vp = viewportRef.current;
    if (!p || !vp) return;
    vp.scrollLeft = p.scrollL - (e.clientX - p.startX);
    vp.scrollTop = p.scrollT - (e.clientY - p.startY);
  }, []);

  const endPan = useCallback(() => {
    panRef.current = null;
    window.removeEventListener("pointermove", onPanMove);
    window.removeEventListener("pointerup", endPan);
  }, [onPanMove]);

  const startPan = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollL: vp.scrollLeft,
        scrollT: vp.scrollTop,
        pointerId: e.pointerId,
      };
      window.addEventListener("pointermove", onPanMove);
      window.addEventListener("pointerup", endPan);
    },
    [onPanMove, endPan],
  );

  const applyCrop = useCallback(() => {
    const cropped = croppedData();
    if (!cropped || !sourceData) return;
    const unchanged =
      cropped.width === sourceData.width &&
      cropped.height === sourceData.height &&
      cropBox?.x === 0 &&
      cropBox?.y === 0 &&
      cropBox?.w === 1 &&
      cropBox?.h === 1;
    // Fix #6: flash message when full image
    if (unchanged) {
      setCropFullMsg(true);
      setTimeout(() => setCropFullMsg(false), 2000);
      return;
    }
    setSourceData(cropped);
    setCropBox({ x: 0, y: 0, w: 1, h: 1 });
    setW(cropped.width);
    setH(cropped.height);
  }, [croppedData, sourceData, cropBox]);

  const reset = () => {
    if (baseRef.current) {
      setSourceData(baseRef.current);
      setCropBox({ x: 0, y: 0, w: 1, h: 1 });
      setW(baseRef.current.width);
      setH(baseRef.current.height);
      setZoom(1);
      setSelectedAspect(null);
      centerViewport();
    }
  };

  // Fix #3: keyboard handler for crop overlay
  const onCropKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!cropBox) return;
      const step = e.shiftKey ? 0.005 : 0.01;
      let handled = true;
      let { x, y, w: bw, h: bh } = cropBox;
      switch (e.key) {
        case "ArrowLeft":
          x = Math.max(0, x - step);
          break;
        case "ArrowRight":
          x = Math.min(1 - bw, x + step);
          break;
        case "ArrowUp":
          y = Math.max(0, y - step);
          break;
        case "ArrowDown":
          y = Math.min(1 - bh, y + step);
          break;
        case "Enter":
          applyCrop();
          break;
        case "Escape":
          setCropBox({ x: 0, y: 0, w: 1, h: 1 });
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.preventDefault();
        if (!["Enter", "Escape"].includes(e.key)) {
          setCropBox({ x, y, w: bw, h: bh });
        }
      }
    },
    [cropBox, applyCrop],
  );

  const displayW = sourceData ? Math.round(sourceData.width * fitScale * zoom) : 0;
  const displayH = sourceData ? Math.round(sourceData.height * fitScale * zoom) : 0;
  const basePad = Math.round(Math.max(displayW, displayH) * WORKSPACE_PAD_RATIO);
  const extLeft = cropBox ? Math.max(0, -cropBox.x * displayW) : 0;
  const extTop = cropBox ? Math.max(0, -cropBox.y * displayH) : 0;
  const extRight = cropBox ? Math.max(0, (cropBox.x + cropBox.w - 1) * displayW) : 0;
  const extBottom = cropBox ? Math.max(0, (cropBox.y + cropBox.h - 1) * displayH) : 0;
  const workspacePad = Math.round(Math.max(basePad, extLeft, extTop, extRight, extBottom) + 24);
  const workspaceW = displayW + workspacePad * 2;
  const workspaceH = displayH + workspacePad * 2;
  const stageW = Math.max(viewportSize.w, workspaceW);
  const stageH = Math.max(viewportSize.h, workspaceH);

  const nudgeZoom = (factor: number) => {
    setZoom((z) => clampZoom(z * factor));
  };

  const onDownload = () => {
    if (!loaded) return;
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-${w}x${h}${EXT[fmt]}`,
      description: "Image",
      mime: fmt,
      ext: EXT[fmt],
      getBlob: encode,
    });
  };

  const copyBase64 = async () => {
    const blob = await encode();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    await navigator.clipboard.writeText(dataUrl);
    setCopiedB64(true);
    setTimeout(() => setCopiedB64(false), 2500);
  };

  const selPx = boxPx();

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!loaded || !sourceData ? (
        <Dropzone onFile={onFile} onError={setError} />
      ) : (
        <>
          <div className="toolbar">
            <ChangeImageButton onFile={onFile} />
            <Button variant="outline" onClick={reset} title="Reset to the original">
              <LuRotateCcw />
              Reset
            </Button>
            <div className="toolbar-spacer" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
              <Button variant="outline" onClick={applyCrop}>
                <LuCheck />
                Apply crop
              </Button>
              {/* Fix #6: flash message when full image */}
              {cropFullMsg && (
                <p className="palette-hint" style={{ margin: 0 }}>
                  Selection covers the full image — drag a handle to crop.
                </p>
              )}
            </div>
            {/* Fix #7: download loading state */}
            <Button disabled={!result || isEncoding} onClick={onDownload}>
              <LuDownload />
              {isEncoding ? "Processing…" : "Download"}
            </Button>
          </div>

          <section className="card settings">
            <div className="field">
              <span className="field-label">Crop aspect ratio</span>
              <div className="row">
                {/* Fix #4: active state on aspect ratio buttons */}
                {CROP_ASPECTS.map((a) => {
                  const isActive = a.ratio === null ? selectedAspect === null : selectedAspect === a.ratio;
                  return (
                    <Button
                      key={a.label}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        applyAspect(a.ratio);
                        setSelectedAspect(a.ratio);
                      }}
                    >
                      {a.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <label className="field">
              <span className="field-label">Output width (px)</span>
              <Input
                type="number"
                min={1}
                max={16384}
                value={w}
                onChange={(e) => setWidth(Math.max(1, Math.round(Number(e.target.value))))}
              />
            </label>
            <label className="field">
              <span className="field-label">Output height (px)</span>
              <Input
                type="number"
                min={1}
                max={16384}
                value={h}
                onChange={(e) => setHeight(Math.max(1, Math.round(Number(e.target.value))))}
              />
            </label>
            {/* Fix #5: warning for very large dimensions */}
            {(w > 8000 || h > 8000) && (
              <p className="palette-hint" style={{ flexBasis: "100%", margin: 0 }}>
                Very large dimensions may be slow — consider resizing in steps.
              </p>
            )}
            <div className="field">
              <span className="field-label">Output aspect</span>
              <Button
                variant={lock ? "default" : "outline"}
                onClick={() => setLock((v) => !v)}
                title="Lock the output width-to-height ratio"
              >
                {lock ? <LuLink /> : <LuLink2Off />}
                {lock ? "Locked" : "Free"}
              </Button>
            </div>
            <label className="field">
              <span className="field-label">Format</span>
              <select value={fmt} onChange={(e) => setFmt(e.target.value as Fmt)}>
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/webp">WebP</option>
              </select>
            </label>
            <div className="field">
              <span className="field-label">Scale crop</span>
              <div className="row">
                {[25, 50, 75, 100].map((p) => (
                  <Button key={p} variant="outline" size="sm" onClick={() => scale(p)}>
                    {p}%
                  </Button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label">Social media presets</span>
              <div className="row" style={{ flexWrap: "wrap", gap: "0.375rem" }}>
                {SOCIAL_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setW(preset.w);
                      setH(preset.h);
                      setLock(false);
                      applyAspect(preset.w / preset.h);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <div className="duo">
            <div className="pane">
              <div className="panel-head">
                <div className="panel-head-main">
                  <span className="tag">Crop</span>
                  <span className="meta">
                    {sourceData.width}×{sourceData.height}
                    {selPx ? ` · selection ${selPx.w}×${selPx.h}` : ""}
                  </span>
                </div>
                <div className="panel-head-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nudgeZoom(1 / 1.25)}
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    <LuZoomOut />
                  </Button>
                  {/* Fix #8: zoom button resets to 100% */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(1)}
                    title="Reset to 100%"
                  >
                    {Math.round(zoom * 100)}%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nudgeZoom(1.25)}
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    <LuZoomIn />
                  </Button>
                </div>
              </div>
              <div className="canvas checker crop-canvas">
                <div className="crop-viewport" ref={viewportRef}>
                  <div className="crop-stage" style={{ width: stageW, height: stageH }}>
                    <div
                      className="crop-workspace"
                      style={{
                        width: workspaceW,
                        height: workspaceH,
                        padding: workspacePad,
                      }}
                      onPointerDown={(e) => {
                        if (e.target === e.currentTarget) startPan(e);
                      }}
                    >
                      <div
                        className="canvas-wrap crop-image-frame"
                        ref={wrapRef}
                        style={{ width: displayW, height: displayH }}
                      >
                        <canvas ref={canvasRef} className="pickable" />

                        {/* Fix #10: scrim divs outside crop area */}
                        {cropBox && (
                          <>
                            {/* Top scrim */}
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: `${cropBox.y * 100}%`,
                                background: "rgba(0,0,0,0.45)",
                                pointerEvents: "none",
                              }}
                            />
                            {/* Bottom scrim */}
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                top: `${(cropBox.y + cropBox.h) * 100}%`,
                                background: "rgba(0,0,0,0.45)",
                                pointerEvents: "none",
                              }}
                            />
                            {/* Left scrim */}
                            <div
                              style={{
                                position: "absolute",
                                top: `${cropBox.y * 100}%`,
                                left: 0,
                                width: `${cropBox.x * 100}%`,
                                height: `${cropBox.h * 100}%`,
                                background: "rgba(0,0,0,0.45)",
                                pointerEvents: "none",
                              }}
                            />
                            {/* Right scrim */}
                            <div
                              style={{
                                position: "absolute",
                                top: `${cropBox.y * 100}%`,
                                left: `${(cropBox.x + cropBox.w) * 100}%`,
                                right: 0,
                                height: `${cropBox.h * 100}%`,
                                background: "rgba(0,0,0,0.45)",
                                pointerEvents: "none",
                              }}
                            />
                          </>
                        )}

                        {cropBox && (
                          <div
                            className="crop-overlay"
                            style={{
                              left: `${cropBox.x * 100}%`,
                              top: `${cropBox.y * 100}%`,
                              width: `${cropBox.w * 100}%`,
                              height: `${cropBox.h * 100}%`,
                            }}
                            onPointerDown={(e) => startDrag("move", e)}
                            onDoubleClick={applyCrop}
                            title="Drag to move · handles to resize · drag padding to pan · wheel to zoom · double-click to apply crop"
                            tabIndex={0}
                            onKeyDown={onCropKeyDown}
                          >
                            {/* Fix #1: rule-of-thirds grid while dragging */}
                            {isDragging && (
                              <>
                                <div style={{ position: "absolute", top: 0, bottom: 0, left: "33.33%", width: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                                <div style={{ position: "absolute", top: 0, bottom: 0, left: "66.66%", width: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                                <div style={{ position: "absolute", left: 0, right: 0, top: "33.33%", height: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                                <div style={{ position: "absolute", left: 0, right: 0, top: "66.66%", height: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                              </>
                            )}
                            {/* Fix #9: aria labels on handles */}
                            {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((hd) => (
                              <span
                                key={hd}
                                className={`crop-handle ${hd}`}
                                onPointerDown={(e) => startDrag(hd, e)}
                                aria-label={`Resize ${hd.toUpperCase()}`}
                                role="button"
                                tabIndex={-1}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pane">
              <div className="panel-head">
                <span className="tag">Output</span>
                <span className="meta">
                  {result ? `${w}×${h} · ${formatBytes(result.size)}` : "…"}
                </span>
              </div>
              <div className="canvas checker">
                {result ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.url} alt="Output preview" />
                ) : (
                  <div className="placeholder">Generating preview…</div>
                )}
              </div>
              {result && (
                <div
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEncoding}
                    onClick={() => void copyBase64()}
                  >
                    <LuCopy />
                    {copiedB64 ? "Copied!" : "Copy as Base64"}
                  </Button>
                  <span
                    style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
                  >
                    data:{fmt};base64,…
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
