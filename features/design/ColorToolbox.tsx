"use client";

import { useState, useCallback } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";

// ─── Color conversion helpers ────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
      )
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360;
  const sn = s / 100;
  const ln = l / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(hn + 1 / 3) * 255),
    Math.round(hue2rgb(hn) * 255),
    Math.round(hue2rgb(hn - 1 / 3) * 255),
  ];
}

// ─── WCAG contrast helpers ────────────────────────────────────────────────────

function linearize(c: number): number {
  const n = c / 255;
  return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function Badge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 text-sm"
      style={{ color: pass ? "#8ef0b5" : "#ffb3bb" }}
    >
      <span style={{ fontSize: "16px" }}>{pass ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Section A: HEX / RGB / HSL Converter ────────────────────────────────────

function ColorConverter() {
  const [hex, setHex] = useState("#2f6bff");
  const [rgb, setRgb] = useState<[number, number, number]>([47, 107, 255]);
  const [hsl, setHsl] = useState<[number, number, number]>([222, 100, 59]);

  const fromHex = useCallback((value: string) => {
    setHex(value);
    const parsed = hexToRgb(value);
    if (parsed) {
      setRgb(parsed);
      setHsl(rgbToHsl(...parsed));
    }
  }, []);

  const fromRgb = useCallback((r: number, g: number, b: number) => {
    const clamped: [number, number, number] = [
      Math.max(0, Math.min(255, r)),
      Math.max(0, Math.min(255, g)),
      Math.max(0, Math.min(255, b)),
    ];
    setRgb(clamped);
    setHex(rgbToHex(...clamped));
    setHsl(rgbToHsl(...clamped));
  }, []);

  const fromHsl = useCallback((h: number, s: number, l: number) => {
    const clamped: [number, number, number] = [
      Math.max(0, Math.min(360, h)),
      Math.max(0, Math.min(100, s)),
      Math.max(0, Math.min(100, l)),
    ];
    setHsl(clamped);
    const newRgb = hslToRgb(...clamped);
    setRgb(newRgb);
    setHex(rgbToHex(...newRgb));
  }, []);

  const hexStr = hex;
  const rgbStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const hslStr = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">HEX / RGB / HSL Converter</h2>

      {/* Color swatch */}
      <div
        style={{
          width: "100%",
          height: "80px",
          borderRadius: "var(--radius)",
          background: hexStr,
          border: "1px solid var(--border)",
          marginBottom: "1.25rem",
          transition: "background 0.15s",
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {/* HEX */}
        <div className="flex flex-col gap-1.5 flex-1">
          <span className="field-label">HEX</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={hexStr}
              onChange={(e) => fromHex(e.target.value)}
              style={{ width: "36px", height: "36px", border: "none", background: "none", cursor: "pointer", padding: 0 }}
              title="Pick color"
            />
            <input
              type="text"
              value={hexStr}
              onChange={(e) => fromHex(e.target.value)}
              maxLength={7}
              placeholder="#RRGGBB"
              className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <CopyButton getText={() => hexStr} label="Copy HEX" size="sm" />
        </div>

        {/* RGB */}
        <div className="flex flex-col gap-1.5 flex-1">
          <span className="field-label">RGB</span>
          <div className="flex gap-1.5">
            {(["R", "G", "B"] as const).map((ch, i) => (
              <div key={ch} className="flex flex-col gap-0.5 flex-1">
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{ch}</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[i]}
                  onChange={(e) => {
                    const vals: [number, number, number] = [...rgb] as [number, number, number];
                    vals[i] = Number(e.target.value);
                    fromRgb(...vals);
                  }}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            ))}
          </div>
          <CopyButton getText={() => rgbStr} label="Copy RGB" size="sm" />
        </div>

        {/* HSL */}
        <div className="flex flex-col gap-1.5 flex-1">
          <span className="field-label">HSL</span>
          <div className="flex gap-1.5">
            {(["H", "S", "L"] as const).map((ch, i) => {
              const maxVal = i === 0 ? 360 : 100;
              return (
                <div key={ch} className="flex flex-col gap-0.5 flex-1">
                  <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{ch}</span>
                  <input
                    type="number"
                    min={0}
                    max={maxVal}
                    value={hsl[i]}
                    onChange={(e) => {
                      const vals: [number, number, number] = [...hsl] as [number, number, number];
                      vals[i] = Number(e.target.value);
                      fromHsl(...vals);
                    }}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              );
            })}
          </div>
          <CopyButton getText={() => hslStr} label="Copy HSL" size="sm" />
        </div>
      </div>
    </section>
  );
}

// ─── Section B: WCAG Contrast Checker ────────────────────────────────────────

function ContrastChecker() {
  const [fg, setFg] = useState("#ffffff");
  const [bg, setBg] = useState("#2f6bff");

  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);

  let ratio: number | null = null;
  if (fgRgb && bgRgb) {
    const l1 = relativeLuminance(...fgRgb);
    const l2 = relativeLuminance(...bgRgb);
    ratio = contrastRatio(l1, l2);
  }

  const ratioStr = ratio !== null ? ratio.toFixed(2) + ":1" : "—";
  const aa_normal = ratio !== null && ratio >= 4.5;
  const aa_large = ratio !== null && ratio >= 3;
  const aaa_normal = ratio !== null && ratio >= 7;
  const aaa_large = ratio !== null && ratio >= 4.5;

  const ColorInput = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="flex flex-col gap-1.5 flex-1">
      <span className="field-label">{label}</span>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "36px", height: "36px", border: "none", background: "none", cursor: "pointer", padding: 0 }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  );

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 mt-8">WCAG Contrast Checker</h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 mb-6">
        <ColorInput label="Foreground" value={fg} onChange={setFg} />
        <ColorInput label="Background" value={bg} onChange={setBg} />
      </div>

      {/* Live preview */}
      <div
        style={{
          background: bg,
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          padding: "1.5rem",
          marginBottom: "1.25rem",
          textAlign: "center",
        }}
      >
        <span style={{ color: fg, fontSize: "18px", fontWeight: 600 }}>
          Sample Text — Preview
        </span>
        <br />
        <span style={{ color: fg, fontSize: "13px" }}>
          Smaller body text example for normal-size checks.
        </span>
      </div>

      {/* Contrast ratio */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--card)",
          marginBottom: "1rem",
        }}
      >
        <span className="field-label" style={{ minWidth: "120px" }}>
          Contrast Ratio
        </span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "22px", fontWeight: 700 }}>
          {ratioStr}
        </span>
        {ratio !== null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(ratio.toFixed(2) + ":1")}
            style={{ marginLeft: "auto" }}
          >
            Copy ratio
          </Button>
        )}
      </div>

      {/* WCAG grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {[
          { label: "AA — Normal text (≥4.5:1)", pass: aa_normal },
          { label: "AA — Large text (≥3:1)", pass: aa_large },
          { label: "AAA — Normal text (≥7:1)", pass: aaa_normal },
          { label: "AAA — Large text (≥4.5:1)", pass: aaa_large },
        ].map(({ label, pass }) => (
          <div
            key={label}
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <Badge pass={pass} label={label} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ColorToolbox() {
  return (
    <div className="tool-ui">
      <ColorConverter />
      <ContrastChecker />
    </div>
  );
}
