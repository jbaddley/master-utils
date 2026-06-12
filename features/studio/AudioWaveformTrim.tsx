"use client";

import { useCallback, useEffect, useRef } from "react";

type DragKind = "start" | "end" | "region" | null;

type AudioWaveformTrimProps = {
  peaks: Float32Array;
  duration: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange?: (start: number, end: number) => void;
  showTrimHandles?: boolean;
  playhead?: number;
  onSeek?: (time: number) => void;
  className?: string;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const MIN_TRIM = 0.05;

export default function AudioWaveformTrim({
  peaks,
  duration,
  trimStart,
  trimEnd,
  onTrimChange,
  showTrimHandles = false,
  playhead = 0,
  onSeek,
  className,
}: AudioWaveformTrimProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: DragKind;
    originX: number;
    startTrim: number;
    endTrim: number;
  } | null>(null);

  const timeToX = useCallback(
    (time: number, width: number) => (duration > 0 ? (time / duration) * width : 0),
    [duration],
  );

  const xToTime = useCallback(
    (x: number, width: number) => (width > 0 ? (x / width) * duration : 0),
    [duration],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || peaks.length === 0) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const mid = height / 2;
      const maxPeak = Math.max(...Array.from(peaks), 0.001);
      const barWidth = width / peaks.length;

      const startX = timeToX(trimStart, width);
      const endX = timeToX(trimEnd, width);

      // Dimmed regions outside trim selection
      if (showTrimHandles && duration > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(0, 0, startX, height);
        ctx.fillRect(endX, 0, width - endX, height);
      }

      for (let i = 0; i < peaks.length; i++) {
        const t = (i / peaks.length) * duration;
        const inSelection = !showTrimHandles || (t >= trimStart && t <= trimEnd);
        const amp = ((peaks[i] ?? 0) / maxPeak) * (height * 0.42);
        const x = i * barWidth;
        ctx.fillStyle = inSelection ? "#3ddc84" : "#2a9d5c";
        ctx.fillRect(x, mid - amp, Math.max(1, barWidth - 0.5), amp * 2);
      }

      // Selection border
      if (showTrimHandles && duration > 0) {
        ctx.strokeStyle = "rgba(61, 220, 132, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(startX + 1, 1, Math.max(0, endX - startX - 2), height - 2);

        // Handles
        const handleW = 8;
        ctx.fillStyle = "#3ddc84";
        ctx.fillRect(startX - handleW / 2, 0, handleW, height);
        ctx.fillRect(endX - handleW / 2, 0, handleW, height);
      }

      // Playhead
      if (duration > 0) {
        const playX = timeToX(playhead, width);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, height);
        ctx.stroke();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [peaks, duration, trimStart, trimEnd, showTrimHandles, playhead, timeToX]);

  const hitTest = (clientX: number): DragKind => {
    if (!showTrimHandles || !onTrimChange || !containerRef.current || duration <= 0) {
      return onSeek ? "region" : null;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const startX = timeToX(trimStart, width);
    const endX = timeToX(trimEnd, width);
    const tol = 10;

    if (Math.abs(x - startX) <= tol) return "start";
    if (Math.abs(x - endX) <= tol) return "end";
    if (x > startX + tol && x < endX - tol) return "region";
    return onSeek ? "region" : null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const kind = hitTest(e.clientX);
    if (!kind) return;

    if (kind === "region" && onSeek && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      onSeek(clamp(xToTime(e.clientX - rect.left, rect.width), 0, duration));
      return;
    }

    if (!onTrimChange) return;

    dragRef.current = {
      kind,
      originX: e.clientX,
      startTrim: trimStart,
      endTrim: trimEnd,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !onTrimChange || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - drag.originX;
    const dt = (dx / rect.width) * duration;

    if (drag.kind === "start") {
      const next = clamp(drag.startTrim + dt, 0, drag.endTrim - MIN_TRIM);
      onTrimChange(next, trimEnd);
    } else if (drag.kind === "end") {
      const next = clamp(drag.endTrim + dt, drag.startTrim + MIN_TRIM, duration);
      onTrimChange(trimStart, next);
    } else if (drag.kind === "region") {
      const len = drag.endTrim - drag.startTrim;
      let nextStart = drag.startTrim + dt;
      nextStart = clamp(nextStart, 0, duration - len);
      onTrimChange(nextStart, nextStart + len);
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const cursor =
    showTrimHandles && onTrimChange
      ? "crosshair"
      : onSeek
        ? "pointer"
        : "default";

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ cursor, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Audio timeline" : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? duration : undefined}
      aria-valuenow={onSeek ? playhead : undefined}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
