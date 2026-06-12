"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  LuCopy,
  LuCrop,
  LuDownload,
  LuEraser,
  LuFileArchive,
  LuFlipHorizontal2,
  LuFlipVertical2,
  LuInfo,
  LuRedo2,
  LuRotateCcw,
  LuRotateCw,
  LuScaling,
  LuScissors,
  LuShapes,
  LuStar,
  LuUndo2,
  LuZoomIn,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { baseName, loadImageFile } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { removeBackground, floodEraseAt } from "@/lib/background";
import { saveAs } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { fileSizeError } from "@/lib/limits";
import {
  renderSquare,
  canvasPngBytes,
  buildIco,
  generateHtmlSnippet,
  generateWebmanifest,
} from "@/lib/favicon";
import { buildOptions, countPaths, PRESETS, SIMPLIFY_LEVELS } from "@/lib/tracer";
import type { TraceRequest, TraceResponse } from "@/features/svg/trace.worker";
import { useToolPreference } from "./useToolPreference";
import {
  SvgSettingsModal,
  DEFAULT_SVG_SETTINGS,
  type SvgTraceSettings,
} from "./SvgSettingsModal";

/* ---------- types ---------- */

type Rect = { x: number; y: number; w: number; h: number };
type Snapshot = { canvas: HTMLCanvasElement; label: string };
type ToolId =
  | "crop"
  | "resize"
  | "rotate"
  | "background"
  | "redact"
  | "upscale"
  | "svg"
  | "favicon"
  | "info";
type RedactMode = "black" | "pixelate";
type DragKind = "new" | "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const TOOLS: { id: ToolId; label: string; icon: IconType }[] = [
  { id: "crop", label: "Crop", icon: LuCrop },
  { id: "resize", label: "Resize", icon: LuScaling },
  { id: "rotate", label: "Rotate", icon: LuRotateCw },
  { id: "background", label: "Cut BG", icon: LuScissors },
  { id: "redact", label: "Redact", icon: LuEraser },
  { id: "upscale", label: "Upscale", icon: LuZoomIn },
  { id: "svg", label: "To SVG", icon: LuShapes },
  { id: "favicon", label: "Favicon", icon: LuStar },
  { id: "info", label: "Info", icon: LuInfo },
];

const FAVICON_PREVIEW_SIZES = [16, 32, 180, 512];

/** Sanitise a user-supplied name: lowercase, alphanumeric + dashes only. */
function sanitiseName(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "favicon"
  );
}

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

const EXPORT_FORMATS: { key: string; label: string; mime: string; ext: string; lossy: boolean }[] = [
  { key: "png", label: "PNG (lossless)", mime: "image/png", ext: ".png", lossy: false },
  { key: "jpeg", label: "JPEG", mime: "image/jpeg", ext: ".jpg", lossy: true },
  { key: "webp", label: "WebP", mime: "image/webp", ext: ".webp", lossy: true },
  { key: "avif", label: "AVIF", mime: "image/avif", ext: ".avif", lossy: true },
];

const MIN_CROP = 16;

/* ---------- canvas helpers ---------- */

function imageElToCanvas(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  return drawToCanvas(img, w, h);
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

/** Pixelate one region of `ctx`, sampling from `source`. */
function pixelateRegion(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  r: Rect,
) {
  if (r.w < 2 || r.h < 2) return;
  const block = Math.max(8, Math.round(Math.max(source.width, source.height) / 90));
  const tw = Math.max(1, Math.round(r.w / block));
  const th = Math.max(1, Math.round(r.h / block));
  const t = document.createElement("canvas");
  t.width = tw;
  t.height = th;
  const tctx = t.getContext("2d")!;
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(source, r.x, r.y, r.w, r.h, 0, 0, tw, th);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(t, 0, 0, tw, th, r.x, r.y, r.w, r.h);
  ctx.imageSmoothingEnabled = true;
}

/* ---------- crop rect math ---------- */

function hitTestCrop(rect: Rect, p: { x: number; y: number }, tol: number): DragKind | null {
  const near = (a: number, b: number) => Math.abs(a - b) <= tol;
  const inX = p.x >= rect.x - tol && p.x <= rect.x + rect.w + tol;
  const inY = p.y >= rect.y - tol && p.y <= rect.y + rect.h + tol;
  const onL = near(p.x, rect.x) && inY;
  const onR = near(p.x, rect.x + rect.w) && inY;
  const onT = near(p.y, rect.y) && inX;
  const onB = near(p.y, rect.y + rect.h) && inX;
  if (onT && onL) return "nw";
  if (onT && onR) return "ne";
  if (onB && onL) return "sw";
  if (onB && onR) return "se";
  if (onT) return "n";
  if (onB) return "s";
  if (onL) return "w";
  if (onR) return "e";
  const inside =
    p.x > rect.x && p.x < rect.x + rect.w && p.y > rect.y && p.y < rect.y + rect.h;
  return inside ? "move" : null;
}

function resizeCropRect(
  orig: Rect,
  kind: DragKind,
  dx: number,
  dy: number,
  aspect: number | null,
  iw: number,
  ih: number,
): Rect {
  let x1 = orig.x;
  let y1 = orig.y;
  let x2 = orig.x + orig.w;
  let y2 = orig.y + orig.h;

  if (kind.includes("w")) x1 += dx;
  if (kind.includes("e")) x2 += dx;
  if (kind.includes("n")) y1 += dy;
  if (kind.includes("s")) y2 += dy;

  if (aspect) {
    if (kind === "n" || kind === "s") {
      const h = Math.max(MIN_CROP, y2 - y1);
      const w = h * aspect;
      const cx = (x1 + x2) / 2;
      x1 = cx - w / 2;
      x2 = cx + w / 2;
    } else if (kind === "e" || kind === "w") {
      const w = Math.max(MIN_CROP, x2 - x1);
      const h = w / aspect;
      const cy = (y1 + y2) / 2;
      y1 = cy - h / 2;
      y2 = cy + h / 2;
    } else {
      const w = Math.max(MIN_CROP, x2 - x1);
      const h = w / aspect;
      if (kind === "nw" || kind === "ne") y1 = y2 - h;
      else y2 = y1 + h;
    }
  }

  x1 = clamp(x1, 0, iw);
  x2 = clamp(x2, 0, iw);
  y1 = clamp(y1, 0, ih);
  y2 = clamp(y2, 0, ih);
  if (x2 - x1 < MIN_CROP) x2 = Math.min(iw, x1 + MIN_CROP);
  if (y2 - y1 < MIN_CROP) y2 = Math.min(ih, y1 + MIN_CROP);
  return { x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) };
}

