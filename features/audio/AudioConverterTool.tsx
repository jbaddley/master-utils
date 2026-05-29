"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { formatFFmpegLoadError, loadFFmpeg } from "@/lib/ffmpeg";
import { LuMusic, LuDownload, LuRefreshCw, LuLoader } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";
import {
  AUDIO_OUTPUT_BY_INPUT,
  AUDIO_LABEL,
  VIDEO_AS_AUDIO_INPUTS,
} from "@/lib/media-conversions";

type OutputFmt = "mp3" | "wav" | "ogg" | "m4a" | "flac" | "aac";

const FMT_MIME: Record<OutputFmt, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",
};

const FMT_LABEL: Record<OutputFmt, string> = {
  mp3: "MP3 — widely compatible",
  wav: "WAV — lossless PCM",
  ogg: "OGG — open & efficient",
  m4a: "M4A — Apple AAC",
  flac: "FLAC — lossless compressed",
  aac: "AAC — high quality",
};

const FMT_EXT: Record<OutputFmt, string> = {
  mp3: "mp3",
  wav: "wav",
  ogg: "ogg",
  m4a: "m4a",
  flac: "flac",
  aac: "m4a",
};

const DEFAULT_ACCEPTED = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "mp4", ...VIDEO_AS_AUDIO_INPUTS];

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function extOf(filename: string): string {
  const m = filename.match(/\.([a-z0-9]+)$/i);
  return m ? m[1]!.toLowerCase() : "";
}

function isVideoExt(ext: string): boolean {
  return VIDEO_AS_AUDIO_INPUTS.includes(ext);
}

function inputKeyForExt(ext: string, extractAudio?: boolean): string {
  if (extractAudio && isVideoExt(ext)) return "video";
  if (ext === "m4v") return "mp4";
  return AUDIO_OUTPUT_BY_INPUT[ext] ? ext : "mp3";
}

function buildArgs(inputName: string, outputFmt: OutputFmt, stripVideo: boolean): string[] {
  const outputName = `output.${FMT_EXT[outputFmt]}`;
  const base = stripVideo ? ["-i", inputName, "-vn"] : ["-i", inputName];
  switch (outputFmt) {
    case "mp3":
      return [...base, "-q:a", "0", outputName];
    case "aac":
      return [...base, "-c:a", "aac", "-q:a", "1", outputName];
    case "ogg":
      return [...base, "-c:a", "libvorbis", outputName];
    case "flac":
      return [...base, "-c:a", "flac", outputName];
    default:
      return [...base, outputName];
  }
}

