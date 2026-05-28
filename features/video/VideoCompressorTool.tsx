"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuVideo, LuDownload, LuRefreshCw } from "react-icons/lu";
import { saveAs } from "@/lib/download";

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

const FILE_SIZE_WARN = 300 * 1024 * 1024; // 300 MB

type Quality = "high" | "medium" | "low";
const QUALITY_CRF: Record<Quality, string> = { high: "23", medium: "28", low: "35" };
const QUALITY_LABEL: Record<Quality, string> = {
  high: "High — best quality, larger file",
  medium: "Medium — balanced (recommended)",
  low: "Low — smallest file, reduced quality",
};

function baseName(name: string) { return name.replace(/\.[^.]+$/, "") || "video"; }
function ext(name: string) { return name.split(".").pop()?.toLowerCase() ?? "mp4"; }

export default function VideoCompressorTool() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>("medium");
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => { setFile(f); setResultBlob(null); setError(null); setStatus("idle"); setProgress(0); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };
  const reset = () => { setFile(null); setResultBlob(null); setError(null); setStatus("idle"); setProgress(0); };

  const getFFmpeg = async () => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    setStatus("loading");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CDNBASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CDNBASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const compress = async () => {
    if (!file) return;
    setError(null); setResultBlob(null); setProgress(0);
    let ffmpeg: FFmpeg;
    try { ffmpeg = await getFFmpeg(); } catch (e) {
      setStatus("error"); setError(e instanceof Error ? e.message : "Failed to load ffmpeg.wasm"); return;
    }
    try {
      setStatus("converting");
      const progressHandler = ({ progress: p }: { progress: number }) => setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      ffmpeg.on("progress", progressHandler);
      const inputExt = ext(file.name);
      const inputName = `input.${inputExt}`;
      const outputName = `output.mp4`;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(["-i", inputName, "-c:v", "libx264", "-preset", "fast", "-crf", QUALITY_CRF[quality], "-c:a", "aac", "-movflags", "+faststart", outputName]);
      const raw = await ffmpeg.readFile(outputName);
      const data = typeof raw === "string" ? new TextEncoder().encode(raw).buffer : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([data as ArrayBuffer], { type: "video/mp4" });
      ffmpeg.off("progress", progressHandler);
      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
      setResultBlob(blob); setProgress(100); setStatus("done");
    } catch (e) {
      setStatus("error"); setError(e instanceof Error ? e.message : "Compression failed.");
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const blob = resultBlob;
    void saveAs({ suggestedName: `${baseName(file.name)}-compressed.mp4`, description: "MP4 Video", mime: "video/mp4", ext: ".mp4", getBlob: () => blob });
  };

  const isWorking = status === "loading" || status === "converting";

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!file ? (
        <div className={`dropzone ${dragging ? "dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input ref={inputRef} type="file" accept=".mp4,.webm,.mov,.avi,.mkv,.ogg,.m4v" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <div className="dropzone-inner">
            <LuVideo className="dropzone-icon" />
            <strong>Drop video or click to select</strong>
            <span>MP4, WebM, MOV, AVI, MKV — output is H.264 MP4</span>
          </div>
        </div>
      ) : (
        <>
          {file.size > FILE_SIZE_WARN && (
            <div style={{ padding: "0.6rem 1rem", borderRadius: "var(--radius)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid var(--primary)", fontSize: "13px", color: "var(--foreground)" }}>
              Large file ({(file.size / 1024 / 1024).toFixed(0)} MB) — compression may take several minutes.
            </div>
          )}
          <div className="toolbar">
            <button onClick={reset} disabled={isWorking}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: "13px", color: "var(--foreground)" }}>
              <LuRefreshCw size={13} /> Change file
            </button>
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{file.name}</span>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <button onClick={download}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
                <LuDownload size={14} /> Download MP4
              </button>
            ) : (
              <button onClick={() => void compress()} disabled={isWorking}
                style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: isWorking ? "var(--muted)" : "var(--primary)", color: isWorking ? "var(--muted-foreground)" : "var(--primary-foreground)", cursor: isWorking ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px" }}>
                {isWorking ? (status === "loading" ? "Loading ffmpeg.wasm…" : `Compressing… ${progress}%`) : "Compress Video"}
              </button>
            )}
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Quality</span>
              <select value={quality} onChange={(e) => { setQuality(e.target.value as Quality); setResultBlob(null); setStatus("idle"); }} disabled={isWorking}
                style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "13px" }}>
                {(["high", "medium", "low"] as Quality[]).map((q) => <option key={q} value={q}>{QUALITY_LABEL[q]}</option>)}
              </select>
            </label>
          </section>

          {isWorking && (
            <div className="card">
              <div className="field-label" style={{ marginBottom: "0.5rem", fontSize: "13px", color: "var(--muted-foreground)" }}>
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Compressing… ${progress}%`}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${status === "loading" ? 10 : progress}%`, background: "var(--primary)", borderRadius: 3, transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          {status === "done" && resultBlob && (
            <div className="card" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              Compressed to {(resultBlob.size / 1024 / 1024).toFixed(1)} MB (was {(file.size / 1024 / 1024).toFixed(1)} MB) — click Download to save.
            </div>
          )}
        </>
      )}
    </div>
  );
}
