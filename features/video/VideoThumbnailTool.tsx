"use client";

import { useRef, useState, useCallback } from "react";
import { LuCamera, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const ACCEPTED_INPUTS = ["mp4", "webm", "mov"];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export default function VideoThumbnailTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const handleFile = (f: File) => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setVideoSrc(url);
    setThumbnailBlob(null);
    setThumbnailUrl(null);
    setCurrentTime(0);
    setVideoDuration(0);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setCapturing(true);

    const doCapture = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCapturing(false);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
          const url = URL.createObjectURL(blob);
          setThumbnailBlob(blob);
          setThumbnailUrl(url);
        }
        setCapturing(false);
      }, "image/png");
    };

    video.currentTime = currentTime;
    video.onseeked = () => {
      video.onseeked = null;
      doCapture();
    };
  }, [currentTime, thumbnailUrl]);

  const download = () => {
    if (!file || !thumbnailBlob) return;
    const blob = thumbnailBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}-thumbnail.png`,
      description: "Video thumbnail PNG",
      mime: "image/png",
      ext: ".png",
      getBlob: () => blob,
    });
  };

  const reset = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    setFile(null);
    setVideoSrc(null);
    setThumbnailBlob(null);
    setThumbnailUrl(null);
    setCurrentTime(0);
    setVideoDuration(0);
  };

  return (
    <div className="tool-ui">
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
            <LuCamera className="dropzone-icon" />
            <strong>Drop video file or click to select</strong>
            <span>Accepted: {ACCEPTED_INPUTS.join(", ").toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <Button variant="outline" onClick={reset}>
              <LuRefreshCw />
              Change file
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[260px]">
              {file.name}
            </span>
            <div className="toolbar-spacer" />
            {thumbnailBlob && (
              <Button onClick={download}>
                <LuDownload />
                Download PNG
              </Button>
            )}
          </div>

          {videoSrc && (
            <section className="card settings">
              {/* Hidden video element for frame extraction */}
              <video
                ref={videoRef}
                src={videoSrc}
                style={{ display: "none" }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setVideoDuration(videoRef.current.duration);
                  }
                }}
                preload="metadata"
                crossOrigin="anonymous"
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />

              <label className="field">
                <span className="field-label">
                  Scrub to frame — {currentTime.toFixed(1)}s
                  {videoDuration > 0 ? ` / ${videoDuration.toFixed(1)}s` : ""}
                </span>
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    setCurrentTime(Number(e.target.value));
                    setThumbnailBlob(null);
                    setThumbnailUrl(null);
                  }}
                  style={{ width: "100%" }}
                />
              </label>

              <Button onClick={captureFrame} disabled={capturing || videoDuration === 0}>
                <LuCamera />
                {capturing ? "Capturing…" : "Capture Frame"}
              </Button>
            </section>
          )}

          {thumbnailUrl && (
            <div className="card" style={{ textAlign: "center" }}>
              <img
                src={thumbnailUrl}
                alt="Captured thumbnail"
                style={{ maxWidth: "100%", borderRadius: 4 }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
