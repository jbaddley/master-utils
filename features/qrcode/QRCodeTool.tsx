"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LuDownload } from "react-icons/lu";
import QRCode from "qrcode";
import type { QRCodeErrorCorrectionLevel } from "qrcode";
import { Button } from "@/components/ui/button";

type Size = 128 | 256 | 512;
type ECLevel = "L" | "M" | "Q" | "H";

export default function QRCodeTool() {
  const [text, setText] = useState("https://example.com");
  const [size, setSize] = useState<Size>(256);
  const [ecLevel, setEcLevel] = useState<ECLevel>("M");
  const [darkColor, setDarkColor] = useState("#000000");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderQR = useCallback(
    (value: string, width: Size, level: ECLevel, dark: string, light: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!value.trim()) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setError(null);
        return;
      }
      QRCode.toCanvas(canvas, value, {
        width,
        errorCorrectionLevel: level as QRCodeErrorCorrectionLevel,
        margin: 2,
        color: { dark, light },
      })
        .then(() => setError(null))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to generate QR code.");
        });
    },
    [],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      renderQR(text, size, ecLevel, darkColor, lightColor);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, size, ecLevel, darkColor, lightColor, renderQR]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qrcode.png";
    a.click();
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <section className="card settings">
        <label className="field" style={{ flex: "2 1 300px" }}>
          <span className="field-label">URL or text</span>
          <input
            type="text"
            className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground"
            placeholder="https://example.com"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Size</span>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value) as Size)}
          >
            <option value={128}>128 × 128 px</option>
            <option value={256}>256 × 256 px</option>
            <option value={512}>512 × 512 px</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Error correction</span>
          <select
            value={ecLevel}
            onChange={(e) => setEcLevel(e.target.value as ECLevel)}
          >
            <option value="L">L — Low (7%)</option>
            <option value="M">M — Medium (15%)</option>
            <option value="Q">Q — Quartile (25%)</option>
            <option value="H">H — High (30%)</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">QR color</span>
          <input
            type="color"
            value={darkColor}
            onChange={(e) => setDarkColor(e.target.value)}
            style={{ width: "2.5rem", height: "2.25rem", cursor: "pointer", borderRadius: "0.375rem", border: "1px solid var(--border)", padding: "0.125rem" }}
          />
        </label>

        <label className="field">
          <span className="field-label">Background color</span>
          <input
            type="color"
            value={lightColor}
            onChange={(e) => setLightColor(e.target.value)}
            style={{ width: "2.5rem", height: "2.25rem", cursor: "pointer", borderRadius: "0.375rem", border: "1px solid var(--border)", padding: "0.125rem" }}
          />
        </label>
      </section>

      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-xl border border-border"
          style={{ maxWidth: "100%", height: "auto" }}
        />

        <Button onClick={handleDownload} disabled={!text.trim()}>
          <LuDownload />
          Download PNG
        </Button>
      </div>
    </div>
  );
}
