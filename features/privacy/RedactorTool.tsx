"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { LuDownload, LuRotateCcw, LuUndo2, LuZoomIn, LuZoomOut } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { canvasToBlob } from "@/lib/image";
import { saveAs } from "@/lib/download";

type Box = { x: number; y: number; w: number; h: number };
type RedactStyle = "black" | "pixelate";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function applyRedaction(
  ctx: CanvasRenderingContext2D,
  box: Box,
  style: RedactStyle,
  source: HTMLCanvasElement,
) {
  const x = Math.round(box.x);
  const y = Math.round(box.y);
  const w = Math.max(1, Math.round(box.w));
  const h = Math.max(1, Math.round(box.h));

  if (style === "black") {
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y, w, h);
    return;
  }

  const block = 14;
  const tmp = document.createElement("canvas");
  tmp.width = Math.max(1, Math.floor(w / block));
  tmp.height = Math.max(1, Math.floor(h / block));
  const tctx = tmp.getContext("2d");
  if (!tctx) return;
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(source, x, y, w, h, 0, 0, tmp.width, tmp.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}

export default function RedactorTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [redactions, setRedactions] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [style, setStyle] = useState<RedactStyle>("black");
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number } | null>(null);

  const redraw = useCallback(() => {
    const src = sourceRef.current;
    const canvas = canvasRef.current;
    if (!src || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0);
    for (const box of redactions) applyRedaction(ctx, box, style, src);
    if (draft) applyRedaction(ctx, draft, style, src);
  }, [redactions, draft, style]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const onFile = async (file: File) => {
    setError(null);
    setRedactions([]);
    setDraft(null);
    try {
      const img = await loadImageFile(file);
      const src = document.createElement("canvas");
      src.width = img.width;
      src.height = img.height;
      src.getContext("2d")?.drawImage(img.img, 0, 0);
      sourceRef.current = src;
      setLoaded((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return img;
      });
      setZoom(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load image.");
    }
  };

  useEffect(() => {
    if (!loaded || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = loaded.width;
    canvas.height = loaded.height;
    redraw();
  }, [loaded, redraw]);

  const toImageCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x: clamp(x, 0, canvas.width), y: clamp(y, 0, canvas.height) };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!loaded) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    dragRef.current = { sx: x, sy: y };
    setDraft({ x, y, w: 0, h: 0 });
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    const { sx, sy } = dragRef.current;
    setDraft({
      x: Math.min(sx, x),
      y: Math.min(sy, y),
      w: Math.abs(x - sx),
      h: Math.abs(y - sy),
    });
  };

  const onPointerUp = () => {
    if (!dragRef.current || !draft || draft.w < 4 || draft.h < 4) {
      dragRef.current = null;
      setDraft(null);
      return;
    }
    setRedactions((prev) => [...prev, draft]);
    dragRef.current = null;
    setDraft(null);
  };

  const undo = () => setRedactions((prev) => prev.slice(0, -1));
  const clearAll = () => setRedactions([]);

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    redraw();
    const blob = await canvasToBlob(canvas, "image/png");
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-redacted.png`,
      description: "PNG image",
      mime: "image/png",
      ext: ".png",
      getBlob: () => blob,
      toolName: "redact-image",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!loaded ? (
        <Dropzone label="Drop an image to redact sensitive areas" onFile={(f) => void onFile(f)} onError={setError} />
      ) : (
        <>
          <div className="editbar">
            <span className="field-label">Style</span>
            <Button variant={style === "black" ? "default" : "secondary"} size="sm" onClick={() => setStyle("black")}>
              Solid black
            </Button>
            <Button
              variant={style === "pixelate" ? "default" : "secondary"}
              size="sm"
              onClick={() => setStyle("pixelate")}
            >
              Pixelate
            </Button>
            <span className="toolbar-spacer" />
            <Button variant="outline" size="sm" onClick={undo} disabled={redactions.length === 0}>
              <LuUndo2 /> Undo
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} disabled={redactions.length === 0}>
              <LuRotateCcw /> Clear all
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => clamp(z - 0.25, MIN_ZOOM, MAX_ZOOM))}>
              <LuZoomOut />
            </Button>
            <span className="muted-text">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => clamp(z + 0.25, MIN_ZOOM, MAX_ZOOM))}>
              <LuZoomIn />
            </Button>
            <ChangeImageButton onFile={(f) => void onFile(f)} />
            <Button onClick={() => void download()}>
              <LuDownload /> Download PNG
            </Button>
          </div>

          <p className="muted-text">Click and drag on the image to draw a redaction box.</p>

          <div className="canvas-wrap" ref={wrapRef} style={{ overflow: "auto", maxHeight: "70vh" }}>
            <canvas
              ref={canvasRef}
              className="canvas"
              style={{
                width: loaded.width * zoom,
                height: loaded.height * zoom,
                cursor: "crosshair",
                touchAction: "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        </>
      )}
    </div>
  );
}
