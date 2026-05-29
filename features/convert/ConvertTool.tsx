"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import { saveAs } from "@/lib/download";
import {
  IMAGE_INPUT_FORMATS,
  IMAGE_OUTPUT_BY_INPUT,
  IMAGE_LABEL,
} from "@/lib/media-conversions";

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};
const IMAGE_EXT: Record<string, string> = {
  png: ".png",
  jpg: ".jpg",
  webp: ".webp",
  avif: ".avif",
};

function extOf(filename: string): string {
  const m = filename.match(/\.([a-z0-9]+)$/i);
  return m ? m[1]!.toLowerCase() : "";
}

function normalizeImageExt(ext: string): string {
  if (ext === "jpeg") return "jpg";
  return ext;
}

export default function ConvertTool({
  initialFrom = "png",
  initialTo = "jpg",
}: {
  initialFrom?: string;
  initialTo?: string;
}) {
  const [fromKey, setFromKey] = useState(initialFrom);
  const [toKey, setToKey] = useState(initialTo);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastUrl = useRef<string | null>(null);

  const allowedOutputs = IMAGE_OUTPUT_BY_INPUT[fromKey] ?? IMAGE_OUTPUT_BY_INPUT.png!;
  const toMime = IMAGE_MIME[toKey] ?? "image/jpeg";
  const toLabel = IMAGE_LABEL[toKey] ?? toKey.toUpperCase();
  const toExt = IMAGE_EXT[toKey] ?? ".jpg";
  const lossy = toMime === "image/jpeg" || toMime === "image/webp";

  useEffect(() => {
    if (!allowedOutputs.includes(toKey)) {
      setToKey(allowedOutputs[0] ?? "jpg");
    }
  }, [fromKey, allowedOutputs, toKey]);

  useEffect(() => {
    setFromKey(initialFrom);
    setToKey(initialTo);
  }, [initialFrom, initialTo]);

  const onFile = async (file: File) => {
    setError(null);
    const detected = normalizeImageExt(extOf(file.name));
    if (detected && IMAGE_OUTPUT_BY_INPUT[detected]) {
      setFromKey(detected === "jpeg" ? "jpg" : detected);
      const outs = IMAGE_OUTPUT_BY_INPUT[detected]!;
      if (!outs.includes(toKey)) setToKey(outs[0]!);
    }
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

      <section className="card settings">
        <div className="duo">
          <label className="field">
            <span className="field-label">Input format</span>
            <select
              value={fromKey}
              onChange={(e) => {
                setFromKey(e.target.value);
                setLoaded(null);
                setResult(null);
              }}
            >
              {IMAGE_INPUT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {IMAGE_LABEL[f] ?? f.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Output format</span>
            <select
              value={toKey}
              onChange={(e) => {
                setToKey(e.target.value);
                setResult(null);
              }}
            >
              {allowedOutputs.map((f) => (
                <option key={f} value={f}>
                  {IMAGE_LABEL[f] ?? f.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!loaded ? (
        <Dropzone
          onFile={onFile}
          onError={setError}
          label={`Drop a ${IMAGE_LABEL[fromKey] ?? fromKey} image`}
        />
      ) : (
        <>
          <div className="toolbar">
            <ChangeImageButton onFile={onFile} />
            <div className="toolbar-spacer" />
            <Button disabled={!result} onClick={onDownload}>
              <LuDownload />
              Download {toLabel}
            </Button>
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
