"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import {
  LuActivity,
  LuDownload,
  LuGauge,
  LuInfo,
  LuLayers,
  LuMusic,
  LuPause,
  LuPlay,
  LuPlus,
  LuRedo2,
  LuScissors,
  LuUndo2,
  LuVolume2,
  LuVolumeX,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { loadFFmpeg } from "@/lib/ffmpeg";
import {
  analyzeAudioFile,
  type AudioAnalysis,
} from "@/lib/audio-analysis";
import {
  AUDIO_FMT_EXT,
  AUDIO_FMT_MIME,
  buildAtempoFilter,
  buildEncodeArgs,
  buildPitchSpeedFilter,
  baseName,
  extOf,
  type AudioOutputFmt,
} from "@/lib/audio-utils";
import { saveAs } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import AudioWaveformTrim from "./AudioWaveformTrim";
import AudioLaneTimeline, { type LaneClip } from "./AudioLaneTimeline";

/* ---------- types ---------- */

type Snapshot = {
  blob: Blob;
  label: string;
  ext: string;
  name: string;
};

type ToolId =
  | "trim"
  | "fade"
  | "speed"
  | "pitch"
  | "normalize"
  | "silence"
  | "lanes"
  | "info";

type Lane2Clip = {
  blob: Blob;
  name: string;
  ext: string;
  duration: number;
  startTime: number;
};

const TOOLS: { id: ToolId; label: string; icon: IconType }[] = [
  { id: "trim", label: "Trim", icon: LuScissors },
  { id: "fade", label: "Fade", icon: LuVolume2 },
  { id: "speed", label: "Speed", icon: LuGauge },
  { id: "pitch", label: "Pitch", icon: LuMusic },
  { id: "normalize", label: "Level", icon: LuActivity },
  { id: "silence", label: "Silence", icon: LuVolumeX },
  { id: "lanes", label: "Lanes", icon: LuLayers },
  { id: "info", label: "Info", icon: LuInfo },
];

const ACCEPTED_INPUTS = [
  "mp3", "wav", "ogg", "m4a", "flac", "aac",
  "mp4", "webm", "mov", "avi", "mkv", "m4v",
];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v"]);

const EXPORT_FORMATS: { key: AudioOutputFmt; label: string }[] = [
  { key: "mp3", label: "MP3" },
  { key: "wav", label: "WAV (lossless)" },
  { key: "ogg", label: "OGG" },
  { key: "m4a", label: "M4A / AAC" },
  { key: "flac", label: "FLAC" },
];

const MIME_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",
};

