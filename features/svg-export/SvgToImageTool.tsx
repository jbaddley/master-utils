"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuDownload, LuCopy, LuLink, LuLink2Off } from "react-icons/lu";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import { saveAs } from "@/lib/download";

type Fmt = "image/png" | "image/jpeg" | "image/webp" | "image/avif";
type Scale = 1 | 2 | 4 | "custom";

const FMT_OPTIONS: { value: Fmt; label: string; ext: string }[] = [
  { value: "image/png",  label: "PNG",  ext: ".png"  },
  { value: "image/jpeg", label: "JPG",  ext: ".jpg"  },
  { value: "image/webp", label: "WebP", ext: ".webp" },
  { value: "image/avif", label: "AVIF", ext: ".avif" },
];

const SCALE_OPTIONS: { value: Scale; label: string }[] = [
  { value: 1,        label: "1×"     },
  { value: 2,        label: "2×"     },
  { value: 4,        label: "4×"     },
  { value: "custom", label: "Custom" },
];

/** Parse SVG width / height from text — falls back to viewBox, then to a safe default. */
function parseSvgDimensions(text: string): { w: number; h: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const root = doc.querySelector("svg");
  if (!root) return { w: 800, h: 600 };

  const wAttr = root.getAttribute("width");
  const hAttr = root.getAttribute("height");
  const vb    = root.getAttribute("viewBox");

  const pw = wAttr ? parseFloat(wAttr) : NaN;
  const ph = hAttr ? parseFloat(hAttr) : NaN;
  if (!isNaN(pw) && pw > 0 && !isNaN(ph) && ph > 0) return { w: pw, h: ph };

  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2]! > 0 && parts[3]! > 0) {
      return { w: parts[2]!, h: parts[3]! };
    }
  }

  return { w: 800, h: 600 };
}

/** Strip the directory and extension from a filename. */
function stem(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "").replace(/.*[/\\]/, "");
}

