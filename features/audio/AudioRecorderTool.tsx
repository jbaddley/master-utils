"use client";

import { useRef, useState, useEffect } from "react";
import { LuMic, LuDownload, LuSquare } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

export default function AudioRecorderTool() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [recording, setRecording] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioSrc) URL.revokeObjectURL(audioSrc);
    };
  }, [audioSrc]);

  const startRecording = async () => {
    setError(null);
    setResultBlob(null);
    setAudioSrc(null);
    setDuration(0);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(
        e instanceof Error ? `Microphone access denied: ${e.message}` : "Could not access microphone."
      );
      return;
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setAudioSrc(url);
    };

    mediaRecorder.start();
    setRecording(true);

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const download = () => {
    if (!resultBlob) return;
    const blob = resultBlob;
    void saveAs({
      suggestedName: `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`,
      description: "Voice recording WebM",
      mime: "audio/webm",
      ext: ".webm",
      getBlob: () => blob,
    });
  };

  const reset = () => {
    setResultBlob(null);
    setAudioSrc(null);
    setDuration(0);
    setError(null);
  };

  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <section className="card settings" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {recording && (
            <div style={{ fontSize: "2rem", fontVariantNumeric: "tabular-nums", color: "var(--destructive, #dc2626)" }}>
              {formatDuration(duration)}
            </div>
          )}

          {!recording ? (
            <Button onClick={() => void startRecording()} size="lg">
              <LuMic />
              {resultBlob ? "Record Again" : "Start Recording"}
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" size="lg">
              <LuSquare />
              Stop Recording
            </Button>
          )}
        </div>
      </section>

      {audioSrc && resultBlob && !recording && (
        <>
          <section className="card">
            <div className="field-label mb-2">Preview</div>
            <audio
              src={audioSrc}
              controls
              style={{ width: "100%" }}
            />
          </section>

          <div className="toolbar">
            <div className="toolbar-spacer" />
            <Button onClick={download}>
              <LuDownload />
              Download .webm
            </Button>
          </div>
        </>
      )}

      {resultBlob && !recording && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button
            onClick={reset}
            style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
          >
            Clear recording
          </button>
        </div>
      )}
    </div>
  );
}
