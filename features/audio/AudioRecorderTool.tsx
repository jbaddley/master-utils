"use client";

import { useRef, useState, useEffect } from "react";
import { LuMic, LuSquare, LuDownload, LuCircle } from "react-icons/lu";
import { saveAs } from "@/lib/download";

type RecordState = "idle" | "recording" | "stopped";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioRecorderTool() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setError(null);
    setBlob(null);
    setAudioUrl(null);
    setElapsed(0);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setError("Microphone access denied. Allow microphone permission and try again.");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const recorded = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(recorded);
      setBlob(recorded);
      setAudioUrl(url);
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start(100);
    setState("recording");
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setState("stopped");
  };

  const download = async () => {
    if (!blob) return;
    const ext = blob.type.includes("ogg") ? ".ogg" : ".webm";
    const mime = blob.type.split(";")[0];
    await saveAs({ suggestedName: `recording-${Date.now()}${ext}`, description: "Audio Recording", mime, ext, getBlob: () => blob });
  };

  const reset = () => {
    setBlob(null);
    setAudioUrl(null);
    setElapsed(0);
    setState("idle");
    setError(null);
  };

  if (!supported) {
    return <div className="card" style={{ textAlign: "center", color: "var(--muted-foreground)", padding: "2rem" }}>Audio recording is not supported in this browser. Try Chrome or Firefox.</div>;
  }

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "2rem 0" }}>
        {/* Timer */}
        <div style={{ fontSize: "3rem", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: state === "recording" ? "var(--primary)" : "var(--foreground)", letterSpacing: "-0.02em" }}>
          {formatTime(elapsed)}
        </div>

        {/* Record/Stop button */}
        {state === "idle" && (
          <button onClick={() => void startRecording()}
            style={{ width: 72, height: 72, borderRadius: "50%", border: "none", background: "var(--destructive, #ef4444)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LuMic size={28} />
          </button>
        )}
        {state === "recording" && (
          <button onClick={stopRecording}
            style={{ width: 72, height: 72, borderRadius: "50%", border: "none", background: "var(--destructive, #ef4444)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s infinite" }}>
            <LuSquare size={24} />
          </button>
        )}

        {state === "recording" && (
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <LuCircle size={10} style={{ color: "var(--destructive, #ef4444)", fill: "currentColor" }} /> Recording…
          </p>
        )}

        {state === "idle" && <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Click the button to start recording</p>}
      </div>

      {audioUrl && blob && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <audio controls src={audioUrl} style={{ width: "100%" }} />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={download}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.6rem 1rem", borderRadius: "var(--radius)", border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
              <LuDownload size={14} /> Download ({(blob.size / 1024).toFixed(0)} KB)
            </button>
            <button onClick={reset}
              style={{ padding: "0.6rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer", fontSize: "14px" }}>
              Record again
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            Saved as WebM/Opus — most players and editors support this format. Use{" "}
            <a href="/audio-studio/" style={{ color: "var(--primary)" }}>
              Audio Studio
            </a>{" "}
            to convert to MP3 or WAV.
          </p>
        </div>
      )}
    </div>
  );
}
