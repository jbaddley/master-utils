"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import { saveAs } from "@/lib/download";

export default function ConvertTool({
  toMime,
  toLabel,
  toExt,
}: {
  toMime: string;
  toLabel: string;
  toExt: string;
}) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastUrl = useRef<string | null>(null);
  const lossy = toMime === "image/jpeg" || toMime === "image/webp";

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
    const canvas = drawToCanvas(
      l.img,
      l.width,
      l.height,
      isOpaqueFormat(toMime) ? "#ffffff" : undefined,
    );
    return canvasToBlob(canvas, toMime, lossy ? 0.92 : undefined);
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
  }, [loaded, toMime]);

  const onDownload = () => {
    if (!loaded) return;
    void saveAs({
      suggestedName: `${baseName(loaded.name)}${toExt}`,
      description: `${toLabel} image`,
      mime: toMime,
      ext: toExt,
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
              Download {toLabel}
            </button>
          </div>

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
                <span className="tag">{toLabel}</span>
                <span className="meta">{result ? formatBytes(result.size) : "…"}</span>
              </div>
              <div className="canvas checker">
                {result ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.url} alt={`Converted ${toLabel}`} />
                ) : (
                  <div className="placeholder">Converting…</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
