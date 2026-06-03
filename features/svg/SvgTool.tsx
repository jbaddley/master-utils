"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PRESETS,
  SIMPLIFY_LEVELS,
  type PresetKey,
  type SimplifyLevel,
  buildOptions,
  countPaths,
  imageToImageData,
} from "@/lib/tracer";
import type { TraceResponse } from "./trace.worker";
import {
  type RGBA,
  extractPalette,
  hasTransparency,
  hexToRgba,
  rgbaToHex,
} from "@/lib/palette";
import { imageDataToBlob, isOpaqueFormat } from "@/lib/image";
import { floodEraseAt, removeBackground } from "@/lib/background";
import { cropImageData, cropToContent } from "@/lib/crop";
import { flipImage } from "@/lib/transform";
import { formatBytes } from "@/lib/format";
import { ACCEPT_ATTR, isSupportedImage, UNSUPPORTED_MESSAGE } from "@/lib/files";
import { saveAs } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LuPipette,
  LuEraser,
  LuWand,
  LuCrop,
  LuScissors,
  LuMinimize2,
  LuFlipHorizontal2,
  LuFlipVertical2,
  LuUndo2,
  LuImagePlus,
  LuSparkles,
  LuDownload,
  LuPlus,
} from "react-icons/lu";

type Swatch = { color: RGBA; on: boolean; custom?: boolean };

const RASTER_FORMATS = [
  { mime: "image/png", label: "PNG", ext: ".png" },
  { mime: "image/webp", label: "WebP", ext: ".webp" },
  { mime: "image/jpeg", label: "JPEG", ext: ".jpg" },
] as const;
type RasterFmt = (typeof RASTER_FORMATS)[number]["mime"];

type Loaded = {
  url: string;
  name: string;
  width: number;
  height: number;
  bytes: number;
};

