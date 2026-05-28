"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { imageToImageData, canvasToBlob } from "@/lib/image";
import { removeBackground } from "@/lib/background";
import { saveAs } from "@/lib/download";

export default function BackgroundTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const baseRef = useRef<ImageData | null>(null);
  const [tolerance, setTolerance] = useState(40);
  const [result, setResult] = useState<ImageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const img = await loadImageFile(file);
      baseRef.current = imageToImageData(img.img);
      setLoaded((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return img;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  // Recompute the cut-out whenever the image or tolerance changes.
  useEffect(() => {
    if (!baseRef.current) {
      setResult(null);
      return;
    }
    setResult(removeBackground(baseRef.current, tolerance));
  }, [loaded, tolerance]);

  // Paint the result to the preview canvas.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !result) return;
    cv.width = result.width;
    cv.height = result.height;
    cv.getContext("2d")?.putImageData(result, 0, 0);
  }, [result]);

  const onDownload = () => {
    if (!loaded || !result) return;
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-no-bg.png`,
      description: "PNG image",
      mime: "image/png",
      ext: ".png",
      getBlob: () => {
        const c = document.createElement("canvas");
        c.width = result.width;
        c.height = result.height;
        c.getContext("2d")?.putImageData(result, 0, 0);
        return canvasToBlob(c, "image/png");
      },
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
              Download PNG
            </button>
          </div>

          <section className="card settings">
            <label className="field" style={{ flex: "1 1 280px" }}>
              <span className="field-label">Tolerance: {tolerance}</span>
              <input
                type="range"
                min={0}
                max={128}
                step={4}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
              />
            </label>
            <p className="palette-hint" style={{ alignSelf: "center", flex: "1 1 240px" }}>
              Works on solid / near-solid backgrounds. Raise the tolerance to
              remove soft edges; lower it to protect detail.
            </p>
          </section>

          <div className="duo">
            <div className="pane">
              <div className="panel-head">
                <span className="tag">Original</span>
                <span className="meta">
                  {loaded.width}×{loaded.height}
                </span>
              </div>
              <div className="canvas checker">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={loaded.url} alt="Original" />
              </div>
            </div>
            <div className="pane">
              <div className="panel-head">
                <span className="tag">Background removed</span>
                <span className="meta">transparent PNG</span>
              </div>
              <div className="canvas checker">
                <canvas ref={canvasRef} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
