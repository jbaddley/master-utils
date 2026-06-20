"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import {
  LuDownload, LuPause, LuPlay, LuPlus, LuRedo2,
  LuScissors, LuUndo2, LuZoomIn, LuZoomOut, LuTrash2,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { loadFFmpeg } from "@/lib/ffmpeg";
import { computeWaveformPeaks } from "@/lib/audio-analysis";
import {
  AUDIO_FMT_EXT, AUDIO_FMT_MIME, baseName, extOf,
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

const EXPORT_FORMATS: { key: AudioOutputFmt; label: string }[] = [
  { key: "mp3", label: "MP3" },
  { key: "wav", label: "WAV" },
  { key: "ogg", label: "OGG" },
  { key: "m4a", label: "M4A" },
  { key: "flac", label: "FLAC" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  const ds = Math.floor((s % 1) * 10);
  return `${m}:${sec}.${ds}`;
}

/* ── History ─────────────────────────────────────────────────── */

type Snap = { lanes: TimelineLane[]; clips: TimelineClip[] };

function useHistory(initial: Snap) {
  const [stack, setStack] = useState<Snap[]>([initial]);
  const [idx, setIdx] = useState(0);
  const current = stack[idx]!;

  const push = useCallback((snap: Snap) => {
    setStack(prev => [...prev.slice(0, idx + 1), snap]);
    setIdx(i => i + 1);
  }, [idx]);

  const undo = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const redo = useCallback(() => setStack(s => { setIdx(i => Math.min(s.length - 1, i + 1)); return s; }), []);

  return { current, push, undo, redo, canUndo: idx > 0, canRedo: idx < stack.length - 1 };
}

/* ── Component ──────────────────────────────────────────────── */

export default function AudioStudio() {
  const hist = useHistory({ lanes: [], clips: [] });
  const { lanes, clips } = hist.current;

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [outputFmt, setOutputFmt] = useState<AudioOutputFmt>("mp3");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingLaneIdRef = useRef<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const activeSources = useRef<AudioBufferSourceNode[]>([]);
  const rafRef = useRef<number | null>(null);
  const playStartCtxTime = useRef(0);
  const playStartPlayhead = useRef(0);

  const totalDuration = useMemo(() => {
    return Math.max(
      30,
      ...clips.map(c => c.startTime + (c.trimEnd - c.trimStart))
    );
  }, [clips]);

  const selectedClip = clips.find(c => c.id === selectedClipId) ?? null;

  /* ── Audio decoding ──────────────────────────────────────── */

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

  async function loadFile(file: File, laneId: string, atTime = 0) {
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

    // Decode to get duration + peaks
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
      color: LANE_COLORS[lanes.findIndex(l => l.id === laneId) % LANE_COLORS.length] ?? LANE_COLORS[0]!,
      peaks,
    };

    // Store in buffer cache so first play is instant
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
    const newLane: TimelineLane = {
      id: uid(),
      name: `Lane ${lanes.length + 1}`,
      muted: false,
    };
    hist.push({ lanes: [...lanes, newLane], clips });
  }

  function handleLaneMute(laneId: string) {
    hist.push({
      lanes: lanes.map(l => l.id === laneId ? { ...l, muted: !l.muted } : l),
      clips,
    });
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
    const remaining = clips.filter(c => c.id !== id);
    hist.push({ lanes, clips: remaining });
    if (selectedClipId === id) setSelectedClipId(null);
    bufferCache.current.delete(id);
  }

  function handleSpliceAtPlayhead() {
    if (!selectedClip) return;
    const clip = selectedClip;
    const posInClip = playhead - clip.startTime; // seconds into the clip's playback region
    if (posInClip <= 0 || posInClip >= clip.trimEnd - clip.trimStart) return;
    const splitAudioOffset = clip.trimStart + posInClip;

    const clipA: TimelineClip = { ...clip, id: uid(), trimEnd: splitAudioOffset };
    const clipB: TimelineClip = {
      ...clip,
      id: uid(),
      trimStart: splitAudioOffset,
      startTime: clip.startTime + posInClip,
    };
    const newClips = clips.filter(c => c.id !== clip.id).concat([clipA, clipB]);
    hist.push({ lanes, clips: newClips });
    setSelectedClipId(clipA.id);
  }

  /* ── Seek ─────────────────────────────────────────────────── */

  function handleSeek(t: number) {
    const wasPlaying = playing;
    if (wasPlaying) stopPlayback();
    setPlayhead(t);
    if (wasPlaying) {
      // Restart from new position after state update
      setTimeout(() => startPlayback(t), 10);
    }
  }

  /* ── Playback ─────────────────────────────────────────────── */

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
      if (c.muted) return false;
      if (!activeLaneIds.has(c.laneId)) return false;
      // Skip clips that have fully passed
      const clipEnd = c.startTime + (c.trimEnd - c.trimStart);
      return clipEnd > startFrom;
    });

    // Decode all clips
    setProcessing(true);
    let decoded: { clip: TimelineClip; buf: AudioBuffer }[] = [];
    try {
      decoded = await Promise.all(
        toPlay.map(async clip => ({ clip, buf: await decodeClip(clip) }))
      );
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

      // Apply fade in/out
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

    // RAF loop for playhead
    function tick() {
      const ctx2 = audioCtxRef.current;
      if (!ctx2) return;
      const elapsed = ctx2.currentTime - startedAt;
      const pos = playStartPlayhead.current + elapsed;
      setPlayhead(pos);

      // Auto-stop at end
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
    if (playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  // Stop playback when unmounted
  useEffect(() => () => stopPlayback(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Export ──────────────────────────────────────────────── */

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
        filterParts.join(";") +
        ";" +
        mixLabels.join("") +
        `amix=inputs=${active.length}:duration=longest:normalize=0[out]`;

      const inputArgs = active.flatMap((_, i) => ["-i", `in_${i}.${active[i]!.ext}`]);
      await ff.exec([
        ...inputArgs,
        "-filter_complex", filterComplex,
        "-map", "[out]",
        "-ar", "44100",
        outName,
      ]);

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

      // Cleanup
      for (const n of inputNames) await ff.deleteFile(n).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
    } catch (e) {
      setError("Export failed: " + (e as Error).message);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }

  /* ── Render ──────────────────────────────────────────────── */

  const isEmpty = lanes.length === 0;

  return (
    <div className="studio">
      <div className="studio-shell">
        {/* ── Topbar ── */}
        <div className="studio-topbar">
          <div className="studio-topbar-left">
            <button
              className="studio-topbar-btn"
              onClick={hist.undo}
              disabled={!hist.canUndo}
              title="Undo"
            >
              <LuUndo2 size={15} />
            </button>
            <button
              className="studio-topbar-btn"
              onClick={hist.redo}
              disabled={!hist.canRedo}
              title="Redo"
            >
              <LuRedo2 size={15} />
            </button>
          </div>

          <div className="studio-topbar-center">
            <button
              className="studio-play-btn"
              onClick={handlePlayPause}
              disabled={isEmpty || processing}
              title={playing ? "Pause" : "Play"}
            >
              {playing ? <LuPause size={18} /> : <LuPlay size={18} />}
            </button>
            <span className="studio-timecode">{fmtTime(playhead)}</span>
            <span className="studio-timecode-sep">/</span>
            <span className="studio-timecode studio-timecode--dim">{fmtTime(totalDuration)}</span>
          </div>

          <div className="studio-topbar-right">
            <button
              className="studio-topbar-btn"
              onClick={() => setZoom(z => Math.max(20, z / 1.5))}
              title="Zoom out"
            >
              <LuZoomOut size={15} />
            </button>
            <span className="studio-zoom-label">{Math.round(zoom)}px/s</span>
            <button
              className="studio-topbar-btn"
              onClick={() => setZoom(z => Math.min(1000, z * 1.5))}
              title="Zoom in"
            >
              <LuZoomIn size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
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
          </nav>

          {/* Timeline viewport */}
          <div className="studio-viewport at-viewport">
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
                onClipSelect={setSelectedClipId}
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

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        style={{ display: "none" }}
        onChange={handleFileInput}
      />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function DropZone({ onFile, onPickFile }: { onFile: (f: File) => void; onPickFile: () => void }) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`studio-dropzone${over ? " is-over" : ""}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      <p className="studio-dropzone-text">Drop an audio or video file here</p>
      <p className="studio-dropzone-sub">MP3, WAV, OGG, M4A, FLAC, AAC, MP4, MOV, WebM&hellip;</p>
      <Button onClick={onPickFile} variant="outline" size="sm">
        Choose file
      </Button>
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
  clip,
  onUpdate,
  onDelete,
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
      <p className="studio-side-hint">
        {dur.toFixed(2)}s — starts at {clip.startTime.toFixed(2)}s
      </p>

      <div className="studio-side-divider" />

      <label className="studio-side-label">Volume</label>
      <div className="studio-side-slider-row">
        <Slider
          min={0} max={2} step={0.01} value={[clip.gain]}
          onValueChange={(v) => onUpdate({ gain: (v as number[])[0] ?? clip.gain })}
        />
        <span className="studio-side-value">{Math.round(clip.gain * 100)}%</span>
      </div>

      <label className="studio-side-label">Fade In</label>
      <div className="studio-side-slider-row">
        <Slider
          min={0} max={Math.min(dur / 2, 10)} step={0.01} value={[clip.fadeIn]}
          onValueChange={(v) => onUpdate({ fadeIn: (v as number[])[0] ?? clip.fadeIn })}
        />
        <span className="studio-side-value">{clip.fadeIn.toFixed(2)}s</span>
      </div>

      <label className="studio-side-label">Fade Out</label>
      <div className="studio-side-slider-row">
        <Slider
          min={0} max={Math.min(dur / 2, 10)} step={0.01} value={[clip.fadeOut]}
          onValueChange={(v) => onUpdate({ fadeOut: (v as number[])[0] ?? clip.fadeOut })}
        />
        <span className="studio-side-value">{clip.fadeOut.toFixed(2)}s</span>
      </div>

      <div className="studio-side-divider" />

      <label className="studio-side-label">Trim range</label>
      <p className="studio-side-hint">
        {clip.trimStart.toFixed(2)}s → {clip.trimEnd.toFixed(2)}s
        (of {clip.audioDuration.toFixed(2)}s)
      </p>

      <div className="studio-side-divider" />

      <button
        className="studio-delete-btn"
        onClick={onDelete}
      >
        <LuTrash2 size={13} /> Delete clip
      </button>
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
          <button
            key={f.key}
            className={`studio-fmt-btn${fmt === f.key ? " is-active" : ""}`}
            onClick={() => onFmtChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Button
        className="studio-export-btn"
        onClick={onExport}
        disabled={disabled}
      >
        <LuDownload size={14} /> Export mix ({clipsCount} clip{clipsCount !== 1 ? "s" : ""})
      </Button>

      <div className="studio-side-divider" />
      <p className="studio-side-hint">
        Select a clip to adjust its volume and fade in/out. Drag clip edges to trim.
        Mute a lane with the speaker icon. Drop audio/video files onto any lane.
      </p>
    </div>
  );
}
