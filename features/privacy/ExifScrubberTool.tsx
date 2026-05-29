"use client";

import { useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import exifr from "exifr";
import { Dropzone } from "@/components/Dropzone";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { loadImageFile, baseName, type LoadedImage } from "@/lib/files";
import { canvasToBlob, drawToCanvas, isOpaqueFormat } from "@/lib/image";
import { exifToRows, type MetadataRow } from "@/lib/exif-display";
import { saveAs } from "@/lib/download";

type Fmt = "image/png" | "image/jpeg";

export default function ExifScrubberTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [rows, setRows] = useState<MetadataRow[]>([]);
  const [fmt, setFmt] = useState<Fmt>("image/jpeg");
  const [quality, setQuality] = useState(0.92);
  const [strippedUrl, setStrippedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "ready">("idle");
  const lastUrl = useRef<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    if (strippedUrl) URL.revokeObjectURL(strippedUrl);
    setStrippedUrl(null);
    setStatus("reading");
    try {
      const img = await loadImageFile(file);
      setLoaded((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return img;
      });
      const meta = await exifr.parse(file, { gps: true, tiff: true, exif: true, iptc: true });
      setRows(exifToRows(meta as Record<string, unknown> | undefined));
      setStatus("ready");
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Could not read image metadata.");
    }
  };

  const strip = async () => {
    if (!loaded) return;
    setError(null);
    try {
      const canvas = drawToCanvas(
        loaded.img,
        loaded.width,
        loaded.height,
        isOpaqueFormat(fmt) ? "#ffffff" : undefined,
      );
      const blob = await canvasToBlob(canvas, fmt, fmt === "image/jpeg" ? quality : undefined);
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      const url = URL.createObjectURL(blob);
      lastUrl.current = url;
      setStrippedUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not strip metadata.");
    }
  };

  const download = () => {
    if (!loaded || !strippedUrl) return;
    const ext = fmt === "image/png" ? ".png" : ".jpg";
    void saveAs({
      suggestedName: `${baseName(loaded.name)}-no-exif${ext}`,
      description: "Image",
      mime: fmt,
      ext,
      getBlob: async () => fetch(strippedUrl).then((r) => r.blob()),
      toolName: "remove-exif",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!loaded ? (
        <>
          <Dropzone label="Drop an image to inspect EXIF metadata" onFile={(f) => void onFile(f)} onError={setError} />
          {status === "reading" && <p className="muted-text" style={{ textAlign: "center", marginTop: "0.75rem" }}>Reading metadata…</p>}
        </>
      ) : (
        <div className="duo">
          <section className="card settings">
            <p className="field-label">Before — detected metadata</p>
            {rows.length === 0 ? (
              <p className="muted-text">No EXIF metadata found in this file.</p>
            ) : (
              <table className="meta-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Field</th>
                    <th>Value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.group}-${r.key}`}>
                      <td>{r.group}</td>
                      <td>{r.key}</td>
                      <td className="meta-value">{r.value}</td>
                      <td>
                        <CopyButton getText={() => r.value} label="Copy" size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="field" style={{ marginTop: "1rem" }}>
              <span className="field-label">Output format</span>
              <select value={fmt} onChange={(e) => setFmt(e.target.value as Fmt)}>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>

            <div className="actionbar">
              <Button type="button" variant="outline" onClick={() => { setLoaded(null); setRows([]); }}>
                Change image
              </Button>
              <Button type="button" onClick={() => void strip()}>
                Strip all metadata
              </Button>
              {strippedUrl && (
                <Button type="button" onClick={download}>
                  <LuDownload /> Download clean image
                </Button>
              )}
            </div>
          </section>

          <section className="card">
            <p className="field-label">After</p>
            {strippedUrl ? (
              <>
                <p className="muted-text">Re-encoded via canvas — EXIF removed.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={strippedUrl} alt="Metadata stripped preview" className="preview-img" />
                <table className="meta-table">
                  <tbody>
                    <tr>
                      <td colSpan={3} className="muted-text">
                        No metadata (clean export)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            ) : (
              <p className="muted-text">Click “Strip all metadata” to generate a clean copy.</p>
            )}
          </section>
        </div>
      )}

    </div>
  );
}
