"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuPlus, LuDownload, LuX, LuMusic } from "react-icons/lu";
import { saveAs } from "@/lib/download";

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

const MIME: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
  m4a: "audio/mp4", flac: "audio/flac", aac: "audio/aac",
};

function ext(name: string) { return name.split(".").pop()?.toLowerCase() ?? "mp3"; }
function mime(name: string) { return MIME[ext(name)] ?? "audio/mpeg"; }

export default function AudioMergeTool() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [outputFmt, setOutputFmt] = useState("mp3");
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
    setResultBlob(null); setStatus("idle"); setError(null);
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); addFiles(e.dataTransfer.files); };

  const getFFmpeg = async () => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    setStatus("loading");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CDNBASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CDNBASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const merge = async () => {
    if (files.length < 2) { setError("Add at least 2 audio files to merge."); return; }
    setError(null); setResultBlob(null); setProgress(0);
    let ffmpeg: FFmpeg;
    try { ffmpeg = await getFFmpeg(); } catch (e) {
      setStatus("error"); setError(e instanceof Error ? e.message : "Failed to load ffmpeg.wasm"); return;
    }
    try {
      setStatus("converting");
      const progressHandler = ({ progress: p }: { progress: number }) =>
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      ffmpeg.on("progress", progressHandler);

      // Write all input files
      const inputNames: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const name = `input${i}.${ext(files[i].name)}`;
        await ffmpeg.writeFile(name, await fetchFile(files[i]));
        inputNames.push(name);
      }

      // Write concat list file
      const listContent = inputNames.map((n) => `file '${n}'`).join("\n");
      await ffmpeg.writeFile("list.txt", listContent);

      const outputName = `merged.${outputFmt}`;
      // If all inputs are same format as output, use stream copy; otherwise re-encode
      const allSameExt = inputNames.every((n) => n.endsWith(`.${outputFmt}`));
      const args = allSameExt
        ? ["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", outputName]
        : ["-f", "concat", "-safe", "0", "-i", "list.txt", outputName];

      await ffmpeg.exec(args);

      const raw = await ffmpeg.readFile(outputName);
      const data = typeof raw === "string" ? new TextEncoder().encode(raw).buffer : (raw as Uint8Array).buffer.slice(0);
      const blob = new Blob([data as ArrayBuffer], { type: MIME[outputFmt] ?? "audio/mpeg" });

      ffmpeg.off("progress", progressHandler);
      for (const name of inputNames) try { await ffmpeg.deleteFile(name); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile("list.txt"); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

      setResultBlob(blob); setProgress(100); setStatus("done");
    } catch (e) {
      setStatus("error"); setError(e instanceof Error ? e.message : "Merge failed.");
    }
  };

  const download = () => {
    if (!resultBlob) return;
    const blob = resultBlob;
    void saveAs({ suggestedName: `merged.${outputFmt}`, description: "Audio", mime: mime(`merged.${outputFmt}`), ext: `.${outputFmt}`, getBlob: () => blob });
  };

  const isWorking = status === "loading" || status === "converting";

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {/* File list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {files.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", fontSize: "13px" }}>
            <LuMusic size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
            <span style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
            <button onClick={() => removeFile(i)} disabled={isWorking}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "0.15rem", display: "flex" }}>
              <LuX size={14} />
            </button>
          </div>
        ))}

        {/* Drop zone */}
        <div
          onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", textAlign: "center", cursor: "pointer", fontSize: "13px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
        >
          <LuPlus size={16} /> Add audio files (MP3, WAV, OGG, M4A, FLAC…)
        </div>
        <input ref={inputRef} type="file" accept=".mp3,.wav,.ogg,.m4a,.flac,.aac" multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {files.length > 0 && (
        <>
          <section className="card settings">
            <label className="field">
              <span className="field-label">Output format</span>
              <select value={outputFmt} onChange={(e) => setOutputFmt(e.target.value)} disabled={isWorking}
                style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "13px" }}>
                <option value="mp3">MP3 — widely compatible</option>
                <option value="wav">WAV — lossless PCM</option>
                <option value="ogg">OGG — open format</option>
                <option value="flac">FLAC — lossless compressed</option>
              </select>
            </label>
          </section>

          <div className="toolbar">
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{files.length} file{files.length !== 1 ? "s" : ""} — merged in order</span>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <button onClick={download}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
                <LuDownload size={14} /> Download merged.{outputFmt}
              </button>
            ) : (
              <button onClick={() => void merge()} disabled={isWorking || files.length < 2}
                style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "none", background: isWorking || files.length < 2 ? "var(--muted)" : "var(--primary)", color: isWorking || files.length < 2 ? "var(--muted-foreground)" : "var(--primary-foreground)", cursor: isWorking || files.length < 2 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px" }}>
                {isWorking ? (status === "loading" ? "Loading ffmpeg.wasm…" : `Merging… ${progress}%`) : "Merge Audio"}
              </button>
            )}
          </div>

          {isWorking && (
            <div className="card">
              <div style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Merging… ${progress}%`}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${status === "loading" ? 10 : progress}%`, background: "var(--primary)", borderRadius: 3, transition: "width 0.2s" }} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