export default function SvgTool() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [preset, setPreset] = useState<PresetKey>("default");
  const [simplify, setSimplify] = useState<SimplifyLevel>("medium");
  const [colorCount, setColorCount] = useState(12);
  const [usePalette, setUsePalette] = useState(true);
  const [palette, setPalette] = useState<Swatch[]>([]);
  const [canvasTool, setCanvasTool] = useState<
    "pick" | "erase" | "crop" | "brush"
  >("pick");
  const [eraseTolerance, setEraseTolerance] = useState(48);
  const [brushSize, setBrushSize] = useState(12);
  const [magnifier, setMagnifier] = useState(false);
  const [pickInfo, setPickInfo] = useState<{ msg: string; hex?: string } | null>(null);
  const pickTimer = useRef<number | null>(null);
  const [historyLen, setHistoryLen] = useState(0);
  const brushRef = useRef<{ x: number; y: number } | null>(null);
  type Box = { x: number; y: number; w: number; h: number };
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
  const [cleanup, setCleanup] = useState(true);
  const [svg, setSvg] = useState<string | null>(null);
  const [rawBytes, setRawBytes] = useState(0);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const baseDataRef = useRef<ImageData | null>(null);
  const [sourceData, setSourceData] = useState<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  const applyEdit = useCallback(
    (next: ImageData) => {
      if (!sourceData) return;
      historyRef.current.push(sourceData);
      setHistoryLen(historyRef.current.length);
      setSourceData(next);
      setSvg(null);
    },
    [sourceData],
  );

  const undoEdit = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setHistoryLen(historyRef.current.length);
    setSourceData(prev);
    setSvg(null);
  }, []);

  useEffect(() => {
    if (!sourceData) {
      setPalette([]);
      return;
    }
    const autos: Swatch[] = extractPalette(sourceData, colorCount).map((color) => ({
      color,
      on: true,
    }));
    setPalette((prev) => [...autos, ...prev.filter((s) => s.custom)]);
  }, [sourceData, colorCount]);

  const showPickInfo = useCallback((info: { msg: string; hex?: string }) => {
    setPickInfo(info);
    if (pickTimer.current) clearTimeout(pickTimer.current);
    pickTimer.current = window.setTimeout(() => setPickInfo(null), 2800);
  }, []);

  const addColor = useCallback((color: RGBA) => {
    setPalette((prev) => {
      const dup = prev.some(
        (s) =>
          (s.color.r - color.r) ** 2 +
            (s.color.g - color.g) ** 2 +
            (s.color.b - color.b) ** 2 <
          25,
      );
      return dup ? prev : [...prev, { color, on: true, custom: true }];
    });
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !sourceData) return;
    cv.width = sourceData.width;
    cv.height = sourceData.height;
    cv.getContext("2d")?.putImageData(sourceData, 0, 0);
  }, [sourceData]);

  useEffect(() => {
    const worker = new Worker(new URL("./trace.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<TraceResponse>) => {
      if (e.data.ok) {
        setSvg(e.data.svg);
        setRawBytes(e.data.cleaned ? e.data.rawBytes : 0);
      } else {
        setError(e.data.error);
      }
      setConverting(false);
    };
    worker.onerror = () => {
      setError("The conversion worker crashed.");
      setConverting(false);
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const acceptFile = useCallback((file: File) => {
    setError(null);
    setSvg(null);
    if (!isSupportedImage(file)) {
      setError(UNSUPPORTED_MESSAGE);
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      try {
        baseDataRef.current = imageToImageData(probe);
      } catch {
        baseDataRef.current = null;
      }
      historyRef.current = [];
      setHistoryLen(0);
      setPalette([]);
      setSourceData(baseDataRef.current);
      setLoaded((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url,
          name: file.name,
          width: probe.naturalWidth,
          height: probe.naturalHeight,
          bytes: file.size,
        };
      });
    };
    probe.onerror = () => setError("Could not read that image.");
    probe.src = url;
  }, []);

  const removeBg = useCallback(() => {
    if (sourceData) applyEdit(removeBackground(sourceData));
  }, [sourceData, applyEdit]);

  const trimToContent = useCallback(() => {
    if (sourceData) applyEdit(cropToContent(sourceData));
  }, [sourceData, applyEdit]);

  const flip = useCallback(
    (axis: "h" | "v") => {
      if (sourceData) applyEdit(flipImage(sourceData, axis));
    },
    [sourceData, applyEdit],
  );

  useEffect(() => {
    if (canvasTool !== "crop" || !sourceData) {
      setCropBox(null);
      return;
    }
    setCropBox({ x: 0, y: 0, w: 1, h: 1 });
  }, [canvasTool, sourceData]);

  const resetCropBox = useCallback(() => {
    if (sourceData) setCropBox({ x: 0, y: 0, w: 1, h: 1 });
  }, [sourceData]);

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

  const [cropFullMsg, setCropFullMsg] = useState(false);
  const commitCrop = useCallback(() => {
    if (!cropBox || !sourceData) return;
    const { width: W, height: H } = sourceData;
    const x = Math.max(0, Math.round(cropBox.x * W));
    const y = Math.max(0, Math.round(cropBox.y * H));
    const w = Math.min(W - x, Math.max(1, Math.round(cropBox.w * W)));
    const h = Math.min(H - y, Math.max(1, Math.round(cropBox.h * H)));
    if (w >= W && h >= H) {
      setCropFullMsg(true);
      setTimeout(() => setCropFullMsg(false), 2000);
      return;
    }
    applyEdit(cropImageData(sourceData, x, y, w, h));
    setCanvasTool("pick");
  }, [cropBox, sourceData, applyEdit]);

  const brushSegment = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const ctx = canvasRef.current?.getContext("2d");
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
    const cv = canvasRef.current;
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * cv.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * cv.height);
    if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return null;
    return { x, y };
  }, []);

  const onCanvasClick = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      if (canvasTool === "crop" || canvasTool === "brush") return;
      const p = canvasPixel(e);
      if (!p || !sourceData) return;
      if (canvasTool === "erase") {
        applyEdit(floodEraseAt(sourceData, p.x, p.y, eraseTolerance));
        return;
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const [r, g, b, a] = ctx.getImageData(p.x, p.y, 1, 1).data;
      if (a < 128) {
        showPickInfo({ msg: "That spot is transparent — nothing to sample" });
        return;
      }
      const color = { r, g, b, a: 255 };
      const hex = rgbaToHex(color);
      if (!usePalette) {
        showPickInfo({ msg: "Turn on “Trace with image palette” to use sampled colors", hex });
        return;
      }
      const dup = palette.some(
        (s) =>
          (s.color.r - r) ** 2 + (s.color.g - g) ** 2 + (s.color.b - b) ** 2 < 25,
      );
      if (!dup) addColor(color);
      showPickInfo({
        hex,
        msg: dup ? `${hex} is already in the palette` : `Added ${hex} to the palette`,
      });
    },
    [
      canvasPixel,
      sourceData,
      canvasTool,
      eraseTolerance,
      usePalette,
      palette,
      applyEdit,
      addColor,
      showPickInfo,
    ],
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
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    setSourceData(ctx.getImageData(0, 0, cv.width, cv.height));
    setSvg(null);
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

  const drawLoupe = useCallback((x: number, y: number) => {
    const src = canvasRef.current;
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

  const onConvert = useCallback(() => {
    if (!sourceData || !workerRef.current) return;
    setConverting(true);
    setError(null);
    setSvg(null);
    const pal =
      usePalette && palette.some((s) => s.on)
        ? palette.filter((s) => s.on).map((s) => s.color)
        : undefined;
    workerRef.current.postMessage({
      imageData: sourceData,
      options: buildOptions(preset, simplify, pal),
      cleanup,
    });
  }, [sourceData, preset, simplify, usePalette, palette, cleanup]);

  const baseName = useCallback(
    () => (loaded ? loaded.name.replace(/\.[^.]+$/, "") : "image"),
    [loaded],
  );

  const onDownload = useCallback(() => {
    if (!svg || !loaded) return;
    void saveAs({
      suggestedName: `${baseName()}.svg`,
      description: "SVG image",
      mime: "image/svg+xml",
      ext: ".svg",
      getBlob: () => new Blob([svg], { type: "image/svg+xml" }),
    });
  }, [svg, loaded, baseName]);

  const imageHasTransparency = useMemo(
    () => (sourceData ? hasTransparency(sourceData) : false),
    [sourceData],
  );

  const [downloadSelectKey, setDownloadSelectKey] = useState(0);

  const downloadRaster = useCallback(
    async (fmt: RasterFmt) => {
      if (!sourceData || !loaded) return;
      const meta = RASTER_FORMATS.find((f) => f.mime === fmt);
      if (!meta) return;
      if (imageHasTransparency && isOpaqueFormat(fmt)) {
        if (
          !window.confirm(
            `This image has transparent areas. ${meta.label} does not support transparency — they will be flattened onto a white background. Download anyway?`,
          )
        ) {
          return;
        }
      }
      const quality = fmt === "image/png" ? undefined : 0.92;
      void saveAs({
        suggestedName: `${baseName()}-edited${meta.ext}`,
        description: `${meta.label} image`,
        mime: fmt,
        ext: meta.ext,
        getBlob: () => imageDataToBlob(sourceData, fmt, quality),
      });
    },
    [sourceData, loaded, baseName, imageHasTransparency],
  );

  const svgBytes = useMemo(() => (svg ? new Blob([svg]).size : 0), [svg]);
  const pathCount = useMemo(() => (svg ? countPaths(svg) : 0), [svg]);
  const savedPct =
    rawBytes > svgBytes && svgBytes > 0
      ? Math.round((1 - svgBytes / rawBytes) * 100)
      : 0;

  return (
    <div className="tool-ui">
      <div className="actionbar">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) acceptFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <LuImagePlus />
          {loaded ? "Change image…" : "Select image…"}
        </Button>
        <div className="actionbar-spacer" />
        <div className="ab-actions panel-actions-dup">
          <Button disabled={!sourceData || converting} onClick={onConvert}>
            <LuSparkles />
            {converting ? "Converting…" : "Convert to SVG"}
          </Button>
          <Button variant="outline" disabled={!svg} onClick={onDownload}>
            <LuDownload />
            Download
          </Button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loaded && (
        <section className="card settings">
          <label className="field">
            <span className="field-label">Style</span>
            <select value={preset} onChange={(e) => setPreset(e.target.value as PresetKey)}>
              {PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} — {p.hint}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Simplify</span>
            <select value={simplify} onChange={(e) => setSimplify(e.target.value as SimplifyLevel)}>
              {SIMPLIFY_LEVELS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} — {s.hint}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span className="field-label">Output</span>
            <label
              className="toggle"
              title="Run SVGO to merge paths, simplify curves and shrink the file"
            >
              <Switch
                size="sm"
                checked={cleanup}
                onCheckedChange={(c) => setCleanup(c === true)}
              />
              Clean up
            </label>
          </div>
        </section>
      )}

      {loaded && palette.length > 0 && (
        <section className="card palette">
          <div className="palette-controls">
            <label className="toggle">
              <Checkbox
                checked={usePalette}
                onCheckedChange={(c) => setUsePalette(c === true)}
              />
              Trace with image palette
            </label>
            <label className="count">
              Colors: {colorCount}
              <Slider
                className="palette-slider"
                min={2}
                max={24}
                value={[colorCount]}
                disabled={!usePalette}
                onValueChange={(v) => setColorCount(Array.isArray(v) ? v[0] : v)}
              />
            </label>
            <span className="palette-hint">
              {usePalette
                ? `${palette.filter((s) => s.on).length} of ${palette.length} active · click to toggle · click the image or + to add`
                : "Palette off — tracer picks its own colors"}
            </span>
          </div>
          <div className={`swatches ${usePalette ? "" : "muted"}`}>
            {palette.map((s, i) => {
              const hex = rgbaToHex(s.color);
              return (
                <button
                  key={`${hex}-${i}`}
                  type="button"
                  className={`swatch ${s.on ? "" : "off"} ${s.custom ? "custom" : ""}`}
                  style={{ background: hex }}
                  title={s.custom ? `${hex} (added)` : hex}
                  disabled={!usePalette}
                  onClick={() =>
                    setPalette((prev) =>
                      prev.map((p, j) => (j === i ? { ...p, on: !p.on } : p)),
                    )
                  }
                >
                  <span className="swatch-hex">{hex}</span>
                </button>
              );
            })}
            <input
              ref={colorInputRef}
              type="color"
              hidden
              onChange={(e) => addColor(hexToRgba(e.target.value))}
            />
            <button
              type="button"
              className="swatch add"
              disabled={!usePalette}
              title="Add a color"
              onClick={() => colorInputRef.current?.click()}
            >
              <LuPlus />
            </button>
          </div>
        </section>
      )}

      {!loaded && !error && (
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
            const f = e.dataTransfer.files?.[0];
            if (f) acceptFile(f);
          }}
        >
          <div className="dropzone-inner">
            <LuImagePlus className="dropzone-icon" />
            <strong>Drop an image here</strong>
            <span>or click to browse</span>
          </div>
        </div>
      )}

      {loaded && (
        <section className="workspace">
          <div className="panel">
            <div className="panel-head">
              <span className="tag">Original</span>
              <span className="meta">
                {sourceData
                  ? `${sourceData.width}×${sourceData.height}`
                  : `${loaded.width}×${loaded.height}`}
                {" · "}
                {formatBytes(loaded.bytes)}
              </span>
            </div>

            <div className="panel-controls">
              <div className="editbar">
                <div className="tool-group" role="group" aria-label="Tools">
                  {(
                    [
                      ["pick", LuPipette, "Eyedropper", "Click the image to add its color to the palette"],
                      ["brush", LuEraser, "Eraser", "Drag to erase pixels by hand"],
                      ["erase", LuWand, "Magic erase", "Click a color to erase that whole connected region"],
                      ["crop", LuCrop, "Crop", "Adjustable crop box"],
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
                  <Button variant="secondary" size="sm" disabled={!sourceData} onClick={removeBg} title="Flood-fill the outer background to transparent">
                    <LuScissors />
                    Remove BG
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!sourceData} onClick={trimToContent} title="Trim transparent margins so the SVG is tightly framed">
                    <LuMinimize2 />
                    Trim
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!sourceData} onClick={() => flip("h")} title="Flip horizontally">
                    <LuFlipHorizontal2 />
                    Flip H
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!sourceData} onClick={() => flip("v")} title="Flip vertically">
                    <LuFlipVertical2 />
                    Flip V
                  </Button>
                </div>

                <div className="tool-group" role="group" aria-label="View">
                  <Button variant="secondary" size="sm" onClick={undoEdit} disabled={historyLen === 0} title="Undo last edit">
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

                <div className="tool-group" role="group" aria-label="Export">
                  <Select
                    key={downloadSelectKey}
                    disabled={!sourceData}
                    onValueChange={(fmt) => {
                      if (!fmt) return;
                      void downloadRaster(fmt as RasterFmt);
                      setDownloadSelectKey((k) => k + 1);
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="edit-download-select"
                      title="Download the edited image"
                    >
                      <LuDownload />
                      <SelectValue placeholder="Download" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {RASTER_FORMATS.map((f) => (
                        <SelectItem key={f.mime} value={f.mime}>
                          {f.label}
                          {imageHasTransparency && isOpaqueFormat(f.mime)
                            ? " — flattens transparency"
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="editopts">
                {canvasTool === "erase" && (
                  <label className="opt" title="How close in color a pixel must be to get erased">
                    Tolerance
                    <Slider
                      className="editopt-slider"
                      min={0}
                      max={128}
                      step={4}
                      value={[eraseTolerance]}
                      onValueChange={(v) => setEraseTolerance(Array.isArray(v) ? v[0] : v)}
                    />
                    <b>{eraseTolerance}</b>
                  </label>
                )}
                {canvasTool === "brush" && (
                  <label className="opt" title="Eraser size">
                    Eraser size
                    <Slider
                      className="editopt-slider"
                      min={2}
                      max={100}
                      step={2}
                      value={[brushSize]}
                      onValueChange={(v) => setBrushSize(Array.isArray(v) ? v[0] : v)}
                    />
                    <b>{brushSize}px</b>
                  </label>
                )}
                {canvasTool === "crop" && (
                  <div className="opt-buttons">
                    <Button size="sm" onClick={commitCrop}>Apply crop</Button>
                    <Button variant="outline" size="sm" onClick={resetCropBox}>Reset box</Button>
                    {cropFullMsg && (
                      <span className="tool-hint" style={{ color: "var(--muted-foreground)" }}>
                        Selection covers full image — drag a handle to crop
                      </span>
                    )}
                  </div>
                )}
                {canvasTool === "pick" && pickInfo && (
                  <span className="opt pick-feedback">
                    {pickInfo.hex && <span className="chip" style={{ background: pickInfo.hex }} />}
                    {pickInfo.msg}
                  </span>
                )}
                <span className="tool-hint">
                  {canvasTool === "erase"
                    ? "Click a color to erase that whole connected region (e.g. gaps the bg remover missed)"
                    : canvasTool === "crop"
                      ? "Drag the box / handles, then Apply crop (or double-click)"
                      : canvasTool === "brush"
                        ? "Drag over the image to erase pixels by hand"
                        : "Tap the image to sample a color into the palette"}
                </span>
              </div>
            </div>

            <div className="canvas checker">
              <div className="canvas-wrap" ref={wrapRef}>
                <canvas
                  ref={canvasRef}
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
                    title="Drag to move · drag a handle to resize · double-click to crop"
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

          <div className="panel">
            <div className="panel-head">
              <span className="tag">SVG result</span>
              <span className="meta">
                {svg
                  ? `${pathCount.toLocaleString()} paths · ${formatBytes(svgBytes)}${
                      savedPct > 0 ? ` · −${savedPct}%` : ""
                    }`
                  : "—"}
              </span>
            </div>
            <div className="panel-controls panel-actions">
              <Button disabled={!sourceData || converting} onClick={onConvert}>
                <LuSparkles />
                {converting ? "Converting…" : "Convert to SVG"}
              </Button>
              <Button variant="outline" disabled={!svg} onClick={onDownload}>
                <LuDownload />
                Download
              </Button>
            </div>
            <div className="canvas checker">
              {svg ? (
                <div className="svg-host" dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <div className="placeholder">
                  {converting ? "Tracing paths…" : "Convert to see the result"}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div ref={loupeRef} className="loupe" style={{ display: "none" }}>
        <div className="loupe-inner checker">
          <canvas ref={loupeCanvasRef} width={150} height={150} />
        </div>
      </div>
    </div>
  );
}
