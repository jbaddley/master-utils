"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload, LuLink, LuLink2Off } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import { saveAs } from "@/lib/download";

type Fmt = "image/png" | "image/jpeg" | "image/webp";
const EXT: Record<Fmt, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export default function ResizeTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [lock, setLock] = useState(true);
  const [fmt, setFmt] = useState<Fmt>("image/png");
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastUrl = useRef<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const img = await loadImageFile(file);
      setLoaded((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return img;
      });
      setW(img.width);
      setH(img.height);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  const setWidth = (val: number) => {
    setW(val);
    if (lock && loaded) setH(Math.max(1, Math.round((val * loaded.height) / loaded.width)));
  };
  const setHeight = (val: number) => {
    setH(val);
    if (lock && loaded) setW(Math.max(1, Math.round((val * loaded.width) / loaded.height)));
  };
  const scale = (pct: number) => {
    if (!loaded) return;
    setW(Math.max(1, Math.round((loaded.width * pct) / 100)));
    setH(Math.max(1, Math.round((loaded.height * pct) / 100)));
  };

  const encode = (l: LoadedImage) => {
    const canvas = drawToCanvas(
      l.img,
      Math.max(1, w),
      Math.max(1, h),
      isOpaqueFormat(fmt) ? "#ffffff" : undefined,
    );
    return canvasToBlob(canvas, fmt, fmt === "image/png" ? undefined : 0.92);
  };

  useEffect(() => {
    if (!loaded || w < 1 || h < 1) {
      setResult(null);
      return;
    }
    let cancelled = false;
    encode(loaded).then((blob) => {
      if (cancelled) return;
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      const url = URL.createObjectURL(blob);
      lastUrl.current = url;
      setResult({ url, size: blob.size });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, w, h, fmt]);

  const onDownload = () => {
    if (!loaded) return;
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-${w}x${h}${EXT[fmt]}`,
      description: "Image",
      mime: fmt,
      ext: EXT[fmt],
      getBlob: () => encode(loaded),
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!loaded ? (
        <Dropzone onFile={onFile} onError={setError} />
      ) : (
        <>
          <div className="toolbar">
            <ChangeImageButton onFile={onFile} />
            <div className="toolbar-spacer" />
            <button className="btn btn-primary" disabled={!result} onClick={onDownload}>
              <LuDownload />
              Download
            </button>
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Width (px)</span>
              <input
                type="number"
                min={1}
                value={w}
                onChange={(e) => setWidth(Math.max(1, Math.round(Number(e.target.value))))}
              />
            </label>
            <label className="field">
              <span className="field-label">Height (px)</span>
              <input
                type="number"
                min={1}
                value={h}
                onChange={(e) => setHeight(Math.max(1, Math.round(Number(e.target.value))))}
              />
            </label>
            <div className="field">
              <span className="field-label">Aspect</span>
              <button
                className={`btn ${lock ? "toggle on" : "toggle"}`}
                onClick={() => setLock((v) => !v)}
                title="Lock the width-to-height ratio"
              >
                {lock ? <LuLink /> : <LuLink2Off />}
                {lock ? "Locked" : "Free"}
              </button>
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
              <span className="field-label">Scale</span>
              <div className="row">
                {[25, 50, 75].map((p) => (
                  <button key={p} className="btn sm" onClick={() => scale(p)}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="duo">
            <div className="pane">
              <div className="panel-head">
                <span className="tag">Original</span>
                <span className="meta">
                  {loaded.width}×{loaded.height} · {formatBytes(loaded.bytes)}
                </span>
              </div>
              <div className="canvas checker">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={loaded.url} alt="Original" />
              </div>
            </div>
            <div className="pane">
              <div className="panel-head">
                <span className="tag">Resized</span>
                <span className="meta">
                  {result ? `${w}×${h} · ${formatBytes(result.size)}` : "…"}
                </span>
              </div>
              <div className="canvas checker">
                {result ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.url} alt="Resized" />
                ) : (
                  <div className="placeholder">Resizing…</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
