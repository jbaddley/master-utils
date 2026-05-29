"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload, LuFileArchive, LuCopy, LuFileCode, LuFileJson } from "react-icons/lu";
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

// Files that go into the zip pack, in display order
const PACK_FILES: {
  filename: string;
  size?: number; // render size in px (undefined = non-image file)
  label: string;
  where: string;
}[] = [
  { filename: "favicon.ico", size: 32, label: "favicon.ico", where: "Browser tab (legacy)" },
  { filename: "favicon-16x16.png", size: 16, label: "favicon-16x16.png", where: "Browser tab" },
  { filename: "favicon-32x32.png", size: 32, label: "favicon-32x32.png", where: "Browser / taskbar" },
  { filename: "apple-touch-icon.png", size: 180, label: "apple-touch-icon.png", where: "iOS home screen" },
  { filename: "android-chrome-192x192.png", size: 192, label: "android-chrome-192x192.png", where: "Android home screen" },
  { filename: "android-chrome-512x512.png", size: 512, label: "android-chrome-512x512.png", where: "PWA splash screen" },
  { filename: "site.webmanifest", label: "site.webmanifest", where: "PWA configuration" },
  { filename: "snippet.html", label: "snippet.html", where: "Paste into <head>" },
];

export default function FaviconTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  // Map from filename → data URL (for image previews)
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      setPreviews({});
      return;
    }
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];

    // Build a canvas preview for every image entry in PACK_FILES
    const next: Record<string, string> = {};
    for (const f of PACK_FILES) {
      if (f.size !== undefined) {
        // Cap display render at 64px — no need to create a 512px canvas just to show it small
        const displaySize = Math.min(f.size, 64);
        next[f.filename] = renderSquare(loaded.img, displaySize).toDataURL("image/png");
      }
    }
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
              favicon.ico only
            </Button>
            <Button onClick={downloadZip}>
              <LuFileArchive />
              Download icon pack (.zip)
            </Button>
          </div>

          {/* Pack contents preview */}
          <div className="pane">
            <div className="panel-head">
              <span className="tag">Pack contents</span>
              <span className="meta">{PACK_FILES.length} files · ready to drop into your project</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "0.75rem",
                padding: "1rem",
              }}
            >
              {PACK_FILES.map((f) => {
                const previewUrl = previews[f.filename];
                const isImage = f.size !== undefined;

                return (
                  <div
                    key={f.filename}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      padding: "0.75rem",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      background: "var(--card)",
                    }}
                  >
                    {/* Thumbnail or file-type icon */}
                    <div
                      className={isImage ? "checker" : undefined}
                      style={{
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "0.375rem",
                        overflow: "hidden",
                        background: isImage ? undefined : "var(--muted)",
                      }}
                    >
                      {isImage && previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl}
                          alt={f.filename}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            imageRendering: (f.size ?? 64) <= 64 ? "pixelated" : "auto",
                          }}
                        />
                      ) : f.filename.endsWith(".webmanifest") ? (
                        <LuFileJson size={28} style={{ opacity: 0.4 }} />
                      ) : (
                        <LuFileCode size={28} style={{ opacity: 0.4 }} />
                      )}
                    </div>

                    {/* Filename + usage label */}
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontFamily: "ui-monospace, monospace",
                          color: "var(--foreground)",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {f.label}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--muted-foreground)",
                          marginTop: "0.15rem",
                        }}
                      >
                        {f.where}
                        {f.size !== undefined && (
                          <span style={{ marginLeft: "0.3em", opacity: 0.6 }}>
                            · {f.size}px
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HTML snippet */}
          <section className="card">
            <span className="field-label">Add to your &lt;head&gt;</span>
            <pre
              style={{
                margin: "8px 0 0",
                overflowX: "auto",
                fontSize: 12,
                color: "var(--muted-foreground)",
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "pre",
              }}
            >
              {HTML_SNIPPET}
            </pre>
            <Button
              variant="outline"
              style={{ marginTop: 10 }}
              onClick={() => {
                void navigator.clipboard.writeText(HTML_SNIPPET).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              <LuCopy />
              {copied ? "Copied!" : "Copy snippet"}
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
