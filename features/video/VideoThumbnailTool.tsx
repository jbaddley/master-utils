"use client";

import { useRef, useState, useCallback } from "react";
import { LuImage, LuDownload, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const ACCEPTED_EXTS = ["mp4", "webm", "mov", "avi", "mkv"];
const ACCEPT_ATTR = ACCEPTED_EXTS.map((e) => `.${e}`).join(",");

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${s}`;
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export default function VideoThumbnailTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [scrubberValue, setScrubberValue] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [extractedBlob, setExtractedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setObjectUrl(url);
    setExtractedBlob(null);
    setPreviewUrl(null);
    setScrubberValue(0);
    setCurrentTime(0);
    setDuration(0);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onVideoMetadataLoaded = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  const onVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrubberValue(val);
    const video = videoRef.current;
    if (video) {
      video.currentTime = val;
    }
  };

  const extractFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !file) return;

    setExtracting(true);
    setExtractedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const doExtract = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setExtracting(false);
        return;
      }
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      canvas.toBlob((blob) => {
        if (!blob) {
          setExtracting(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        setExtractedBlob(blob);
        setPreviewUrl(url);
        setExtracting(false);
      }, "image/png");
    };

    video.currentTime = scrubberValue;
    video.onseeked = () => {
      video.onseeked = null;
      doExtract();
    };
  }, [file, scrubberValue, previewUrl]);

  const download = () => {
    if (!file || !extractedBlob) return;
    const blob = extractedBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}-thumbnail.png`,
      description: "PNG thumbnail",
      mime: "image/png",
      ext: ".png",
      getBlob: () => blob,
    });
  };

  const reset = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setObjectUrl(null);
    setExtractedBlob(null);
    setPreviewUrl(null);
    setScrubberValue(0);
    setCurrentTime(0);
    setDuration(0);
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
            <LuImage className="dropzone-icon" />
            <strong>Drop video file or click to select</strong>
            <span>Accepted: {ACCEPTED_EXTS.join(", ").toUpperCase()}</span>
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
            {extractedBlob ? (
              <Button onClick={download}>
                <LuDownload />
                Download PNG
              </Button>
            ) : (
              <Button onClick={extractFrame} disabled={extracting || duration === 0}>
                {extracting ? "Extracting…" : "Extract Frame"}
              </Button>
            )}
          </div>

          <section className="card settings" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Hidden video element for frame extraction */}
            <video
              ref={videoRef}
              src={objectUrl ?? undefined}
              style={{ width: "100%", maxHeight: 360, borderRadius: 6, background: "#000" }}
              onLoadedMetadata={onVideoMetadataLoaded}
              onTimeUpdate={onVideoTimeUpdate}
              controls={false}
              preload="metadata"
              muted
            />

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="text-sm text-muted-foreground" style={{ minWidth: 64 }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={scrubberValue}
                onChange={handleScrubberChange}
                disabled={duration === 0}
                style={{ flex: 1 }}
              />
              <span className="text-sm text-muted-foreground" style={{ minWidth: 64, textAlign: "right" }}>
                {formatTime(duration)}
              </span>
            </div>
          </section>

          {/* Hidden canvas for frame extraction */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {previewUrl && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="field-label">Extracted frame preview</span>
              <img
                src={previewUrl}
                alt="Extracted video frame"
                style={{ width: "100%", borderRadius: 6, objectFit: "contain", maxHeight: 360 }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
