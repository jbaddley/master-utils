"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import {
  LuActivity, LuDownload, LuGauge, LuInfo, LuMusic,
  LuPause, LuPlay, LuPlus, LuRedo2, LuScissors,
  LuUndo2, LuVolumeX, LuZoomIn, LuZoomOut, LuTrash2,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { loadFFmpeg } from "@/lib/ffmpeg";
import { computeWaveformPeaks } from "@/lib/audio-analysis";
import {
  AUDIO_FMT_EXT, AUDIO_FMT_MIME, baseName, extOf,
  buildAtempoFilter, buildPitchSpeedFilter,
  type AudioOutputFmt,
} from "@/lib/audio-utils";
import { saveAs } from "@/lib/download";
import AudioTimeline, {
  type TimelineClip, type TimelineLane, LANE_COLORS,
} from "./AudioTimeline";

/* ── Constants ──────────────────────────────────────────────── */

const ACCEPTED_INPUTS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "mp4", "webm", "mov", "avi", "mkv", "m4v"];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v"]);

type ToolId = "speed" | "pitch" | "normalize" | "silence" | "info";

const TOOLS: { id: ToolId; label: string; icon: IconType }[] = [
  { id: "speed",     label: "Speed",   icon: LuGauge    },
  { id: "pitch",     label: "Pitch",   icon: LuMusic    },
  { id: "normalize", label: "Level",   icon: LuActivity },
  { id: "silence",   label: "Silence", icon: LuVolumeX  },
  { id: "info",      label: "Info",    icon: LuInfo     },
];

const EXPORT_FORMATS: { key: AudioOutputFmt; label: string }[] = [
  { key: "mp3", label: "MP3" },
  { key: "wav", label: "WAV" },
  { key: "ogg", label: "OGG" },
  { key: "m4a", label: "M4A" },
  { key: "flac", label: "FLAC" },
];

/* ── History (atomic state to avoid stale-closure bugs) ──────── */

type Snap = { lanes: TimelineLane[]; clips: TimelineClip[] };
type HistState = { stack: Snap[]; idx: number };

function useHistory(initial: Snap) {
  const [hs, setHs] = useState<HistState>({ stack: [initial], idx: 0 });

  const current = hs.stack[hs.idx]!;
  const canUndo = hs.idx > 0;
  const canRedo = hs.idx < hs.stack.length - 1;

  const push = useCallback((snap: Snap) => {
    setHs(({ stack, idx }) => ({ stack: [...stack.slice(0, idx + 1), snap], idx: idx + 1 }));
  }, []);

  const undo = useCallback(() => {
    setHs(({ stack, idx }) => ({ stack, idx: Math.max(0, idx - 1) }));
  }, []);

  const redo = useCallback(() => {
    setHs(({ stack, idx }) => ({ stack, idx: Math.min(stack.length - 1, idx + 1) }));
  }, []);

  return { current, push, undo, redo, canUndo, canRedo };
}

/* ── Slider value helper (base-ui type is number | readonly number[]) */

function sliderVal(v: number | readonly number[], fallback: number): number {
  if (Array.isArray(v)) return (v as number[])[0] ?? fallback;
  return typeof v === "number" ? v : fallback;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  const ds = Math.floor((s % 1) * 10);
  return `${m}:${sec}.${ds}`;
}

/* ── Component ──────────────────────────────────────────────── */

