"use client";

import { useRef, useState } from "react";
import {
  LuClipboard, LuDownload, LuFileText, LuLink,
  LuLoader, LuMusic, LuSearch, LuVideo, LuX,
} from "react-icons/lu";
import { loadFFmpeg } from "@/lib/ffmpeg";

/* ── Types ────────────────────────────────────────────────── */

interface VideoFormat {
  itag: number;
  quality: string;
  container: string;
  size: number | null;
}

interface AudioFormat {
  itag: number;
  bitrate: number;
  container: string;
  size: number | null;
}

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
  author: string;
  videoFormats: VideoFormat[];
  audioFormats: AudioFormat[];
}

interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

type Mode = "video" | "audio" | "transcript";
type Status = "idle" | "fetching-info" | "fetching-transcript" | "downloading" | "processing" | "done" | "error";

/* ── Helpers ──────────────────────────────────────────────── */

function parseTime(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  const parts = t.split(":").map(n => parseFloat(n) || 0);
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  return parts[0]!;
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec}`;
  return `${m}:${sec}`;
}

function fmtBytes(n: number): string {
  if (n < 1_048_576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}

function concatChunks(chunks: Uint8Array[]): ArrayBuffer {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out.buffer;
}

function dlBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function toSRT(items: TranscriptItem[], offsetSec = 0): string {
  return items.map((item, i) => {
    const t0 = Math.max(0, item.start - offsetSec);
    const t1 = Math.max(0, t0 + item.duration);
    return `${i + 1}\n${srtTs(t0)} --> ${srtTs(t1)}\n${item.text.trim()}\n`;
  }).join("\n");
}

function srtTs(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${p2(h)}:${p2(m)}:${p2(sec)},${ms.toString().padStart(3, "0")}`;
}

function p2(n: number) { return n.toString().padStart(2, "0"); }

function thumbUrl(raw: string | null): string | null {
  if (!raw) return null;
  return `/api/youtube/thumb?url=${encodeURIComponent(raw)}`;
}

/* ── Component ──────────────────────────────────────────────── */

