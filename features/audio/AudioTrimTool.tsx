"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { formatFFmpegLoadError, loadFFmpeg } from "@/lib/ffmpeg";
import { LuScissors, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const ACCEPTED_INPUTS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "mp4"];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");

/** Parse a MM:SS or plain-seconds string into total seconds (as a string for ffmpeg). */
function parseTime(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(":").map(Number);
  if (parts.length === 2) {
    const [m, s] = parts;
    return String(m * 60 + s);
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return String(h * 3600 + m * 60 + s);
  }
  throw new Error(`Invalid time format: "${raw}". Use MM:SS or seconds.`);
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function extOf(filename: string): string {
  return filename.split(".").pop() ?? "mp3";
}

const MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",
  mp4: "video/mp4",
};

export default function AudioTrimTool() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState("0:00");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setResultBlob(null);
    setError(null);
    setStatus("idle");
    setProgress(0);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
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
      setStatus("loading");
      ffmpeg = await loadFFmpeg();
    } catch (e) {
      setStatus("error");
      setError(formatFFmpegLoadError(e));
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

      const data = await ffmpeg.readFile(outputName);
      const mime = MIME_MAP[ext] ?? "audio/mpeg";
      const audioData = typeof data === "string" ? new TextEncoder().encode(data).buffer : (data as Uint8Array).buffer.slice(0);
      const blob = new Blob([audioData as ArrayBuffer], { type: mime });

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
    const mime = MIME_MAP[ext] ?? "audio/mpeg";
    const blob = resultBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}-trimmed.${ext}`,
      description: `Trimmed ${ext.toUpperCase()} audio`,
      mime,
      ext: `.${ext}`,
      getBlob: () => blob,
    });
  };

  const reset = () => {
    setFile(null);
    setResultBlob(null);
    setError(null);
    setStatus("idle");
    setProgress(0);
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
            <strong>Drop audio file or click to select</strong>
            <span>Accepted: {ACCEPTED_INPUTS.join(", ").toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <Button variant="outline" onClick={reset} disabled={isWorking}>
              <LuRefreshCw />
              Change file
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[260px]">
              {file.name}
            </span>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <Button onClick={download}>
                <LuDownload />
                Download trimmed
              </Button>
            ) : (
              <Button onClick={() => void trim()} disabled={isWorking}>
                {isWorking ? (
                  status === "loading" ? "Loading ffmpeg.wasm…" : `Trimming… ${progress}%`
                ) : (
                  "Trim"
                )}
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
