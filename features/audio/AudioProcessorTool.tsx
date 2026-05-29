"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { formatFFmpegLoadError, loadFFmpeg } from "@/lib/ffmpeg";
import { LuMusic, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const ACCEPTED_INPUTS = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");

const MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",
};

const MODE_CONFIG = {
  normalize: {
    label: "Normalize Audio",
    actionLabel: "Normalize",
    actioningLabel: "Normalizing",
    filter: "loudnorm=I=-14:TP=-1:LRA=11",
    suffix: "-normalized",
  },
  "remove-silence": {
    label: "Remove Silence",
    actionLabel: "Remove Silence",
    actioningLabel: "Processing",
    filter:
      "silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB:stop_periods=-1:stop_silence=0.5:stop_threshold=-50dB",
    suffix: "-no-silence",
  },
} as const;

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function extOf(filename: string): string {
  return filename.split(".").pop() ?? "mp3";
}

export default function AudioProcessorTool({
  mode,
}: {
  mode: "normalize" | "remove-silence";
}) {
  const config = MODE_CONFIG[mode];

  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
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

  const process = async () => {
    if (!file) return;
    setError(null);
    setResultBlob(null);
    setProgress(0);

    let ffmpeg: FFmpeg;
    try {
      setStatus("loading"); ffmpeg = await loadFFmpeg();
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error
          ? `Failed to load ffmpeg.wasm: ${e.message}`
          : "Failed to load ffmpeg.wasm"
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

      const ext = extOf(file.name);
      const inputName = `input.${ext}`;
      const outputName = `output.${ext}`;
      const mimeType = MIME_MAP[ext] ?? "audio/mpeg";

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(["-i", inputName, "-af", config.filter, outputName]);

      const data = await ffmpeg.readFile(outputName);
      const audioData =
        typeof data === "string"
          ? new TextEncoder().encode(data).buffer
          : (data as Uint8Array).buffer.slice(0);
      const blob = new Blob([audioData as ArrayBuffer], { type: mimeType });

      ffmpeg.off("progress", progressHandler);

      try {
        await ffmpeg.deleteFile(inputName);
      } catch {
        /* ignore */
      }
      try {
        await ffmpeg.deleteFile(outputName);
      } catch {
        /* ignore */
      }

      setResultBlob(blob);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? `Processing failed: ${e.message}` : "Processing failed."
      );
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const ext = extOf(file.name);
    const mimeType = MIME_MAP[ext] ?? "audio/mpeg";
    const blob = resultBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}${config.suffix}.${ext}`,
      description: `${config.label} ${ext.toUpperCase()} audio`,
      mime: mimeType,
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
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
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
            <LuMusic className="dropzone-icon" />
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
                Download
              </Button>
            ) : (
              <Button onClick={() => void process()} disabled={isWorking}>
                {isWorking ? (
                  status === "loading"
                    ? "Loading ffmpeg.wasm…"
                    : `${config.actioningLabel}… ${progress}%`
                ) : (
                  config.actionLabel
                )}
              </Button>
            )}
          </div>

          {isWorking && (
            <div className="card">
              <div className="field-label mb-2">
                {status === "loading"
                  ? "Loading ffmpeg.wasm…"
                  : `${config.actioningLabel}… ${progress}%`}
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
              <LuMusic style={{ flexShrink: 0, color: "var(--muted-foreground)" }} />
              <span className="text-sm text-muted-foreground">
                Ready — click <strong>Download</strong> above to save.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