export default function AudioStudio() {
  const hist = useHistory({ lanes: [], clips: [] });
  const { lanes, clips } = hist.current;

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [outputFmt, setOutputFmt] = useState<AudioOutputFmt>("mp3");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Tool params
  const [speed, setSpeed] = useState(1.0);
  const [semitones, setSemitones] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingLaneIdRef = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const activeSources = useRef<AudioBufferSourceNode[]>([]);
  const rafRef = useRef<number | null>(null);
  const playStartCtxTime = useRef(0);
  const playStartPlayhead = useRef(0);

  const totalDuration = useMemo(() => {
    return Math.max(30, ...clips.map(c => c.startTime + (c.trimEnd - c.trimStart)));
  }, [clips]);

  const selectedClip = clips.find(c => c.id === selectedClipId) ?? null;

  /* ── Audio context ─────────────────────────────────────────── */

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  async function decodeClip(clip: TimelineClip): Promise<AudioBuffer> {
    const cached = bufferCache.current.get(clip.id);
    if (cached) return cached;
    const ctx = getAudioCtx();
    const ab = await clip.blob.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    bufferCache.current.set(clip.id, buf);
    return buf;
  }

  /* ── File loading ─────────────────────────────────────────── */

  async function loadFile(file: File, laneId: string, atTime = 0): Promise<TimelineClip> {
    const ext = extOf(file.name);
    let blob: Blob;
    let audioExt: string;

    if (VIDEO_EXTS.has(ext)) {
      setProcessing(true);
      setProgress(0);
      try {
        const ff = await loadFFmpeg();
        ff.on("progress", ({ progress: p }) => setProgress(Math.round(p * 100)));
        const inputName = `input.${ext}`;
        await ff.writeFile(inputName, await fetchFile(file));
        await ff.exec(["-i", inputName, "-vn", "-acodec", "pcm_s16le", "extracted.wav"]);
        const data = await ff.readFile("extracted.wav");
        await ff.deleteFile(inputName).catch(() => {});
        await ff.deleteFile("extracted.wav").catch(() => {});
        blob = new Blob([data as unknown as BlobPart], { type: "audio/wav" });
        audioExt = "wav";
      } finally {
        setProcessing(false);
      }
    } else {
      blob = file;
      audioExt = ext;
    }

    const ab = await blob.arrayBuffer();
    const tempCtx = new AudioContext();
    let audioBuf: AudioBuffer;
    try {
      audioBuf = await tempCtx.decodeAudioData(ab.slice(0));
    } finally {
      await tempCtx.close();
    }
    const duration = audioBuf.duration;
    const peaks = computeWaveformPeaks(audioBuf, 600);

    const laneIdx = lanes.findIndex(l => l.id === laneId);
    const newClip: TimelineClip = {
      id: uid(),
      laneId,
      name: baseName(file.name),
      ext: audioExt,
      blob,
      audioDuration: duration,
      startTime: atTime,
      trimStart: 0,
      trimEnd: duration,
      fadeIn: 0,
      fadeOut: 0,
      gain: 1,
      muted: false,
      color: LANE_COLORS[laneIdx % LANE_COLORS.length] ?? LANE_COLORS[0]!,
      peaks,
    };

    bufferCache.current.set(newClip.id, audioBuf);
    return newClip;
  }

  async function handleFirstFile(file: File) {
    const laneId = uid();
    const newLane: TimelineLane = { id: laneId, name: "Lane 1", muted: false };
    setError(null);
    try {
      const newClip = await loadFile(file, laneId, 0);
      hist.push({ lanes: [newLane], clips: [newClip] });
      setSelectedClipId(newClip.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDropFile(laneId: string, file: File, atTime: number) {
    setError(null);
    try {
      const newClip = await loadFile(file, laneId, atTime);
      hist.push({ lanes, clips: [...clips, newClip] });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const laneId = pendingLaneIdRef.current;
    if (!laneId) {
      handleFirstFile(file);
    } else {
      handleDropFile(laneId, file, 0);
    }
    pendingLaneIdRef.current = null;
  }

  /* ── Lane operations ─────────────────────────────────────── */

  function handleAddLane() {
    const newLane: TimelineLane = { id: uid(), name: `Lane ${lanes.length + 1}`, muted: false };
    hist.push({ lanes: [...lanes, newLane], clips });
  }

  function handleLaneMute(laneId: string) {
    hist.push({ lanes: lanes.map(l => l.id === laneId ? { ...l, muted: !l.muted } : l), clips });
  }

  function handleAddFileToLane(laneId: string) {
    pendingLaneIdRef.current = laneId;
    fileInputRef.current?.click();
  }

  /* ── Clip operations ─────────────────────────────────────── */

  function handleClipMove(id: string, newStart: number) {
    hist.push({ lanes, clips: clips.map(c => c.id === id ? { ...c, startTime: newStart } : c) });
  }

  function handleClipTrimStart(id: string, trimStart: number, startTime: number) {
    hist.push({ lanes, clips: clips.map(c => c.id === id ? { ...c, trimStart, startTime } : c) });
  }

  function handleClipTrimEnd(id: string, trimEnd: number) {
    hist.push({ lanes, clips: clips.map(c => c.id === id ? { ...c, trimEnd } : c) });
  }

  function handleUpdateClip(id: string, patch: Partial<TimelineClip>) {
    hist.push({ lanes, clips: clips.map(c => c.id === id ? { ...c, ...patch } : c) });
  }

  function handleDeleteClip(id: string) {
    hist.push({ lanes, clips: clips.filter(c => c.id !== id) });
    if (selectedClipId === id) setSelectedClipId(null);
    bufferCache.current.delete(id);
  }

  function handleSpliceAtPlayhead() {
    if (!selectedClip) return;
    const posInClip = playhead - selectedClip.startTime;
    if (posInClip <= 0.01 || posInClip >= (selectedClip.trimEnd - selectedClip.trimStart) - 0.01) return;
    const splitAudioOffset = selectedClip.trimStart + posInClip;
    const clipA: TimelineClip = { ...selectedClip, id: uid(), trimEnd: splitAudioOffset };
    const clipB: TimelineClip = {
      ...selectedClip, id: uid(),
      trimStart: splitAudioOffset,
      startTime: selectedClip.startTime + posInClip,
    };
    hist.push({ lanes, clips: clips.filter(c => c.id !== selectedClip.id).concat([clipA, clipB]) });
    setSelectedClipId(clipA.id);
  }

  /* ── ffmpeg processing on a clip ─────────────────────────── */

  async function applyClipTool(
    label: string,
    buildArgs: (inName: string, outName: string) => string[]
  ) {
    if (!selectedClip) return;
    const clip = selectedClip;
    setProcessing(true);
    setError(null);
    setProgress(0);
    try {
      const ff = await loadFFmpeg();
      ff.on("progress", ({ progress: p }) => setProgress(Math.round(p * 100)));
      const inName = `in_proc.${clip.ext}`;
      const outName = `out_proc.${clip.ext}`;
      await ff.writeFile(inName, await fetchFile(clip.blob));
      await ff.exec(buildArgs(inName, outName));
      const data = await ff.readFile(outName);
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
      const newBlob = new Blob([data as unknown as BlobPart], { type: `audio/${clip.ext}` });

      const ab = await newBlob.arrayBuffer();
      const tempCtx = new AudioContext();
      let buf: AudioBuffer;
      try {
        buf = await tempCtx.decodeAudioData(ab.slice(0));
      } finally {
        await tempCtx.close();
      }
      const audioDuration = buf.duration;
      const peaks = computeWaveformPeaks(buf, 600);
      bufferCache.current.delete(clip.id);
      bufferCache.current.set(clip.id, buf);

      const updated: TimelineClip = {
        ...clip, blob: newBlob, audioDuration, peaks,
        trimStart: 0, trimEnd: audioDuration,
        name: clip.name + ` [${label}]`,
      };
      hist.push({ lanes, clips: clips.map(c => c.id === clip.id ? updated : c) });
    } catch (e) {
      setError("Processing failed: " + (e as Error).message);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }

  function handleApplySpeed() {
    const filter = buildAtempoFilter(speed);
    void applyClipTool(`${speed.toFixed(2)}×`, (i, o) => ["-i", i, "-af", filter, o]);
  }

  function handleApplyPitch() {
    const filter = buildPitchSpeedFilter(semitones, 1);
    if (!filter) return;
    void applyClipTool(`${semitones >= 0 ? "+" : ""}${semitones}st`, (i, o) => ["-i", i, "-af", filter, o]);
  }

  function handleApplyNormalize() {
    void applyClipTool("normalized", (i, o) => ["-i", i, "-af", "loudnorm=I=-14:TP=-1:LRA=11", o]);
  }

  function handleApplySilence() {
    const filter = "silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB:stop_periods=-1:stop_silence=0.5:stop_threshold=-50dB";
    void applyClipTool("trimmed", (i, o) => ["-i", i, "-af", filter, o]);
  }

  /* ── Seek ───────────────────────────────────────────────── */

  function handleSeek(t: number) {
    const wasPlaying = playing;
    if (wasPlaying) stopPlayback();
    setPlayhead(t);
    if (wasPlaying) setTimeout(() => startPlayback(t), 10);
  }

  /* ── Playback ──────────────────────────────────────────── */

  function stopPlayback() {
    activeSources.current.forEach(s => { try { s.stop(); } catch {} });
    activeSources.current = [];
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
  }

  async function startPlayback(from?: number) {
    const startFrom = from ?? playhead;
    stopPlayback();

    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();

    const activeLaneIds = new Set(lanes.filter(l => !l.muted).map(l => l.id));
    const toPlay = clips.filter(c => {
      if (c.muted || !activeLaneIds.has(c.laneId)) return false;
      return c.startTime + (c.trimEnd - c.trimStart) > startFrom;
    });

    setProcessing(true);
    let decoded: { clip: TimelineClip; buf: AudioBuffer }[] = [];
    try {
      decoded = await Promise.all(toPlay.map(async clip => ({ clip, buf: await decodeClip(clip) })));
    } catch (e) {
      setError("Failed to decode audio: " + (e as Error).message);
      setProcessing(false);
      return;
    }
    setProcessing(false);

    const startedAt = ctx.currentTime;
    playStartCtxTime.current = startedAt;
    playStartPlayhead.current = startFrom;

    for (const { clip, buf } of decoded) {
      const elapsed = Math.max(0, startFrom - clip.startTime);
      const audioOffset = clip.trimStart + elapsed;
      const duration = (clip.trimEnd - clip.trimStart) - elapsed;
      if (duration <= 0) continue;

      const source = ctx.createBufferSource();
      source.buffer = buf;
      const gainNode = ctx.createGain();
      gainNode.gain.value = clip.gain;

      const when = ctx.currentTime + Math.max(0, clip.startTime - startFrom);
      if (clip.fadeIn > 0 && elapsed < clip.fadeIn) {
        gainNode.gain.setValueAtTime(0, when);
        gainNode.gain.linearRampToValueAtTime(clip.gain, when + (clip.fadeIn - elapsed));
      }
      if (clip.fadeOut > 0) {
        const fadeOutStart = when + duration - clip.fadeOut;
        gainNode.gain.setValueAtTime(clip.gain, Math.max(when, fadeOutStart));
        gainNode.gain.linearRampToValueAtTime(0, when + duration);
      }

      source.connect(gainNode).connect(ctx.destination);
      source.start(when, audioOffset, duration);
      activeSources.current.push(source);
    }

    setPlaying(true);

    function tick() {
      const ctx2 = audioCtxRef.current;
      if (!ctx2) return;
      const pos = playStartPlayhead.current + (ctx2.currentTime - playStartCtxTime.current);
      setPlayhead(pos);
      if (pos >= totalDuration + 0.1) {
        stopPlayback();
        setPlayhead(0);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePlayPause() {
    if (playing) stopPlayback();
    else void startPlayback();
  }

  useEffect(() => () => stopPlayback(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Zoom fit ───────────────────────────────────────────── */

  function handleFitZoom() {
    const el = viewportRef.current;
    if (!el || totalDuration <= 0) return;
    const scrollW = el.clientWidth - 144; // subtract label column
    const fitZoom = Math.max(10, Math.min(1000, (scrollW - 20) / totalDuration));
    setZoom(fitZoom);
  }

  /* ── Export ─────────────────────────────────────────────── */

  async function handleExport() {
    const activeLaneIds = new Set(lanes.filter(l => !l.muted).map(l => l.id));
    const active = clips.filter(c => !c.muted && activeLaneIds.has(c.laneId));
    if (active.length === 0) return;

    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const ff = await loadFFmpeg();
      ff.on("progress", ({ progress: p }) => setProgress(Math.round(p * 100)));

      const inputNames: string[] = [];
      const filterParts: string[] = [];
      const mixLabels: string[] = [];

      for (let i = 0; i < active.length; i++) {
        const c = active[i]!;
        const inName = `in_${i}.${c.ext}`;
        await ff.writeFile(inName, await fetchFile(c.blob));
        inputNames.push(inName);

        const delayMs = Math.round(c.startTime * 1000);
        filterParts.push(
          `[${i}:a]` +
          `atrim=start=${c.trimStart.toFixed(3)}:end=${c.trimEnd.toFixed(3)},` +
          `asetpts=PTS-STARTPTS,` +
          `volume=${c.gain.toFixed(3)},` +
          (c.fadeIn > 0 ? `afade=t=in:st=0:d=${c.fadeIn.toFixed(3)},` : "") +
          (c.fadeOut > 0 ? `afade=t=out:st=${(c.trimEnd - c.trimStart - c.fadeOut).toFixed(3)}:d=${c.fadeOut.toFixed(3)},` : "") +
          `adelay=${delayMs}|${delayMs}` +
          `[a${i}]`
        );
        mixLabels.push(`[a${i}]`);
      }

      const ext = AUDIO_FMT_EXT[outputFmt];
      const outName = `mixed.${ext}`;
      const filterComplex =
        filterParts.join(";") + ";" +
        mixLabels.join("") +
        `amix=inputs=${active.length}:duration=longest:normalize=0[out]`;

      const inputArgs = active.flatMap((_, i) => ["-i", `in_${i}.${active[i]!.ext}`]);
      await ff.exec([...inputArgs, "-filter_complex", filterComplex, "-map", "[out]", "-ar", "44100", outName]);

      const data = await ff.readFile(outName);
      const mime = AUDIO_FMT_MIME[outputFmt];
      const blob = new Blob([data as unknown as BlobPart], { type: mime });
      const firstName = active[0]?.name ?? "mix";
      await saveAs({
        suggestedName: `${firstName}_mix.${ext}`,
        description: "Audio Mix",
        mime,
        ext,
        getBlob: () => blob,
      });

      for (const n of inputNames) await ff.deleteFile(n).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
    } catch (e) {
      setError("Export failed: " + (e as Error).message);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }

  /* ── Render ─────────────────────────────────────────────── */

  const isEmpty = lanes.length === 0;

  return (
    <div className="studio">
      <div className="studio-shell">
        {/* Topbar */}
        <div className="studio-topbar">
          <div className="studio-topbar-left">
            <button className="studio-topbar-btn" onClick={hist.undo} disabled={!hist.canUndo} title="Undo">
              <LuUndo2 size={15} />
            </button>
            <button className="studio-topbar-btn" onClick={hist.redo} disabled={!hist.canRedo} title="Redo">
              <LuRedo2 size={15} />
            </button>
          </div>

          <div className="studio-topbar-center">
            <button className="studio-play-btn" onClick={handlePlayPause} disabled={isEmpty || processing} title={playing ? "Pause" : "Play"}>
              {playing ? <LuPause size={18} /> : <LuPlay size={18} />}
            </button>
            <span className="studio-timecode">{fmtTime(playhead)}</span>
            <span className="studio-timecode-sep">/</span>
            <span className="studio-timecode studio-timecode--dim">{fmtTime(totalDuration)}</span>
          </div>

          <div className="studio-topbar-right">
            <button className="studio-topbar-btn" onClick={handleFitZoom} disabled={isEmpty} title="Fit all clips in view">
              Fit
            </button>
            <button className="studio-topbar-btn" onClick={() => setZoom(z => Math.max(10, z / 1.5))} title="Zoom out">
              <LuZoomOut size={15} />
            </button>
            <span className="studio-zoom-label">{Math.round(zoom)}px/s</span>
            <button className="studio-topbar-btn" onClick={() => setZoom(z => Math.min(1500, z * 1.5))} title="Zoom in">
              <LuZoomIn size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="studio-body studio-body-audio">
          {/* Left rail */}
          <nav className="studio-rail">
            <button
              className="studio-rail-btn"
              onClick={() => { pendingLaneIdRef.current = null; fileInputRef.current?.click(); }}
              title="Add audio or video file"
            >
              <LuPlus size={20} />
              <span>Add</span>
            </button>

            <button
              className="studio-rail-btn"
              onClick={handleSpliceAtPlayhead}
              disabled={!selectedClip}
              title="Splice clip at playhead"
            >
              <LuScissors size={20} />
              <span>Splice</span>
            </button>

            <div className="studio-rail-divider" />

            {TOOLS.map(t => (
              <button
                key={t.id}
                className={`studio-rail-btn${tool === t.id ? " is-active" : ""}`}
                onClick={() => setTool(tool === t.id ? null : t.id)}
                disabled={!selectedClip && t.id !== "info"}
                title={t.label}
              >
                <t.icon size={20} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Timeline viewport */}
          <div ref={viewportRef} className="studio-viewport at-viewport">
            {isEmpty ? (
              <DropZone
                onFile={handleFirstFile}
                onPickFile={() => { pendingLaneIdRef.current = null; fileInputRef.current?.click(); }}
              />
            ) : (
              <AudioTimeline
                lanes={lanes}
                clips={clips}
                selectedClipId={selectedClipId}
                playhead={playhead}
                zoom={zoom}
                totalDuration={totalDuration}
                onSeek={handleSeek}
                onClipSelect={(id) => { setSelectedClipId(id); if (!id) setTool(null); }}
                onClipMove={handleClipMove}
                onClipTrimStart={handleClipTrimStart}
                onClipTrimEnd={handleClipTrimEnd}
                onLaneMute={handleLaneMute}
                onAddLane={handleAddLane}
                onAddFileToLane={handleAddFileToLane}
                onDropFile={handleDropFile}
              />
            )}
          </div>

          {/* Right sidebar */}
          <aside className="studio-side">
            {processing ? (
              <ProcessingPane progress={progress} />
            ) : tool && selectedClip ? (
              <ToolPane
                tool={tool}
                clip={selectedClip}
                speed={speed}
                semitones={semitones}
                onSpeedChange={setSpeed}
                onSemitonesChange={setSemitones}
                onApplySpeed={handleApplySpeed}
                onApplyPitch={handleApplyPitch}
                onApplyNormalize={handleApplyNormalize}
                onApplySilence={handleApplySilence}
              />
            ) : selectedClip ? (
              <ClipPane
                clip={selectedClip}
                onUpdate={patch => handleUpdateClip(selectedClip.id, patch)}
                onDelete={() => handleDeleteClip(selectedClip.id)}
              />
            ) : (
              <ExportPane
                fmt={outputFmt}
                onFmtChange={setOutputFmt}
                onExport={handleExport}
                disabled={isEmpty || processing}
                clipsCount={clips.length}
              />
            )}
            {error && <p className="studio-error">{error}</p>}
          </aside>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept={ACCEPT_ATTR} style={{ display: "none" }} onChange={handleFileInput} />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function DropZone({ onFile, onPickFile }: { onFile: (f: File) => void; onPickFile: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`studio-dropzone${over ? " is-over" : ""}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <p className="studio-dropzone-text">Drop an audio or video file here</p>
      <p className="studio-dropzone-sub">MP3, WAV, OGG, M4A, FLAC, AAC, MP4, MOV, WebM&hellip;</p>
      <Button onClick={onPickFile} variant="outline" size="sm">Choose file</Button>
    </div>
  );
}

function ProcessingPane({ progress }: { progress: number }) {
  return (
    <div className="studio-side-pane">
      <p className="studio-side-label">Processing…</p>
      <div className="studio-progress-bar">
        <div className="studio-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="studio-side-hint">{progress}%</p>
    </div>
  );
}

function ClipPane({
  clip, onUpdate, onDelete,
}: {
  clip: TimelineClip;
  onUpdate: (patch: Partial<TimelineClip>) => void;
  onDelete: () => void;
}) {
  const dur = clip.trimEnd - clip.trimStart;
  return (
    <div className="studio-side-pane">
      <p className="studio-side-section-label">Clip</p>
      <p className="studio-clip-name">{clip.name}</p>
      <p className="studio-side-hint">{dur.toFixed(2)}s — starts at {clip.startTime.toFixed(2)}s</p>

      <div className="studio-side-divider" />

      <label className="studio-side-label">Volume</label>
      <div className="studio-side-slider-row">
        <Slider min={0} max={2} step={0.01} value={[clip.gain]}
          onValueChange={v => onUpdate({ gain: sliderVal(v, clip.gain) })} />
        <span className="studio-side-value">{Math.round(clip.gain * 100)}%</span>
      </div>

      <label className="studio-side-label">Fade In</label>
      <div className="studio-side-slider-row">
        <Slider min={0} max={Math.min(dur / 2, 10)} step={0.01} value={[clip.fadeIn]}
          onValueChange={v => onUpdate({ fadeIn: sliderVal(v, clip.fadeIn) })} />
        <span className="studio-side-value">{clip.fadeIn.toFixed(2)}s</span>
      </div>

      <label className="studio-side-label">Fade Out</label>
      <div className="studio-side-slider-row">
        <Slider min={0} max={Math.min(dur / 2, 10)} step={0.01} value={[clip.fadeOut]}
          onValueChange={v => onUpdate({ fadeOut: sliderVal(v, clip.fadeOut) })} />
        <span className="studio-side-value">{clip.fadeOut.toFixed(2)}s</span>
      </div>

      <div className="studio-side-divider" />

      <label className="studio-side-label">Trim range</label>
      <p className="studio-side-hint">{clip.trimStart.toFixed(2)}s → {clip.trimEnd.toFixed(2)}s (of {clip.audioDuration.toFixed(2)}s)</p>
      <p className="studio-side-hint" style={{ marginTop: "-0.25rem" }}>Drag clip edges on the timeline to trim.</p>

      <div className="studio-side-divider" />

      <button className="studio-delete-btn" onClick={onDelete}>
        <LuTrash2 size={13} /> Delete clip
      </button>
    </div>
  );
}

function ToolPane({
  tool, clip, speed, semitones,
  onSpeedChange, onSemitonesChange,
  onApplySpeed, onApplyPitch, onApplyNormalize, onApplySilence,
}: {
  tool: ToolId;
  clip: TimelineClip;
  speed: number;
  semitones: number;
  onSpeedChange: (v: number) => void;
  onSemitonesChange: (v: number) => void;
  onApplySpeed: () => void;
  onApplyPitch: () => void;
  onApplyNormalize: () => void;
  onApplySilence: () => void;
}) {
  const dur = clip.trimEnd - clip.trimStart;

  if (tool === "speed") return (
    <div className="studio-side-pane">
      <p className="studio-side-section-label">Speed</p>
      <p className="studio-clip-name">{clip.name}</p>
      <div className="studio-side-divider" />
      <label className="studio-side-label">Playback Speed</label>
      <div className="studio-side-slider-row">
        <Slider min={0.25} max={4} step={0.05} value={[speed]}
          onValueChange={v => onSpeedChange(sliderVal(v, speed))} />
        <span className="studio-side-value">{speed.toFixed(2)}×</span>
      </div>
      <p className="studio-side-hint">New duration: ~{(dur / speed).toFixed(2)}s</p>
      <Button size="sm" className="studio-apply-btn" onClick={onApplySpeed} disabled={Math.abs(speed - 1) < 0.01}>
        Apply Speed
      </Button>
      <p className="studio-side-hint">Permanently re-encodes the clip.</p>
    </div>
  );

  if (tool === "pitch") return (
    <div className="studio-side-pane">
      <p className="studio-side-section-label">Pitch</p>
      <p className="studio-clip-name">{clip.name}</p>
      <div className="studio-side-divider" />
      <label className="studio-side-label">Semitones</label>
      <div className="studio-side-slider-row">
        <Slider min={-12} max={12} step={1} value={[semitones]}
          onValueChange={v => onSemitonesChange(sliderVal(v, semitones))} />
        <span className="studio-side-value">{semitones >= 0 ? "+" : ""}{semitones}st</span>
      </div>
      <Button size="sm" className="studio-apply-btn" onClick={onApplyPitch} disabled={semitones === 0}>
        Apply Pitch
      </Button>
      <p className="studio-side-hint">Permanently re-encodes the clip.</p>
    </div>
  );

  if (tool === "normalize") return (
    <div className="studio-side-pane">
      <p className="studio-side-section-label">Level (Normalize)</p>
      <p className="studio-clip-name">{clip.name}</p>
      <div className="studio-side-divider" />
      <p className="studio-side-hint">Applies loudnorm to target −14 LUFS integrated loudness (broadcast standard).</p>
      <Button size="sm" className="studio-apply-btn" onClick={onApplyNormalize}>
        Normalize
      </Button>
    </div>
  );

  if (tool === "silence") return (
    <div className="studio-side-pane">
      <p className="studio-side-section-label">Remove Silence</p>
      <p className="studio-clip-name">{clip.name}</p>
      <div className="studio-side-divider" />
      <p className="studio-side-hint">Strips leading, trailing, and internal silent sections (below −50 dB for &gt;0.5s).</p>
      <Button size="sm" className="studio-apply-btn" onClick={onApplySilence}>
        Remove Silence
      </Button>
    </div>
  );

  if (tool === "info") return (
    <div className="studio-side-pane">
      <p className="studio-side-section-label">Info</p>
      <p className="studio-clip-name">{clip.name}</p>
      <div className="studio-side-divider" />
      <InfoRow label="Format" value={clip.ext.toUpperCase()} />
      <InfoRow label="Full duration" value={`${clip.audioDuration.toFixed(3)}s`} />
      <InfoRow label="Trim range" value={`${clip.trimStart.toFixed(3)}s → ${clip.trimEnd.toFixed(3)}s`} />
      <InfoRow label="Playing" value={`${(clip.trimEnd - clip.trimStart).toFixed(3)}s`} />
      <InfoRow label="Timeline start" value={`${clip.startTime.toFixed(3)}s`} />
      <InfoRow label="Volume" value={`${Math.round(clip.gain * 100)}%`} />
      <InfoRow label="Fade in" value={`${clip.fadeIn.toFixed(2)}s`} />
      <InfoRow label="Fade out" value={`${clip.fadeOut.toFixed(2)}s`} />
    </div>
  );

  return null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="studio-info-row">
      <span className="studio-info-label">{label}</span>
      <span className="studio-info-value">{value}</span>
    </div>
  );
}

function ExportPane({
  fmt, onFmtChange, onExport, disabled, clipsCount,
}: {
  fmt: AudioOutputFmt;
  onFmtChange: (f: AudioOutputFmt) => void;
  onExport: () => void;
  disabled: boolean;
  clipsCount: number;
}) {
  return (
    <div className="studio-side-pane">
      <p className="studio-side-section-label">Export</p>

      <label className="studio-side-label">Format</label>
      <div className="studio-format-btns">
        {EXPORT_FORMATS.map(f => (
          <button key={f.key} className={`studio-fmt-btn${fmt === f.key ? " is-active" : ""}`} onClick={() => onFmtChange(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <Button className="studio-export-btn" onClick={onExport} disabled={disabled}>
        <LuDownload size={14} /> Export mix ({clipsCount} clip{clipsCount !== 1 ? "s" : ""})
      </Button>

      <div className="studio-side-divider" />
      <p className="studio-side-hint">
        Select a clip to adjust its volume and fade in/out. Use the rail tools to change speed, pitch, or normalize a clip. Drag clip edges on the timeline to trim.
      </p>
    </div>
  );
}
