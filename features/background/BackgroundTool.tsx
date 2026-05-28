"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { imageToImageData, canvasToBlob } from "@/lib/image";
import { removeBackground } from "@/lib/background";
import { saveAs } from "@/lib/download";

type FillType = "transparent" | "color" | "gradient";
type GradientDir = "horizontal" | "vertical" | "diagonal";

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
    // gradient
    let grad: CanvasGradient;
    if (gradientDir === "horizontal") {
      grad = ctx.createLinearGradient(0, 0, c.width, 0);
    } else if (gradientDir === "vertical") {
      grad = ctx.createLinearGradient(0, 0, 0, c.height);
    } else {
      // diagonal
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
  const [result, setResult] = useState<ImageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [fillType, setFillType] = useState<FillType>("transparent");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [gradientFrom, setGradientFrom] = useState("#ffffff");
  const [gradientTo, setGradientTo] = useState("#f0f0f0");
  const [gradientDir, setGradientDir] = useState<GradientDir>("vertical");

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

  // Paint the composite result to the preview canvas.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !result) return;
    const composite = compositeResult(result, fillType, fillColor, gradientFrom, gradientTo, gradientDir);
    cv.width = composite.width;
    cv.height = composite.height;
    cv.getContext("2d")?.drawImage(composite, 0, 0);
  }, [result, fillType, fillColor, gradientFrom, gradientTo, gradientDir]);

  const onDownload = () => {
    if (!loaded || !result) return;
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-no-bg.png`,
      description: "PNG image",
      mime: "image/png",
      ext: ".png",
      getBlob: () => {
        const c = compositeResult(result, fillType, fillColor, gradientFrom, gradientTo, gradientDir);
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
            <Button disabled={!result} onClick={onDownload}>
              <LuDownload />
              Download PNG
            </Button>
          </div>

          <section className="card settings">
            <div className="field" style={{ flex: "1 1 280px" }}>
              <span className="field-label">Tolerance: {tolerance}</span>
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
              Works on solid / near-solid backgrounds. Raise the tolerance to
              remove soft edges; lower it to protect detail.
            </p>

            <div className="field" style={{ flex: "1 1 100%", marginTop: "0.75rem" }}>
              <span className="field-label">Background</span>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <Button
                  variant={fillType === "transparent" ? "default" : "outline"}
                  onClick={() => setFillType("transparent")}
                >
                  Transparent
                </Button>
                <Button
                  variant={fillType === "color" ? "default" : "outline"}
                  onClick={() => setFillType("color")}
                >
                  Color
                </Button>
                <Button
                  variant={fillType === "gradient" ? "default" : "outline"}
                  onClick={() => setFillType("gradient")}
                >
                  Gradient
                </Button>

                {fillType === "color" && (
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    style={{ width: "2.5rem", height: "2.5rem", cursor: "pointer", border: "none", padding: 0, background: "none" }}
                    title="Fill color"
                  />
                )}

                {fillType === "gradient" && (
                  <>
                    <input
                      type="color"
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      style={{ width: "2.5rem", height: "2.5rem", cursor: "pointer", border: "none", padding: 0, background: "none" }}
                      title="Gradient from"
                    />
                    <input
                      type="color"
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      style={{ width: "2.5rem", height: "2.5rem", cursor: "pointer", border: "none", padding: 0, background: "none" }}
                      title="Gradient to"
                    />
                    <select
                      value={gradientDir}
                      onChange={(e) => setGradientDir(e.target.value as GradientDir)}
                      style={{ padding: "0.25rem 0.5rem", borderRadius: "0.375rem", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                      <option value="diagonal">Diagonal</option>
                    </select>
                  </>
                )}
              </div>
            </div>
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
                <span className="meta">
                  {fillType === "transparent" ? "transparent PNG" : fillType === "color" ? "solid fill" : `${gradientDir} gradient`}
                </span>
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
