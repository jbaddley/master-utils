"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuVideo, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

type OutputFmt = "mp4" | "webm" | "ogv";

const FMT_MIME: Record<OutputFmt, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
};

const FMT_LABEL: Record<OutputFmt, string> = {
  mp4: "MP4 — H.264 (widest compatibility)",
  webm: "WebM — VP9 (smaller size)",
  ogv: "OGV — Theora (open format)",
};

const ALL_OUTPUT_FORMATS: OutputFmt[] = ["mp4", "webm", "ogv"];

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

const ACCEPTED_INPUTS = ["mp4", "webm", "mov", "avi", "mkv"];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");

const LARGE_FILE_THRESHOLD = 300 * 1024 * 1024; // 300 MB

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export default function VideoConverterTool({
  defaultOutputFormat,
}: {
  defaultOutputFormat?: string;
}) {
  const initialFmt = (
    defaultOutputFormat && ALL_OUTPUT_FORMATS.includes(defaultOutputFormat as OutputFmt)
      ? defaultOutputFormat
      : "mp4"
  ) as OutputFmt;

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [outputFmt, setOutputFmt] = useState<OutputFmt>(initialFmt);
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

  const buildArgs = (inputName: string, outputName: string, fmt: OutputFmt): string[] => {
    if (fmt === "mp4") {
      return ["-i", inputName, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", outputName];
    }
    if (fmt === "webm") {
      return ["-i", inputName, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-c:a", "libopus", outputName];
    }
    // ogv
    return ["-i", inputName, "-c:v", "libtheora", "-q:v", "5", "-c:a", "libvorbis", outputName];
  };

  const convert = async () => {
    if (!file) return;
    setError(null);
    setResultBlob(null);
    setProgress(0);

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
      setProgress(0);

      const progressHandler = ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      };
      ffmpeg.on("progress", progressHandler);

      const inputExt = file.name.split(".").pop() ?? "mp4";
      const inputName = `input.${inputExt}`;
      const outputName = `output.${outputFmt}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(buildArgs(inputName, outputName, outputFmt));

      const data = await ffmpeg.readFile(outputName);
      const raw = typeof data === "string" ? new TextEncoder().encode(data).buffer : (data as Uint8Array).buffer.slice(0);
      const blob = new Blob([raw as ArrayBuffer], { type: FMT_MIME[outputFmt] });

      ffmpeg.off("progress", progressHandler);

      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

      setResultBlob(blob);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? `Conversion failed: ${e.message}` : "Conversion failed."
      );
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const blob = resultBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}.${outputFmt}`,
      description: `${outputFmt.toUpperCase()} video`,
      mime: FMT_MIME[outputFmt],
      ext: `.${outputFmt}`,
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
  const isLarge = file ? file.size > LARGE_FILE_THRESHOLD : false;

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
              <Button onClick={() => void convert()} disabled={isWorking}>
                {isWorking ? (
                  status === "loading" ? "Loading ffmpeg.wasm…" : `Converting… ${progress}%`
                ) : (
                  "Convert"
                )}
              </Button>
            )}
          </div>

          {isLarge && (
            <div className="card" style={{ color: "var(--warning, #b45309)", fontSize: "0.875rem" }}>
              Warning: This file is over 300 MB. Conversion may be slow or run out of memory in some browsers.
            </div>
          )}

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
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Converting… ${progress}%`}
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
