"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { LuMusic, LuPlus, LuDownload, LuRefreshCw, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { saveAs } from "@/lib/download";

const CDNBASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

const ACCEPTED_INPUTS = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];
const ACCEPT_ATTR = ACCEPTED_INPUTS.map((e) => `.${e}`).join(",");

const MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",
};

function extOf(filename: string): string {
  return filename.split(".").pop() ?? "mp3";
}

export default function AudioMergeTool() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "converting" | "done" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles((prev) => [...prev, ...arr]);
    setResultBlob(null);
    setError(null);
    if (status === "done") setStatus("idle");
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResultBlob(null);
    if (status === "done") setStatus("idle");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const getFFmpeg = async (): Promise<FFmpeg> => {
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
    if (files.length < 2) {
      setError("Please add at least 2 audio files to merge.");
      return;
    }
    setError(null);
    setResultBlob(null);
    setProgress(0);

    let ffmpeg: FFmpeg;
    try {
      ffmpeg = await getFFmpeg();
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? `Failed to load ffmpeg.wasm: ${e.message}` : "Failed to load ffmpeg.wasm"
      );
      return;
    }

    try {
      setStatus("converting");
      setProgress(0);

      const progressHandler = ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100));
      };
      ffmpeg.on("progress", progressHandler);

      const inputNames: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = extOf(f.name);
        const name = `input${i}.${ext}`;
        inputNames.push(name);
        await ffmpeg.writeFile(name, await fetchFile(f));
      }

      // Write filelist.txt for concat demuxer
      const fileListContent = inputNames.map((n) => `file '${n}'`).join("\n");
      await ffmpeg.writeFile("filelist.txt", fileListContent);

      const firstExt = extOf(files[0].name);
      const outputName = `output.${firstExt}`;

      await ffmpeg.exec([
        "-f", "concat",
        "-safe", "0",
        "-i", "filelist.txt",
        "-c", "copy",
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const mime = MIME_MAP[firstExt] ?? "audio/mpeg";
      const raw = typeof data === "string" ? new TextEncoder().encode(data).buffer : (data as Uint8Array).buffer.slice(0);
      const blob = new Blob([raw as ArrayBuffer], { type: mime });

      ffmpeg.off("progress", progressHandler);

      for (const name of inputNames) {
        try { await ffmpeg.deleteFile(name); } catch { /* ignore */ }
      }
      try { await ffmpeg.deleteFile("filelist.txt"); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

      setResultBlob(blob);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? `Merge failed: ${e.message}` : "Merge failed."
      );
    }
  };

  const download = () => {
    if (!files.length || !resultBlob) return;
    const ext = extOf(files[0].name);
    const mime = MIME_MAP[ext] ?? "audio/mpeg";
    const blob = resultBlob;
    void saveAs({
      suggestedName: `merged.${ext}`,
      description: `Merged ${ext.toUpperCase()} audio`,
      mime,
      ext: `.${ext}`,
      getBlob: () => blob,
    });
  };

  const reset = () => {
    setFiles([]);
    setResultBlob(null);
    setError(null);
    setStatus("idle");
    setProgress(0);
  };

  const isWorking = status === "loading" || status === "converting";

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      {/* Drop zone to add files */}
      <div
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={files.length > 0 ? { padding: "16px", minHeight: "auto" } : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="dropzone-inner">
          <LuMusic className="dropzone-icon" />
          {files.length === 0 ? (
            <>
              <strong>Drop audio files or click to select</strong>
              <span>Accepted: {ACCEPTED_INPUTS.join(", ").toUpperCase()}</span>
            </>
          ) : (
            <>
              <LuPlus style={{ marginRight: 4 }} />
              <strong>Add more files</strong>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <>
          <section className="card">
            <div className="field-label mb-2">Files to merge ({files.length})</div>
            <ol style={{ margin: 0, padding: "0 0 0 20px", listStyle: "decimal" }}>
              {files.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <span className="text-sm" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    disabled={isWorking}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}
                    aria-label={`Remove ${f.name}`}
                  >
                    <LuX size={14} />
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <div className="toolbar">
            <Button variant="outline" onClick={reset} disabled={isWorking}>
              <LuRefreshCw />
              Clear all
            </Button>
            <div className="toolbar-spacer" />
            {status === "done" ? (
              <Button onClick={download}>
                <LuDownload />
                Download merged
              </Button>
            ) : (
              <Button onClick={() => void merge()} disabled={isWorking || files.length < 2}>
                {isWorking ? (
                  status === "loading" ? "Loading ffmpeg.wasm…" : `Merging… ${progress}%`
                ) : (
                  "Merge Files"
                )}
              </Button>
            )}
          </div>

          {isWorking && (
            <div className="card">
              <div className="field-label mb-2">
                {status === "loading" ? "Loading ffmpeg.wasm…" : `Merging… ${progress}%`}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${status === "loading" ? 15 : progress}%`,
                    background: "var(--primary)",
                    borderRadius: 3,
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LuMusic style={{ flexShrink: 0, color: "var(--muted-foreground)" }} />
              <span className="text-sm text-muted-foreground">
                Ready — click <strong>Download merged</strong> above to save.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
