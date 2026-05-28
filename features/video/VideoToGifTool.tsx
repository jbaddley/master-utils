"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuClapperboard, LuDownload, LuRefreshCw } from "react-icons/lu";
import { saveAs } from "@/lib/download";

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
const MAX_DURATION = 30; // seconds

function baseName(name: string) { return name.replace(/\.[^.]+$/, "") || "video"; }

export default function VideoToGifTool() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [startTime, setStartTime] = useState("0");
  const [duration, setDuration] = useState("10");
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => { setFile(f); setResultBlob(null); setResultUrl(null); setError(null); setStatus("idle"); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };
  const reset = () => { setFile(null); setResultBlob(null); setResultUrl(null); setError(null); setStatus("idle"); };

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

  const convert = async () => {
    if (!file) return;
    const clipDuration = parseFloat(duration) || 10;
    if (clipDuration > MAX_DURATION) { setError(`Duration capped at ${MAX_DURATION} seconds for GIF generation.`); return; }
    setError(null); setResultBlob(null); setResultUrl(null); setProgress(0);
    let ffmpeg: FFmpeg;
    try { ffmpeg = await getFFmpeg(); } catch (e) {
      setStatus("error"); setError(e instanceof Error ? e.message : "Failed to load ffmpeg.wasm"); return;
    }
    try {
      setStatus("converting");
      const progressHandler = ({ progress: p }: { progress: number }) => setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      ffmpeg.on("progress", progressHandler);
      const inputExt = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
      const inputName = `input.${inputExt}`;
      const paletteName = "palette.png";
      const outputName = "output.gif";
      const ss = startTime || "0";
      const t = String(Math.min(clipDuration, MAX_DURATION));
      const filter = `fps=${fps},scale=${width}:-1:flags=lanczos`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      // Two-pass: generate palette then use it for better GIF quality
      await ffmpeg.exec(["-ss", ss, "-t", t, "-i", inputName, "-vf", `${filter},palettegen`, "-y", paletteName]);
      await ffmpeg.exec(["-ss", ss, "-t", t, "-i", inputName, "-i", paletteName, "-lavfi", `${filter}[x];[x][1:v]paletteuse`, "-y", outputName]);

      const raw = await ffmpeg.readFile(outputName);
      const data = typeof raw === "string" ? new TextEncoder().encode(raw).buffer : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([data as ArrayBuffer], { type: "image/gif" });
      ffmpeg.off("progress", progressHandler);
      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(paletteName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
      const url = URL.createObjectURL(blob);
      setResultBlob(blob); setResultUrl(url); setProgress(100); setStatus("done");
    } catch (e) {
      setStatus("error"); setError(e instanceof Error ? e.message : "GIF conversion failed.");
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const blob = resultBlob;
    void saveAs({ suggestedName: `${baseName(file.name)}.gif`, description: "GIF Animation", mime: "image/gif", ext: ".gif", getBlob: () => blob });
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
            <LuClapperboard className="dropzone-icon" />
            <strong>Drop a video or click to select</strong>
            <span>MP4, WebM, MOV — up to {MAX_DURATION}s clip will be converted</span>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <button onClick={reset} disabled={isWorking}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: "13px", color: "var(--foreground)" }}>
              <LuRefreshCw size={13} /> Change file
            </button>
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{file.name}</span>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <button onClick={download}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
                <LuDownload size={14} /> Download GIF ({resultBlob ? (resultBlob.size / 1024).toFixed(0) + " KB" : ""})
              </button>
            ) : (
              <button onClick={() => void convert()} disabled={isWorking}
                style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: isWorking ? "var(--muted)" : "var(--primary)", color: isWorking ? "var(--muted-foreground)" : "var(--primary-foreground)", cursor: isWorking ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px" }}>
                {isWorking ? (status === "loading" ? "Loading ffmpeg.wasm…" : `Converting… ${progress}%`) : "Convert to GIF"}
              </button>
            )}
          </div>

          <section className="card settings" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label className="field">
              <span className="field-label">Start time (seconds)</span>
              <input type="number" min={0} step={1} value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isWorking}
                style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "13px", width: "100%" }} />
            </label>
            <label className="field">
              <span className="field-label">Duration (max {MAX_DURATION}s)</span>
              <input type="number" min={1} max={MAX_DURATION} step={1} value={duration} onChange={(e) => setDuration(e.target.value)} disabled={isWorking}
                style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "13px", width: "100%" }} />
            </label>
            <label className="field">
              <span className="field-label">Frame rate (FPS)</span>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={isWorking}
                style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "13px" }}>
                <option value={6}>6 FPS — smallest file</option>
                <option value={10}>10 FPS — recommended</option>
                <option value={15}>15 FPS — smoother</option>
                <option value={24}>24 FPS — cinema quality</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Width (px)</span>
              <select value={width} onChange={(e) => setWidth(Number(e.target.value))} disabled={isWorking}
                style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "13px" }}>
                <option value={320}>320px — tiny</option>
                <option value={480}>480px — standard</option>
                <option value={640}>640px — large</option>
                <option value={800}>800px — extra large</option>
              </select>
            </label>
          </section>

          {isWorking && (
            <div className="card">
              <div style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Converting… ${progress}%`}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${status === "loading" ? 10 : progress}%`, background: "var(--primary)", borderRadius: 3, transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          {resultUrl && (
            <div style={{ textAlign: "center", padding: "0.5rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultUrl} alt="GIF preview" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: "var(--radius-sm)" }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
