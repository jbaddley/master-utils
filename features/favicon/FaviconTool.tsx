"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload, LuFileArchive } from "react-icons/lu";
import JSZip from "jszip";
import { Dropzone, ChangeImageButton } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { loadImageFile, type LoadedImage } from "@/lib/files";
import { saveAs } from "@/lib/download";
import {
  renderSquare,
  canvasPngBytes,
  buildIco,
  HTML_SNIPPET,
  WEBMANIFEST,
} from "@/lib/favicon";

const PREVIEW_SIZES = [16, 32, 48, 64];

export default function FaviconTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [previews, setPreviews] = useState<{ size: number; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

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

  useEffect(() => {
    if (!loaded) {
      setPreviews([]);
      return;
    }
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    const next = PREVIEW_SIZES.map((size) => {
      const url = renderSquare(loaded.img, size).toDataURL("image/png");
      return { size, url };
    });
    setPreviews(next);
  }, [loaded]);

  const downloadIco = () => {
    if (!loaded) return;
    void saveAs({
      suggestedName: "favicon.ico",
      description: "Icon",
      mime: "image/x-icon",
      ext: ".ico",
      getBlob: async () => {
        const entries = await Promise.all(
          [16, 32, 48].map(async (size) => ({
            size,
            png: await canvasPngBytes(renderSquare(loaded.img, size)),
          })),
        );
        return buildIco(entries);
      },
    });
  };

  const downloadZip = () => {
    if (!loaded) return;
    void saveAs({
      suggestedName: "favicons.zip",
      description: "Zip archive",
      mime: "application/zip",
      ext: ".zip",
      getBlob: async () => {
        const zip = new JSZip();
        const png = (size: number) => canvasPngBytes(renderSquare(loaded.img, size));
        const ico = buildIco(
          await Promise.all(
            [16, 32, 48].map(async (size) => ({ size, png: await png(size) })),
          ),
        );
        zip.file("favicon.ico", ico);
        zip.file("favicon-16x16.png", await png(16));
        zip.file("favicon-32x32.png", await png(32));
        zip.file("apple-touch-icon.png", await png(180));
        zip.file("android-chrome-192x192.png", await png(192));
        zip.file("android-chrome-512x512.png", await png(512));
        zip.file("site.webmanifest", WEBMANIFEST);
        zip.file("snippet.html", HTML_SNIPPET);
        return zip.generateAsync({ type: "blob" });
      },
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!loaded ? (
        <Dropzone onFile={onFile} onError={setError} label="Drop a square image here" />
      ) : (
        <>
          <div className="toolbar">
            <ChangeImageButton onFile={onFile} />
            <div className="toolbar-spacer" />
            <Button variant="outline" onClick={downloadIco}>
              <LuDownload />
              favicon.ico
            </Button>
            <Button onClick={downloadZip}>
              <LuFileArchive />
              Download icon pack (.zip)
            </Button>
          </div>

          <div className="pane">
            <div className="panel-head">
              <span className="tag">Preview</span>
              <span className="meta">16 · 32 · 48 · 64 px</span>
            </div>
            <div className="canvas checker" style={{ gap: 24 }}>
              {previews.map((p) => (
                <div key={p.size} style={{ textAlign: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`${p.size}px icon`}
                    width={p.size}
                    height={p.size}
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="meta" style={{ marginTop: 6 }}>
                    {p.size}px
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="card">
            <span className="field-label">Add to your &lt;head&gt;</span>
            <pre
              style={{
                margin: "8px 0 0",
                overflowX: "auto",
                fontSize: 12,
                color: "var(--muted)",
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "pre",
              }}
            >
              {HTML_SNIPPET}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