export default function SvgToImageTool() {
  const [file, setFile]           = useState<File | null>(null);
  const [svgUrl, setSvgUrl]       = useState<string | null>(null);
  const [naturalW, setNaturalW]   = useState(0);
  const [naturalH, setNaturalH]   = useState(0);
  const [outputName, setOutputName] = useState("image");
  const [fmt, setFmt]             = useState<Fmt>("image/png");
  const [scale, setScale]         = useState<Scale>(1);
  const [customW, setCustomW]     = useState(0);
  const [customH, setCustomH]     = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [quality, setQuality]     = useState(92); // 1–100 for UI; divide by 100 for canvas
  const [bgColor, setBgColor]     = useState("#ffffff");
  const [result, setResult]       = useState<{ url: string; size: number } | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [copiedB64, setCopiedB64] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const lastResultUrl = useRef<string | null>(null);

  // ── Load SVG ──────────────────────────────────────────────────────────────

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    try {
      const text = await f.text();
      const { w, h } = parseSvgDimensions(text);

      if (svgUrl) URL.revokeObjectURL(svgUrl);
      const url = URL.createObjectURL(f);

      setFile(f);
      setSvgUrl(url);
      setNaturalW(w);
      setNaturalH(h);
      setCustomW(w);
      setCustomH(h);
      setOutputName(stem(f.name) || "image");
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that SVG.");
    }
  }, [svgUrl]);

  // ── Encode ────────────────────────────────────────────────────────────────

  const outW = scale === "custom" ? customW : Math.round(naturalW * scale);
  const outH = scale === "custom" ? customH : Math.round(naturalH * scale);

  const needsQuality = fmt === "image/jpeg" || fmt === "image/webp";
  const needsBg      = isOpaqueFormat(fmt); // JPG always; others transparent

  const encode = useCallback(async (): Promise<Blob> => {
    if (!svgUrl || !outW || !outH) throw new Error("Nothing to render.");
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not render SVG — does it contain external resources?"));
      el.src = svgUrl;
    });
    const bg     = needsBg ? bgColor : undefined;
    const canvas = drawToCanvas(img, outW, outH, bg);
    const q      = needsQuality ? quality / 100 : undefined;
    return canvasToBlob(canvas, fmt, q);
  }, [svgUrl, outW, outH, fmt, needsBg, bgColor, needsQuality, quality]);

  // Re-render preview whenever format, scale, or file changes
  useEffect(() => {
    if (!svgUrl || !outW || !outH) { setResult(null); return; }
    let cancelled = false;
    setIsEncoding(true);
    encode().then((blob) => {
      if (cancelled) return;
      if (lastResultUrl.current) URL.revokeObjectURL(lastResultUrl.current);
      const url = URL.createObjectURL(blob);
      lastResultUrl.current = url;
      setResult({ url, size: blob.size });
      setIsEncoding(false);
    }).catch((e: unknown) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Render failed.");
        setIsEncoding(false);
      }
    });
    return () => { cancelled = true; };
  }, [svgUrl, outW, outH, fmt, quality, bgColor, encode]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (svgUrl) URL.revokeObjectURL(svgUrl);
    if (lastResultUrl.current) URL.revokeObjectURL(lastResultUrl.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Custom size helpers ───────────────────────────────────────────────────

  const aspect = naturalH > 0 ? naturalW / naturalH : 1;

  const setW = (val: number) => {
    const v = Math.max(1, Math.round(val));
    setCustomW(v);
    if (lockAspect) setCustomH(Math.max(1, Math.round(v / aspect)));
  };
  const setH = (val: number) => {
    const v = Math.max(1, Math.round(val));
    setCustomH(v);
    if (lockAspect) setCustomW(Math.max(1, Math.round(v * aspect)));
  };

  // ── Download & Copy ───────────────────────────────────────────────────────

  const fmtInfo = FMT_OPTIONS.find((f) => f.value === fmt) ?? FMT_OPTIONS[0]!;

  const onDownload = () => {
    void saveAs({
      suggestedName: `${outputName}${fmtInfo.ext}`,
      description: `${fmtInfo.label} image`,
      mime: fmt,
      ext: fmtInfo.ext,
      getBlob: encode,
    });
  };

  const copyBase64 = async () => {
    const blob = await encode();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    await navigator.clipboard.writeText(dataUrl);
    setCopiedB64(true);
    setTimeout(() => setCopiedB64(false), 2500);
  };

  const reset = () => {
    if (svgUrl) URL.revokeObjectURL(svgUrl);
    if (lastResultUrl.current) URL.revokeObjectURL(lastResultUrl.current);
    setFile(null);
    setSvgUrl(null);
    setResult(null);
    setError(null);
    lastResultUrl.current = null;
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!file ? (
        <FileDropzone
          label="Drop an SVG file here"
          accept=".svg,image/svg+xml"
          onFiles={(fs) => void onFiles(fs)}
          onError={setError}
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="toolbar">
            <Button variant="outline" onClick={reset}>
              Change file
            </Button>

            {/* Output filename */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "0 1 200px" }}>
              <Input
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                placeholder="filename"
                aria-label="Output filename"
                style={{ fontSize: "13px", height: "2rem" }}
              />
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                {fmtInfo.ext}
              </span>
            </div>

            <div className="toolbar-spacer" />
            <Button disabled={!result || isEncoding} onClick={onDownload}>
              <LuDownload />
              {isEncoding ? "Rendering…" : `Download ${fmtInfo.label}`}
            </Button>
          </div>

          {/* Settings */}
          <section className="card settings">
            <div className="field">
              <span className="field-label">Output format</span>
              <div className="row">
                {FMT_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    variant={fmt === o.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFmt(o.value)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Scale</span>
              <div className="row">
                {SCALE_OPTIONS.map((o) => (
                  <Button
                    key={String(o.value)}
                    variant={scale === o.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setScale(o.value);
                      if (o.value !== "custom") return;
                      setCustomW(naturalW);
                      setCustomH(naturalH);
                    }}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>

            {scale === "custom" && (
              <>
                <label className="field">
                  <span className="field-label">Width (px)</span>
                  <Input
                    type="number"
                    min={1}
                    max={16384}
                    value={customW}
                    onChange={(e) => setW(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Height (px)</span>
                  <Input
                    type="number"
                    min={1}
                    max={16384}
                    value={customH}
                    onChange={(e) => setH(Number(e.target.value))}
                  />
                </label>
                <div className="field">
                  <span className="field-label">Aspect ratio</span>
                  <Button
                    variant={lockAspect ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLockAspect((v) => !v)}
                  >
                    {lockAspect ? <LuLink /> : <LuLink2Off />}
                    {lockAspect ? "Locked" : "Free"}
                  </Button>
                </div>
              </>
            )}

            {needsQuality && (
              <div className="field">
                <span className="field-label">
                  Quality
                  <span style={{ marginLeft: "0.5rem", fontWeight: 400, color: "var(--muted-foreground)" }}>
                    {quality}%
                  </span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Slider
                    min={30}
                    max={100}
                    step={1}
                    value={[quality]}
                    onValueChange={(v) => setQuality(Array.isArray(v) ? (v[0] ?? quality) : v)}
                    style={{ flex: 1 }}
                  />
                  <Input
                    type="number"
                    min={30}
                    max={100}
                    value={quality}
                    onChange={(e) => setQuality(Math.min(100, Math.max(30, Number(e.target.value))))}
                    style={{ width: "4.5rem", fontSize: "13px", height: "2rem" }}
                  />
                </div>
              </div>
            )}

            {needsBg && (
              <div className="field">
                <span className="field-label">Background color</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{
                      width: "2rem",
                      height: "2rem",
                      padding: "0.15rem",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    aria-label="Background color picker"
                  />
                  <Input
                    value={bgColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      // accept partial hex while typing; apply only when valid
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBgColor(v);
                    }}
                    onBlur={(e) => {
                      // Pad to full hex on blur if needed
                      if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setBgColor("#ffffff");
                    }}
                    placeholder="#ffffff"
                    style={{ width: "6rem", fontSize: "13px", height: "2rem", fontFamily: "monospace" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    JPG has no transparency
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Preview panes */}
          <div className="duo">
            {/* Source SVG */}
            <div className="pane">
              <div className="panel-head">
                <span className="tag">Source SVG</span>
                <span className="meta">
                  {naturalW}×{naturalH} · {file.name}
                </span>
              </div>
              <div className="canvas checker">
                {svgUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={svgUrl} alt="SVG preview" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                )}
              </div>
            </div>

            {/* Converted output */}
            <div className="pane">
              <div className="panel-head">
                <span className="tag">{fmtInfo.label} Output</span>
                <span className="meta">
                  {result ? `${outW}×${outH} · ${formatBytes(result.size)}` : "…"}
                </span>
              </div>
              <div className="canvas checker">
                {result ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.url} alt="Converted output" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                ) : (
                  <div className="placeholder">{isEncoding ? "Rendering…" : "Select options above"}</div>
                )}
              </div>
              {result && (
                <div
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEncoding}
                    onClick={() => void copyBase64()}
                  >
                    <LuCopy />
                    {copiedB64 ? "Copied!" : "Copy as Base64"}
                  </Button>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    data:{fmt};base64,…
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
