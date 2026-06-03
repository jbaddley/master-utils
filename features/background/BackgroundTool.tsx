"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  LuDownload,
  LuEraser,
  LuWand,
  LuCrop,
  LuMinimize2,
  LuFlipHorizontal2,
  LuFlipVertical2,
  LuUndo2,
} from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { imageToImageData, canvasToBlob } from "@/lib/image";
import { removeBackground, floodEraseAt } from "@/lib/background";
import { cropImageData, cropToContent } from "@/lib/crop";
import { flipImage } from "@/lib/transform";
import { saveAs } from "@/lib/download";

type FillType = "transparent" | "color" | "gradient";
type GradientDir = "horizontal" | "vertical" | "diagonal";
type Box = { x: number; y: number; w: number; h: number };

const OUTPUT_FORMATS = [
  { mime: "image/png", label: "PNG", ext: ".png" },
  { mime: "image/webp", label: "WebP", ext: ".webp" },
] as const;
type OutputFmt = (typeof OUTPUT_FORMATS)[number]["mime"];

function compositeResult(
  result: ImageData,
  fillType: FillType,
  fillColor: string,
  gradientFrom: string,
  gradientTo: string,
  gradientDir: GradientDir,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = result.width;
  c.height = result.height;
  const ctx = c.getContext("2d")!;

  if (fillType === "transparent") {
    ctx.putImageData(result, 0, 0);
  } else if (fillType === "color") {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, c.width, c.height);
    const tmp = document.createElement("canvas");
    tmp.width = result.width;
    tmp.height = result.height;
    tmp.getContext("2d")!.putImageData(result, 0, 0);
    ctx.drawImage(tmp, 0, 0);
  } else {
    let grad: CanvasGradient;
    if (gradientDir === "horizontal") {
      grad = ctx.createLinearGradient(0, 0, c.width, 0);
    } else if (gradientDir === "vertical") {
      grad = ctx.createLinearGradient(0, 0, 0, c.height);
    } else {
      grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    }
    grad.addColorStop(0, gradientFrom);
    grad.addColorStop(1, gradientTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
    const tmp = document.createElement("canvas");
    tmp.width = result.width;
    tmp.height = result.height;
    tmp.getContext("2d")!.putImageData(result, 0, 0);
    ctx.drawImage(tmp, 0, 0);
  }

  return c;
}

