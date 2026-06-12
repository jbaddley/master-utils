"use client";

import { useCallback, useEffect, useRef } from "react";

export type LaneClip = {
  id: string;
  label: string;
  duration: number;
  startTime: number;
  color: string;
};

type AudioLaneTimelineProps = {
  totalDuration: number;
  lanes: LaneClip[][];
  crossfadeStart: number;
  crossfadeEnd: number;
  onClipMove: (laneIndex: number, clipId: string, startTime: number) => void;
  playhead?: number;
  className?: string;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const LANE_HEIGHT = 52;
const LANE_GAP = 6;
const RULER_H = 22;

export default function AudioLaneTimeline({
  totalDuration,
  lanes,
  crossfadeStart,
  crossfadeEnd,
  onClipMove,
  playhead = 0,
  className,
}: AudioLaneTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    laneIndex: number;
    clipId: string;
    originX: number;
    originStart: number;
  } | null>(null);

  const timeToX = useCallback(
    (time: number, width: number) => (totalDuration > 0 ? (time / totalDuration) * width : 0),
    [totalDuration],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const laneCount = Math.max(lanes.length, 2);
      const height = RULER_H + laneCount * (LANE_HEIGHT + LANE_GAP) + LANE_GAP;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, width, height);

      // Crossfade overlap zone
      if (crossfadeEnd > crossfadeStart && totalDuration > 0) {
        const x1 = timeToX(crossfadeStart, width);
        const x2 = timeToX(crossfadeEnd, width);
        ctx.fillStyle = "rgba(147, 112, 219, 0.2)";
        ctx.fillRect(x1, RULER_H, x2 - x1, height - RULER_H);
        ctx.fillStyle = "rgba(147, 112, 219, 0.5)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText("crossfade", x1 + 4, RULER_H + 12);
      }

      // Time ruler
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.font = "10px system-ui, sans-serif";
      ctx.beginPath();
      ctx.moveTo(0, RULER_H);
      ctx.lineTo(width, RULER_H);
      ctx.stroke();

      const tickCount = Math.min(12, Math.max(4, Math.ceil(totalDuration / 5)));
      for (let i = 0; i <= tickCount; i++) {
        const t = (i / tickCount) * totalDuration;
        const x = timeToX(t, width);
        ctx.beginPath();
        ctx.moveTo(x, RULER_H - 4);
        ctx.lineTo(x, RULER_H);
        ctx.stroke();
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60)
          .toString()
          .padStart(2, "0");
        ctx.fillText(`${m}:${s}`, x + 2, RULER_H - 6);
      }

      // Lanes
      lanes.forEach((laneClips, laneIdx) => {
        const y = RULER_H + LANE_GAP + laneIdx * (LANE_HEIGHT + LANE_GAP);

        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(0, y, width, LANE_HEIGHT);
        ctx.strokeRect(0, y, width, LANE_HEIGHT);

        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText(`Lane ${laneIdx + 1}`, 6, y + 12);

        for (const clip of laneClips) {
          if (totalDuration <= 0) continue;
          const x = timeToX(clip.startTime, width);
          const w = timeToX(clip.duration, width);
          ctx.fillStyle = clip.color;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.fillRect(x, y + 14, Math.max(4, w), LANE_HEIGHT - 18);
          ctx.strokeRect(x, y + 14, Math.max(4, w), LANE_HEIGHT - 18);

          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.font = "11px system-ui, sans-serif";
          const label =
            clip.label.length > 18 ? `${clip.label.slice(0, 16)}…` : clip.label;
          ctx.fillText(label, x + 6, y + 30);
        }
      });

      // Playhead
      if (totalDuration > 0) {
        const px = timeToX(playhead, width);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [lanes, totalDuration, crossfadeStart, crossfadeEnd, playhead, timeToX]);

  const findClipAt = (clientX: number, clientY: number) => {
    if (!containerRef.current || totalDuration <= 0) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const width = rect.width;

    for (let laneIdx = 0; laneIdx < lanes.length; laneIdx++) {
      const laneY = RULER_H + LANE_GAP + laneIdx * (LANE_HEIGHT + LANE_GAP);
      if (y < laneY + 14 || y > laneY + LANE_HEIGHT - 4) continue;

      for (const clip of lanes[laneIdx] ?? []) {
        const cx = timeToX(clip.startTime, width);
        const cw = timeToX(clip.duration, width);
        if (x >= cx && x <= cx + cw) {
          return { laneIdx, clip };
        }
      }
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const hit = findClipAt(e.clientX, e.clientY);
    if (!hit || hit.laneIdx === 0) return; // lane 0 is locked at 0

    dragRef.current = {
      laneIndex: hit.laneIdx,
      clipId: hit.clip.id,
      originX: e.clientX,
      originStart: hit.clip.startTime,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - drag.originX;
    const dt = (dx / rect.width) * totalDuration;
    const clip = lanes[drag.laneIndex]?.find((c) => c.id === drag.clipId);
    if (!clip) return;

    const next = clamp(drag.originStart + dt, 0, Math.max(0, totalDuration - clip.duration));
    onClipMove(drag.laneIndex, drag.clipId, next);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ touchAction: "none", cursor: "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <canvas ref={canvasRef} className="block w-full" />
    </div>
  );
}