export default function AudioConverterTool({
  initialFrom,
  initialTo = "mp3",
  acceptedInputs,
  extractAudio,
}: {
  initialFrom?: string;
  initialTo?: string;
  acceptedInputs?: string[];
  extractAudio?: boolean;
}) {
  const accepted = acceptedInputs ?? DEFAULT_ACCEPTED;
  const acceptAttr = [...new Set(accepted)].map((ext) => `.${ext}`).join(",");

  const [inputKey, setInputKey] = useState(initialFrom ?? "mp3");
  const [outputFmt, setOutputFmt] = useState<OutputFmt>(
    (initialTo as OutputFmt) in FMT_MIME ? (initialTo as OutputFmt) : "mp3",
  );

  const allowedOutputs = useMemo(() => {
    const keys = AUDIO_OUTPUT_BY_INPUT[inputKey] ?? AUDIO_OUTPUT_BY_INPUT.mp3!;
    return keys.filter((k): k is OutputFmt => k in FMT_MIME);
  }, [inputKey]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!allowedOutputs.includes(outputFmt)) {
      setOutputFmt(allowedOutputs[0] ?? "mp3");
    }
  }, [allowedOutputs, outputFmt]);

  useEffect(() => {
    if (initialFrom) setInputKey(initialFrom);
    if (initialTo && initialTo in FMT_MIME) setOutputFmt(initialTo as OutputFmt);
  }, [initialFrom, initialTo]);

  const handleFile = (f: File) => {
    const ext = extOf(f.name);
    const key = inputKeyForExt(ext, extractAudio);
    setInputKey(key);
    const outs = (AUDIO_OUTPUT_BY_INPUT[key] ?? []).filter((k): k is OutputFmt => k in FMT_MIME);
    if (outs.length && !outs.includes(outputFmt)) setOutputFmt(outs[0]!);
    setFile(f);
    if (resultUrl) { URL.revokeObjectURL(resultUrl); setResultUrl(null); }
    setResultBlob(null);
    setError(null);
    setStatus("idle");
    setProgress(0);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setError(null);
    setResultBlob(null);
    setProgress(0);

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
      const progressHandler = ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      };
      ffmpeg.on("progress", progressHandler);

      const inputExt = extOf(file.name) || "mp3";
      const inputName = `input.${inputExt}`;
      const stripVideo = extractAudio || isVideoExt(inputExt);

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(buildArgs(inputName, outputFmt, stripVideo));

      const outputName = `output.${FMT_EXT[outputFmt]}`;
      const raw = await ffmpeg.readFile(outputName);
      const audioData =
        typeof raw === "string" ? new TextEncoder().encode(raw).buffer : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([audioData as ArrayBuffer], { type: FMT_MIME[outputFmt] });

      ffmpeg.off("progress", progressHandler);
      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? `Conversion failed: ${e.message}` : "Conversion failed.");
    }
  };

  const download = () => {
    if (!file || !resultBlob) return;
    const blob = resultBlob;
    void saveAs({
      suggestedName: `${baseName(file.name)}.${FMT_EXT[outputFmt]}`,
      description: `${outputFmt.toUpperCase()} audio`,
      mime: FMT_MIME[outputFmt],
      ext: `.${FMT_EXT[outputFmt]}`,
      getBlob: () => blob,
    });
  };

  const reset = () => {
    if (resultUrl) { URL.revokeObjectURL(resultUrl); setResultUrl(null); }
    setFile(null);
    setResultBlob(null);
    setError(null);
    setStatus("idle");
    setProgress(0);
  };

  const isWorking = status === "loading" || status === "converting";
  const inputLabel = inputKey === "video" ? "Video" : (AUDIO_LABEL[inputKey] ?? inputKey.toUpperCase());

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <section className="card settings">
        <div className="duo">
          <label className="field">
            <span className="field-label">Input format</span>
            <select
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setFile(null);
                setResultBlob(null);
              }}
              disabled={!!file && isWorking}
            >
              {(extractAudio
                ? ["video", ...Object.keys(AUDIO_OUTPUT_BY_INPUT).filter((k) => k !== "mp4")]
                : Object.keys(AUDIO_OUTPUT_BY_INPUT)
              ).map((k) => (
                <option key={k} value={k}>
                  {k === "video" ? "Video (any)" : (AUDIO_LABEL[k] ?? k.toUpperCase())}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Output format</span>
            <select
              value={outputFmt}
              onChange={(e) => {
                setOutputFmt(e.target.value as OutputFmt);
                setResultBlob(null);
                setStatus("idle");
              }}
              disabled={isWorking}
            >
              {allowedOutputs.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {FMT_LABEL[fmt]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

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
            accept={acceptAttr}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="dropzone-inner">
            <LuMusic className="dropzone-icon" />
            <strong>Drop {inputLabel} file or click to select</strong>
            <span>Output: {allowedOutputs.map((f) => f.toUpperCase()).join(", ")}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <Button variant="outline" onClick={reset} disabled={isWorking}>
              <LuRefreshCw />
              Change file
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[260px]">{file.name}</span>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <Button onClick={download}>
                <LuDownload />
                Download {outputFmt.toUpperCase()}
              </Button>
            ) : (
              <Button onClick={() => void convert()} disabled={isWorking}>
                {isWorking
                  ? status === "loading"
                    ? "Loading ffmpeg.wasm…"
                    : `Converting… ${progress}%`
                  : extractAudio
                    ? "Extract audio"
                    : "Convert"}
              </Button>
            )}
          </div>

          {isWorking && (
            <div className="card">
              <div className="field-label mb-2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {status === "loading" ? (
                  <>
                    <LuLoader className="animate-spin" style={{ width: 14, height: 14, flexShrink: 0 }} />
                    Loading ffmpeg.wasm…
                  </>
                ) : (
                  `Converting… ${progress}%`
                )}
              </div>
              {status === "converting" && (
                <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: "var(--primary)",
                      borderRadius: 3,
                      transition: "width 0.2s",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {status === "done" && resultUrl && (
            <div className="card">
              <div className="field-label mb-2">Preview</div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={resultUrl} style={{ width: "100%" }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
