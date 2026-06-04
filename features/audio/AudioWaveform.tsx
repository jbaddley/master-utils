"use client";

import { useEffect, useRef } from "react";

type AudioWaveformProps = {
  peaks: Float32Array;
  progress?: number;
  className?: string;
  onSeek?: (ratio: number) => void;
};

export default function AudioWaveform({
  peaks,
  progress = 0,
  className,
  onSeek,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

      ctx.fillStyle = "#3ddc84";
      for (let i = 0; i < peaks.length; i++) {
        const amp = ((peaks[i] ?? 0) / maxPeak) * (height * 0.42);
        const x = i * barWidth;
        ctx.fillRect(x, mid - amp, Math.max(1, barWidth - 0.5), amp * 2);
      }

      const playX = Math.max(0, Math.min(1, progress)) * width;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [peaks, progress]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)));
  };

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={handleClick}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek audio" : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      style={{ cursor: onSeek ? "pointer" : "default" }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
