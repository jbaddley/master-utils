"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import {
  LuCamera,
  LuClapperboard,
  LuDownload,
  LuPause,
  LuPlay,
  LuRefreshCw,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";
import { formatFFmpegLoadError, loadFFmpeg } from "@/lib/ffmpeg";

const MAX_DURATION = 30;
const MIN_CLIP = 0.25;

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/ogg,video/x-m4v";

function VideoDropzone({
  onFile,
  onError,
  maxDuration,
}: {
  onFile: (f: File) => void;
  onError: (msg: string) => void;
  maxDuration: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|webm|mov|avi|mkv|ogg|m4v)$/i.test(f.name)) {
      onError("Please select a video file (MP4, WebM, MOV…)");
      return;
    }
    onFile(f);
  };

  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files?.[0]); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        hidden
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }}
      />
      <div className="dropzone-inner">
        <LuClapperboard className="dropzone-icon" />
        <strong>Drop a video or click to select</strong>
        <span>MP4, WebM, MOV — up to {maxDuration}s clip</span>
      </div>
    </div>
  );
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "video";
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

export default function VideoToGifTool() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // File + object URL
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Video state
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Clip range
  const [startTime, setStartTime] = useState(0);
  const [clipDuration, setClipDuration] = useState(10);

  // Frame capture
  type FrameFormat = "png" | "jpeg" | "webp";
  const [frameFormat, setFrameFormat] = useState<FrameFormat>("png");

  // GIF settings
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);

  // Conversion
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const isWorking = status === "loading" || status === "converting";

  // Derived
  const endTime = videoDuration > 0
    ? Math.min(startTime + clipDuration, videoDuration)
    : startTime + clipDuration;
  const startFrac = videoDuration > 0 ? startTime / videoDuration : 0;
  const endFrac = videoDuration > 0 ? endTime / videoDuration : 0;
  const playheadFrac = videoDuration > 0 ? currentTime / videoDuration : 0;

  // Live refs so drag handlers never have stale closures
  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;
  const clipDurationRef = useRef(clipDuration);
  clipDurationRef.current = clipDuration;
  const videoDurationRef = useRef(videoDuration);
  videoDurationRef.current = videoDuration;

  // Object URL lifecycle
  useEffect(() => {
    if (!file) { setFileUrl(null); return; }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (f: File) => {
    setFile(f);
    setResultBlob(null);
    setResultUrl(null);
    setError(null);
    setStatus("idle");
    setVideoDuration(0);
    setCurrentTime(0);
    setStartTime(0);
    setClipDuration(10);
    setIsPlaying(false);
  };

  const reset = () => {
    setFile(null);
    setResultBlob(null);
    setResultUrl(null);
    setError(null);
    setStatus("idle");
    setVideoDuration(0);
    setCurrentTime(0);
    setStartTime(0);
    setClipDuration(10);
    setIsPlaying(false);
  };

  // ── Video events ──────────────────────────────────────────────────────────

  const seekTo = useCallback((t: number) => {
    const vid = videoRef.current;
    const dur = videoDurationRef.current;
    if (vid) vid.currentTime = Math.max(0, Math.min(dur > 0 ? dur : t, t));
  }, []);

  const onLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid || !isFinite(vid.duration)) return;
    const dur = vid.duration;
    setVideoDuration(dur);
    setClipDuration((prev) => Math.min(prev, dur, MAX_DURATION));
  };

  const onTimeUpdate = () => {
    const vid = videoRef.current;
    if (vid) setCurrentTime(vid.currentTime);
  };

  const onVideoPlay = () => setIsPlaying(true);
  const onVideoPause = () => setIsPlaying(false);
  const onVideoEnded = () => setIsPlaying(false);

  // Auto-pause at end of clip
  useEffect(() => {
    if (isPlaying && currentTime >= endTime - 0.08) {
      videoRef.current?.pause();
    }
  }, [currentTime, endTime, isPlaying]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      if (vid.currentTime >= endTime - 0.08) vid.currentTime = startTimeRef.current;
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  // ── Timeline drag ─────────────────────────────────────────────────────────

  type DragType = "start" | "end" | "range";
  const dragRef = useRef<{
    type: DragType;
    originX: number;
    origStart: number;
    origDuration: number;
    barW: number;
  } | null>(null);

  const startDrag = useCallback(
    (type: DragType, e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const bar = trackRef.current;
      if (!bar) return;
      dragRef.current = {
        type,
        originX: e.clientX,
        origStart: startTimeRef.current,
        origDuration: clipDurationRef.current,
        barW: bar.getBoundingClientRect().width,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onGlobalPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dur = videoDurationRef.current;
    if (dur <= 0) return;
    const dt = ((e.clientX - d.originX) / d.barW) * dur;

    if (d.type === "start") {
      // End follows start — duration stays constant
      const maxStart = Math.max(0, Math.min(dur - d.origDuration, dur - MIN_CLIP));
      const newStart = Math.max(0, Math.min(maxStart, d.origStart + dt));
      const actualDur = Math.min(d.origDuration, dur - newStart, MAX_DURATION);
      setStartTime(newStart);
      setClipDuration(Math.max(MIN_CLIP, actualDur));
      seekTo(newStart);
    } else if (d.type === "end") {
      // Start fixed, end moves — adjusts duration input
      const maxEnd = Math.min(dur, d.origStart + MAX_DURATION);
      const minEnd = d.origStart + MIN_CLIP;
      const newEnd = Math.max(minEnd, Math.min(maxEnd, d.origStart + d.origDuration + dt));
      setClipDuration(newEnd - d.origStart);
      seekTo(newEnd);
    } else {
      // Range: both move, duration constant
      const maxStart = Math.max(0, dur - d.origDuration);
      const newStart = Math.max(0, Math.min(maxStart, d.origStart + dt));
      setStartTime(newStart);
      seekTo(newStart);
    }
  }, [seekTo]);

  const onGlobalPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
    };
  }, [onGlobalPointerMove, onGlobalPointerUp]);

  // Click on empty track area → seek only (no handle movement)
  const onTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragRef.current) return;
      const bar = trackRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(frac * videoDurationRef.current);
    },
    [seekTo],
  );

  // ── Input handlers ────────────────────────────────────────────────────────

  const onStartInput = (val: string) => {
    const s = Math.max(0, Math.min(parseFloat(val) || 0, Math.max(0, videoDuration - MIN_CLIP)));
    setStartTime(s);
    seekTo(s);
  };

  const onDurationInput = (val: string) => {
    const d = Math.max(MIN_CLIP, Math.min(parseFloat(val) || MIN_CLIP, MAX_DURATION));
    setClipDuration(d);
  };

  // ── Frame capture ─────────────────────────────────────────────────────────

  const captureFrame = () => {
    const vid = videoRef.current;
    if (!vid || !file || vid.videoWidth === 0) return;
    const mime = frameFormat === "jpeg" ? "image/jpeg"
      : frameFormat === "webp" ? "image/webp"
      : "image/png";
    const quality = frameFormat === "jpeg" ? 0.92 : undefined;
    const t = currentTime;
    const ts = `${Math.floor(t / 60)}m${(t % 60).toFixed(1).replace(".", "s")}`;
    void saveAs({
      suggestedName: `${baseName(file.name)}_${ts}.${frameFormat}`,
      description: `Video Frame (${frameFormat.toUpperCase()})`,
      mime,
      ext: `.${frameFormat}`,
      getBlob: () =>
        new Promise<Blob>((resolve, reject) => {
          const canvas = document.createElement("canvas");
          canvas.width = vid.videoWidth;
          canvas.height = vid.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("No 2D context")); return; }
          ctx.drawImage(vid, 0, 0);
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Failed to encode frame"))),
            mime,
            quality,
          );
        }),
    });
  };

  // ── Conversion ────────────────────────────────────────────────────────────

  const convert = async () => {
    if (!file) return;
    const clipDur = Math.min(clipDuration, MAX_DURATION, videoDuration > 0 ? videoDuration - startTime : clipDuration);
    if (clipDur < MIN_CLIP) { setError("Clip is too short."); return; }
    setError(null); setResultBlob(null); setResultUrl(null); setProgress(0);
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
      const progressHandler = ({ progress: p }: { progress: number }) =>
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      ffmpeg.on("progress", progressHandler);
      const inputExt = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
      const inputName = `input.${inputExt}`;
      const paletteName = "palette.png";
      const outputName = "output.gif";
      const ss = startTime.toFixed(3);
      const t = clipDur.toFixed(3);
      const filter = `fps=${fps},scale=${width}:-1:flags=lanczos`;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(["-ss", ss, "-t", t, "-i", inputName, "-vf", `${filter},palettegen`, "-y", paletteName]);
      await ffmpeg.exec(["-ss", ss, "-t", t, "-i", inputName, "-i", paletteName, "-lavfi", `${filter}[x];[x][1:v]paletteuse`, "-y", outputName]);
      const raw = await ffmpeg.readFile(outputName);
      const data = typeof raw === "string"
        ? new TextEncoder().encode(raw).buffer
        : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([data as ArrayBuffer], { type: "image/gif" });
      ffmpeg.off("progress", progressHandler);
      for (const name of [inputName, paletteName, outputName]) {
        try { await ffmpeg.deleteFile(name); } catch { /* ignore */ }
      }
      const url = URL.createObjectURL(blob);
      setResultBlob(blob); setResultUrl(url); setProgress(100); setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "GIF conversion failed.");
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const blob = resultBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}.gif`,
      description: "GIF Animation",
      mime: "image/gif",
      ext: ".gif",
      getBlob: () => blob,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!file) {
    return (
      <div className="tool-ui">
        <VideoDropzone onFile={handleFile} onError={setError} maxDuration={MAX_DURATION} />
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <Button variant="outline" size="sm" onClick={reset} disabled={isWorking}>
          <LuRefreshCw /> Change file
        </Button>
        <span className="gif-filename">{file.name}</span>
        <div className="toolbar-spacer" />
        {status === "done" ? (
          <Button onClick={download}>
            <LuDownload />
            Download GIF{resultBlob ? ` (${(resultBlob.size / 1024).toFixed(0)} KB)` : ""}
          </Button>
        ) : (
          <Button onClick={() => void convert()} disabled={isWorking}>
            {isWorking
              ? status === "loading" ? "Loading ffmpeg…" : `Converting… ${progress}%`
              : "Convert to GIF"}
          </Button>
        )}
      </div>

      {/* ── Video preview ── */}
      {fileUrl && (
        <div className="gif-preview">
          <video
            ref={videoRef}
            src={fileUrl}
            className="gif-video"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onPlay={onVideoPlay}
            onPause={onVideoPause}
            onEnded={onVideoEnded}
            preload="metadata"
            playsInline
          />
          <button
            className="gif-play-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            type="button"
          >
            {isPlaying ? <LuPause size={20} /> : <LuPlay size={20} />}
          </button>
          {/* Current time display */}
          <span className="gif-current-time">{fmtTime(currentTime)}</span>
        </div>
      )}

      {/* ── Save frame ── */}
      {videoDuration > 0 && (
        <div className="gif-frame-capture">
          <LuCamera size={14} />
          <span className="gif-frame-label">Save frame as</span>
          <select
            className="gif-select gif-frame-fmt"
            value={frameFormat}
            onChange={(e) => setFrameFormat(e.target.value as FrameFormat)}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
          <Button variant="outline" size="sm" onClick={captureFrame}>
            <LuCamera size={14} />
            Save Frame
          </Button>
        </div>
      )}

      {/* ── Timeline scrubber ── */}
      {videoDuration > 0 && (
        <div className="gif-timeline">
          <div className="gif-timeline-info">
            <span className="gif-range-label">
              {fmtTime(startTime)}
              <span className="gif-range-arrow"> → </span>
              {fmtTime(endTime)}
            </span>
            <span className="gif-duration-badge">{clipDuration.toFixed(1)}s</span>
            <span className="gif-total-time">{fmtTime(videoDuration)}</span>
          </div>

          {/* Track */}
          <div className="gif-track" ref={trackRef} onClick={onTrackClick}>

            {/* Dimmed: before selection */}
            <div
              className="gif-track-dim"
              style={{ left: 0, width: `${startFrac * 100}%` }}
            />
            {/* Dimmed: after selection */}
            <div
              className="gif-track-dim"
              style={{ left: `${endFrac * 100}%`, right: 0 }}
            />

            {/* Selection band — drag to move entire range */}
            <div
              className="gif-selection"
              style={{
                left: `${startFrac * 100}%`,
                width: `${Math.max(0, endFrac - startFrac) * 100}%`,
              }}
              onPointerDown={(e) => startDrag("range", e)}
            />

            {/* Start handle */}
            <div
              className="gif-handle gif-handle-start"
              style={{ left: `${startFrac * 100}%` }}
              onPointerDown={(e) => startDrag("start", e)}
              title={`Start: ${fmtTime(startTime)}`}
            >
              <span className="gif-handle-label">{fmtTime(startTime)}</span>
            </div>

            {/* End handle */}
            <div
              className="gif-handle gif-handle-end"
              style={{ left: `${endFrac * 100}%` }}
              onPointerDown={(e) => startDrag("end", e)}
              title={`End: ${fmtTime(endTime)}`}
            >
              <span className="gif-handle-label">{fmtTime(endTime)}</span>
            </div>

            {/* Playhead */}
            <div className="gif-playhead" style={{ left: `${playheadFrac * 100}%` }} />
          </div>

          <div className="gif-track-ticks">
            <span>0:00.0</span>
            <span>{fmtTime(videoDuration)}</span>
          </div>
        </div>
      )}

      {/* ── Settings ── */}
      <section className="card settings">
        <label className="field">
          <span className="field-label">Start time (s)</span>
          <input
            type="number"
            className="gif-input"
            min={0}
            max={videoDuration > 0 ? (videoDuration - MIN_CLIP).toFixed(2) : undefined}
            step={0.1}
            value={startTime.toFixed(1)}
            onChange={(e) => onStartInput(e.target.value)}
            disabled={isWorking}
          />
        </label>
        <label className="field">
          <span className="field-label">Duration (max {MAX_DURATION}s)</span>
          <input
            type="number"
            className="gif-input"
            min={MIN_CLIP}
            max={MAX_DURATION}
            step={0.5}
            value={clipDuration.toFixed(1)}
            onChange={(e) => onDurationInput(e.target.value)}
            disabled={isWorking}
          />
        </label>
        <label className="field">
          <span className="field-label">Frame rate</span>
          <select className="gif-select" value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={isWorking}>
            <option value={6}>6 FPS — smallest file</option>
            <option value={10}>10 FPS — recommended</option>
            <option value={15}>15 FPS — smoother</option>
            <option value={24}>24 FPS — cinema quality</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Output width</span>
          <select className="gif-select" value={width} onChange={(e) => setWidth(Number(e.target.value))} disabled={isWorking}>
            <option value={320}>320px — tiny</option>
            <option value={480}>480px — standard</option>
            <option value={640}>640px — large</option>
            <option value={800}>800px — extra large</option>
          </select>
        </label>
      </section>

      {/* ── Progress ── */}
      {isWorking && (
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>
            {status === "loading" ? "Loading ffmpeg.wasm…" : `Converting… ${progress}%`}
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${status === "loading" ? 10 : progress}%`, background: "var(--primary)", borderRadius: 3, transition: "width 0.2s" }} />
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {resultUrl && (
        <div style={{ textAlign: "center", padding: "0.5rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="GIF preview" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: "var(--radius-sm)" }} />
        </div>
      )}
    </div>
  );
}