/* ---------- helpers ---------- */

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ds = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ds}`;
}

function blobMime(ext: string): string {
  return MIME_BY_EXT[ext] ?? "audio/mpeg";
}

function isVideoFile(name: string): boolean {
  return VIDEO_EXTS.has(extOf(name));
}

async function runFfmpeg(
  inputBlob: Blob,
  inputExt: string,
  buildArgs: (inputName: string, outputName: string) => string[],
  outputExt: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  const inputName = `studio-in.${inputExt}`;
  const outputName = `studio-out.${outputExt}`;

  if (onProgress) {
    const handler = ({ progress: p }: { progress: number }) => {
      onProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
    };
    ffmpeg.on("progress", handler);
    try {
      await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));
      await ffmpeg.exec(buildArgs(inputName, outputName));
    } finally {
      ffmpeg.off("progress", handler);
    }
  } else {
    await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));
    await ffmpeg.exec(buildArgs(inputName, outputName));
  }

  const data = await ffmpeg.readFile(outputName);
  const buf =
    typeof data === "string"
      ? new TextEncoder().encode(data).buffer
      : (data as Uint8Array).buffer.slice(0);

  try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

  return new Blob([buf as ArrayBuffer], { type: blobMime(outputExt) });
}

async function extractAudioFromVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  const ext = extOf(file.name);
  const outExt = "wav";
  const blob = await runFfmpeg(
    file,
    ext,
    (input, output) => ["-i", input, "-vn", output],
    outExt,
    onProgress,
  );
  return { blob, ext: outExt };
}

/* ---------- component ---------- */

export default function AudioStudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lane2AudioRef = useRef<HTMLAudioElement>(null);
  const laneInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const [peaks, setPeaks] = useState<Float32Array>(new Float32Array(0));
  const [duration, setDuration] = useState(0);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lane2PreviewUrl, setLane2PreviewUrl] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);

  // trim
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // fade
  const [fadeIn, setFadeIn] = useState(1);
  const [fadeOut, setFadeOut] = useState(2);

  // speed / pitch
  const [speed, setSpeed] = useState(1);
  const [semitones, setSemitones] = useState(0);

  // lanes
  const [lane2, setLane2] = useState<Lane2Clip | null>(null);
  const [crossfade, setCrossfade] = useState(1.5);

  // export
  const [outputFmt, setOutputFmt] = useState<AudioOutputFmt>("mp3");
  const [downloading, setDownloading] = useState(false);

  const current = history[index] ?? null;
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const resetToolState = useCallback(() => {
    if (duration > 0) {
      setTrimStart(0);
      setTrimEnd(duration);
    }
    setFadeIn(1);
    setFadeOut(2);
    setSpeed(1);
    setSemitones(0);
    setLane2(null);
    setCrossfade(1.5);
  }, [duration]);

  const analyzeSnapshot = useCallback(async (snap: Snapshot) => {
    const file = new File([snap.blob], `${snap.name}.${snap.ext}`, {
      type: snap.blob.type || blobMime(snap.ext),
    });
    try {
      const result = await analyzeAudioFile(file, 900);
      setPeaks(result.peaks);
      setDuration(result.duration);
      setAnalysis(result);
      setTrimStart(0);
      setTrimEnd(result.duration);
    } catch {
      setPeaks(new Float32Array(0));
      setDuration(0);
      setAnalysis(null);
    }
  }, []);

  const apply = useCallback(
    (blob: Blob, ext: string, label: string) => {
      const snap: Snapshot = {
        blob,
        ext,
        label,
        name: current?.name ?? "audio",
      };
      setHistory((h) => [...h.slice(0, index + 1), snap]);
      setIndex((i) => i + 1);
      setTool(null);
      resetToolState();
      void analyzeSnapshot(snap);
    },
    [index, current?.name, resetToolState, analyzeSnapshot],
  );

  const loadFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      setProcessing(true);
      setProgress(0);
      setTool(null);
      setPlayhead(0);
      setPlaying(false);

      try {
        let blob: Blob = file;
        let ext = extOf(file.name);
        let label = "Original";

        if (isVideoFile(file.name)) {
          const extracted = await extractAudioFromVideo(file, setProgress);
          blob = extracted.blob;
          ext = extracted.ext;
          label = "Extracted from video";
        }

        const snap: Snapshot = {
          blob,
          ext,
          label,
          name: baseName(file.name),
        };

        setOriginalFile(file);
        setHistory([snap]);
        setIndex(0);
        resetToolState();
        await analyzeSnapshot(snap);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load audio file.",
        );
      } finally {
        setLoading(false);
        setProcessing(false);
        setProgress(0);
      }
    },
    [analyzeSnapshot, resetToolState],
  );

  // Preview URL for current snapshot
  useEffect(() => {
    if (!current) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(current.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [current]);

  // Preview URL for lane 2's clip
  useEffect(() => {
    if (!lane2) {
      setLane2PreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(lane2.blob);
    setLane2PreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [lane2]);

  // While previewing the Lanes tool, keep lane 2's audio playing in sync with
  // the main track so both tracks are audible together (lane 2 is otherwise
  // only baked into one file via "Mix lanes").
  useEffect(() => {
    const el2 = lane2AudioRef.current;
    if (!el2 || !lane2 || tool !== "lanes") {
      el2?.pause();
      return;
    }
    const offset = playhead - lane2.startTime;
    const inRange = offset >= 0 && offset <= lane2.duration;
    if (!playing || !inRange) {
      if (!el2.paused) el2.pause();
      return;
    }
    if (Math.abs(el2.currentTime - offset) > 0.3) {
      el2.currentTime = offset;
    }
    if (el2.paused) void el2.play();
  }, [playing, playhead, lane2, tool]);

  // Sync playhead with audio element
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => setPlayhead(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setPlayhead(0);
    };

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (index < history.length - 1) {
            setIndex((i) => i + 1);
            setTool(null);
            resetToolState();
          }
        } else if (index > 0) {
          setIndex((i) => i - 1);
          setTool(null);
          resetToolState();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, history.length, resetToolState]);

  // Re-analyze when jumping history
  useEffect(() => {
    const snap = history[index];
    if (snap) void analyzeSnapshot(snap);
  }, [index, history, analyzeSnapshot]);

  const selectTool = (id: ToolId) => {
    setTool((t) => (t === id ? null : id));
    if (id === "trim" && duration > 0) {
      setTrimStart(0);
      setTrimEnd(duration);
    }
  };

  const undo = () => {
    if (!canUndo) return;
    setIndex((i) => i - 1);
    setTool(null);
    resetToolState();
  };

  const redo = () => {
    if (!canRedo) return;
    setIndex((i) => i + 1);
    setTool(null);
    resetToolState();
  };

  const withProcess = async (label: string, fn: () => Promise<{ blob: Blob; ext: string }>) => {
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
  };

  const applyTrim = () => {
    if (!current || duration <= 0) return;
    const ss = trimStart.toFixed(3);
    const to = trimEnd.toFixed(3);
    void withProcess("Trim", () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (input, output) => ["-i", input, "-ss", ss, "-to", to, "-c", "copy", output],
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  const applyFade = () => {
    if (!current || duration <= 0) return;
    const outStart = Math.max(0, duration - fadeOut);
    const filter = `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${outStart.toFixed(3)}:d=${fadeOut}`;
    void withProcess("Fade", () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (input, output) => ["-i", input, "-af", filter, output],
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  const applySpeed = () => {
    if (!current || Math.abs(speed - 1) < 0.01) return;
    const filter = buildAtempoFilter(speed);
    void withProcess(`Speed ${speed.toFixed(1)}×`, () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (input, output) => ["-i", input, "-af", filter, output],
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  const applyPitch = () => {
    if (!current || semitones === 0) return;
    const filter = buildPitchSpeedFilter(semitones, 1);
    if (!filter) return;
    void withProcess(`Pitch ${semitones >= 0 ? "+" : ""}${semitones}st`, () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (input, output) => ["-i", input, "-af", filter, output],
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  const applyNormalize = () => {
    if (!current) return;
    void withProcess("Normalize", () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (input, output) =>
          ["-i", input, "-af", "loudnorm=I=-14:TP=-1:LRA=11", output],
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  const applySilence = () => {
    if (!current) return;
    const filter =
      "silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB:stop_periods=-1:stop_silence=0.5:stop_threshold=-50dB";
    void withProcess("Remove silence", () =>
      runFfmpeg(
        current.blob,
        current.ext,
        (input, output) => ["-i", input, "-af", filter, output],
        current.ext,
        setProgress,
      ).then((blob) => ({ blob, ext: current.ext })),
    );
  };

  const applyLanes = () => {
    if (!current || !lane2) return;

    const d0 = duration;
    const d1 = lane2.duration;
    const s1 = lane2.startTime;
    const cf = crossfade;
    const overlapStart = s1;
    const overlapEnd = Math.min(d0, s1 + d1);
    const hasOverlap = overlapEnd > overlapStart;

    void withProcess("Mix lanes", async () => {
      const ffmpeg = await loadFFmpeg();
      const in0 = `lane0.${current.ext}`;
      const in1 = `lane1.${lane2.ext}`;
      const out = `mixed.${current.ext}`;

      const handler = ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      };
      ffmpeg.on("progress", handler);

      try {
        await ffmpeg.writeFile(in0, await fetchFile(current.blob));
        await ffmpeg.writeFile(in1, await fetchFile(lane2.blob));

        let filter: string;
        if (hasOverlap && cf > 0) {
          const fadeOutSt = overlapStart.toFixed(3);
          const fadeInDur = Math.min(cf, overlapEnd - overlapStart).toFixed(3);
          filter =
            `[0:a]afade=t=out:st=${fadeOutSt}:d=${fadeInDur}[a0];` +
            `[1:a]adelay=${Math.round(s1 * 1000)}|${Math.round(s1 * 1000)},` +
            `afade=t=in:st=0:d=${fadeInDur}[a1];` +
            `[a0][a1]amix=inputs=2:duration=longest:normalize=0[out]`;
        } else {
          filter =
            `[0:a]apad=whole_dur=${(s1 + d1).toFixed(3)}[a0];` +
            `[1:a]adelay=${Math.round(s1 * 1000)}|${Math.round(s1 * 1000)}[a1];` +
            `[a0][a1]amix=inputs=2:duration=longest:normalize=0[out]`;
        }

        await ffmpeg.exec([
          "-i", in0,
          "-i", in1,
          "-filter_complex", filter,
          "-map", "[out]",
          out,
        ]);

        const data = await ffmpeg.readFile(out);
        const buf =
          typeof data === "string"
            ? new TextEncoder().encode(data).buffer
            : (data as Uint8Array).buffer.slice(0);
        const blob = new Blob([buf as ArrayBuffer], { type: blobMime(current.ext) });

        try { await ffmpeg.deleteFile(in0); } catch { /* ignore */ }
        try { await ffmpeg.deleteFile(in1); } catch { /* ignore */ }
        try { await ffmpeg.deleteFile(out); } catch { /* ignore */ }

        return { blob, ext: current.ext };
      } finally {
        ffmpeg.off("progress", handler);
      }
    });
  };

  const addLane2File = async (file: File) => {
    setError(null);
    setProcessing(true);
    setProgress(0);
    try {
      let blob: Blob = file;
      let ext = extOf(file.name);
      if (isVideoFile(file.name)) {
        const extracted = await extractAudioFromVideo(file, setProgress);
        blob = extracted.blob;
        ext = extracted.ext;
      }
      const f = new File([blob], `${baseName(file.name)}.${ext}`, {
        type: blobMime(ext),
      });
      const result = await analyzeAudioFile(f, 400);
      setLane2({
        blob,
        name: baseName(file.name),
        ext,
        duration: result.duration,
        startTime: Math.max(0, duration * 0.5),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lane clip.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  };

  const seek = (time: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = time;
    setPlayhead(time);
  };

  const download = async () => {
    if (!current) return;
    setDownloading(true);
    setError(null);
    try {
      let blob = current.blob;
      let ext = current.ext;

      if (outputFmt !== (current.ext as AudioOutputFmt)) {
        const outExt = AUDIO_FMT_EXT[outputFmt];
        blob = await runFfmpeg(
          current.blob,
          current.ext,
          (input, output) => {
            const built = buildEncodeArgs(input, outputFmt, null);
            return built.map((arg) =>
              arg === `output.${outExt}` ? output : arg,
            );
          },
          outExt,
          setProgress,
        );
        ext = outExt;
      }

      const outBlob = blob;
      void saveAs({
        suggestedName: `${current.name}-studio.${ext}`,
        description: `${ext.toUpperCase()} audio`,
        mime: AUDIO_FMT_MIME[outputFmt],
        ext: `.${ext}`,
        getBlob: () => outBlob,
        toolName: "Audio Studio",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const laneTimelineDuration = useMemo(() => {
    if (!current) return 0;
    const d0 = duration;
    const d1 = lane2?.duration ?? 0;
    const s1 = lane2?.startTime ?? 0;
    return Math.max(d0, s1 + d1, 1);
  }, [current, duration, lane2]);

  const crossfadeZone = useMemo(() => {
    if (!lane2 || duration <= 0) return { start: 0, end: 0 };
    const overlapStart = lane2.startTime;
    const overlapEnd = Math.min(duration, lane2.startTime + lane2.duration);
    return { start: overlapStart, end: overlapEnd };
  }, [lane2, duration]);

  const laneClips: LaneClip[][] = useMemo(() => {
    if (!current) return [[], []];
    const lane0: LaneClip[] = [
      {
        id: "main",
        label: current.name,
        duration,
        startTime: 0,
        color: "rgba(61, 220, 132, 0.75)",
      },
    ];
    const lane1: LaneClip[] = lane2
      ? [
          {
            id: "lane2",
            label: lane2.name,
            duration: lane2.duration,
            startTime: lane2.startTime,
            color: "rgba(99, 149, 255, 0.75)",
          },
        ]
      : [];
    return [lane0, lane1];
  }, [current, duration, lane2]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void loadFile(f);
  };

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
            <LuMusic className="dropzone-icon" />
            <strong>Drop audio or video to start editing</strong>
            <span>
              MP3, WAV, OGG, M4A, FLAC, AAC — or extract from MP4, WebM, MOV
            </span>
          </div>
        </div>
        {(loading || processing) && (
          <div className="studio-loading">
            {loading ? "Loading…" : `Processing… ${progress}%`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="studio">
      {error && <div className="error">{error}</div>}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={previewUrl ?? undefined} preload="auto" hidden />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={lane2AudioRef} src={lane2PreviewUrl ?? undefined} preload="auto" hidden />

      <div className="studio-shell">
        <div className="studio-topbar">
          <div className="studio-file">
            <strong title={originalFile?.name ?? current.name}>
              {originalFile?.name ?? current.name}
            </strong>
            <span>
              {formatTime(duration)}
              {history.length > 1
                ? ` · ${history.length - 1} edit${history.length > 2 ? "s" : ""}`
                : ""}
              {" · "}
              {formatBytes(current.blob.size)}
            </span>
          </div>
          <div className="studio-topbar-actions">
            <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} aria-label="Undo">
              <LuUndo2 />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} aria-label="Redo">
              <LuRedo2 />
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
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
            <Button size="sm" onClick={() => void download()} disabled={downloading || processing}>
              <LuDownload />
              {downloading ? "Saving…" : "Download"}
            </Button>
          </div>
        </div>

        <div className="studio-body studio-body-audio">
          <nav className="studio-rail" aria-label="Audio tools">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`studio-rail-btn${tool === id ? " is-active" : ""}`}
                onClick={() => selectTool(id)}
                aria-pressed={tool === id}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="studio-viewport studio-audio-viewport">
            <div className="studio-audio-main">
              <div className="studio-audio-transport">
                <Button variant="outline" size="sm" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                  {playing ? <LuPause /> : <LuPlay />}
                </Button>
                <span className="studio-audio-time">
                  {formatTime(playhead)} / {formatTime(duration)}
                </span>
              </div>

              <AudioWaveformTrim
                className="studio-audio-waveform"
                peaks={peaks}
                duration={duration}
                trimStart={trimStart}
                trimEnd={trimEnd}
                showTrimHandles={tool === "trim"}
                onTrimChange={
                  tool === "trim"
                    ? (s, e) => {
                        setTrimStart(s);
                        setTrimEnd(e);
                      }
                    : undefined
                }
                playhead={playhead}
                onSeek={seek}
              />

              {tool === "lanes" && (
                <AudioLaneTimeline
                  className="studio-audio-lanes"
                  totalDuration={laneTimelineDuration}
                  lanes={laneClips}
                  crossfadeStart={crossfadeZone.start}
                  crossfadeEnd={crossfadeZone.end}
                  playhead={playhead}
                  onClipMove={(_lane, clipId, startTime) => {
                    if (clipId === "lane2" && lane2) {
                      setLane2({ ...lane2, startTime });
                    }
                  }}
                />
              )}
            </div>

            {processing && (
              <div className="studio-audio-progress">
                <div
                  className="studio-audio-progress-bar"
                  style={{ width: `${progress || 12}%` }}
                />
              </div>
            )}
          </div>

          <aside className="studio-side">
            {tool === "trim" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Trim</h3>
                <p className="studio-hint">
                  Drag the green handles on the waveform to cut from the start, end, or both.
                </p>
                <p className="studio-readout">
                  {formatTime(trimStart)} → {formatTime(trimEnd)}
                  {" · "}
                  {formatTime(Math.max(0, trimEnd - trimStart))} selected
                </p>
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applyTrim} disabled={processing}>
                    Apply trim
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTool(null)}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {tool === "fade" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Fade in / out</h3>
                <label className="studio-slider-label">
                  Fade in <span>{fadeIn.toFixed(1)}s</span>
                </label>
                <Slider
                  value={[fadeIn]}
                  min={0}
                  max={10}
                  step={0.5}
                  onValueChange={(v) => setFadeIn(Array.isArray(v) ? v[0] : v)}
                />
                <label className="studio-slider-label">
                  Fade out <span>{fadeOut.toFixed(1)}s</span>
                </label>
                <Slider
                  value={[fadeOut]}
                  min={0}
                  max={10}
                  step={0.5}
                  onValueChange={(v) => setFadeOut(Array.isArray(v) ? v[0] : v)}
                />
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applyFade} disabled={processing}>
                    Apply fade
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTool(null)}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {tool === "speed" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Speed</h3>
                <label className="studio-slider-label">
                  Playback speed <span>{speed.toFixed(1)}×</span>
                </label>
                <Slider
                  value={[speed]}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onValueChange={(v) => setSpeed(Array.isArray(v) ? v[0] : v)}
                />
                <p className="studio-hint">Pitch is preserved (0.5× – 2.0×).</p>
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applySpeed} disabled={processing || Math.abs(speed - 1) < 0.01}>
                    Apply speed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTool(null)}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {tool === "pitch" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Pitch</h3>
                <label className="studio-slider-label">
                  Semitones <span>{semitones >= 0 ? "+" : ""}{semitones}</span>
                </label>
                <Slider
                  value={[semitones]}
                  min={-6}
                  max={6}
                  step={1}
                  onValueChange={(v) => setSemitones(Array.isArray(v) ? v[0] : v)}
                />
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applyPitch} disabled={processing || semitones === 0}>
                    Apply pitch
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTool(null)}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {tool === "normalize" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Normalize</h3>
                <p className="studio-hint">
                  Evens out loudness to −14 LUFS — good for podcasts and voice recordings.
                </p>
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applyNormalize} disabled={processing}>
                    Normalize
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTool(null)}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {tool === "silence" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Remove silence</h3>
                <p className="studio-hint">
                  Strips silent gaps longer than 0.5s below −50 dB.
                </p>
                <div className="studio-tool-actions">
                  <Button size="sm" onClick={applySilence} disabled={processing}>
                    Remove silence
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTool(null)}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {tool === "lanes" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Multi-track lanes</h3>
                <p className="studio-hint">
                  Lane 1 is your current audio. Add a second track on lane 2, drag it horizontally
                  to set its start time, and crossfade where they overlap.
                </p>
                {!lane2 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => laneInputRef.current?.click()}
                    disabled={processing}
                  >
                    <LuPlus />
                    Add track to lane 2
                  </Button>
                ) : (
                  <>
                    <p className="studio-readout">
                      Lane 2: {lane2.name} · starts {formatTime(lane2.startTime)}
                    </p>
                    <label className="studio-slider-label">
                      Crossfade <span>{crossfade.toFixed(1)}s</span>
                    </label>
                    <Slider
                      value={[crossfade]}
                      min={0}
                      max={5}
                      step={0.25}
                      onValueChange={(v) => setCrossfade(Array.isArray(v) ? v[0] : v)}
                    />
                    {crossfadeZone.end > crossfadeZone.start && (
                      <p className="studio-hint">
                        Overlap {formatTime(crossfadeZone.start)}–{formatTime(crossfadeZone.end)}
                      </p>
                    )}
                    <div className="studio-tool-actions">
                      <Button size="sm" onClick={applyLanes} disabled={processing}>
                        Mix lanes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => laneInputRef.current?.click()}
                        disabled={processing}
                      >
                        Replace lane 2
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setLane2(null)}>
                        Clear lane 2
                      </Button>
                    </div>
                  </>
                )}
                <input
                  ref={laneInputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void addLane2File(f);
                    e.target.value = "";
                  }}
                />
              </section>
            )}

            {tool === "info" && (
              <section className="studio-card">
                <h3 className="studio-card-title">File info</h3>
                <dl className="studio-meta">
                  <div><dt>Name</dt><dd>{originalFile?.name ?? current.name}</dd></div>
                  <div><dt>Duration</dt><dd>{formatTime(duration)}</dd></div>
                  <div><dt>Format</dt><dd>{current.ext.toUpperCase()}</dd></div>
                  <div><dt>Size</dt><dd>{formatBytes(current.blob.size)}</dd></div>
                  {analysis?.bpm ? (
                    <div><dt>BPM</dt><dd>{analysis.bpm}</dd></div>
                  ) : null}
                  {analysis?.key ? (
                    <div><dt>Key</dt><dd>{analysis.key.label}</dd></div>
                  ) : null}
                </dl>
                {originalFile && isVideoFile(originalFile.name) && (
                  <p className="studio-hint">
                    Audio was extracted from your video file on load.
                  </p>
                )}
              </section>
            )}

            {!tool && (
              <section className="studio-card">
                <h3 className="studio-card-title">Edit</h3>
                <p className="studio-hint">
                  Pick a tool from the left rail. Every edit stacks on the previous one — undo any
                  time, then export once when you&apos;re done.
                </p>
              </section>
            )}

            <section className="studio-card">
              <h3 className="studio-card-title">Export</h3>
              <div className="field">
                <span className="field-label">Format</span>
                <select
                  value={outputFmt}
                  onChange={(e) => setOutputFmt(e.target.value as AudioOutputFmt)}
                >
                  {EXPORT_FORMATS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
              <p className="studio-readout">
                Current: {current.ext.toUpperCase()} · {formatBytes(current.blob.size)}
              </p>
              <Button className="w-full" onClick={() => void download()} disabled={downloading || processing}>
                <LuDownload />
                {downloading ? "Saving…" : `Download .${AUDIO_FMT_EXT[outputFmt]}`}
              </Button>
            </section>

            {history.length > 1 && (
              <section className="studio-card">
                <h3 className="studio-card-title">History</h3>
                <ol className="studio-history">
                  {history.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className={`studio-step${i === index ? " is-current" : ""}`}
                        onClick={() => {
                          setIndex(i);
                          setTool(null);
                          resetToolState();
                        }}
                      >
                        {i === 0 ? "Original" : `${i}. ${s.label}`}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
