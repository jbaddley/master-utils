"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LuDownload } from "react-icons/lu";
import QRCode from "qrcode";
import type { QRCodeErrorCorrectionLevel } from "qrcode";
import { Button } from "@/components/ui/button";

type SecurityType = "WPA" | "WEP" | "nopass";

function buildWifiString(ssid: string, password: string, security: SecurityType): string {
  const escapedSsid = ssid.replace(/[\\;,":]/g, (c) => `\\${c}`);
  const escapedPwd = password.replace(/[\\;,":]/g, (c) => `\\${c}`);
  if (security === "nopass") {
    return `WIFI:T:nopass;S:${escapedSsid};;`;
  }
  return `WIFI:T:${security};S:${escapedSsid};P:${escapedPwd};;`;
}

export default function WifiQRTool() {
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState<SecurityType>("WPA");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderQR = useCallback((value: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!value || !ssid.trim()) {
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
  }, [ssid]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ssid.trim()) return;
      const wifiString = buildWifiString(ssid, password, security);
      renderQR(wifiString);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ssid, password, security, renderQR]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `wifi-${ssid || "qrcode"}.png`;
    a.click();
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <section className="card settings">
        <label className="field" style={{ flex: "2 1 240px" }}>
          <span className="field-label">Network name (SSID)</span>
          <input
            type="text"
            className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground"
            placeholder="My WiFi Network"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Security type</span>
          <select
            value={security}
            onChange={(e) => setSecurity(e.target.value as SecurityType)}
          >
            <option value="WPA">WPA / WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">None (open)</option>
          </select>
        </label>

        {security !== "nopass" && (
          <label className="field" style={{ flex: "2 1 240px" }}>
            <span className="field-label">Password</span>
            <input
              type="text"
              className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground"
              placeholder="WiFi password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
      </section>

      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="rounded-xl border border-border"
          style={{ maxWidth: "100%", height: "auto" }}
        />

        <Button onClick={handleDownload} disabled={!ssid.trim()}>
          <LuDownload />
          Download PNG
        </Button>
      </div>
    </div>
  );
}
