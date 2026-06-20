"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuVolumeX, LuVolume2, LuPlus } from "react-icons/lu";

/* ── Types ─────────────────────────────────────────────────── */

export type TimelineClip = {
  id: string;
  laneId: string;
  name: string;
  ext: string;
  blob: Blob;
  audioDuration: number; // full audio length before trim
  startTime: number;     // timeline position (s)
  trimStart: number;     // offset into audio (s)
  trimEnd: number;       // end of audio to play (s)
  fadeIn: number;
  fadeOut: number;
  gain: number;
  muted: boolean;
  color: string;
  peaks: Float32Array;
};

export type TimelineLane = {
  id: string;
  name: string;
  muted: boolean;
};

export const LANE_COLORS = [
  "rgba(61, 220, 132, 0.72)",
  "rgba(91, 155, 255, 0.72)",
  "rgba(255, 180, 50, 0.72)",
  "rgba(220, 100, 200, 0.72)",
  "rgba(100, 220, 220, 0.72)",
  "rgba(255, 100, 100, 0.72)",
  "rgba(180, 220, 100, 0.72)",
  "rgba(255, 140, 70, 0.72)",
];

/* ── Constants ──────────────────────────────────────────────── */

const RULER_H = 28;
const LANE_H = 76;
const CLIP_PAD_V = 13;
const HANDLE_W = 10;
const ADD_LANE_H = 36;

/* ── Helpers ────────────────────────────────────────────────── */

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  const ds = Math.floor((s % 1) * 10);
  return `${m}:${sec}.${ds}`;
}

/* ── Drag modes ─────────────────────────────────────────────── */

type DragMode =
  | { kind: "none" }
  | { kind: "seek" }
  | { kind: "move"; clipId: string; originX: number; originStart: number }
  | { kind: "trim-start"; clipId: string; originX: number; origTrimStart: number; origStart: number }
  | { kind: "trim-end"; clipId: string; originX: number; origTrimEnd: number };

/* ── Props ──────────────────────────────────────────────────── */

export interface AudioTimelineProps {
  lanes: TimelineLane[];
  clips: TimelineClip[];
  selectedClipId: string | null;
  playhead: number;
  zoom: number; // px / second
  totalDuration: number;
  onSeek: (t: number) => void;
  onClipSelect: (id: string | null) => void;
  onClipMove: (id: string, newStart: number) => void;
  onClipTrimStart: (id: string, trimStart: number, startTime: number) => void;
  onClipTrimEnd: (id: string, trimEnd: number) => void;
  onLaneMute: (laneId: string) => void;
  onAddLane: () => void;
  onAddFileToLane: (laneId: string) => void;
  onDropFile: (laneId: string, file: File, atTime: number) => void;
}

/* ── Component ──────────────────────────────────────────────── */

