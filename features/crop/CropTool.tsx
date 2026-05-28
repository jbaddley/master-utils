"use client";

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { LuDownload, LuCheck, LuRotateCcw } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { imageToImageData, canvasToBlob } from "@/lib/image";
import { cropImageData } from "@/lib/crop";
import { formatBytes } from "@/lib/format";
import { saveAs } from "@/lib/download";

type Box = { x: number; y: number; w: number; h: number };

const ASPECTS: { label: string; ratio: number | null }[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "16:9", ratio: 16 / 9 },
];

export default function CropTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [sourceData, setSourceData] = useState<ImageData | null>(null);
  const baseRef = useRef<ImageData | null>(null);
  const [cropBox, setCropBox] = useState<Box | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: string;
    startX: number;
    startY: number;
    startBox: Box;
    wrapW: number;
    wrapH: number;
  } | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  // Mirror working image to the canvas.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !sourceData) return;
    cv.width = sourceData.width;
    cv.height = sourceData.height;
    cv.getContext("2d")?.putImageData(sourceData, 0, 0);
  }, [sourceData]);

  const applyAspect = (ratio: number | null) => {
    if (!sourceData || ratio === null) {
      setCropBox({ x: 0, y: 0, w: 1, h: 1 });
      return;
    }
    const W = sourceData.width;
    const H = sourceData.height;
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
  };

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
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

  const endDrag = useCallback(() => {
    dragRef.current = null;
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
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", endDrag);
    },
    [cropBox, onDragMove, endDrag],
  );

  const boxPx = useCallback(() => {
    if (!cropBox || !sourceData) return null;
    const W = sourceData.width;
    const H = sourceData.height;
    const x = Math.max(0, Math.round(cropBox.x * W));
    const y = Math.max(0, Math.round(cropBox.y * H));
    const w = Math.min(W - x, Math.max(1, Math.round(cropBox.w * W)));
    const h = Math.min(H - y, Math.max(1, Math.round(cropBox.h * H)));
    return { x, y, w, h };
  }, [cropBox, sourceData]);

  const applyCrop = useCallback(() => {
    if (!sourceData) return;
    const r = boxPx();
    if (!r || (r.w >= sourceData.width && r.h >= sourceData.height)) return;
    setSourceData(cropImageData(sourceData, r.x, r.y, r.w, r.h));
    setCropBox({ x: 0, y: 0, w: 1, h: 1 });
  }, [sourceData, boxPx]);

  const reset = () => {
    if (baseRef.current) {
      setSourceData(baseRef.current);
      setCropBox({ x: 0, y: 0, w: 1, h: 1 });
    }
  };

  const onDownload = () => {
    if (!sourceData || !loaded) return;
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-cropped.png`,
      description: "PNG image",
      mime: "image/png",
      ext: ".png",
      getBlob: () => {
        const c = document.createElement("canvas");
        c.width = sourceData.width;
        c.height = sourceData.height;
        c.getContext("2d")?.putImageData(sourceData, 0, 0);
        return canvasToBlob(c, "image/png");
      },
    });
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
            <Button variant="outline" onClick={applyCrop}>
              <LuCheck />
              Apply crop
            </Button>
            <Button onClick={onDownload}>
              <LuDownload />
              Download
            </Button>
          </div>

          <section className="card settings">
            <div className="field">
              <span className="field-label">Aspect ratio</span>
              <div className="row">
                {ASPECTS.map((a) => (
                  <Button key={a.label} variant="outline" size="sm" onClick={() => applyAspect(a.ratio)}>
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <div className="pane">
            <div className="panel-head">
              <span className="tag">Crop</span>
              <span className="meta">
                {sourceData.width}×{sourceData.height}
                {selPx ? ` · selection ${selPx.w}×${selPx.h}` : ""}
              </span>
            </div>
            <div className="canvas checker">
              <div className="canvas-wrap" ref={wrapRef}>
                <canvas ref={canvasRef} className="pickable" />
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
                    title="Drag to move · drag a handle to resize · double-click to crop"
                  >
                    {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((hd) => (
                      <span
                        key={hd}
                        className={`crop-handle ${hd}`}
                        onPointerDown={(e) => startDrag(hd, e)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
