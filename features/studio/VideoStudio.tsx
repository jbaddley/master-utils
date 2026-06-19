"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import {
  LuClapperboard,
  LuDownload,
  LuFilm,
  LuGauge,
  LuImage,
  LuInfo,
  LuMusic,
  LuPause,
  LuPlay,
  LuRedo2,
  LuScissors,
  LuUndo2,
  LuVideo,
  LuVolumeX,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Button } from "@/components/ui/button";
import { loadFFmpeg } from "@/lib/ffmpeg";
import { saveAs } from "@/lib/download";
import { formatBytes } from "@/lib/format";

/* ---------- types ---------- */

type Snapshot = {
  blob: Blob;
  label: string;
  ext: string;
  name: string;
};

type ToolId =
  | "convert"
  | "trim"
  | "compress"
  | "mute"
  | "extract"
  | "gif"
  | "thumbnail"
  | "info";

const TOOLS: { id: ToolId; label: string; icon: IconType }[] = [
  { id: "convert", label: "Convert", icon: LuFilm },
  { id: "trim", label: "Trim", icon: LuScissors },
  { id: "compress", label: "Compress", icon: LuGauge },
  { id: "mute", label: "Mute", icon: LuVolumeX },
  { id: "extract", label: "Extract Audio", icon: LuMusic },
  { id: "gif", label: "To GIF", icon: LuClapperboard },
  { id: "thumbnail", label: "Thumbnail", icon: LuImage },
  { id: "info", label: "Info", icon: LuInfo },
];

const VIDEO_EXTS = ["mp4", "webm", "mov", "avi", "mkv", "m4v"];
const ACCEPT_ATTR = VIDEO_EXTS.map((e) => `.${e}`).join(",");

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
};

const QUALITY_CRF: Record<string, string> = {
  high: "23",
  medium: "28",
  low: "35",
};

const MAX_GIF_DURATION = 30;

/* ---------- helpers ---------- */

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "video";
}

function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "mp4";
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseTimeStr(s: string): string {
  const t = s.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return t;
  const parts = t.split(":").map(Number);
  if (parts.length === 2) return String(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return String(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  throw new Error(`Invalid time: "${s}". Use MM:SS or plain seconds.`);
}

async function runFfmpeg(
  inputBlob: Blob,
  inputExt: string,
  buildArgs: (inputName: string, outputName: string) => string[],
  outputExt: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  const inputName = `vstudio-in.${inputExt}`;
  const outputName = `vstudio-out.${outputExt}`;
  const mime = MIME_BY_EXT[outputExt] ?? "video/mp4";

  const handler = ({ progress: p }: { progress: number }) => {
    onProgress?.(Math.round(Math.max(0, Math.min(1, p)) * 100));
  };
  if (onProgress) ffmpeg.on("progress", handler);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));
    await ffmpeg.exec(buildArgs(inputName, outputName));
  } finally {
    if (onProgress) ffmpeg.off("progress", handler);
  }

  const data = await ffmpeg.readFile(outputName);
  const buf =
    typeof data === "string"
      ? new TextEncoder().encode(data).buffer
      : (data as Uint8Array).buffer.slice(0);

  try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

  return new Blob([buf as ArrayBuffer], { type: mime });
}

/* ---------- component ---------- */

