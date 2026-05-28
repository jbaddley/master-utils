"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuMusic, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

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

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function extOf(filename: string): string {
  return filename.split(".").pop() ?? "mp3";
}

function buildAtempoFilter(speed: number): string {
  // atempo only supports 0.5–2.0, chain for speeds > 2.0
  if (speed > 2.0) {
    return `atempo=2.0,atempo=${(speed / 2).toFixed(4)}`;
  }
  return `atempo=${speed.toFixed(4)}`;
}

export default function AudioEffectsTool({
  mode,
}: {
  mode: "speed" | "fade" | "pitch";
}) {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [dragging, setDragging] = useState(false);

  // speed mode
  const [speed, setSpeed] = useState(1.5);

  // fade mode
  const [fadeIn, setFadeIn] = useState(2);
  const [fadeOut, setFadeOut] = useState(3);

  // pitch mode
  const [semitones, setSemitones] = useState(0);

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

  const buildFilter = (): string => {
    if (mode === "speed") {
      return buildAtempoFilter(speed);
    }
    if (mode === "fade") {
      return `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=9999:d=${fadeOut}`;
    }
    // pitch
    const rate = Math.pow(2, semitones / 12);
    return `asetrate=44100*${rate.toFixed(6)},aresample=44100`;
  };

  const getSuffix = (): string => {
    if (mode === "speed") return `-speed${speed.toFixed(1)}x`;
    if (mode === "fade") return "-fade";
    return `-pitch${semitones >= 0 ? "+" : ""}${semitones}st`;
  };

  const getActionLabel = (): string => {
    if (mode === "speed") return "Apply Speed";
    if (mode === "fade") return "Apply Fade";
    return "Shift Pitch";
  };

  const getActioningLabel = (): string => {
    if (mode === "speed") return "Processing";
    if (mode === "fade") return "Processing";
    return "Processing";
  };

  const process = async () => {
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
      await ffmpeg.exec(["-i", inputName, "-af", buildFilter(), outputName]);

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
      setError(e instanceof Error ? `Processing failed: ${e.message}` : "Processing failed.");
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const ext = extOf(file.name);
    const mimeType = MIME_MAP[ext] ?? "audio/mpeg";
    const blob = resultBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}${getSuffix()}.${ext}`,
      description: `${ext.toUpperCase()} audio`,
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
                    : `${getActioningLabel()}… ${progress}%`
                ) : (
                  getActionLabel()
                )}
              </Button>
            )}
          </div>

          <section className="card settings">
            {mode === "speed" && (
              <label className="field">
                <span className="field-label">
                  Playback speed: <strong>{speed.toFixed(1)}×</strong>
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={speed}
                  onChange={(e) => {
                    setSpeed(parseFloat(e.target.value));
                    setResultBlob(null);
                    setStatus("idle");
                  }}
                  disabled={isWorking}
                />
                <span className="text-xs text-muted-foreground">0.5× (half speed) → 2.0× (double speed)</span>
              </label>
            )}

            {mode === "fade" && (
              <>
                <label className="field">
                  <span className="field-label">Fade in duration (seconds)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={fadeIn}
                    onChange={(e) => {
                      setFadeIn(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)));
                      setResultBlob(null);
                      setStatus("idle");
                    }}
                    disabled={isWorking}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Fade out duration (seconds)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={fadeOut}
                    onChange={(e) => {
                      setFadeOut(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)));
                      setResultBlob(null);
                      setStatus("idle");
                    }}
                    disabled={isWorking}
                  />
                </label>
              </>
            )}

            {mode === "pitch" && (
              <label className="field">
                <span className="field-label">
                  Pitch shift: <strong>{semitones >= 0 ? "+" : ""}{semitones} semitones</strong>
                </span>
                <input
                  type="range"
                  min={-6}
                  max={6}
                  step={1}
                  value={semitones}
                  onChange={(e) => {
                    setSemitones(parseInt(e.target.value, 10));
                    setResultBlob(null);
                    setStatus("idle");
                  }}
                  disabled={isWorking}
                />
                <span className="text-xs text-muted-foreground">
                  Pitch shift (also affects tempo slightly)
                </span>
              </label>
            )}
          </section>

          {isWorking && (
            <div className="card">
              <div className="field-label mb-2">
                {status === "loading"
                  ? "Loading ffmpeg.wasm…"
                  : `${getActioningLabel()}… ${progress}%`}
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
