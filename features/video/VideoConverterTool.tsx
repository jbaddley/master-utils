"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { formatFFmpegLoadError, loadFFmpeg } from "@/lib/ffmpeg";
import { LuVideo, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";
import { VIDEO_LABEL, VIDEO_OUTPUT_BY_INPUT } from "@/lib/media-conversions";

type OutputFmt = "mp4" | "webm" | "ogg";

const FMT_MIME: Record<OutputFmt, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
};

const FMT_LABEL: Record<OutputFmt, string> = {
  mp4: "MP4 — H.264, widely compatible",
  webm: "WebM — VP9, open format",
  ogg: "OGG — Theora, open & compact",
};

const DEFAULT_ACCEPTED = ["mp4", "webm", "mov", "avi", "mkv", "ogg"];

const LARGE_FILE_BYTES = 300 * 1024 * 1024;

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function extOf(filename: string): string {
  const m = filename.match(/\.([a-z0-9]+)$/i);
  return m ? m[1]!.toLowerCase() : "";
}

function buildArgs(inputName: string, outputFmt: OutputFmt): string[] {
  switch (outputFmt) {
    case "mp4":
      return ["-i", inputName, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "output.mp4"];
    case "webm":
      return ["-i", inputName, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-c:a", "libvorbis", "output.webm"];
    case "ogg":
      return ["-i", inputName, "-c:v", "libtheora", "-q:v", "5", "-c:a", "libvorbis", "output.ogg"];
  }
}

export default function VideoConverterTool({
  initialFrom,
  initialTo = "mp4",
  acceptedInputs,
}: {
  initialFrom?: string;
  initialTo?: string;
  acceptedInputs?: string[];
}) {
  const accepted = acceptedInputs ?? DEFAULT_ACCEPTED;
  const acceptAttr = accepted.map((ext) => `.${ext}`).join(",");

  const [inputKey, setInputKey] = useState(initialFrom ?? "mp4");
  const [outputFmt, setOutputFmt] = useState<OutputFmt>(
    initialTo in FMT_MIME ? (initialTo as OutputFmt) : "mp4",
  );

  const allowedOutputs = useMemo(() => {
    const keys = VIDEO_OUTPUT_BY_INPUT[inputKey] ?? VIDEO_OUTPUT_BY_INPUT.mp4!;
    return keys.filter((k): k is OutputFmt => k in FMT_MIME);
  }, [inputKey]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!allowedOutputs.includes(outputFmt)) {
      setOutputFmt(allowedOutputs[0] ?? "mp4");
    }
  }, [allowedOutputs, outputFmt]);

  useEffect(() => {
    if (initialFrom) setInputKey(initialFrom);
    if (initialTo && initialTo in FMT_MIME) setOutputFmt(initialTo as OutputFmt);
  }, [initialFrom, initialTo]);

  const handleFile = (f: File) => {
    const ext = extOf(f.name);
    if (VIDEO_OUTPUT_BY_INPUT[ext]) {
      setInputKey(ext);
      const outs = VIDEO_OUTPUT_BY_INPUT[ext]!.filter((k): k is OutputFmt => k in FMT_MIME);
      if (!outs.includes(outputFmt)) setOutputFmt(outs[0] ?? "mp4");
    }
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

  const convert = async () => {
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
      const progressHandler = ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      };
      ffmpeg.on("progress", progressHandler);

      const inputExt = extOf(file.name) || "mp4";
      const inputName = `input.${inputExt}`;
      const outputName = `output.${outputFmt}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(buildArgs(inputName, outputFmt));

      const raw = await ffmpeg.readFile(outputName);
      const data =
        typeof raw === "string" ? new TextEncoder().encode(raw).buffer : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([data as ArrayBuffer], { type: FMT_MIME[outputFmt] });

      ffmpeg.off("progress", progressHandler);
      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

      setResultBlob(blob);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? `Conversion failed: ${e.message}` : "Conversion failed.");
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
  const inputLabel = VIDEO_LABEL[inputKey] ?? inputKey.toUpperCase();

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <section className="card settings">
        <div className="duo">
          <label className="field">
            <span className="field-label">Input format</span>
            <select
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setFile(null);
                setResultBlob(null);
              }}
              disabled={!!file && isWorking}
            >
              {Object.keys(VIDEO_OUTPUT_BY_INPUT).map((k) => (
                <option key={k} value={k}>
                  {VIDEO_LABEL[k] ?? k.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
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
              {allowedOutputs.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {FMT_LABEL[fmt]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

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
            <strong>Drop {inputLabel} video or click to select</strong>
            <span>Output: {allowedOutputs.map((f) => f.toUpperCase()).join(", ")}</span>
          </div>
        </div>
      ) : (
        <>
          {file.size > LARGE_FILE_BYTES && (
            <div className="card" style={{ background: "var(--warning, #fef9c3)", color: "#713f12", borderColor: "#fde047" }}>
              Large file — conversion may take several minutes on this device.
            </div>
          )}

          <div className="toolbar">
            <Button variant="outline" onClick={reset} disabled={isWorking}>
              <LuRefreshCw />
              Change file
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[260px]">{file.name}</span>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <Button onClick={download}>
                <LuDownload />
                Download {outputFmt.toUpperCase()}
              </Button>
            ) : (
              <Button onClick={() => void convert()} disabled={isWorking}>
                {isWorking
                  ? status === "loading"
                    ? "Loading ffmpeg.wasm…"
                    : `Converting… ${progress}%`
                  : "Convert"}
              </Button>
            )}
          </div>

          {isWorking && (
            <div className="card">
              <div className="field-label mb-2">
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Converting… ${progress}%`}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
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
        </>
      )}
    </div>
  );
}
