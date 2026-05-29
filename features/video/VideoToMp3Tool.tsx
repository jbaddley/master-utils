"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { formatFFmpegLoadError, loadFFmpeg } from "@/lib/ffmpeg";
import { LuVideo, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

type OutputFmt = "mp3" | "wav" | "aac" | "ogg" | "flac";

const FMT_MIME: Record<OutputFmt, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/mp4",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

const FMT_EXT: Record<OutputFmt, string> = {
  mp3: "mp3",
  wav: "wav",
  aac: "m4a",
  ogg: "ogg",
  flac: "flac",
};

const FMT_LABEL: Record<OutputFmt, string> = {
  mp3: "MP3 — widely compatible",
  wav: "WAV — lossless PCM",
  aac: "AAC / M4A — high quality",
  ogg: "OGG — open & efficient",
  flac: "FLAC — lossless compressed",
};

const ALL_OUTPUT_FORMATS: OutputFmt[] = ["mp3", "wav", "aac", "ogg", "flac"];

const ACCEPTED_INPUTS = ["mp4", "webm", "mov", "avi", "mkv", "ogg", "m4v"];

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function buildArgs(inputName: string, outputFmt: OutputFmt): string[] {
  const ext = FMT_EXT[outputFmt];
  const outputName = `output.${ext}`;
  switch (outputFmt) {
    case "mp3":
      return ["-i", inputName, "-vn", "-q:a", "0", outputName];
    case "wav":
      return ["-i", inputName, "-vn", outputName];
    case "aac":
      return ["-i", inputName, "-vn", "-c:a", "aac", "-q:a", "1", outputName];
    case "ogg":
      return ["-i", inputName, "-vn", "-c:a", "libvorbis", outputName];
    case "flac":
      return ["-i", inputName, "-vn", "-c:a", "flac", outputName];
  }
}

export default function VideoToMp3Tool() {
  const acceptAttr = ACCEPTED_INPUTS.map((ext) => `.${ext}`).join(",");

  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [outputFmt, setOutputFmt] = useState<OutputFmt>("mp3");
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
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

  const extract = async () => {
    if (!file) return;
    setError(null);
    setResultBlob(null);
    setProgress(0);

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
      setProgress(0);

      const progressHandler = ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      };
      ffmpeg.on("progress", progressHandler);

      const inputExt = file.name.split(".").pop() ?? "mp4";
      const inputName = `input.${inputExt}`;
      const ext = FMT_EXT[outputFmt];
      const outputName = `output.${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(buildArgs(inputName, outputFmt));

      const raw = await ffmpeg.readFile(outputName);
      const data =
        typeof raw === "string"
          ? new TextEncoder().encode(raw).buffer
          : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([data as ArrayBuffer], { type: FMT_MIME[outputFmt] });

      ffmpeg.off("progress", progressHandler);

      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

      setResultBlob(blob);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? `Extraction failed: ${e.message}` : "Extraction failed."
      );
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const blob = resultBlob;
    const ext = FMT_EXT[outputFmt];
    void saveAs({
      suggestedName: `${baseName(file.name)}.${ext}`,
      description: `${outputFmt.toUpperCase()} audio`,
      mime: FMT_MIME[outputFmt],
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
            accept={acceptAttr}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="dropzone-inner">
            <LuVideo className="dropzone-icon" />
            <strong>Drop video file or click to select</strong>
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
                Download {outputFmt.toUpperCase()}
              </Button>
            ) : (
              <Button onClick={() => void extract()} disabled={isWorking}>
                {isWorking ? (
                  status === "loading" ? "Loading ffmpeg.wasm…" : `Extracting… ${progress}%`
                ) : (
                  "Extract Audio"
                )}
              </Button>
            )}
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Output format</span>
              <select
                value={outputFmt}
                onChange={(e) => {
                  setOutputFmt(e.target.value as OutputFmt);
                  setResultBlob(null);
                  setStatus("idle");
                }}
                disabled={isWorking}
              >
                {ALL_OUTPUT_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {FMT_LABEL[fmt]}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {isWorking && (
            <div className="card">
              <div className="field-label mb-2">
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Extracting… ${progress}%`}
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
              <LuVideo style={{ flexShrink: 0, color: "var(--muted-foreground)" }} />
              <span className="text-sm text-muted-foreground">
                Ready — click <strong>Download {outputFmt.toUpperCase()}</strong> above to save.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
