"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import {
  LuDownload,
  LuMusic,
  LuPause,
  LuPlay,
  LuRefreshCw,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { analyzeAudioFile, type DetectedKey } from "@/lib/audio-analysis";
import {
  ACCEPTED_AUDIO_ATTR,
  ACCEPTED_AUDIO_INPUTS,
  adjustedBpm,
  AUDIO_FMT_EXT,
  AUDIO_FMT_MIME,
  baseName,
  buildEncodeArgs,
  buildPitchSpeedFilter,
  extOf,
  transposeKeyLabel,
  type AudioOutputFmt,
} from "@/lib/audio-utils";
import { saveAs } from "@/lib/download";
import { formatFFmpegLoadError, loadFFmpeg } from "@/lib/ffmpeg";
import AudioWaveform from "@/features/audio/AudioWaveform";

const OUTPUT_FORMATS: AudioOutputFmt[] = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];

export default function AudioPitchSpeedTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processGenRef = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "analyzing" | "loading" | "processing" | "ready" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);

  const [peaks, setPeaks] = useState<Float32Array>(new Float32Array(0));
  const [detectedBpm, setDetectedBpm] = useState(0);
  const [detectedKey, setDetectedKey] = useState<DetectedKey | null>(null);
  const [duration, setDuration] = useState(0);

  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [snapSemitones, setSnapSemitones] = useState(true);
  const [outputFmt, setOutputFmt] = useState<AudioOutputFmt>("mp3");
  const [volume, setVolume] = useState(0.85);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const revokePreview = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const resetAll = useCallback(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    revokePreview(previewUrl);
    setPreviewUrl(null);
    setResultBlob(null);
    setFile(null);
    setPeaks(new Float32Array(0));
    setDetectedBpm(0);
    setDetectedKey(null);
    setDuration(0);
    setPitch(0);
    setSpeed(1);
    setError(null);
    setStatus("idle");
    setProgress(0);
    setIsPlaying(false);
    setPlayhead(0);
  }, [previewUrl, revokePreview]);

  const handleFile = async (f: File) => {
    resetAll();
    setFile(f);
    setStatus("analyzing");
    setError(null);

    const ext = extOf(f.name) as AudioOutputFmt;
    if (OUTPUT_FORMATS.includes(ext)) setOutputFmt(ext);

    try {
      const analysis = await analyzeAudioFile(f);
      setPeaks(analysis.peaks);
      setDetectedBpm(analysis.bpm);
      setDetectedKey(analysis.key);
      setDuration(analysis.duration);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error
          ? `Could not read audio: ${e.message}`
          : "Could not read audio file."
      );
    }
  };

  const processAudio = useCallback(
    async (pitchValue: number, speedValue: number) => {
      if (!file) return null;

      const gen = ++processGenRef.current;
      setError(null);
      setProgress(0);

      let ffmpeg: FFmpeg;
      try {
        setStatus("loading");
        ffmpeg = await loadFFmpeg();
      } catch (e) {
        if (gen !== processGenRef.current) return null;
        setStatus("error");
        setError(formatFFmpegLoadError(e));
        return null;
      }

      try {
        if (gen !== processGenRef.current) return null;
        setStatus("processing");

        const progressHandler = ({ progress: p }: { progress: number }) => {
          setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
        };
        ffmpeg.on("progress", progressHandler);

        const ext = extOf(file.name);
        const inputName = `input.${ext}`;
        const filter = buildPitchSpeedFilter(pitchValue, speedValue);
        const args = buildEncodeArgs(inputName, outputFmt, filter);

        await ffmpeg.writeFile(inputName, await fetchFile(file));
        await ffmpeg.exec(args);

        const outputName = `output.${AUDIO_FMT_EXT[outputFmt]}`;
        const data = await ffmpeg.readFile(outputName);
        const mime = AUDIO_FMT_MIME[outputFmt];
        const audioData =
          typeof data === "string"
            ? new TextEncoder().encode(data).buffer
            : (data as Uint8Array).buffer.slice(0);
        const blob = new Blob([audioData as ArrayBuffer], { type: mime });

        ffmpeg.off("progress", progressHandler);
        try {
          await ffmpeg.deleteFile(inputName);
        } catch {
          /* ignore */
        }
        try {
          await ffmpeg.deleteFile(outputName);
        } catch {
          /* ignore */
        }

        if (gen !== processGenRef.current) return null;
        return blob;
      } catch (e) {
        if (gen !== processGenRef.current) return null;
        setStatus("error");
        setError(
          e instanceof Error ? `Processing failed: ${e.message}` : "Processing failed."
        );
        return null;
      }
    },
    [file, outputFmt]
  );

  const schedulePreview = useCallback(() => {
    if (!file) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

    if (pitch === 0 && speed === 1) {
      setPreviewUrl((prev) => {
        revokePreview(prev);
        return URL.createObjectURL(file);
      });
      setResultBlob(null);
      setStatus("ready");
      setProgress(100);
      setPlayhead(0);
      setIsPlaying(false);
      return;
    }

    previewTimerRef.current = setTimeout(() => {
      void (async () => {
        const blob = await processAudio(pitch, speed);
        if (!blob) return;

        setPreviewUrl((prev) => {
          revokePreview(prev);
          return URL.createObjectURL(blob);
        });
        setResultBlob(blob);
        setStatus("ready");
        setProgress(100);
        setPlayhead(0);
        setIsPlaying(false);
      })();
    }, 700);
  }, [file, pitch, speed, processAudio, revokePreview]);

  useEffect(() => {
    if (!file || status === "analyzing") return;
    schedulePreview();
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [file, pitch, speed, outputFmt, schedulePreview, status]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      revokePreview(previewUrl);
    };
  }, [previewUrl, revokePreview]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setError("Playback was blocked. Click play again.");
    }
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setPlayhead(audio.currentTime / audio.duration);
  };

  const seekTo = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = ratio * audio.duration;
    setPlayhead(ratio);
  };

  const download = async () => {
    if (!file) return;
    let blob = resultBlob;
    if (!blob) {
      blob = await processAudio(pitch, speed);
      if (!blob) return;
      setResultBlob(blob);
      setStatus("ready");
    }

    const suffix =
      pitch === 0 && speed === 1
        ? ""
        : `-pitch${pitch >= 0 ? "+" : ""}${pitch.toFixed(2)}-speed${speed.toFixed(2)}x`;

    void saveAs({
      suggestedName: `${baseName(file.name)}${suffix}.${outputFmt === "aac" ? "m4a" : outputFmt}`,
      description: `${outputFmt.toUpperCase()} audio`,
      mime: AUDIO_FMT_MIME[outputFmt],
      ext: `.${outputFmt === "aac" ? "m4a" : outputFmt}`,
      getBlob: () => blob!,
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const isWorking =
    status === "analyzing" ||
    status === "loading" ||
    status === "processing";

  const displayPitch = snapSemitones ? Math.round(pitch) : pitch;
  const keyLabel = detectedKey
    ? transposeKeyLabel(detectedKey.root, detectedKey.mode, displayPitch)
    : "—";
  const bpmLabel =
    detectedBpm > 0 ? String(adjustedBpm(detectedBpm, speed)) : "—";

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {!file ? (
        <div className="pitch-speed-empty">
          <p className="pitch-speed-kicker">How it works</p>
          <h2 className="pitch-speed-title">Audio speed and pitch changer</h2>
          <p className="pitch-speed-subtitle">
            Change pitch and tempo independently with musical key and BPM hints
            — all in your browser.
          </p>
          <div
            className={`dropzone pitch-speed-dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_AUDIO_ATTR}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <div className="dropzone-inner">
              <LuMusic className="dropzone-icon" />
              <strong>Browse my files</strong>
              <span>{ACCEPTED_AUDIO_INPUTS.join(", ").toUpperCase()}</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <Button variant="outline" onClick={resetAll} disabled={isWorking}>
              <LuRefreshCw />
              Change file
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[260px]">
              {file.name}
            </span>
            <div className="toolbar-spacer" />
            {isWorking && (
              <span className="text-sm text-muted-foreground">
                {status === "analyzing"
                  ? "Analyzing…"
                  : status === "loading"
                    ? "Loading ffmpeg…"
                    : `Processing… ${progress}%`}
              </span>
            )}
          </div>

          <div className="pitch-speed-workspace card">
            <AudioWaveform
              peaks={peaks}
              progress={playhead}
              onSeek={previewUrl ? seekTo : undefined}
              className="pitch-speed-waveform"
            />

            <div className="pitch-speed-controls">
              <div className="pitch-speed-row">
                <span className="pitch-speed-label">Pitch</span>
                <Slider
                  min={-12}
                  max={12}
                  step={snapSemitones ? 1 : 0.05}
                  value={[pitch]}
                  disabled={isWorking}
                  onValueChange={(values) => {
                    const next = Array.isArray(values) ? values[0]! : values;
                    setPitch(snapSemitones ? Math.round(next) : next);
                  }}
                  className="pitch-speed-slider"
                />
                <span className="pitch-speed-value">
                  {displayPitch >= 0 ? "+" : ""}
                  {displayPitch.toFixed(snapSemitones ? 0 : 2)}
                </span>
                <div className="pitch-speed-meta">
                  <span className="pitch-speed-meta-label">Key</span>
                  <span className="pitch-speed-meta-value">{keyLabel}</span>
                </div>
              </div>

              <div className="pitch-speed-row pitch-speed-row-secondary">
                <span className="pitch-speed-label" aria-hidden />
                <div className="pitch-speed-semitones">
                  <Switch
                    id="semitones"
                    checked={snapSemitones}
                    onCheckedChange={(checked) => {
                      setSnapSemitones(!!checked);
                      if (checked) setPitch(Math.round(pitch));
                    }}
                    disabled={isWorking}
                  />
                  <Label htmlFor="semitones" className="text-xs text-muted-foreground">
                    semitones
                  </Label>
                </div>
              </div>

              <div className="pitch-speed-row">
                <span className="pitch-speed-label">Speed</span>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.01}
                  value={[speed]}
                  disabled={isWorking}
                  onValueChange={(values) =>
                    setSpeed(Array.isArray(values) ? values[0]! : values)
                  }
                  className="pitch-speed-slider"
                />
                <span className="pitch-speed-value">{speed.toFixed(2)}×</span>
                <div className="pitch-speed-meta">
                  <span className="pitch-speed-meta-label">BPM</span>
                  <span className="pitch-speed-meta-value">{bpmLabel}</span>
                </div>
              </div>
            </div>

            <div className="pitch-speed-transport">
              <div className="pitch-speed-playback">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void togglePlay()}
                  disabled={!previewUrl || isWorking}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <LuPause /> : <LuPlay />}
                </Button>
                <Slider
                  min={0}
                  max={1}
                  step={0.001}
                  value={[volume]}
                  onValueChange={(values) =>
                    setVolume(Array.isArray(values) ? values[0]! : values)
                  }
                  className="pitch-speed-volume"
                  aria-label="Volume"
                />
                {duration > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatTime(playhead * duration)} / {formatTime(duration)}
                  </span>
                )}
              </div>

              <div className="pitch-speed-export">
                <Select
                  value={outputFmt}
                  onValueChange={(value) => setOutputFmt(value as AudioOutputFmt)}
                  disabled={isWorking}
                >
                  <SelectTrigger size="sm" aria-label="Output format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map((fmt) => (
                      <SelectItem key={fmt} value={fmt}>
                        {fmt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => void download()} disabled={isWorking}>
                  <LuDownload />
                  Save
                </Button>
              </div>
            </div>

            {previewUrl && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio
                ref={audioRef}
                src={previewUrl}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                hidden
              />
            )}
          </div>

          {detectedKey && detectedBpm > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Detected {detectedKey.label} at ~{detectedBpm} BPM. Key and BPM
              update as you adjust pitch and speed.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
