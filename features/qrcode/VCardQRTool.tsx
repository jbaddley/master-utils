"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LuDownload } from "react-icons/lu";
import QRCode from "qrcode";
import type { QRCodeErrorCorrectionLevel } from "qrcode";
import { Button } from "@/components/ui/button";

function buildVCard(name: string, phone: string, email: string, website: string): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  if (name) lines.push(`FN:${name}`);
  if (phone) lines.push(`TEL:${phone}`);
  if (email) lines.push(`EMAIL:${email}`);
  if (website) lines.push(`URL:${website}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

export default function VCardQRTool() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasContent = !!(name || phone || email || website);

  const renderQR = useCallback((value: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!value.trim()) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setError(null);
      return;
    }
    QRCode.toCanvas(canvas, value, {
      width: 256,
      errorCorrectionLevel: "M" as QRCodeErrorCorrectionLevel,
      margin: 2,
      color: { dark: "#ffffff", light: "#000000" },
    })
      .then(() => setError(null))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to generate QR code.");
      });
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!hasContent) return;
      const vcard = buildVCard(name, phone, email, website);
      renderQR(vcard);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [name, phone, email, website, hasContent, renderQR]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `vcard-${name || "contact"}.png`;
    a.click();
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <section className="card settings">
        <label className="field">
          <span className="field-label">Full name</span>
          <input
            type="text"
            className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Phone</span>
          <input
            type="tel"
            className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground"
            placeholder="+1 555 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Email</span>
          <input
            type="email"
            className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Website</span>
          <input
            type="url"
            className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground"
            placeholder="https://example.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </section>

      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="rounded-xl border border-border"
          style={{ maxWidth: "100%", height: "auto" }}
        />

        <Button onClick={handleDownload} disabled={!hasContent}>
          <LuDownload />
          Download PNG
        </Button>
      </div>
    </div>
  );
}
