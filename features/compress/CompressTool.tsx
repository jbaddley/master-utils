"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import { saveAs } from "@/lib/download";

type Fmt = "image/jpeg" | "image/webp" | "image/png";
const FMT_EXT: Record<Fmt, string> = {
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/png": ".png",
};
const FMT_LABEL: Record<Fmt, string> = {
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/png": "PNG",
};

export default function CompressTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [fmt, setFmt] = useState<Fmt>("image/webp");
  const [quality, setQuality] = useState(0.7);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  const encode = (l: LoadedImage) => {
    const lossy = fmt !== "image/png";
    const canvas = drawToCanvas(
      l.img,
      l.width,
      l.height,
      isOpaqueFormat(fmt) ? "#ffffff" : undefined,
    );
    return canvasToBlob(canvas, fmt, lossy ? quality : undefined);
  };

  useEffect(() => {
    if (!loaded) {
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
  }, [loaded, fmt, quality]);

  const onDownload = () => {
    if (!loaded) return;
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-compressed${FMT_EXT[fmt]}`,
      description: `${FMT_LABEL[fmt]} image`,
      mime: fmt,
      ext: FMT_EXT[fmt],
      getBlob: () => encode(loaded),
    });
  };

  const pct =
    loaded && result ? Math.round((1 - result.size / loaded.bytes) * 100) : 0;

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
              <span className="field-label">Output format</span>
              <select value={fmt} onChange={(e) => setFmt(e.target.value as Fmt)}>
                <option value="image/webp">WebP — best compression</option>
                <option value="image/jpeg">JPEG — photos</option>
                <option value="image/png">PNG — lossless</option>
              </select>
            </label>
            {fmt !== "image/png" && (
              <label className="field">
                <span className="field-label">Quality: {Math.round(quality * 100)}%</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
              </label>
            )}
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
                <span className="tag">Compressed</span>
                <span className="meta">
                  {result ? (
                    <>
                      {formatBytes(result.size)} ·{" "}
                      <span className={pct >= 0 ? "savings" : "bigger"}>
                        {pct >= 0 ? `−${pct}%` : `+${-pct}%`}
                      </span>
                    </>
                  ) : (
                    "…"
                  )}
                </span>
              </div>
              <div className="canvas checker">
                {result ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.url} alt="Compressed" />
                ) : (
                  <div className="placeholder">Encoding…</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