export default function BackgroundTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const baseRef = useRef<ImageData | null>(null);
  const [tolerance, setTolerance] = useState(40);
  const [sourceData, setSourceData] = useState<ImageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fill settings
  const [fillType, setFillType] = useState<FillType>("transparent");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [gradientFrom, setGradientFrom] = useState("#ffffff");
  const [gradientTo, setGradientTo] = useState("#f0f0f0");
  const [gradientDir, setGradientDir] = useState<GradientDir>("vertical");

  // Editing tools
  const [canvasTool, setCanvasTool] = useState<"brush" | "erase" | "crop">("brush");
  const [eraseTolerance, setEraseTolerance] = useState(48);
  const [brushSize, setBrushSize] = useState(12);
  const [magnifier, setMagnifier] = useState(false);
  const historyRef = useRef<ImageData[]>([]);
  const [historyLen, setHistoryLen] = useState(0);
  const brushRef = useRef<{ x: number; y: number } | null>(null);
  const [cropBox, setCropBox] = useState<Box | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef<{
    type: string;
    startX: number;
    startY: number;
    startBox: Box;
    wrapW: number;
    wrapH: number;
  } | null>(null);

  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadSelectKey, setDownloadSelectKey] = useState(0);

  // ── History ──────────────────────────────────────────────────────────────

  const applyEdit = useCallback(
    (next: ImageData) => {
      if (!sourceData) return;
      historyRef.current.push(sourceData);
      setHistoryLen(historyRef.current.length);
      setSourceData(next);
    },
    [sourceData],
  );

  const undoEdit = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setHistoryLen(historyRef.current.length);
    setSourceData(prev);
  }, []);

  // ── File loading ──────────────────────────────────────────────────────────

  const onFile = async (file: File) => {
    setError(null);
    try {
      const img = await loadImageFile(file);
      baseRef.current = imageToImageData(img.img);
      historyRef.current = [];
      setHistoryLen(0);
      setLoaded((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return img;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  // ── Auto-apply BG removal when tolerance or image changes ─────────────────
  // Resets manual edits — intentional; adjusting resets the working copy.

  useEffect(() => {
    if (!baseRef.current) {
      setSourceData(null);
      return;
    }
    historyRef.current = [];
    setHistoryLen(0);
    setSourceData(removeBackground(baseRef.current, tolerance));
  }, [loaded, tolerance]);

  // ── Paint edit canvas ─────────────────────────────────────────────────────

  useEffect(() => {
    const cv = editCanvasRef.current;
    if (!cv || !sourceData) return;
    cv.width = sourceData.width;
    cv.height = sourceData.height;
    cv.getContext("2d")?.putImageData(sourceData, 0, 0);
  }, [sourceData]);

  // ── Paint composited preview canvas ──────────────────────────────────────

  useEffect(() => {
    const cv = previewCanvasRef.current;
    if (!cv || !sourceData) return;
    const composite = compositeResult(
      sourceData, fillType, fillColor, gradientFrom, gradientTo, gradientDir,
    );
    cv.width = composite.width;
    cv.height = composite.height;
    cv.getContext("2d")?.drawImage(composite, 0, 0);
  }, [sourceData, fillType, fillColor, gradientFrom, gradientTo, gradientDir]);

  // ── Crop box ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (canvasTool !== "crop" || !sourceData) {
      setCropBox(null);
      return;
    }
    setCropBox({ x: 0, y: 0, w: 1, h: 1 });
  }, [canvasTool, sourceData]);

  const onCropDragMove = useCallback((e: PointerEvent) => {
    const d = cropDragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.wrapW;
    const dy = (e.clientY - d.startY) / d.wrapH;
    const min = 0.02;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
    let { x, y, w, h } = d.startBox;
    if (d.type === "move") {
      x = clamp(x + dx, 0, 1 - w);
      y = clamp(y + dy, 0, 1 - h);
    } else {
      if (d.type.includes("w")) {
        const nx = clamp(x + dx, 0, x + w - min);
        w += x - nx;
        x = nx;
      }
      if (d.type.includes("e")) w = clamp(w + dx, min, 1 - x);
      if (d.type.includes("n")) {
        const ny = clamp(y + dy, 0, y + h - min);
        h += y - ny;
        y = ny;
      }
      if (d.type.includes("s")) h = clamp(h + dy, min, 1 - y);
    }
    setCropBox({ x, y, w, h });
  }, []);

  const endCropDrag = useCallback(() => {
    cropDragRef.current = null;
    window.removeEventListener("pointermove", onCropDragMove);
    window.removeEventListener("pointerup", endCropDrag);
  }, [onCropDragMove]);

  const startCropDrag = useCallback(
    (type: string, e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = wrapRef.current?.getBoundingClientRect();
      if (!wrap || !cropBox) return;
      cropDragRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        startBox: cropBox,
        wrapW: wrap.width,
        wrapH: wrap.height,
      };
      window.addEventListener("pointermove", onCropDragMove);
      window.addEventListener("pointerup", endCropDrag);
    },
    [cropBox, onCropDragMove, endCropDrag],
  );

  const commitCrop = useCallback(() => {
    if (!cropBox || !sourceData) return;
    const { width: W, height: H } = sourceData;
    const x = Math.max(0, Math.round(cropBox.x * W));
    const y = Math.max(0, Math.round(cropBox.y * H));
    const w = Math.min(W - x, Math.max(1, Math.round(cropBox.w * W)));
    const h = Math.min(H - y, Math.max(1, Math.round(cropBox.h * H)));
    if (w >= W && h >= H) return;
    applyEdit(cropImageData(sourceData, x, y, w, h));
    setCanvasTool("brush");
  }, [cropBox, sourceData, applyEdit]);

  const resetCropBox = useCallback(() => {
    if (sourceData) setCropBox({ x: 0, y: 0, w: 1, h: 1 });
  }, [sourceData]);

  // ── Brush erase ───────────────────────────────────────────────────────────

  const brushSegment = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const ctx = editCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = brushSize * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x1, y1, brushSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    [brushSize],
  );

  const canvasPixel = useCallback((e: { clientX: number; clientY: number }) => {
    const cv = editCanvasRef.current;
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * cv.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * cv.height);
    if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return null;
    return { x, y };
  }, []);

  const onCanvasClick = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      if (canvasTool !== "erase") return;
      const p = canvasPixel(e);
      if (!p || !sourceData) return;
      applyEdit(floodEraseAt(sourceData, p.x, p.y, eraseTolerance));
    },
    [canvasTool, canvasPixel, sourceData, eraseTolerance, applyEdit],
  );

  const onCanvasDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (canvasTool !== "brush") return;
      const p = canvasPixel(e);
      if (!p || !sourceData) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      historyRef.current.push(sourceData);
      setHistoryLen(historyRef.current.length);
      brushRef.current = { x: p.x, y: p.y };
      brushSegment(p.x, p.y, p.x, p.y);
    },
    [canvasTool, canvasPixel, sourceData, brushSegment],
  );

  const commitBrush = useCallback(() => {
    if (!brushRef.current) return;
    brushRef.current = null;
    const cv = editCanvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    setSourceData(ctx.getImageData(0, 0, cv.width, cv.height));
  }, []);

  const onCanvasUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (brushRef.current) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        commitBrush();
      }
    },
    [commitBrush],
  );

  // ── Magnifier loupe ───────────────────────────────────────────────────────

  const drawLoupe = useCallback((x: number, y: number) => {
    const src = editCanvasRef.current;
    const lc = loupeCanvasRef.current;
    const lctx = lc?.getContext("2d");
    if (!src || !lc || !lctx) return;
    const span = Math.min(15, src.width, src.height);
    const half = Math.floor(span / 2);
    const sx = Math.max(0, Math.min(x - half, src.width - span));
    const sy = Math.max(0, Math.min(y - half, src.height - span));
    lctx.clearRect(0, 0, lc.width, lc.height);
    lctx.imageSmoothingEnabled = false;
    lctx.drawImage(src, sx, sy, span, span, 0, 0, lc.width, lc.height);
    const cellW = lc.width / span;
    const cellH = lc.height / span;
    const cx = (x - sx) * cellW;
    const cy = (y - sy) * cellH;
    lctx.lineWidth = 2;
    lctx.strokeStyle = "rgba(0,0,0,0.9)";
    lctx.strokeRect(cx, cy, cellW, cellH);
    lctx.lineWidth = 1;
    lctx.strokeStyle = "rgba(255,255,255,0.95)";
    lctx.strokeRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
  }, []);

  const onCanvasMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const p = canvasPixel(e);
      if (brushRef.current && p) {
        brushSegment(brushRef.current.x, brushRef.current.y, p.x, p.y);
        brushRef.current = { x: p.x, y: p.y };
      }
      const div = loupeRef.current;
      if (!magnifier || !div) return;
      if (!p) {
        div.style.display = "none";
        return;
      }
      const offX = e.clientX > window.innerWidth - 190 ? -174 : 24;
      const offY = e.clientY > window.innerHeight - 190 ? -174 : 24;
      div.style.left = `${e.clientX + offX}px`;
      div.style.top = `${e.clientY + offY}px`;
      div.style.display = "block";
      drawLoupe(p.x, p.y);
    },
    [magnifier, canvasPixel, drawLoupe, brushSegment],
  );

  const onCanvasLeave = useCallback(() => {
    if (loupeRef.current) loupeRef.current.style.display = "none";
    if (brushRef.current) commitBrush();
  }, [commitBrush]);

  useEffect(() => {
    if (!magnifier && loupeRef.current) loupeRef.current.style.display = "none";
  }, [magnifier]);

  // ── Adjust actions ────────────────────────────────────────────────────────

  const trimToContent = useCallback(() => {
    if (sourceData) applyEdit(cropToContent(sourceData));
  }, [sourceData, applyEdit]);

  const flip = useCallback(
    (axis: "h" | "v") => {
      if (sourceData) applyEdit(flipImage(sourceData, axis));
    },
    [sourceData, applyEdit],
  );

  // ── Download ──────────────────────────────────────────────────────────────

  const onDownload = useCallback(
    (fmt: OutputFmt) => {
      if (!loaded || !sourceData) return;
      const meta = OUTPUT_FORMATS.find((f) => f.mime === fmt)!;
      void saveAs({
        suggestedName: `${baseName(loaded.name)}-no-bg${meta.ext}`,
        description: `${meta.label} image`,
        mime: fmt,
        ext: meta.ext,
        getBlob: () => {
          const c = compositeResult(
            sourceData, fillType, fillColor, gradientFrom, gradientTo, gradientDir,
          );
          return canvasToBlob(c, fmt);
        },
      });
    },
    [loaded, sourceData, fillType, fillColor, gradientFrom, gradientTo, gradientDir],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!loaded ? (
        <Dropzone onFile={onFile} onError={setError} />
      ) : (
        <>
          {/* Top actionbar */}
          <div className="actionbar">
            <ChangeImageButton onFile={onFile} />
            <div className="actionbar-spacer" />
            <Select
              key={downloadSelectKey}
              disabled={!sourceData}
              onValueChange={(fmt) => {
                if (!fmt) return;
                onDownload(fmt as OutputFmt);
                setDownloadSelectKey((k) => k + 1);
              }}
            >
              <SelectTrigger size="sm" title="Download result">
                <LuDownload />
                <SelectValue placeholder="Download" />
              </SelectTrigger>
              <SelectContent align="end">
                {OUTPUT_FORMATS.map((f) => (
                  <SelectItem key={f.mime} value={f.mime}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tolerance */}
          <section className="card settings">
            <div className="field" style={{ flex: "1 1 280px" }}>
              <span className="field-label">Removal tolerance: {tolerance}</span>
              <Slider
                className="mt-2"
                min={0}
                max={128}
                step={4}
                value={[tolerance]}
                onValueChange={(v) => setTolerance(Array.isArray(v) ? v[0] : v)}
              />
            </div>
            <p className="palette-hint" style={{ alignSelf: "center", flex: "1 1 240px" }}>
              Works on solid / near-solid backgrounds. Raise to remove soft edges; lower to
              protect detail. <em>Changing tolerance resets manual edits.</em>
            </p>
          </section>

          {/* Workspace: edit canvas + composited preview */}
          <section className="workspace">

            {/* ── Left panel: editing canvas ── */}
            <div className="panel">
              <div className="panel-head">
                <span className="tag">Edit</span>
                <span className="meta">
                  {sourceData ? `${sourceData.width}×${sourceData.height}` : ""}
                </span>
              </div>

              <div className="panel-controls">
                <div className="editbar">

                  <div className="tool-group" role="group" aria-label="Tools">
                    {(
                      [
                        ["brush", LuEraser, "Eraser", "Drag to erase pixels by hand"],
                        ["erase", LuWand, "Magic erase", "Click a color region to erase all connected pixels"],
                        ["crop", LuCrop, "Crop", "Draw a crop box then apply"],
                      ] as const
                    ).map(([key, Icon, label, tip]) => (
                      <Button
                        key={key}
                        variant={canvasTool === key ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setCanvasTool(key)}
                        title={tip}
                      >
                        <Icon />
                        {label}
                      </Button>
                    ))}
                  </div>

                  <div className="tool-group" role="group" aria-label="Adjust">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!sourceData}
                      onClick={trimToContent}
                      title="Trim transparent margins so the image is tightly framed"
                    >
                      <LuMinimize2 />
                      Trim
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!sourceData}
                      onClick={() => flip("h")}
                      title="Flip horizontally"
                    >
                      <LuFlipHorizontal2 />
                      Flip H
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!sourceData}
                      onClick={() => flip("v")}
                      title="Flip vertically"
                    >
                      <LuFlipVertical2 />
                      Flip V
                    </Button>
                  </div>

                  <div className="tool-group" role="group" aria-label="View">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={undoEdit}
                      disabled={historyLen === 0}
                      title="Undo last edit"
                    >
                      <LuUndo2 />
                      Undo
                    </Button>
                    <label
                      className="editbar-toggle"
                      title="Zoom in on individual pixels while hovering"
                    >
                      <Switch
                        size="sm"
                        checked={magnifier}
                        onCheckedChange={(c) => setMagnifier(c === true)}
                      />
                      Magnifier
                    </label>
                  </div>
                </div>

                <div className="editopts">
                  {canvasTool === "erase" && (
                    <label
                      className="opt"
                      title="How close in color a pixel must be to get erased by Magic erase"
                    >
                      Tolerance
                      <Slider
                        className="editopt-slider"
                        min={0}
                        max={128}
                        step={4}
                        value={[eraseTolerance]}
                        onValueChange={(v) =>
                          setEraseTolerance(Array.isArray(v) ? v[0] : v)
                        }
                      />
                      <b>{eraseTolerance}</b>
                    </label>
                  )}
                  {canvasTool === "brush" && (
                    <label className="opt" title="Eraser brush size">
                      Eraser size
                      <Slider
                        className="editopt-slider"
                        min={2}
                        max={100}
                        step={2}
                        value={[brushSize]}
                        onValueChange={(v) =>
                          setBrushSize(Array.isArray(v) ? v[0] : v)
                        }
                      />
                      <b>{brushSize}px</b>
                    </label>
                  )}
                  {canvasTool === "crop" && (
                    <div className="opt-buttons">
                      <Button size="sm" onClick={commitCrop}>
                        Apply crop
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetCropBox}>
                        Reset box
                      </Button>
                    </div>
                  )}
                  <span className="tool-hint">
                    {canvasTool === "erase"
                      ? "Click a color to erase that whole connected region (e.g. gaps the remover missed)"
                      : canvasTool === "crop"
                        ? "Drag the box / handles, then Apply crop (or double-click)"
                        : "Drag over the image to erase pixels by hand"}
                  </span>
                </div>
              </div>

              <div className="canvas checker">
                <div className="canvas-wrap" ref={wrapRef}>
                  <canvas
                    ref={editCanvasRef}
                    className={canvasTool === "erase" ? "erasable" : "pickable"}
                    onClick={onCanvasClick}
                    onPointerDown={onCanvasDown}
                    onPointerMove={onCanvasMove}
                    onPointerUp={onCanvasUp}
                    onPointerLeave={onCanvasLeave}
                  />
                  {canvasTool === "crop" && cropBox && (
                    <div
                      className="crop-overlay"
                      style={{
                        left: `${cropBox.x * 100}%`,
                        top: `${cropBox.y * 100}%`,
                        width: `${cropBox.w * 100}%`,
                        height: `${cropBox.h * 100}%`,
                      }}
                      onPointerDown={(e) => startCropDrag("move", e)}
                      onDoubleClick={commitCrop}
                      title="Drag to move · drag a handle to resize · double-click to apply"
                    >
                      {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => (
                        <span
                          key={h}
                          className={`crop-handle ${h}`}
                          onPointerDown={(e) => startCropDrag(h, e)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right panel: composited preview + fill options ── */}
            <div className="panel">
              <div className="panel-head">
                <span className="tag">Preview</span>
                <span className="meta">
                  {fillType === "transparent"
                    ? "transparent PNG"
                    : fillType === "color"
                      ? "solid fill"
                      : `${gradientDir} gradient`}
                </span>
              </div>

              <div className="panel-controls">
                <div className="editbar">
                  <div className="tool-group" role="group" aria-label="Background">
                    <Button
                      variant={fillType === "transparent" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setFillType("transparent")}
                    >
                      Transparent
                    </Button>
                    <Button
                      variant={fillType === "color" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setFillType("color")}
                    >
                      Color
                    </Button>
                    <Button
                      variant={fillType === "gradient" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setFillType("gradient")}
                    >
                      Gradient
                    </Button>
                  </div>

                  {fillType === "color" && (
                    <div className="tool-group">
                      <input
                        type="color"
                        value={fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        style={{
                          width: "2rem",
                          height: "2rem",
                          cursor: "pointer",
                          border: "1px solid var(--border)",
                          borderRadius: "0.375rem",
                          padding: 0,
                          background: "none",
                        }}
                        title="Fill color"
                      />
                    </div>
                  )}

                  {fillType === "gradient" && (
                    <div className="tool-group" style={{ alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="color"
                        value={gradientFrom}
                        onChange={(e) => setGradientFrom(e.target.value)}
                        style={{
                          width: "2rem",
                          height: "2rem",
                          cursor: "pointer",
                          border: "1px solid var(--border)",
                          borderRadius: "0.375rem",
                          padding: 0,
                          background: "none",
                        }}
                        title="Gradient start color"
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>→</span>
                      <input
                        type="color"
                        value={gradientTo}
                        onChange={(e) => setGradientTo(e.target.value)}
                        style={{
                          width: "2rem",
                          height: "2rem",
                          cursor: "pointer",
                          border: "1px solid var(--border)",
                          borderRadius: "0.375rem",
                          padding: 0,
                          background: "none",
                        }}
                        title="Gradient end color"
                      />
                      <select
                        value={gradientDir}
                        onChange={(e) => setGradientDir(e.target.value as GradientDir)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.375rem",
                          border: "1px solid var(--border)",
                          fontSize: "0.875rem",
                          background: "var(--card)",
                          color: "var(--card-foreground)",
                        }}
                      >
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                        <option value="diagonal">Diagonal</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="canvas checker">
                <canvas ref={previewCanvasRef} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* Magnifier loupe */}
      <div ref={loupeRef} className="loupe" style={{ display: "none" }}>
        <div className="loupe-inner checker">
          <canvas ref={loupeCanvasRef} width={150} height={150} />
        </div>
      </div>
    </div>
  );
}