function centeredAspectRect(iw: number, ih: number, aspect: number | null): Rect {
  if (!aspect) return { x: 0, y: 0, w: iw, h: ih };
  let w = iw;
  let h = w / aspect;
  if (h > ih) {
    h = ih;
    w = h * aspect;
  }
  return {
    x: Math.round((iw - w) / 2),
    y: Math.round((ih - h) / 2),
    w: Math.round(w),
    h: Math.round(h),
  };
}

/* ---------- component ---------- */

export default function ImageStudio() {
  const { isPro } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current: Snapshot | null = history[index] ?? null;

  /* tool state */
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [cropAspect, setCropAspect] = useState<number | null>(null);
  const [resizeW, setResizeW] = useState(0);
  const [resizeH, setResizeH] = useState(0);
  const [resizeLock, setResizeLock] = useState(true);
  const [bgTolerance, setBgTolerance] = useState(40);
  const [bgData, setBgData] = useState<ImageData | null>(null);
  const [redactRects, setRedactRects] = useState<Rect[]>([]);
  const [redactDraft, setRedactDraft] = useState<Rect | null>(null);
  const [redactMode, setRedactMode] = useState<RedactMode>("black");
  const [upscaleFactor, setUpscaleFactor] = useState(2);
  const [upscaleMode, setUpscaleMode] = useState<"smooth" | "crisp" | "ai">("smooth");
  const [upscaling, setUpscaling] = useState(false);
  const [faviconName, setFaviconName] = useState("favicon");
  const [faviconCopied, setFaviconCopied] = useState(false);
  const svgPref = useToolPreference<SvgTraceSettings>("image-to-svg");
  const [svgModalOpen, setSvgModalOpen] = useState(false);
  const [svgResult, setSvgResult] = useState<{ svg: string; bytes: number; paths: number } | null>(null);
  const [tracing, setTracing] = useState(false);
  const traceWorkerRef = useRef<Worker | null>(null);
  const [exif, setExif] = useState<[string, string][] | null>(null);

  /* export state */
  const [fmtKey, setFmtKey] = useState("png");
  const [quality, setQuality] = useState(85);
  const [avifOk, setAvifOk] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const displayRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ kind: DragKind; start: { x: number; y: number }; rect: Rect } | null>(null);
  const bgBaseRef = useRef<ImageData | null>(null);

  const fmt = EXPORT_FORMATS.find((f) => f.key === fmtKey) ?? EXPORT_FORMATS[0];

  const resetToolState = useCallback(() => {
    setCropRect(null);
    setCropAspect(null);
    setBgData(null);
    bgBaseRef.current = null;
    setRedactRects([]);
    setRedactDraft(null);
    dragRef.current = null;
    setSvgResult(null);
    setTracing(false);
    traceWorkerRef.current?.terminate();
    traceWorkerRef.current = null;
  }, []);

  const selectTool = useCallback(
    (id: ToolId | null) => {
      resetToolState();
      const next = tool === id ? null : id;
      setTool(next);
      if (next === "crop" && current) {
        setCropRect({ x: 0, y: 0, w: current.canvas.width, h: current.canvas.height });
      }
      if (next === "resize" && current) {
        setResizeW(current.canvas.width);
        setResizeH(current.canvas.height);
      }
      // First time using image → SVG: collect settings once, then they stick.
      if (next === "svg" && svgPref.loaded && !svgPref.value) {
        setSvgModalOpen(true);
      }
    },
    [tool, current, resetToolState, svgPref.loaded, svgPref.value],
  );

  /* ---------- file loading ---------- */

  const loadFile = useCallback(
    async (f: File) => {
      setError(null);
      const sizeErr = fileSizeError(f.size, isPro);
      if (sizeErr) {
        setError(sizeErr);
        return;
      }
      try {
        const loaded = await loadImageFile(f);
        const canvas = imageElToCanvas(loaded.img, loaded.width, loaded.height);
        URL.revokeObjectURL(loaded.url);
        setFile(f);
        setHistory([{ canvas, label: "Original" }]);
        setIndex(0);
        setTool(null);
        resetToolState();
        setExif(null);
        setEstimate(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that image.");
      }
    },
    [isPro, resetToolState],
  );

  /* ---------- history ---------- */

  const apply = useCallback(
    (canvas: HTMLCanvasElement, label: string) => {
      setHistory((h) => [...h.slice(0, index + 1), { canvas, label }]);
      setIndex((i) => i + 1);
      setTool(null);
      resetToolState();
    },
    [index, resetToolState],
  );

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setTool(null);
      resetToolState();
    }
  }, [index, resetToolState]);

  const redo = useCallback(() => {
    setIndex((i) => (i < history.length - 1 ? i + 1 : i));
    setTool(null);
    resetToolState();
  }, [history.length, resetToolState]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  /* ---------- AVIF support probe ---------- */

  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    c.toBlob((b) => setAvifOk(!!b && b.type === "image/avif"), "image/avif", 0.8);
  }, []);

  /* ---------- per-tool init ---------- */

  // Background removal: snapshot base pixels when the tool opens, recompute
  // the preview when tolerance changes (debounced — flood fill is sync work).
  useEffect(() => {
    if (tool !== "background" || !current) return;
    const ctx = current.canvas.getContext("2d")!;
    bgBaseRef.current = ctx.getImageData(0, 0, current.canvas.width, current.canvas.height);
    setBgData(removeBackground(bgBaseRef.current, bgTolerance));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, current]);

  useEffect(() => {
    if (tool !== "background" || !bgBaseRef.current) return;
    const t = setTimeout(() => {
      if (bgBaseRef.current) setBgData(removeBackground(bgBaseRef.current, bgTolerance));
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgTolerance]);

  useEffect(() => {
    if (tool !== "info" || !file) return;
    let alive = true;
    import("exifr")
      .then((m) => m.default.parse(file, { tiff: true, exif: true, gps: true }))
      .then((data: Record<string, unknown> | undefined) => {
        if (!alive) return;
        if (!data) {
          setExif([]);
          return;
        }
        const rows = Object.entries(data)
          .filter(([, v]) => v != null && typeof v !== "object" || v instanceof Date)
          .map(([k, v]): [string, string] => [
            k,
            v instanceof Date ? v.toLocaleString() : String(v),
          ])
          .slice(0, 60);
        setExif(rows);
      })
      .catch(() => alive && setExif([]));
    return () => {
      alive = false;
    };
  }, [tool, file]);

  /* ---------- favicon previews ---------- */

  const favName = sanitiseName(faviconName);

  const faviconPreviews = useMemo(() => {
    if (tool !== "favicon" || !current) return null;
    return FAVICON_PREVIEW_SIZES.map((size) => ({
      size,
      url: renderSquare(current.canvas, Math.min(size, 64)).toDataURL("image/png"),
    }));
  }, [tool, current]);

  const faviconSnippet = useMemo(
    () => generateHtmlSnippet(`${favName}.ico`, favName),
    [favName],
  );

  /* ---------- preview canvas for BG tool ---------- */

  const bgCanvas = useMemo(() => {
    if (!bgData) return null;
    const c = document.createElement("canvas");
    c.width = bgData.width;
    c.height = bgData.height;
    c.getContext("2d")!.putImageData(bgData, 0, 0);
    return c;
  }, [bgData]);

  /* ---------- viewport redraw ---------- */

  useEffect(() => {
    const display = displayRef.current;
    if (!display || !current) return;
    const base = tool === "background" && bgCanvas ? bgCanvas : current.canvas;
    display.width = base.width;
    display.height = base.height;
    const ctx = display.getContext("2d")!;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(base, 0, 0);

    if (tool === "redact") {
      for (const r of [...redactRects, ...(redactDraft ? [redactDraft] : [])]) {
        if (redactMode === "black") {
          ctx.fillStyle = "#000";
          ctx.fillRect(r.x, r.y, r.w, r.h);
        } else {
          pixelateRegion(ctx, current.canvas, r);
        }
      }
      if (redactDraft) {
        const scale = display.getBoundingClientRect().width / display.width || 1;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = Math.max(1, 1.5 / scale);
        ctx.setLineDash([6 / scale, 4 / scale]);
        ctx.strokeRect(redactDraft.x, redactDraft.y, redactDraft.w, redactDraft.h);
        ctx.setLineDash([]);
      }
    }

    if (tool === "crop" && cropRect) {
      const scale = display.getBoundingClientRect().width / display.width || 1;
      const r = cropRect;
      ctx.fillStyle = "rgba(5, 8, 14, 0.6)";
      ctx.fillRect(0, 0, display.width, r.y);
      ctx.fillRect(0, r.y, r.x, r.h);
      ctx.fillRect(r.x + r.w, r.y, display.width - r.x - r.w, r.h);
      ctx.fillRect(0, r.y + r.h, display.width, display.height - r.y - r.h);

      const lw = Math.max(1, 1.5 / scale);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = lw;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      for (let i = 1; i < 3; i++) {
        ctx.moveTo(r.x + (r.w * i) / 3, r.y);
        ctx.lineTo(r.x + (r.w * i) / 3, r.y + r.h);
        ctx.moveTo(r.x, r.y + (r.h * i) / 3);
        ctx.lineTo(r.x + r.w, r.y + (r.h * i) / 3);
      }
      ctx.stroke();

      const hs = Math.max(6, 9 / scale);
      ctx.fillStyle = "#fff";
      const points = [
        [r.x, r.y], [r.x + r.w / 2, r.y], [r.x + r.w, r.y],
        [r.x, r.y + r.h / 2], [r.x + r.w, r.y + r.h / 2],
        [r.x, r.y + r.h], [r.x + r.w / 2, r.y + r.h], [r.x + r.w, r.y + r.h],
      ];
      for (const [px, py] of points) ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
    }
  }, [current, tool, cropRect, redactRects, redactDraft, redactMode, bgCanvas]);

  /* ---------- pointer interaction ---------- */

  const toImagePoint = useCallback((e: React.PointerEvent) => {
    const c = displayRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: clamp(Math.round((e.clientX - r.left) * (c.width / r.width)), 0, c.width),
      y: clamp(Math.round((e.clientY - r.top) * (c.height / r.height)), 0, c.height),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current) return;
    const p = toImagePoint(e);

    if (tool === "crop" && cropRect) {
      const c = displayRef.current!;
      const tol = 14 * (c.width / (c.getBoundingClientRect().width || c.width));
      const kind = hitTestCrop(cropRect, p, tol) ?? "new";
      dragRef.current = { kind, start: p, rect: { ...cropRect } };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (tool === "redact") {
      dragRef.current = { kind: "new", start: p, rect: { x: p.x, y: p.y, w: 0, h: 0 } };
      setRedactDraft({ x: p.x, y: p.y, w: 0, h: 0 });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (tool === "background" && bgData) {
      // Magic-erase: flood-clear the clicked region in the preview.
      if (bgData.data[(p.y * bgData.width + p.x) * 4 + 3] >= 128) {
        setBgData(floodEraseAt(bgData, p.x, p.y, bgTolerance + 8));
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || !current) return;
    const p = toImagePoint(e);
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;
    const iw = current.canvas.width;
    const ih = current.canvas.height;

    if (tool === "crop") {
      if (drag.kind === "new") {
        const r = normalizeRect(drag.start, p);
        if (r.w > 4 || r.h > 4) setCropRect(resizeCropRect(r, "se", 0, 0, cropAspect, iw, ih));
      } else if (drag.kind === "move") {
        setCropRect({
          ...drag.rect,
          x: clamp(drag.rect.x + dx, 0, iw - drag.rect.w),
          y: clamp(drag.rect.y + dy, 0, ih - drag.rect.h),
        });
      } else {
        setCropRect(resizeCropRect(drag.rect, drag.kind, dx, dy, cropAspect, iw, ih));
      }
    } else if (tool === "redact") {
      setRedactDraft(normalizeRect(drag.start, p));
    }
  };

  const onPointerUp = () => {
    if (tool === "redact" && redactDraft) {
      if (redactDraft.w >= 4 && redactDraft.h >= 4) {
        setRedactRects((rs) => [...rs, redactDraft]);
      }
      setRedactDraft(null);
    }
    dragRef.current = null;
  };

  /* ---------- apply operations ---------- */

  const applyCrop = () => {
    if (!current || !cropRect) return;
    const r = cropRect;
    const c = document.createElement("canvas");
    c.width = r.w;
    c.height = r.h;
    c.getContext("2d")!.drawImage(current.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    apply(c, `Crop ${r.w}×${r.h}`);
  };

  const applyResize = () => {
    if (!current || resizeW < 1 || resizeH < 1) return;
    apply(drawToCanvas(current.canvas, resizeW, resizeH), `Resize ${resizeW}×${resizeH}`);
  };

  const applyRotate = (dir: 1 | -1) => {
    if (!current) return;
    const src = current.canvas;
    const c = document.createElement("canvas");
    c.width = src.height;
    c.height = src.width;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((dir * Math.PI) / 2);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    apply(c, dir === 1 ? "Rotate right" : "Rotate left");
  };

  const applyFlip = (axis: "h" | "v") => {
    if (!current) return;
    const src = current.canvas;
    const c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext("2d")!;
    if (axis === "h") {
      ctx.scale(-1, 1);
      ctx.drawImage(src, -src.width, 0);
    } else {
      ctx.scale(1, -1);
      ctx.drawImage(src, 0, -src.height);
    }
    apply(c, axis === "h" ? "Flip horizontal" : "Flip vertical");
  };

  const applyBackground = () => {
    if (!bgCanvas) return;
    apply(cloneCanvas(bgCanvas), "Remove background");
  };

  const applyRedact = () => {
    if (!current || redactRects.length === 0) return;
    const c = cloneCanvas(current.canvas);
    const ctx = c.getContext("2d")!;
    for (const r of redactRects) {
      if (redactMode === "black") {
        ctx.fillStyle = "#000";
        ctx.fillRect(r.x, r.y, r.w, r.h);
      } else {
        pixelateRegion(ctx, current.canvas, r);
      }
    }
    apply(c, `Redact ${redactRects.length} area${redactRects.length > 1 ? "s" : ""}`);
  };

  const applyUpscale = async () => {
    if (!current) return;
    const src = current.canvas;

    if (upscaleMode === "ai") {
      setUpscaling(true);
      setError(null);
      try {
        const blob = await canvasToBlob(src, "image/png");
        const form = new FormData();
        form.append("image", new File([blob], "image.png", { type: "image/png" }));
        form.append("scale", String(upscaleFactor === 3 ? 4 : upscaleFactor)); // AI supports 2× and 4×
        const res = await fetch("/api/v1/upscale", { method: "POST", body: form });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "AI upscaling failed");
        }
        const resultBlob = await res.blob();
        const url = URL.createObjectURL(resultBlob);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error("Could not read the upscaled image."));
          i.src = url;
        });
        const c = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(url);
        apply(c, `AI upscale ${upscaleFactor}×`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI upscaling failed");
      } finally {
        setUpscaling(false);
      }
      return;
    }

    const c = document.createElement("canvas");
    c.width = src.width * upscaleFactor;
    c.height = src.height * upscaleFactor;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = upscaleMode === "smooth";
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, c.width, c.height);
    apply(c, `Upscale ${upscaleFactor}×`);
  };

  /* ---------- image → SVG ---------- */

  const runTrace = () => {
    if (!current || tracing) return;
    const settings = svgPref.value ?? DEFAULT_SVG_SETTINGS;
    setTracing(true);
    setError(null);
    setSvgResult(null);

    const ctx = current.canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, current.canvas.width, current.canvas.height);

    traceWorkerRef.current?.terminate();
    const worker = new Worker(new URL("../svg/trace.worker.ts", import.meta.url), {
      type: "module",
    });
    traceWorkerRef.current = worker;
    worker.onmessage = (e: MessageEvent<TraceResponse>) => {
      if (e.data.ok) {
        const svg = e.data.svg;
        setSvgResult({ svg, bytes: new Blob([svg]).size, paths: countPaths(svg) });
      } else {
        setError(e.data.error);
      }
      setTracing(false);
      worker.terminate();
      traceWorkerRef.current = null;
    };
    worker.onerror = () => {
      setError("The SVG conversion worker crashed.");
      setTracing(false);
      worker.terminate();
      traceWorkerRef.current = null;
    };
    const request: TraceRequest = {
      imageData,
      options: buildOptions(settings.preset, settings.simplify),
      cleanup: settings.cleanup,
    };
    worker.postMessage(request);
  };

  const downloadSvg = () => {
    if (!svgResult || !file) return;
    const svg = svgResult.svg;
    void saveAs({
      suggestedName: `${baseName(file.name)}.svg`,
      description: "SVG image",
      mime: "image/svg+xml",
      ext: ".svg",
      toolName: "Image Studio",
      getBlob: () => new Blob([svg], { type: "image/svg+xml" }),
    });
  };

  /* ---------- favicon pack ---------- */

  const downloadFaviconIco = () => {
    if (!current) return;
    const src = current.canvas;
    void saveAs({
      suggestedName: `${favName}.ico`,
      description: "Icon",
      mime: "image/x-icon",
      ext: ".ico",
      toolName: "Image Studio",
      getBlob: async () => {
        const entries = await Promise.all(
          [16, 32, 48].map(async (size) => ({
            size,
            png: await canvasPngBytes(renderSquare(src, size)),
          })),
        );
        return buildIco(entries);
      },
    });
  };

  const downloadFaviconZip = () => {
    if (!current) return;
    const src = current.canvas;
    const snippet = faviconSnippet;
    void saveAs({
      suggestedName: `${favName}-favicons.zip`,
      description: "Zip archive",
      mime: "application/zip",
      ext: ".zip",
      toolName: "Image Studio",
      getBlob: async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const png = (size: number) => canvasPngBytes(renderSquare(src, size));
        const ico = buildIco(
          await Promise.all(
            [16, 32, 48].map(async (size) => ({ size, png: await png(size) })),
          ),
        );
        zip.file(`${favName}.ico`, ico);
        zip.file(`${favName}-16x16.png`, await png(16));
        zip.file(`${favName}-32x32.png`, await png(32));
        zip.file("apple-touch-icon.png", await png(180));
        zip.file("android-chrome-192x192.png", await png(192));
        zip.file("android-chrome-512x512.png", await png(512));
        zip.file("site.webmanifest", generateWebmanifest());
        zip.file("snippet.html", snippet);
        return zip.generateAsync({ type: "blob" });
      },
    });
  };

  /* ---------- export ---------- */

  useEffect(() => {
    if (!current) return;
    let alive = true;
    const t = setTimeout(() => {
      const src = isOpaqueFormat(fmt.mime)
        ? drawToCanvas(current.canvas, current.canvas.width, current.canvas.height, "#ffffff")
        : current.canvas;
      canvasToBlob(src, fmt.mime, fmt.lossy ? quality / 100 : undefined)
        .then((b) => alive && setEstimate(b.size))
        .catch(() => alive && setEstimate(null));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [current, fmt.mime, fmt.lossy, quality]);

  const download = async () => {
    if (!current || !file) return;
    setDownloading(true);
    try {
      await saveAs({
        suggestedName: `${baseName(file.name)}-edited${fmt.ext}`,
        description: `${fmt.label} image`,
        mime: fmt.mime,
        ext: fmt.ext,
        toolName: "Image Studio",
        getBlob: () => {
          const src = isOpaqueFormat(fmt.mime)
            ? drawToCanvas(current.canvas, current.canvas.width, current.canvas.height, "#ffffff")
            : current.canvas;
          return canvasToBlob(src, fmt.mime, fmt.lossy ? quality / 100 : undefined);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export the image.");
    } finally {
      setDownloading(false);
    }
  };

  /* ---------- render ---------- */

  if (!file || !current) {
    return (
      <div className="studio">
        {error && <div className="error">{error}</div>}
        <Dropzone
          onFile={(f) => void loadFile(f)}
          onError={setError}
          label="Drop an image to get started"
        />
      </div>
    );
  }

  const cursor =
    tool === "crop" || tool === "redact"
      ? "crosshair"
      : tool === "background"
        ? "pointer"
        : "default";

  return (
    <div className="studio">
      {error && <div className="error">{error}</div>}

      <div className="studio-shell">
        {/* ---- top bar ---- */}
        <div className="studio-topbar">
          <div className="studio-file">
            <strong title={file.name}>{file.name}</strong>
            <span>
              {current.canvas.width}×{current.canvas.height}
              {history.length > 1 ? ` · ${history.length - 1} edit${history.length > 2 ? "s" : ""}` : ""}
              {" · "}
              {formatBytes(file.size)} original
            </span>
          </div>
          <div className="studio-topbar-actions">
            <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} aria-label="Undo">
              <LuUndo2 />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} aria-label="Redo">
              <LuRedo2 />
            </Button>
            <ChangeImageButton onFile={(f) => void loadFile(f)} />
            <Button size="sm" onClick={() => void download()} disabled={downloading}>
              <LuDownload />
              {downloading ? "Saving…" : "Download"}
            </Button>
          </div>
        </div>

        <div className="studio-body">
          {/* ---- tool rail ---- */}
          <nav className="studio-rail" aria-label="Editing tools">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`studio-rail-btn${tool === id ? " is-active" : ""}`}
                onClick={() => selectTool(id)}
                aria-pressed={tool === id}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* ---- canvas viewport ---- */}
          <div className="studio-viewport checker">
            <canvas
              ref={displayRef}
              className="studio-canvas"
              style={{ cursor }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>

          {/* ---- side panel ---- */}
          <aside className="studio-side">
            {tool === "crop" && cropRect && (
              <section className="studio-card">
                <h3 className="studio-card-title">Crop</h3>
                <p className="studio-hint">Drag the handles, or drag inside to move the selection.</p>
                <div className="studio-presets">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className={`studio-chip${cropAspect === a.value ? " is-active" : ""}`}
                      onClick={() => {
                        setCropAspect(a.value);
                        setCropRect(
                          centeredAspectRect(current.canvas.width, current.canvas.height, a.value),
                        );
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <p className="studio-readout">
                  {cropRect.w}×{cropRect.h} px
                </p>
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applyCrop}>Apply crop</Button>
                  <Button size="sm" variant="outline" onClick={() => selectTool(null)}>Cancel</Button>
                </div>
              </section>
            )}

            {tool === "resize" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Resize</h3>
                <div className="studio-dims">
                  <label className="studio-dim">
                    <span>Width</span>
                    <Input
                      type="number"
                      min={1}
                      value={resizeW || ""}
                      onChange={(e) => {
                        const w = Math.max(0, Math.round(Number(e.target.value)));
                        setResizeW(w);
                        if (resizeLock && current.canvas.width > 0) {
                          setResizeH(Math.max(1, Math.round((w * current.canvas.height) / current.canvas.width)));
                        }
                      }}
                    />
                  </label>
                  <label className="studio-dim">
                    <span>Height</span>
                    <Input
                      type="number"
                      min={1}
                      value={resizeH || ""}
                      onChange={(e) => {
                        const h = Math.max(0, Math.round(Number(e.target.value)));
                        setResizeH(h);
                        if (resizeLock && current.canvas.height > 0) {
                          setResizeW(Math.max(1, Math.round((h * current.canvas.width) / current.canvas.height)));
                        }
                      }}
                    />
                  </label>
                </div>
                <label className="studio-check">
                  <input
                    type="checkbox"
                    checked={resizeLock}
                    onChange={(e) => setResizeLock(e.target.checked)}
                  />
                  Lock aspect ratio
                </label>
                <div className="studio-presets">
                  {[25, 50, 75, 200].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className="studio-chip"
                      onClick={() => {
                        setResizeW(Math.max(1, Math.round((current.canvas.width * pct) / 100)));
                        setResizeH(Math.max(1, Math.round((current.canvas.height * pct) / 100)));
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={applyResize}
                    disabled={
                      resizeW < 1 ||
                      resizeH < 1 ||
                      (resizeW === current.canvas.width && resizeH === current.canvas.height)
                    }
                  >
                    Apply resize
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectTool(null)}>Cancel</Button>
                </div>
              </section>
            )}

            {tool === "rotate" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Rotate & flip</h3>
                <p className="studio-hint">Each click applies immediately — undo to step back.</p>
                <div className="studio-grid2">
                  <Button variant="outline" size="sm" onClick={() => applyRotate(-1)}>
                    <LuRotateCcw /> Left 90°
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyRotate(1)}>
                    <LuRotateCw /> Right 90°
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyFlip("h")}>
                    <LuFlipHorizontal2 /> Flip H
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyFlip("v")}>
                    <LuFlipVertical2 /> Flip V
                  </Button>
                </div>
              </section>
            )}

            {tool === "background" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Remove background</h3>
                <p className="studio-hint">
                  Solid backgrounds are detected from the edges. Click any leftover patch on the
                  image to erase it too.
                </p>
                <label className="studio-slider-label">
                  Tolerance <span>{bgTolerance}</span>
                </label>
                <Slider
                  value={[bgTolerance]}
                  min={5}
                  max={120}
                  step={1}
                  onValueChange={(v) => setBgTolerance(Array.isArray(v) ? v[0] : v)}
                />
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applyBackground} disabled={!bgCanvas}>
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectTool(null)}>Cancel</Button>
                </div>
              </section>
            )}

            {tool === "redact" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Redact</h3>
                <p className="studio-hint">Drag on the image to cover sensitive areas.</p>
                <div className="studio-presets">
                  <button
                    type="button"
                    className={`studio-chip${redactMode === "black" ? " is-active" : ""}`}
                    onClick={() => setRedactMode("black")}
                  >
                    Blackout
                  </button>
                  <button
                    type="button"
                    className={`studio-chip${redactMode === "pixelate" ? " is-active" : ""}`}
                    onClick={() => setRedactMode("pixelate")}
                  >
                    Pixelate
                  </button>
                </div>
                <p className="studio-readout">
                  {redactRects.length} area{redactRects.length === 1 ? "" : "s"} marked
                </p>
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applyRedact} disabled={redactRects.length === 0}>
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRedactRects((rs) => rs.slice(0, -1))}
                    disabled={redactRects.length === 0}
                  >
                    Undo area
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectTool(null)}>Cancel</Button>
                </div>
              </section>
            )}

            {tool === "upscale" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Upscale</h3>
                <div className="studio-presets">
                  {(upscaleMode === "ai" ? [2, 4] : [2, 3, 4]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`studio-chip${upscaleFactor === f ? " is-active" : ""}`}
                      onClick={() => setUpscaleFactor(f)}
                    >
                      {f}×
                    </button>
                  ))}
                </div>
                <div className="studio-presets">
                  <button
                    type="button"
                    className={`studio-chip${upscaleMode === "smooth" ? " is-active" : ""}`}
                    onClick={() => setUpscaleMode("smooth")}
                  >
                    Smooth (photos)
                  </button>
                  <button
                    type="button"
                    className={`studio-chip${upscaleMode === "crisp" ? " is-active" : ""}`}
                    onClick={() => setUpscaleMode("crisp")}
                  >
                    Crisp (pixel art)
                  </button>
                  {isPro ? (
                    <button
                      type="button"
                      className={`studio-chip${upscaleMode === "ai" ? " is-active" : ""}`}
                      onClick={() => {
                        setUpscaleMode("ai");
                        if (upscaleFactor === 3) setUpscaleFactor(4);
                      }}
                    >
                      AI (ESRGAN) — Pro
                    </button>
                  ) : (
                    <Link className="studio-chip" href="/pricing">
                      AI (ESRGAN) — Pro
                    </Link>
                  )}
                </div>
                {upscaleMode === "ai" && (
                  <p className="studio-hint">
                    Real-ESRGAN neural upscaling — the only studio operation that uploads your
                    image. Takes 30–60 seconds.
                  </p>
                )}
                <p className="studio-readout">
                  Result: {current.canvas.width * upscaleFactor}×{current.canvas.height * upscaleFactor} px
                </p>
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={() => void applyUpscale()} disabled={upscaling}>
                    {upscaling ? "Upscaling…" : "Apply"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectTool(null)} disabled={upscaling}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {tool === "svg" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Image → SVG</h3>
                <p className="studio-hint">
                  Traces your edited image into scalable vector paths. Best for logos, icons, and
                  flat-color artwork.
                </p>
                {svgPref.value ? (
                  <p className="studio-readout">
                    {PRESETS.find((p) => p.key === svgPref.value!.preset)?.label ?? svgPref.value.preset}
                    {" · "}
                    {SIMPLIFY_LEVELS.find((s) => s.key === svgPref.value!.simplify)?.label ??
                      svgPref.value.simplify}{" "}
                    simplify
                    {" · "}
                    {svgPref.value.cleanup ? "optimized" : "raw"}
                  </p>
                ) : (
                  <p className="studio-hint">No tracing settings saved yet.</p>
                )}
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={runTrace} disabled={tracing || !svgPref.loaded}>
                    {tracing ? "Tracing…" : svgResult ? "Re-convert" : "Convert to SVG"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSvgModalOpen(true)}>
                    Settings…
                  </Button>
                </div>
                {svgResult && (
                  <>
                    <div className="studio-svg-preview checker">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgResult.svg)}`}
                        alt="Traced SVG preview"
                      />
                    </div>
                    <p className="studio-readout">
                      {svgResult.paths} path{svgResult.paths === 1 ? "" : "s"} ·{" "}
                      {formatBytes(svgResult.bytes)}
                    </p>
                    <Button size="sm" onClick={downloadSvg}>
                      <LuDownload />
                      Download .svg
                    </Button>
                  </>
                )}
                <p className="studio-hint">
                  Going the other way? Drop an SVG into the studio and export it as PNG, JPEG,
                  WebP, or AVIF.
                </p>
              </section>
            )}

            {tool === "favicon" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Favicon pack</h3>
                <p className="studio-hint">
                  Builds a complete icon set from your edited image — .ico, PNGs for every
                  platform, webmanifest, and a ready-to-paste HTML snippet.
                </p>
                <div className="field">
                  <span className="field-label">Base name</span>
                  <Input
                    value={faviconName}
                    onChange={(e) => setFaviconName(e.target.value)}
                    placeholder="favicon"
                    aria-label="Favicon base name"
                  />
                </div>
                {faviconPreviews && (
                  <div className="studio-favicon-grid">
                    {faviconPreviews.map((p) => (
                      <figure key={p.size} className="studio-favicon-cell">
                        <span className="checker">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.url}
                            alt={`${p.size}px favicon preview`}
                            style={{ imageRendering: p.size <= 64 ? "pixelated" : "auto" }}
                          />
                        </span>
                        <figcaption>{p.size}px</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {current.canvas.width !== current.canvas.height && (
                  <p className="studio-hint">
                    Your image isn&apos;t square — it will be centered on a transparent square.
                    Use the Crop tool first for an exact fit.
                  </p>
                )}
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={downloadFaviconZip}>
                    <LuFileArchive />
                    Download pack (.zip)
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadFaviconIco}>
                    <LuDownload />
                    {favName}.ico only
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(faviconSnippet).then(() => {
                        setFaviconCopied(true);
                        setTimeout(() => setFaviconCopied(false), 2000);
                      });
                    }}
                  >
                    <LuCopy />
                    {faviconCopied ? "Copied!" : "Copy <head> snippet"}
                  </Button>
                </div>
              </section>
            )}

            {tool === "info" && (
              <section className="studio-card">
                <h3 className="studio-card-title">File info</h3>
                <dl className="studio-meta">
                  <div><dt>Name</dt><dd>{file.name}</dd></div>
                  <div><dt>Type</dt><dd>{file.type || "unknown"}</dd></div>
                  <div><dt>Original</dt><dd>{history[0].canvas.width}×{history[0].canvas.height} · {formatBytes(file.size)}</dd></div>
                  <div><dt>Current</dt><dd>{current.canvas.width}×{current.canvas.height}</dd></div>
                </dl>
                <h3 className="studio-card-title">EXIF metadata</h3>
                {exif === null ? (
                  <p className="studio-hint">Reading metadata…</p>
                ) : exif.length === 0 ? (
                  <p className="studio-hint">No EXIF metadata found.</p>
                ) : (
                  <dl className="studio-meta studio-meta-scroll">
                    {exif.map(([k, v]) => (
                      <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                )}
                <p className="studio-hint">
                  Exports are re-encoded in your browser, so downloaded images carry no EXIF
                  metadata.
                </p>
              </section>
            )}

            {!tool && (
              <section className="studio-card">
                <h3 className="studio-card-title">Edit</h3>
                <p className="studio-hint">
                  Pick a tool from the left rail. Every edit stacks on the previous one — undo any
                  time, then download once when you&apos;re happy.
                </p>
              </section>
            )}

            {/* ---- export ---- */}
            <section className="studio-card">
              <h3 className="studio-card-title">Export</h3>
              <div className="field">
                <span className="field-label">Format</span>
                <select value={fmtKey} onChange={(e) => setFmtKey(e.target.value)}>
                  {EXPORT_FORMATS.filter((f) => f.key !== "avif" || avifOk).map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
              {fmt.lossy && (
                <>
                  <label className="studio-slider-label">
                    Quality <span>{quality}%</span>
                  </label>
                  <Slider
                    value={[quality]}
                    min={10}
                    max={100}
                    step={1}
                    onValueChange={(v) => setQuality(Array.isArray(v) ? v[0] : v)}
                  />
                </>
              )}
              <p className="studio-readout">
                {estimate != null
                  ? `≈ ${formatBytes(estimate)} (${formatBytes(file.size)} original)`
                  : "Estimating size…"}
              </p>
              <Button className="w-full" onClick={() => void download()} disabled={downloading}>
                <LuDownload />
                {downloading ? "Saving…" : `Download ${fmt.ext}`}
              </Button>
            </section>

            {/* ---- history ---- */}
            {history.length > 1 && (
              <section className="studio-card">
                <h3 className="studio-card-title">History</h3>
                <ol className="studio-history">
                  {history.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className={`studio-step${i === index ? " is-current" : ""}`}
                        onClick={() => {
                          setIndex(i);
                          setTool(null);
                          resetToolState();
                        }}
                      >
                        {i === 0 ? "Original" : `${i}. ${s.label}`}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      </div>

      {svgModalOpen && (
        <SvgSettingsModal
          initial={svgPref.value}
          onSave={(settings) => {
            svgPref.save(settings);
            setSvgModalOpen(false);
          }}
          onClose={() => setSvgModalOpen(false)}
        />
      )}
    </div>
  );
}
