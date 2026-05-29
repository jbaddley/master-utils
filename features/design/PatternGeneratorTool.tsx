"use client";

import { useState, useCallback } from "react";
import { LuDownload } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/CopyButton";

// ─── Pattern generators ───────────────────────────────────────────────────────

type PatternFn = (c1: string, c2: string, size: number, rotation: number) => string;

function escapeColor(color: string): string {
  return color.replace(/#/g, "%23");
}

const patterns: Record<string, { label: string; fn: PatternFn }> = {
  stripes: {
    label: "Diagonal Stripes",
    fn: (c1, c2, size, rotation) => {
      const half = size / 2;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${c2}"/><line x1="0" y1="${half}" x2="${size}" y2="${half}" stroke="${c1}" stroke-width="${half}" transform="rotate(${rotation} ${size / 2} ${size / 2})"/></svg>`;
    },
  },
  dots: {
    label: "Dots / Polka Dots",
    fn: (c1, c2, size) => {
      const r = size * 0.22;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${c2}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${c1}"/></svg>`;
    },
  },
  grid: {
    label: "Grid / Graph Paper",
    fn: (c1, c2, size) => {
      const sw = Math.max(1, size * 0.05);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${c2}"/><rect x="0" y="0" width="${size}" height="${sw}" fill="${c1}"/><rect x="0" y="0" width="${sw}" height="${size}" fill="${c1}"/></svg>`;
    },
  },
  checkerboard: {
    label: "Checkerboard",
    fn: (c1, c2, size) => {
      const half = size / 2;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${c2}"/><rect x="0" y="0" width="${half}" height="${half}" fill="${c1}"/><rect x="${half}" y="${half}" width="${half}" height="${half}" fill="${c1}"/></svg>`;
    },
  },
  herringbone: {
    label: "Herringbone / Zigzag",
    fn: (c1, c2, size, rotation) => {
      const h = size;
      const w = size;
      const q = h / 4;
      const points1 = `0,${q} ${w / 2},0 ${w / 2},${q} 0,${q * 2}`;
      const points2 = `${w / 2},${q * 2} ${w},${q} ${w},${q * 2} ${w / 2},${q * 3}`;
      const sw = Math.max(1, size * 0.12);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${c2}"/><g transform="rotate(${rotation} ${w / 2} ${h / 2})"><polyline points="${points1}" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linejoin="miter"/><polyline points="${points2}" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linejoin="miter"/></g></svg>`;
    },
  },
  hexagons: {
    label: "Hexagons",
    fn: (c1, c2, size) => {
      const r = size / 2;
      const h = r * Math.sqrt(3);
      const w = r * 2;
      const sw = Math.max(1, size * 0.07);
      // Pointy-top hexagon
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 30);
        return `${r + r * 0.85 * Math.cos(angle)},${r + r * 0.85 * Math.sin(angle)}`;
      }).join(" ");
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${c2}"/><polygon points="${pts}" fill="none" stroke="${c1}" stroke-width="${sw}"/></svg>`;
    },
  },
};

const PATTERN_KEYS = Object.keys(patterns) as Array<keyof typeof patterns>;

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatternGeneratorTool() {
  const [patternKey, setPatternKey] = useState<string>("stripes");
  const [color1, setColor1] = useState("#2f6bff");
  const [color2, setColor2] = useState("#0f1115");
  const [size, setSize] = useState(40);
  const [rotation, setRotation] = useState(45);

  const getSvg = useCallback((): string => {
    const { fn } = patterns[patternKey];
    return fn(color1, color2, size, rotation);
  }, [patternKey, color1, color2, size, rotation]);

  const getCss = useCallback((): string => {
    const svg = getSvg();
    const encoded = encodeURIComponent(svg);
    return `background-image: url("data:image/svg+xml,${encoded}");\nbackground-size: ${size}px ${size}px;`;
  }, [getSvg, size]);

  const downloadSvg = () => {
    const svg = getSvg();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pattern-${patternKey}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const svgStr = getSvg();
  const encodedSvg = encodeURIComponent(svgStr);

  return (
    <div className="tool-ui">
      {/* Controls */}
      <div className="settings mb-6">
        {/* Pattern selector */}
        <div className="field">
          <span className="field-label">Pattern</span>
          <select
            value={patternKey}
            onChange={(e) => setPatternKey(e.target.value)}
          >
            {PATTERN_KEYS.map((k) => (
              <option key={k} value={k}>
                {patterns[k].label}
              </option>
            ))}
          </select>
        </div>

        {/* Primary color */}
        <div className="field">
          <span className="field-label">Primary Color</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={color1}
              onChange={(e) => setColor1(e.target.value)}
              style={{ width: "36px", height: "36px", border: "none", background: "none", cursor: "pointer", padding: 0 }}
            />
            <input
              type="text"
              value={color1}
              onChange={(e) => setColor1(e.target.value)}
              maxLength={7}
              className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        {/* Background color */}
        <div className="field">
          <span className="field-label">Background Color</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={color2}
              onChange={(e) => setColor2(e.target.value)}
              style={{ width: "36px", height: "36px", border: "none", background: "none", cursor: "pointer", padding: 0 }}
            />
            <input
              type="text"
              value={color2}
              onChange={(e) => setColor2(e.target.value)}
              maxLength={7}
              className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        {/* Size slider */}
        <div className="field">
          <span className="field-label">Size / Scale — {size}px</span>
          <div className="palette-slider">
            <Slider
              min={8}
              max={128}
              value={[size]}
              onValueChange={(v) => setSize(Array.isArray(v) ? v[0] : v)}
            />
          </div>
        </div>

        {/* Rotation slider — only for patterns where rotation is meaningful */}
        {(patternKey === "stripes" || patternKey === "herringbone") && (
          <div className="field">
            <span className="field-label">Rotation — {rotation}°</span>
            <div className="palette-slider">
              <Slider
                min={0}
                max={180}
                value={[rotation]}
                onValueChange={(v) => setRotation(Array.isArray(v) ? v[0] : v)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div
        style={{
          width: "100%",
          height: "300px",
          backgroundImage: `url("data:image/svg+xml,${encodedSvg}")`,
          backgroundSize: `${size}px ${size}px`,
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          marginBottom: "1.25rem",
        }}
        aria-label="Pattern preview"
      />

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2.5">
        <CopyButton getText={getCss} label="Copy CSS" />
        <CopyButton getText={getSvg} label="Copy SVG" />
        <Button type="button" variant="outline" onClick={downloadSvg}>
          <LuDownload /> Download SVG tile
        </Button>
      </div>

      {/* CSS output */}
      <div className="mt-4">
        <p className="field-label mb-1">CSS Output</p>
        <pre className="code-output code-output--wrap">{getCss()}</pre>
      </div>
    </div>
  );
}