export default function VideoStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  // convert
  const [convertFmt, setConvertFmt] = useState<"mp4" | "webm">("mp4");

  // trim
  const [trimStart, setTrimStart] = useState("0:00");
  const [trimEnd, setTrimEnd] = useState("");

  // compress
  const [compressQuality, setCompressQuality] = useState<"high" | "medium" | "low">("medium");

  // gif
  const [gifStart, setGifStart] = useState("0");
  const [gifDuration, setGifDuration] = useState("5");
  const [gifFps, setGifFps] = useState(10);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifGenerating, setGifGenerating] = useState(false);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  // extract audio
  const [audioFmt, setAudioFmt] = useState<"mp3" | "wav" | "m4a">("mp3");
  const [extracting, setExtracting] = useState(false);

  // thumbnail
  const [thumbTime, setThumbTime] = useState(0);
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  // download
  const [downloading, setDownloading] = useState(false);

  const current = history[index] ?? null;
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  // Preview URL from current snapshot
  useEffect(() => {
    if (!current) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(current.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [current]);

  // Video event listeners
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [previewUrl]);

  // Keyboard undo/redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (index < history.length - 1) {
            setIndex((i) => i + 1);
            setTool(null);
          }
        } else if (index > 0) {
          setIndex((i) => i - 1);
          setTool(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, history.length]);

  const apply = useCallback(
    (blob: Blob, ext: string, label: string) => {
      const snap: Snapshot = {
        blob,
        ext,
        label,
        name: current?.name ?? "video",
      };
      setHistory((h) => [...h.slice(0, index + 1), snap]);
      setIndex((i) => i + 1);
      setTool(null);
      setThumbBlob(null);
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
      setThumbUrl(null);
      setGifBlob(null);
      if (gifUrl) URL.revokeObjectURL(gifUrl);
      setGifUrl(null);
    },
    [index, current?.name, thumbUrl, gifUrl],
  );

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setProcessing(true);
    setProgress(0);
    setTool(null);
    setThumbBlob(null);
    setGifBlob(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setTrimEnd("");
    try {
      const buf = await file.arrayBuffer();
      const blob = new Blob([buf], {
        type: MIME_BY_EXT[extOf(file.name)] ?? file.type ?? "video/mp4",
      });
      const snap: Snapshot = {
        blob,
        ext: extOf(file.name),
        label: "Original",
        name: baseName(file.name),
      };
      setOriginalFile(file);
      setHistory([snap]);
      setIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load video.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, []);

  const withProcess = useCallback(
    async (
      label: string,
      fn: () => Promise<{ blob: Blob; ext: string }>,
    ) => {
      setError(null);
      setProcessing(true);
      setProgress(0);
      try {
        const { blob, ext } = await fn();
        apply(blob, ext, label);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Processing failed.");
      } finally {
        setProcessing(false);
        setProgress(0);
      }
    },
    [apply],
  );

  /* ---- tool operations ---- */

  const applyConvert = () => {
    if (!current) return;
    void withProcess(`Convert to ${convertFmt.toUpperCase()}`, () => {
      const args =
        convertFmt === "mp4"
          ? (i: string, o: string) => [
              "-i", i, "-c:v", "libx264", "-preset", "fast",
              "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", o,
            ]
          : (i: string, o: string) => [
              "-i", i, "-c:v", "libvpx", "-b:v", "1M", "-c:a", "libvorbis", o,
            ];
      return runFfmpeg(current.blob, current.ext, args, convertFmt, setProgress).then(
        (blob) => ({ blob, ext: convertFmt }),
      );
    });
  };

  const applyTrim = () => {
    if (!current) return;
    let ss: string;
    let to: string | null = null;
    try {
      ss = parseTimeStr(trimStart || "0");
      if (trimEnd.trim()) to = parseTimeStr(trimEnd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid time format.");
      return;
    }
    void withProcess("Trim", () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (i, o) => {
          const args = ["-i", i, "-ss", ss];
          if (to !== null) args.push("-to", to);
          args.push("-c", "copy", o);
          return args;
        },
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  const applyCompress = () => {
    if (!current) return;
    const crf = QUALITY_CRF[compressQuality];
    void withProcess(`Compress (${compressQuality})`, () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (i, o) => [
          "-i", i, "-c:v", "libx264", "-preset", "fast",
          "-crf", crf, "-c:a", "aac", "-movflags", "+faststart", o,
        ],
        "mp4",
        setProgress,
      ).then((blob) => ({ blob, ext: "mp4" })),
    );
  };

  const applyMute = () => {
    if (!current) return;
    void withProcess("Remove Audio", () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (i, o) => ["-i", i, "-an", "-c:v", "copy", o],
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  /* ---- one-shot operations (download directly) ---- */

  const extractAudio = async () => {
    if (!current) return;
    setError(null);
    setExtracting(true);
    try {
      const audioCodec =
        audioFmt === "mp3"
          ? "libmp3lame"
          : audioFmt === "wav"
            ? "pcm_s16le"
            : "aac";
      const blob = await runFfmpeg(
        current.blob,
        current.ext,
        (i, o) => ["-i", i, "-vn", "-c:a", audioCodec, o],
        audioFmt,
        setProgress,
      );
      void saveAs({
        suggestedName: `${current.name}-audio.${audioFmt}`,
        description: `Audio (${audioFmt.toUpperCase()})`,
        mime: MIME_BY_EXT[audioFmt] ?? "audio/mpeg",
        ext: `.${audioFmt}`,
        getBlob: () => blob,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audio extraction failed.");
    } finally {
      setExtracting(false);
      setProgress(0);
    }
  };

  const generateGif = async () => {
    if (!current) return;
    setError(null);
    setGifGenerating(true);
    if (gifUrl) { URL.revokeObjectURL(gifUrl); setGifUrl(null); }
    setGifBlob(null);
    try {
      const d = parseFloat(gifDuration) || 5;
      if (d > MAX_GIF_DURATION) {
        setError(`GIF duration capped at ${MAX_GIF_DURATION}s.`);
        return;
      }
      const ss = gifStart || "0";
      const t = String(Math.min(d, MAX_GIF_DURATION));
      const filter = `fps=${gifFps},scale=${gifWidth}:-1:flags=lanczos`;
      const ffmpeg = await loadFFmpeg();
      const inName = `vstudio-gif-in.${current.ext}`;
      const palName = "vstudio-palette.png";
      const outName = "vstudio-out.gif";

      await ffmpeg.writeFile(inName, await fetchFile(current.blob));
      await ffmpeg.exec(["-ss", ss, "-t", t, "-i", inName, "-vf", `${filter},palettegen`, "-y", palName]);
      await ffmpeg.exec(["-ss", ss, "-t", t, "-i", inName, "-i", palName, "-lavfi", `${filter}[x];[x][1:v]paletteuse`, "-y", outName]);

      const raw = await ffmpeg.readFile(outName);
      const buf =
        typeof raw === "string"
          ? new TextEncoder().encode(raw).buffer
          : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([buf as ArrayBuffer], { type: "image/gif" });

      try { await ffmpeg.deleteFile(inName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(palName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }

      const url = URL.createObjectURL(blob);
      setGifBlob(blob);
      setGifUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GIF generation failed.");
    } finally {
      setGifGenerating(false);
      setProgress(0);
    }
  };

  const extractThumbnail = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !current) return;
    if (thumbUrl) { URL.revokeObjectURL(thumbUrl); setThumbUrl(null); }
    setThumbBlob(null);

    const doExtract = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setThumbBlob(blob);
        setThumbUrl(url);
      }, "image/png");
    };

    video.currentTime = thumbTime;
    video.onseeked = () => {
      video.onseeked = null;
      doExtract();
    };
  }, [current, thumbTime, thumbUrl]);

  const downloadThumbnail = () => {
    if (!current || !thumbBlob) return;
    const blob = thumbBlob;
    void saveAs({
      suggestedName: `${current.name}-thumbnail.png`,
      description: "PNG thumbnail",
      mime: "image/png",
      ext: ".png",
      getBlob: () => blob,
    });
  };

  const downloadGif = () => {
    if (!current || !gifBlob) return;
    const blob = gifBlob;
    void saveAs({
      suggestedName: `${current.name}.gif`,
      description: "Animated GIF",
      mime: "image/gif",
      ext: ".gif",
      getBlob: () => blob,
    });
  };

  const download = async () => {
    if (!current) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = current.blob;
      const ext = current.ext;
      void saveAs({
        suggestedName: `${current.name}.${ext}`,
        description: `${ext.toUpperCase()} video`,
        mime: MIME_BY_EXT[ext] ?? "video/mp4",
        ext: `.${ext}`,
        getBlob: () => blob,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  };

  const seekTo = (t: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = t;
    setCurrentTime(t);
  };

  const undo = () => {
    if (!canUndo) return;
    setIndex((i) => i - 1);
    setTool(null);
  };

  const redo = () => {
    if (!canRedo) return;
    setIndex((i) => i + 1);
    setTool(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void loadFile(f);
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.35rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--foreground)",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  };

  /* ---- dropzone ---- */

  if (!current) {
    return (
      <div className="studio">
        {error && <div className="error">{error}</div>}
        <div
          className="dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = "";
            }}
          />
          <div className="dropzone-inner">
            <LuVideo className="dropzone-icon" />
            <strong>Drop a video to start editing</strong>
            <span>MP4, WebM, MOV, AVI, MKV — processing stays in your browser</span>
          </div>
        </div>
        {processing && <div className="studio-loading">Loading…</div>}
      </div>
    );
  }

  /* ---- studio shell ---- */

  return (
    <div className="studio">
      {error && <div className="error">{error}</div>}

      <div className="studio-shell">
        {/* Topbar */}
        <div className="studio-topbar">
          <div className="studio-file">
            <strong title={originalFile?.name ?? current.name}>
              {originalFile?.name ?? current.name}
            </strong>
            <span>
              {duration > 0 ? formatTime(duration) : "—"}
              {history.length > 1
                ? ` · ${history.length - 1} edit${history.length > 2 ? "s" : ""}`
                : ""}
              {" · "}
              {formatBytes(current.blob.size)}
            </span>
          </div>
          <div className="studio-topbar-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <LuUndo2 />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <LuRedo2 />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              onClick={() => void download()}
              disabled={downloading || processing}
            >
              <LuDownload />
              {downloading ? "Saving…" : "Download"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="studio-body">
          {/* Left rail */}
          <nav className="studio-rail" aria-label="Video tools">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`studio-rail-btn${tool === id ? " is-active" : ""}`}
                onClick={() => setTool((t) => (t === id ? null : id))}
                aria-pressed={tool === id}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Viewport */}
          <div className="studio-viewport studio-video-viewport">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={previewUrl ?? undefined}
              style={{
                width: "100%",
                maxHeight: 380,
                background: "#000",
                borderRadius: "var(--radius-sm)",
                display: "block",
              }}
              preload="metadata"
              onLoadedMetadata={() => {
                const el = videoRef.current;
                if (el) {
                  setDuration(el.duration);
                  setTrimEnd(formatTime(el.duration));
                  setThumbTime(0);
                }
              }}
            />

            {/* Scrubber / transport */}
            {duration > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlay}
                  aria-label={playing ? "Pause" : "Play"}
                  style={{ flexShrink: 0 }}
                >
                  {playing ? <LuPause /> : <LuPlay />}
                </Button>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    minWidth: 48,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    minWidth: 48,
                    textAlign: "right",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {formatTime(duration)}
                </span>
              </div>
            )}

            {/* Progress */}
            {processing && (
              <div
                style={{
                  height: 4,
                  background: "var(--border)",
                  borderRadius: 2,
                  overflow: "hidden",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress || 10}%`,
                    background: "var(--primary)",
                    borderRadius: 2,
                    transition: "width 0.2s",
                  }}
                />
              </div>
            )}

            {/* Hidden canvas for thumbnail extraction */}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>

          {/* Right sidebar */}
          <aside className="studio-side">
            {/* History */}
            {history.length > 1 && (
              <section className="studio-card">
                <h3 className="studio-card-title">History</h3>
                <ol
                  style={{
                    margin: 0,
                    padding: "0 0 0 1.1em",
                    fontSize: 12,
                    lineHeight: 1.9,
                  }}
                >
                  {history.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        cursor: "pointer",
                        fontWeight: i === index ? 600 : 400,
                        color:
                          i === index
                            ? "var(--primary)"
                            : "var(--foreground)",
                        opacity: i > index ? 0.4 : 1,
                      }}
                      onClick={() => {
                        setIndex(i);
                        setTool(null);
                      }}
                    >
                      {s.label}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {!tool && (
              <section className="studio-card">
                <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  Select a tool from the left rail to get started.
                </p>
              </section>
            )}

            {/* Convert */}
            {tool === "convert" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Convert</h3>
                <label className="field">
                  <span className="field-label">Output format</span>
                  <select
                    value={convertFmt}
                    onChange={(e) =>
                      setConvertFmt(e.target.value as "mp4" | "webm")
                    }
                    disabled={processing}
                    style={inputStyle}
                  >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="webm">WebM (VP8)</option>
                  </select>
                </label>
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={applyConvert}
                    disabled={processing}
                  >
                    {processing ? `Converting… ${progress}%` : "Convert"}
                  </Button>
                </div>
              </section>
            )}

            {/* Trim */}
            {tool === "trim" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Trim</h3>
                <label className="field">
                  <span className="field-label">Start time</span>
                  <input
                    type="text"
                    value={trimStart}
                    placeholder="0:00 or seconds"
                    disabled={processing}
                    onChange={(e) => setTrimStart(e.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label className="field">
                  <span className="field-label">End time (blank = end)</span>
                  <input
                    type="text"
                    value={trimEnd}
                    placeholder="MM:SS or seconds"
                    disabled={processing}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    style={inputStyle}
                  />
                </label>
                {duration > 0 && (
                  <p className="studio-hint">
                    Duration: {formatTime(duration)}
                  </p>
                )}
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={applyTrim}
                    disabled={processing}
                  >
                    {processing ? `Trimming… ${progress}%` : "Apply Trim"}
                  </Button>
                </div>
              </section>
            )}

            {/* Compress */}
            {tool === "compress" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Compress</h3>
                <label className="field">
                  <span className="field-label">Quality</span>
                  <select
                    value={compressQuality}
                    onChange={(e) =>
                      setCompressQuality(
                        e.target.value as "high" | "medium" | "low",
                      )
                    }
                    disabled={processing}
                    style={inputStyle}
                  >
                    <option value="high">High — best quality</option>
                    <option value="medium">
                      Medium — balanced (recommended)
                    </option>
                    <option value="low">Low — smallest file</option>
                  </select>
                </label>
                <p className="studio-hint">Re-encodes to H.264 MP4.</p>
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={applyCompress}
                    disabled={processing}
                  >
                    {processing
                      ? `Compressing… ${progress}%`
                      : "Compress"}
                  </Button>
                </div>
              </section>
            )}

            {/* Mute */}
            {tool === "mute" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Remove Audio</h3>
                <p className="studio-hint">
                  Strips the audio track from the video. The video stream is
                  copied without re-encoding.
                </p>
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={applyMute}
                    disabled={processing}
                  >
                    {processing
                      ? `Processing… ${progress}%`
                      : "Remove Audio"}
                  </Button>
                </div>
              </section>
            )}

            {/* Extract Audio */}
            {tool === "extract" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Extract Audio</h3>
                <label className="field">
                  <span className="field-label">Output format</span>
                  <select
                    value={audioFmt}
                    onChange={(e) =>
                      setAudioFmt(e.target.value as "mp3" | "wav" | "m4a")
                    }
                    disabled={extracting}
                    style={inputStyle}
                  >
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV (lossless)</option>
                    <option value="m4a">M4A / AAC</option>
                  </select>
                </label>
                <p className="studio-hint">
                  Downloads the audio track. The video is not modified.
                </p>
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={() => void extractAudio()}
                    disabled={extracting}
                  >
                    {extracting
                      ? "Extracting…"
                      : `Extract & Download ${audioFmt.toUpperCase()}`}
                  </Button>
                </div>
              </section>
            )}

            {/* To GIF */}
            {tool === "gif" && (
              <section className="studio-card">
                <h3 className="studio-card-title">To GIF</h3>
                <label className="field">
                  <span className="field-label">Start (seconds)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={gifStart}
                    onChange={(e) => {
                      setGifStart(e.target.value);
                      setGifBlob(null);
                    }}
                    disabled={gifGenerating}
                    style={inputStyle}
                  />
                </label>
                <label className="field">
                  <span className="field-label">
                    Duration (max {MAX_GIF_DURATION}s)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_GIF_DURATION}
                    step={1}
                    value={gifDuration}
                    onChange={(e) => {
                      setGifDuration(e.target.value);
                      setGifBlob(null);
                    }}
                    disabled={gifGenerating}
                    style={inputStyle}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Frame rate</span>
                  <select
                    value={gifFps}
                    onChange={(e) => {
                      setGifFps(Number(e.target.value));
                      setGifBlob(null);
                    }}
                    disabled={gifGenerating}
                    style={inputStyle}
                  >
                    <option value={6}>6 FPS — smallest</option>
                    <option value={10}>10 FPS — recommended</option>
                    <option value={15}>15 FPS — smoother</option>
                    <option value={24}>24 FPS — cinema</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Width</span>
                  <select
                    value={gifWidth}
                    onChange={(e) => {
                      setGifWidth(Number(e.target.value));
                      setGifBlob(null);
                    }}
                    disabled={gifGenerating}
                    style={inputStyle}
                  >
                    <option value={320}>320px</option>
                    <option value={480}>480px — standard</option>
                    <option value={640}>640px</option>
                    <option value={800}>800px</option>
                  </select>
                </label>
                <div className="studio-tool-actions">
                  {gifBlob ? (
                    <Button size="sm" onClick={downloadGif}>
                      <LuDownload />
                      Download GIF ({(gifBlob.size / 1024).toFixed(0)} KB)
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => void generateGif()}
                      disabled={gifGenerating}
                    >
                      {gifGenerating ? "Generating…" : "Generate GIF"}
                    </Button>
                  )}
                </div>
                {gifUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gifUrl}
                    alt="GIF preview"
                    style={{
                      marginTop: 8,
                      width: "100%",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                )}
              </section>
            )}

            {/* Thumbnail */}
            {tool === "thumbnail" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Extract Frame</h3>
                <p className="studio-hint">
                  Drag the scrubber to pick a time, then extract that frame as
                  a PNG.
                </p>
                <label className="field">
                  <span className="field-label">
                    Time: {formatTime(thumbTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={thumbTime}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setThumbTime(t);
                      const el = videoRef.current;
                      if (el) el.currentTime = t;
                      setThumbBlob(null);
                    }}
                    style={{ width: "100%" }}
                  />
                </label>
                <div className="studio-tool-actions">
                  {thumbBlob ? (
                    <Button size="sm" onClick={downloadThumbnail}>
                      <LuDownload />
                      Download PNG
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={extractThumbnail}
                      disabled={duration === 0}
                    >
                      Extract Frame
                    </Button>
                  )}
                </div>
                {thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl}
                    alt="Extracted frame"
                    style={{
                      marginTop: 8,
                      width: "100%",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                )}
              </section>
            )}

            {/* Info */}
            {tool === "info" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Info</h3>
                <dl
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    File
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontFamily: "ui-monospace, monospace",
                      wordBreak: "break-all",
                      fontSize: 12,
                    }}
                  >
                    {current.name}.{current.ext}
                  </dd>
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                    }}
                  >
                    Size
                  </dt>
                  <dd style={{ margin: 0 }}>
                    {formatBytes(current.blob.size)}
                  </dd>
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                    }}
                  >
                    Duration
                  </dt>
                  <dd style={{ margin: 0 }}>
                    {duration > 0 ? formatTime(duration) : "—"}
                  </dd>
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                    }}
                  >
                    Format
                  </dt>
                  <dd style={{ margin: 0 }}>{current.ext.toUpperCase()}</dd>
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                    }}
                  >
                    Edits
                  </dt>
                  <dd style={{ margin: 0 }}>
                    {index} / {history.length - 1}
                  </dd>
                </dl>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
