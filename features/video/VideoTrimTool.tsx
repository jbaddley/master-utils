"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuScissors, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

const ACCEPTED_EXTS = ["mp4", "webm", "mov", "avi", "mkv", "ogg"];
const ACCEPT_ATTR = ACCEPTED_EXTS.map((e) => `.${e}`).join(",");

const MIME_MAP: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/mp4",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  ogg: "video/ogg",
};

/** Convert MM:SS, HH:MM:SS, or plain seconds into an ffmpeg-format timestamp. */
function parseTime(s: string): string {
  const trimmed = s.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(":").map(Number);
  if (parts.length === 2) {
    const [m, sec] = parts;
    return String(m * 60 + sec);
  }
  if (parts.length === 3) {
    const [h, m, sec] = parts;
    return String(h * 3600 + m * 60 + sec);
  }
  throw new Error(`Invalid time format: "${s}". Use MM:SS, HH:MM:SS, or plain seconds.`);
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function extOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "mp4";
}

function formatDuration(secs: number): string {
  if (!isFinite(secs) || secs <= 0) return "unknown";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoTrimTool() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState("0:00");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setObjectUrl(url);
    setResultBlob(null);
    setError(null);
    setStatus("idle");
    setProgress(0);
    setDuration(0);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onVideoMetadataLoaded = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setEndTime(formatDuration(video.duration));
  };

  const getFFmpeg = async (): Promise<FFmpeg> => {
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

  const trim = async () => {
    if (!file) return;
    setError(null);
    setResultBlob(null);
    setProgress(0);

    let ssTime: string;
    let toTime: string | null = null;

    try {
      ssTime = parseTime(startTime || "0");
      if (endTime.trim()) toTime = parseTime(endTime);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid time.");
      return;
    }

    let ffmpeg: FFmpeg;
    try {
      ffmpeg = await getFFmpeg();
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? `Failed to load ffmpeg.wasm: ${e.message}` : "Failed to load ffmpeg.wasm"
      );
      return;
    }

    try {
      setStatus("converting");

      const progressHandler = ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      };
      ffmpeg.on("progress", progressHandler);

      const ext = extOf(file.name);
      const inputName = `input.${ext}`;
      const outputName = `output.${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const args = ["-i", inputName, "-ss", ssTime];
      if (toTime !== null) args.push("-to", toTime);
      args.push("-c", "copy", outputName);

      await ffmpeg.exec(args);

      const raw = await ffmpeg.readFile(outputName);
      const mime = MIME_MAP[ext] ?? "video/mp4";
      const buf = typeof raw === "string"
        ? new TextEncoder().encode(raw).buffer
        : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([buf as ArrayBuffer], { type: mime });

      ffmpeg.off("progress", progressHandler);

      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

      setResultBlob(blob);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? `Trim failed: ${e.message}` : "Trim failed."
      );
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const ext = extOf(file.name);
    const mime = MIME_MAP[ext] ?? "video/mp4";
    const blob = resultBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}-trimmed.${ext}`,
      description: `Trimmed ${ext.toUpperCase()} video`,
      mime,
      ext: `.${ext}`,
      getBlob: () => blob,
    });
  };

  const reset = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setFile(null);
    setObjectUrl(null);
    setResultBlob(null);
    setError(null);
    setStatus("idle");
    setProgress(0);
    setDuration(0);
    setStartTime("0:00");
    setEndTime("");
  };

  const isWorking = status === "loading" || status === "converting";

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!file ? (
        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="dropzone-inner">
            <LuScissors className="dropzone-icon" />
            <strong>Drop video file or click to select</strong>
            <span>Accepted: {ACCEPTED_EXTS.join(", ").toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Hidden video for duration detection */}
          <video
            ref={videoRef}
            src={objectUrl ?? undefined}
            style={{ display: "none" }}
            onLoadedMetadata={onVideoMetadataLoaded}
            preload="metadata"
            muted
          />

          <div className="toolbar">
            <Button variant="outline" onClick={reset} disabled={isWorking}>
              <LuRefreshCw />
              Change file
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[260px]">
              {file.name}
              {duration > 0 && (
                <span className="ml-2 opacity-60">({formatDuration(duration)})</span>
              )}
            </span>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <Button onClick={download}>
                <LuDownload />
                Download trimmed
              </Button>
            ) : (
              <Button onClick={() => void trim()} disabled={isWorking}>
                {isWorking
                  ? status === "loading"
                    ? "Loading ffmpeg.wasm…"
                    : `Trimming… ${progress}%`
                  : "Trim"}
              </Button>
            )}
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Start time</span>
              <input
                type="text"
                value={startTime}
                placeholder="0:00 or seconds"
                disabled={isWorking}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setResultBlob(null);
                  if (status === "done") setStatus("idle");
                }}
              />
            </label>
            <label className="field">
              <span className="field-label">End time (leave blank for end of file)</span>
              <input
                type="text"
                value={endTime}
                placeholder="MM:SS or seconds"
                disabled={isWorking}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setResultBlob(null);
                  if (status === "done") setStatus("idle");
                }}
              />
            </label>
          </section>

          {isWorking && (
            <div className="card">
              <div className="field-label mb-2">
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Trimming… ${progress}%`}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${status === "loading" ? 15 : progress}%`,
                    background: "var(--primary)",
                    borderRadius: 3,
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LuScissors style={{ flexShrink: 0, color: "var(--muted-foreground)" }} />
              <span className="text-sm text-muted-foreground">
                Ready — click <strong>Download trimmed</strong> above to save.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