export default function AudioTimeline({
  lanes, clips, selectedClipId, playhead, zoom, totalDuration,
  onSeek, onClipSelect, onClipMove, onClipTrimStart, onClipTrimEnd,
  onLaneMute, onAddLane, onAddFileToLane, onDropFile,
}: AudioTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragMode>({ kind: "none" });
  const [dropOverLane, setDropOverLane] = useState<string | null>(null);

  const canvasW = Math.max(900, totalDuration * zoom + 300);
  const canvasH = RULER_H + lanes.length * LANE_H + ADD_LANE_H;

  const tToX = useCallback((t: number) => t * zoom, [zoom]);
  const xToT = useCallback((x: number) => Math.max(0, x / zoom), [zoom]);

  /* ── Draw ─────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasW, canvasH);

    /* Ruler */
    ctx.fillStyle = "rgba(14, 16, 21, 0.97)";
    ctx.fillRect(0, 0, canvasW, RULER_H);

    const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300];
    const tickStep = STEPS.find(s => s * zoom >= 50) ?? 300;

    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;

    const end = Math.max(totalDuration, 30);
    for (let t = 0; t <= end + tickStep; t += tickStep) {
      const x = tToX(t);
      if (x > canvasW) break;
      ctx.beginPath();
      ctx.moveTo(x, RULER_H - 5);
      ctx.lineTo(x, RULER_H);
      ctx.stroke();
      ctx.fillText(fmtTime(t), x + 3, RULER_H - 7);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath(); ctx.moveTo(0, RULER_H); ctx.lineTo(canvasW, RULER_H); ctx.stroke();

    /* Lanes */
    lanes.forEach((lane, li) => {
      const laneY = RULER_H + li * LANE_H;
      ctx.fillStyle = dropOverLane === lane.id
        ? "rgba(255,255,255,0.07)"
        : li % 2 === 0
        ? "rgba(255,255,255,0.018)"
        : "rgba(0,0,0,0.14)";
      ctx.fillRect(0, laneY, canvasW, LANE_H);

      ctx.strokeStyle = "rgba(255,255,255,0.055)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, laneY + LANE_H); ctx.lineTo(canvasW, laneY + LANE_H); ctx.stroke();

      /* Clips */
      clips.filter(c => c.laneId === lane.id).forEach(clip => {
        const dur = clip.trimEnd - clip.trimStart;
        if (dur <= 0) return;
        const clipX = tToX(clip.startTime);
        const clipW = Math.max(4, tToX(dur));
        const clipY = laneY + CLIP_PAD_V;
        const clipH = LANE_H - CLIP_PAD_V * 2;
        const isSel = clip.id === selectedClipId;

        ctx.fillStyle = clip.muted ? "rgba(90,90,90,0.5)" : clip.color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(clipX, clipY, clipW, clipH, 4);
        else ctx.rect(clipX, clipY, clipW, clipH);
        ctx.fill();

        ctx.strokeStyle = isSel ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)";
        ctx.lineWidth = isSel ? 1.5 : 1;
        ctx.stroke();

        /* Waveform */
        if (clip.peaks.length > 0 && clipW > 14) {
          ctx.save();
          ctx.beginPath(); ctx.rect(clipX + 2, clipY + 2, clipW - 4, clipH - 4); ctx.clip();
          const mid = clipY + clipH / 2;
          const amp = (clipH / 2) * 0.72;
          const bars = Math.min(clip.peaks.length, Math.floor(clipW / 2));
          const step = clip.peaks.length / bars;
          ctx.strokeStyle = "rgba(255,255,255,0.38)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < bars; i++) {
            const p = clip.peaks[Math.floor(i * step)] ?? 0;
            const px = clipX + (i / bars) * clipW;
            ctx.moveTo(px, mid - p * amp);
            ctx.lineTo(px, mid + p * amp);
          }
          ctx.stroke();
          ctx.restore();
        }

        /* Label */
        ctx.fillStyle = "rgba(0,0,0,0.82)";
        ctx.font = "bold 10px system-ui, sans-serif";
        const lbl = clip.name.length > 22 ? clip.name.slice(0, 20) + "…" : clip.name;
        if (ctx.measureText(lbl).width + 10 < clipW) ctx.fillText(lbl, clipX + 5, clipY + 11);

        /* Trim handles when selected */
        if (isSel) {
          ctx.fillStyle = "rgba(255, 220, 0, 0.88)";
          ctx.fillRect(clipX, clipY, HANDLE_W, clipH);
          ctx.fillRect(clipX + clipW - HANDLE_W, clipY, HANDLE_W, clipH);
          ctx.strokeStyle = "rgba(0,0,0,0.45)";
          ctx.lineWidth = 1;
          const mid = clipY + clipH / 2;
          [clipX + HANDLE_W / 2, clipX + clipW - HANDLE_W / 2].forEach(hx => {
            ctx.beginPath();
            ctx.moveTo(hx, mid - 5); ctx.lineTo(hx, mid + 5); ctx.stroke();
          });
        }
      });
    });

    /* Add-lane hint */
    const addY = RULER_H + lanes.length * LANE_H;
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, addY, canvasW, ADD_LANE_H);

    /* Playhead */
    const phX = tToX(playhead);
    ctx.strokeStyle = "rgba(255, 55, 55, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, canvasH); ctx.stroke();
    ctx.fillStyle = "rgba(255, 55, 55, 0.9)";
    ctx.beginPath();
    ctx.moveTo(phX - 5, 0); ctx.lineTo(phX + 5, 0); ctx.lineTo(phX, 9);
    ctx.closePath(); ctx.fill();
  }, [lanes, clips, selectedClipId, playhead, zoom, totalDuration, tToX, canvasW, canvasH, dropOverLane]);

  /* ── Pointer helpers ────────────────────────────────────────── */

  const coords = (e: React.PointerEvent | React.DragEvent) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const findClip = useCallback((x: number, y: number) => {
    for (const clip of [...clips].reverse()) {
      const li = lanes.findIndex(l => l.id === clip.laneId);
      if (li < 0) continue;
      const laneY = RULER_H + li * LANE_H;
      if (y < laneY + CLIP_PAD_V || y > laneY + LANE_H - CLIP_PAD_V) continue;
      const cx = tToX(clip.startTime);
      const cw = tToX(clip.trimEnd - clip.trimStart);
      if (x >= cx && x <= cx + cw) return clip;
    }
    return null;
  }, [clips, lanes, tToX]);

  const laneAtY = (y: number) => lanes[Math.floor((y - RULER_H) / LANE_H)] ?? null;

  /* ── Pointer events ─────────────────────────────────────────── */

  const onPointerDown = (e: React.PointerEvent) => {
    const pos = coords(e);
    if (!pos) return;
    const { x, y } = pos;

    if (y < RULER_H) {
      dragRef.current = { kind: "seek" };
      onSeek(xToT(x));
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    const addY = RULER_H + lanes.length * LANE_H;
    if (y >= addY) { onAddLane(); return; }

    const clip = findClip(x, y);
    if (!clip) { onClipSelect(null); return; }

    onClipSelect(clip.id);

    const cx = tToX(clip.startTime);
    const cw = tToX(clip.trimEnd - clip.trimStart);
    const isSel = clip.id === selectedClipId;

    if (isSel && x - cx < HANDLE_W) {
      dragRef.current = { kind: "trim-start", clipId: clip.id, originX: x, origTrimStart: clip.trimStart, origStart: clip.startTime };
    } else if (isSel && (cx + cw) - x < HANDLE_W) {
      dragRef.current = { kind: "trim-end", clipId: clip.id, originX: x, origTrimEnd: clip.trimEnd };
    } else {
      dragRef.current = { kind: "move", clipId: clip.id, originX: x, originStart: clip.startTime };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.kind === "none") return;
    const pos = coords(e);
    if (!pos) return;
    const { x } = pos;

    if (drag.kind === "seek") { onSeek(xToT(x)); return; }

    const clip = clips.find(c => c.id === (drag as { clipId: string }).clipId);
    if (!clip) return;
    const dt = (x - (drag as { originX: number }).originX) / zoom;

    if (drag.kind === "move") {
      onClipMove(clip.id, Math.max(0, drag.originStart + dt));
    } else if (drag.kind === "trim-start") {
      const maxT = clip.trimEnd - 0.05;
      const ts = clamp(drag.origTrimStart + dt, 0, maxT);
      const delta = ts - drag.origTrimStart;
      onClipTrimStart(clip.id, ts, Math.max(0, drag.origStart + delta));
    } else if (drag.kind === "trim-end") {
      onClipTrimEnd(clip.id, clamp(drag.origTrimEnd + dt, clip.trimStart + 0.05, clip.audioDuration));
    }
  };

  const onPointerUp = () => { dragRef.current = { kind: "none" }; };

  const onPointerMoveHover = (e: React.PointerEvent) => {
    onPointerMove(e);
    if (dragRef.current.kind !== "none") return;
    const pos = coords(e);
    if (!pos || !canvasRef.current) return;
    const { x, y } = pos;
    if (y < RULER_H) { canvasRef.current.style.cursor = "col-resize"; return; }
    const clip = findClip(x, y);
    if (!clip) { canvasRef.current.style.cursor = "default"; return; }
    const cx = tToX(clip.startTime);
    const cw = tToX(clip.trimEnd - clip.trimStart);
    const isSel = clip.id === selectedClipId;
    canvasRef.current.style.cursor = isSel && (x - cx < HANDLE_W || (cx + cw) - x < HANDLE_W) ? "ew-resize" : "grab";
  };

  /* ── Drag-and-drop files ─────────────────────────────────────── */

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    const pos = coords(e);
    setDropOverLane(pos ? (laneAtY(pos.y)?.id ?? null) : null);
  };
  const onDragLeave = () => setDropOverLane(null);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropOverLane(null);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const pos = coords(e);
    if (!pos) return;
    const lane = laneAtY(pos.y);
    if (!lane) { onAddLane(); return; }
    onDropFile(lane.id, file, xToT(pos.x));
  };

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="at-root">
      {/* Left: lane labels */}
      <div className="at-labels">
        <div className="at-ruler-spacer" />
        {lanes.map((lane) => (
          <div key={lane.id} className="at-label">
            <span className="at-label-name">{lane.name}</span>
            <div className="at-label-actions">
              <button
                className={`at-mute-btn${lane.muted ? " is-muted" : ""}`}
                onClick={() => onLaneMute(lane.id)}
                title={lane.muted ? "Unmute" : "Mute"}
              >
                {lane.muted ? <LuVolumeX size={12} /> : <LuVolume2 size={12} />}
              </button>
              <button
                className="at-add-file-btn"
                onClick={() => onAddFileToLane(lane.id)}
                title="Add clip to this lane"
              >
                <LuPlus size={11} />
              </button>
            </div>
          </div>
        ))}
        <div className="at-add-lane-row">
          <button className="at-add-lane-btn" onClick={onAddLane}>
            <LuPlus size={11} style={{ display: "inline", marginRight: 3 }} />
            Add Lane
          </button>
        </div>
      </div>

      {/* Right: scrollable timeline canvas */}
      <div className="at-scroll-wrapper">
        <canvas
          ref={canvasRef}
          style={{ display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMoveHover}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      </div>
    </div>
  );
}
