"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuClapperboard, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

const ACCEPTED_INPUTS = ["mp4", "webm", "mov"];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");

const FPS_OPTIONS = [10, 15, 20, 25];
const WIDTH_OPTIONS = [320, 480, 640];

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export default function VideoToGifTool() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fps, setFps] = useState(15);
  const [maxWidth, setMaxWidth] = useState(480);
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

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Pass 1: generate palette
      await ffmpeg.exec([
        "-i", inputName,
        "-vf", `fps=${fps},scale=${maxWidth}:-1:flags=lanczos,palettegen`,
        "palette.png",
      ]);

      // Pass 2: generate GIF using palette
      await ffmpeg.exec([
        "-i", inputName,
        "-i", "palette.png",
        "-filter_complex", `fps=${fps},scale=${maxWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
        "-loop", "0",
        "output.gif",
      ]);

      const data = await ffmpeg.readFile("output.gif");
      const raw = typeof data === "string" ? new TextEncoder().encode(data).buffer : (data as Uint8Array).buffer.slice(0);
      const blob = new Blob([raw as ArrayBuffer], { type: "image/gif" });

      ffmpeg.off("progress", progressHandler);

      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile("palette.png"); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile("output.gif"); } catch { /* ignore */ }

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
      suggestedName: `${baseName(file.name)}.gif`,
      description: "Animated GIF",
      mime: "image/gif",
      ext: ".gif",
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
            <LuClapperboard className="dropzone-icon" />
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
                Download GIF
              </Button>
            ) : (
              <Button onClick={() => void convert()} disabled={isWorking}>
                {isWorking ? (
                  status === "loading" ? "Loading ffmpeg.wasm…" : `Converting… ${progress}%`
                ) : (
                  "Convert to GIF"
                )}
              </Button>
            )}
          </div>

          <div className="card" style={{ color: "var(--warning, #b45309)", fontSize: "0.875rem" }}>
            Note: For best results keep clips under 30 seconds. GIF files can be large — lower FPS and width reduce file size.
          </div>

          <section className="card settings">
            <label className="field">
              <span className="field-label">Frame rate (FPS)</span>
              <select
                value={fps}
                onChange={(e) => {
                  setFps(Number(e.target.value));
                  setResultBlob(null);
                  setStatus("idle");
                }}
                disabled={isWorking}
              >
                {FPS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f} fps
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Max width (pixels)</span>
              <select
                value={maxWidth}
                onChange={(e) => {
                  setMaxWidth(Number(e.target.value));
                  setResultBlob(null);
                  setStatus("idle");
                }}
                disabled={isWorking}
              >
                {WIDTH_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}px
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
              <LuClapperboard style={{ flexShrink: 0, color: "var(--muted-foreground)" }} />
              <span className="text-sm text-muted-foreground">
                Ready — click <strong>Download GIF</strong> above to save.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