export default function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [from, setFrom] = useState("0:00");
  const [to, setTo] = useState("");
  const [selectedVideoItag, setSelectedVideoItag] = useState<number | null>(null);
  const [transcriptFmt, setTranscriptFmt] = useState<"txt" | "srt">("txt");
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Derived ─────────────────────────────────────────────── */

  const fromSec = parseTime(from);
  const toSec = to.trim() ? parseTime(to) : (info?.duration ?? 0);
  const hasRange = fromSec > 0.5 || (to.trim() && toSec < (info?.duration ?? Infinity) - 1);
  const isWorking = ["fetching-info", "fetching-transcript", "downloading", "processing"].includes(status);
  const videoFmt = (selectedVideoItag ? info?.videoFormats.find(f => f.itag === selectedVideoItag) : null) ?? info?.videoFormats[0] ?? null;
  const audioFmt = info?.audioFormats[0] ?? null;

  /* ── Fetch info ─────────────────────────────────────────── */

  async function handleFetch() {
    const u = url.trim();
    if (!u) return;
    setInfo(null); setError(null); setTranscriptItems(null);
    setStatus("fetching-info");
    try {
      const res = await fetch(`/api/youtube/info?url=${encodeURIComponent(u)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInfo(data as VideoInfo);
      setTo(fmtTime((data as VideoInfo).duration));
      setSelectedVideoItag(null);
      setStatus("idle");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  /* ── Paste from clipboard ────────────────────────────────── */

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.includes("youtube.com") || text.includes("youtu.be")) {
        setUrl(text.trim());
      }
    } catch {}
  }

  /* ── Transcript ──────────────────────────────────────────── */

  async function handleFetchTranscript() {
    if (!info) return;
    setError(null);
    setTranscriptItems(null);
    setStatus("fetching-transcript");
    try {
      const rangeQ = hasRange ? `&from=${fromSec.toFixed(2)}&to=${toSec.toFixed(2)}` : "";
      const res = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(url)}${rangeQ}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTranscriptItems(data.items);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  function handleDownloadTranscript() {
    if (!transcriptItems || !info) return;
    const offset = hasRange ? fromSec : 0;
    const content = transcriptFmt === "srt"
      ? toSRT(transcriptItems, offset)
      : transcriptItems.map(i => i.text.trim()).join(" ");
    const safe = info.title.replace(/[^\w\s.-]/g, "_").slice(0, 60);
    dlBlob(new Blob([content], { type: "text/plain" }), `${safe}.${transcriptFmt}`);
  }

  /* ── Video / Audio download ──────────────────────────────── */

  async function handleDownload() {
    if (!info) return;
    setError(null);
    setProgress(0);
    setStatus("downloading");

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const type = mode as "video" | "audio";
      const itagQ = (mode === "video" && selectedVideoItag) ? `&itag=${selectedVideoItag}` : "";
      const dlUrl = `/api/youtube/download?url=${encodeURIComponent(url)}&type=${type}${itagQ}`;

      setProgressLabel("Downloading…");
      const res = await fetch(dlUrl, { signal: ac.signal });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(j.error ?? "Download failed");
      }

      const total = res.headers.get("content-length") ? parseInt(res.headers.get("content-length")!) : null;
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) setProgress(Math.round((received / total) * (hasRange ? 60 : 95)));
        else setProgress(p => Math.min(p + 1, hasRange ? 55 : 90));
      }

      const buf = concatChunks(chunks);
      const ext = type === "audio" ? "m4a" : "mp4";
      const mime = type === "audio" ? "audio/mp4" : "video/mp4";
      const safe = info.title.replace(/[^\w\s.-]/g, "_").slice(0, 60);

      if (hasRange) {
        setStatus("processing");
        setProgressLabel("Cutting clip…");
        setProgress(65);

        const ff = await loadFFmpeg();
        ff.on("progress", ({ progress: p }) => setProgress(65 + Math.round(p * 30)));

        const inFile = `yt_in.${ext}`;
        const outFile = `yt_out.${ext}`;
        await ff.writeFile(inFile, new Uint8Array(buf));
        await ff.exec(["-i", inFile, "-ss", fromSec.toFixed(3), "-to", toSec.toFixed(3), "-c", "copy", outFile]);
        const output = await ff.readFile(outFile);
        await ff.deleteFile(inFile).catch(() => {});
        await ff.deleteFile(outFile).catch(() => {});

        dlBlob(new Blob([output as unknown as BlobPart], { type: mime }), `${safe}_clip.${ext}`);
      } else {
        dlBlob(new Blob([buf], { type: mime }), `${safe}.${ext}`);
      }

      setProgress(100);
      setProgressLabel("");
      setStatus("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setStatus("error");
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setStatus("idle");
    setProgress(0);
    setProgressLabel("");
  }

  /* ── Render ─────────────────────────────────────────────── */

  const canAct = !!info && !isWorking;
  const clipLabel = hasRange ? ` (${fmtTime(fromSec)} – ${fmtTime(toSec)})` : "";

  return (
    <div className="yt-root">

      {/* URL bar */}
      <div className="yt-url-bar">
        <div className="yt-url-wrap">
          <LuLink className="yt-url-icon" size={16} />
          <input
            className="yt-url-input"
            type="url"
            placeholder="Paste a YouTube URL…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleFetch()}
            disabled={isWorking}
          />
          {url ? (
            <button className="yt-url-side-btn" title="Clear" onClick={() => {
              setUrl(""); setInfo(null); setError(null); setTranscriptItems(null); setStatus("idle");
            }}>
              <LuX size={14} />
            </button>
          ) : (
            <button className="yt-url-side-btn" title="Paste from clipboard" onClick={handlePaste}>
              <LuClipboard size={14} />
            </button>
          )}
        </div>
        <button className="yt-fetch-btn" onClick={handleFetch} disabled={!url.trim() || isWorking}>
          {status === "fetching-info"
            ? <LuLoader size={15} className="yt-spin" />
            : <LuSearch size={15} />}
          Fetch
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="yt-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Video card */}
      {info && (
        <div className="yt-card">
          {info.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="yt-thumb" src={thumbUrl(info.thumbnail)!} alt="" />
          )}
          <div className="yt-card-info">
            <p className="yt-card-title">{info.title}</p>
            <p className="yt-card-meta">{info.author} · {fmtTime(info.duration)}</p>
          </div>
        </div>
      )}

      {info && (
        <>
          {/* Mode tabs */}
          <div className="yt-tabs">
            <button className={`yt-tab${mode === "video" ? " is-active" : ""}`} onClick={() => { setMode("video"); setTranscriptItems(null); setError(null); }} disabled={isWorking}>
              <LuVideo size={14} /> Video
            </button>
            <button className={`yt-tab${mode === "audio" ? " is-active" : ""}`} onClick={() => { setMode("audio"); setTranscriptItems(null); setError(null); }} disabled={isWorking}>
              <LuMusic size={14} /> Audio
            </button>
            <button className={`yt-tab${mode === "transcript" ? " is-active" : ""}`} onClick={() => { setMode("transcript"); setError(null); }} disabled={isWorking}>
              <LuFileText size={14} /> Transcript
            </button>
          </div>

          {/* Time range */}
          <div className="yt-range">
            <div className="yt-range-group">
              <label className="yt-range-label">From</label>
              <input
                className="yt-time-input"
                type="text"
                value={from}
                placeholder="0:00"
                onChange={e => setFrom(e.target.value)}
                onBlur={() => setFrom(fmtTime(Math.max(0, parseTime(from))))}
                disabled={isWorking}
              />
            </div>
            <span className="yt-range-arrow">→</span>
            <div className="yt-range-group">
              <label className="yt-range-label">To</label>
              <input
                className="yt-time-input"
                type="text"
                value={to}
                placeholder={fmtTime(info.duration)}
                onChange={e => setTo(e.target.value)}
                onBlur={() => { if (to.trim()) setTo(fmtTime(Math.min(info.duration, parseTime(to)))); }}
                disabled={isWorking}
              />
            </div>
            {hasRange && (
              <button className="yt-range-clear" onClick={() => { setFrom("0:00"); setTo(fmtTime(info.duration)); }} title="Reset range" disabled={isWorking}>
                <LuX size={12} />
              </button>
            )}
          </div>

          {/* Mode-specific options */}
          {mode === "video" && (
            <div className="yt-options">
              <span className="yt-options-label">Quality</span>
              <div className="yt-quality-list">
                {info.videoFormats.length === 0 ? (
                  <span className="yt-options-hint">No combined formats found</span>
                ) : info.videoFormats.map(f => (
                  <button
                    key={f.itag}
                    className={`yt-quality-btn${(selectedVideoItag ?? info.videoFormats[0]?.itag) === f.itag ? " is-active" : ""}`}
                    onClick={() => setSelectedVideoItag(f.itag)}
                    disabled={isWorking}
                  >
                    {f.quality}
                    {f.size && <span className="yt-quality-size">{fmtBytes(f.size)}</span>}
                  </button>
                ))}
              </div>
              {hasRange && <p className="yt-options-hint">Full video downloads then clip is cut in-browser via ffmpeg.</p>}
            </div>
          )}

          {mode === "audio" && (
            <div className="yt-options">
              <span className="yt-options-label">Format</span>
              {audioFmt ? (
                <span className="yt-quality-btn is-active">
                  M4A · {audioFmt.bitrate}kbps
                  {audioFmt.size && <span className="yt-quality-size">{fmtBytes(audioFmt.size)}</span>}
                </span>
              ) : (
                <span className="yt-options-hint">No audio format found</span>
              )}
              {hasRange && <p className="yt-options-hint">Full audio downloads then clip is cut in-browser via ffmpeg.</p>}
            </div>
          )}

          {mode === "transcript" && (
            <div className="yt-options">
              <span className="yt-options-label">Export as</span>
              {(["txt", "srt"] as const).map(f => (
                <button
                  key={f}
                  className={`yt-quality-btn${transcriptFmt === f ? " is-active" : ""}`}
                  onClick={() => setTranscriptFmt(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Progress */}
          {isWorking && (
            <div className="yt-progress">
              <div className="yt-progress-track">
                <div className="yt-progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="yt-progress-row">
                <span className="yt-progress-label">{progressLabel} {progress > 0 ? `${progress}%` : ""}</span>
                <button className="yt-cancel-btn" onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          )}

          {/* Transcript preview */}
          {mode === "transcript" && transcriptItems && (
            <div className="yt-transcript-box">
              <div className="yt-transcript-header">
                <span className="yt-transcript-count">{transcriptItems.length} segments{hasRange ? ` · ${fmtTime(fromSec)}–${fmtTime(toSec)}` : ""}</span>
                <button className="yt-transcript-dl" onClick={handleDownloadTranscript}>
                  <LuDownload size={13} /> .{transcriptFmt}
                </button>
              </div>
              <div className="yt-transcript-scroll">
                {transcriptItems.slice(0, 300).map((item, i) => (
                  <div key={i} className="yt-transcript-line">
                    <span className="yt-transcript-ts">{fmtTime(item.start)}</span>
                    <span dangerouslySetInnerHTML={{ __html: item.text }} />
                  </div>
                ))}
                {transcriptItems.length > 300 && (
                  <p className="yt-transcript-overflow">+ {transcriptItems.length - 300} more segments — download to see all</p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {mode !== "transcript" && (
            <button className="yt-dl-btn" onClick={handleDownload} disabled={!canAct || (mode === "video" ? !videoFmt : !audioFmt)}>
              <LuDownload size={16} />
              Download {mode === "video" ? "Video" : "Audio"}{clipLabel}
            </button>
          )}

          {mode === "transcript" && !transcriptItems && (
            <button className="yt-dl-btn" onClick={handleFetchTranscript} disabled={!canAct}>
              {status === "fetching-transcript"
                ? <LuLoader size={16} className="yt-spin" />
                : <LuFileText size={16} />}
              Fetch Transcript{clipLabel}
            </button>
          )}

          {mode === "transcript" && transcriptItems && (
            <button className="yt-dl-btn yt-dl-btn--secondary" onClick={() => { setTranscriptItems(null); setStatus("idle"); }}>
              <LuSearch size={16} /> Fetch Again
            </button>
          )}
        </>
      )}

      {/* Empty state */}
      {!info && !isWorking && (
        <div className="yt-empty">
          <div className="yt-empty-icon">▶</div>
          <p className="yt-empty-title">Paste a YouTube URL to get started</p>
          <p className="yt-empty-sub">
            Download video (up to 720p), audio (M4A), or the auto-generated transcript.
            Set From / To to clip a specific segment.
          </p>
        </div>
      )}
    </div>
  );
}
