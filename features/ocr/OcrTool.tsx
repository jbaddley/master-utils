"use client";

import { useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { Dropzone } from "@/components/Dropzone";
import { FileDropzone } from "@/components/FileDropzone";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveAs } from "@/lib/download";
import { getPdfJs } from "@/lib/pdfjs";

const LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
] as const;

type Worker = Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>>;

let workerCache: { lang: string; worker: Worker } | null = null;
let onProgress: ((pct: number) => void) | null = null;

async function getWorker(lang: string): Promise<Worker> {
  if (workerCache?.lang === lang) return workerCache.worker;
  if (workerCache) {
    await workerCache.worker.terminate();
    workerCache = null;
  }
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang, 1, {
    logger: (m: { status: string; progress?: number }) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  workerCache = { lang, worker };
  return worker;
}

export default function OcrTool() {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("eng");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);

  const runOcr = async (file: File) => {
    setError(null);
    setText("");
    setStatus("working");
    setProgress(0);
    fileRef.current = file;
    try {
      let input: Blob | string = file;
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const pdfjs = await getPdfJs();
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (doc.numPages > 1) {
          throw new Error("Multi-page PDFs are not supported yet — use the first page only or split the PDF.");
        }
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not available");
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        input = await new Promise<Blob>((res, rej) => {
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("Render failed"))), "image/png");
        });
        page.cleanup();
        await doc.destroy();
      }

      onProgress = setProgress;
      const worker = await getWorker(lang);
      const { data } = await worker.recognize(input);
      onProgress = null;
      setProgress(100);
      setText(data.text.trim());
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "OCR failed.");
    }
  };

  const downloadTxt = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    void saveAs({
      suggestedName: "extracted-text.txt",
      description: "Text",
      mime: "text/plain",
      ext: ".txt",
      getBlob: () => blob,
      toolName: "image-to-text",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <div className="field" style={{ marginBottom: "1rem" }}>
        <Label htmlFor="ocr-lang">Language</Label>
        <select id="ocr-lang" value={lang} onChange={(e) => setLang(e.target.value)} disabled={status === "working"}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {status === "idle" && !text && (
        <>
          <Dropzone label="Drop an image to extract text" onFile={(f) => void runOcr(f)} onError={setError} />
          <p style={{ textAlign: "center", margin: "0.75rem 0", color: "var(--muted-foreground)", fontSize: "13px" }}>or</p>
          <FileDropzone
            label="Drop a single-page PDF"
            accept="application/pdf,.pdf"
            onFiles={(fs) => void runOcr(fs[0])}
            onError={setError}
          />
        </>
      )}

      {status === "working" && (
        <div className="card">
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>
            Recognizing text… {progress > 0 ? `${progress}%` : "loading engine"}
          </p>
          <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(8, progress)}%`,
                background: "var(--primary)",
                transition: "width 0.2s",
              }}
            />
          </div>
        </div>
      )}

      {(text || status === "done") && (
        <div className="settings">
          <textarea
            className="code-area"
            readOnly
            value={text}
            rows={14}
            placeholder="Extracted text will appear here…"
          />
          <div className="actionbar">
            <CopyButton getText={() => text} label="Copy text" />
            <Button type="button" variant="outline" onClick={() => { setText(""); setStatus("idle"); fileRef.current = null; }}>
              New file
            </Button>
            <Button type="button" onClick={downloadTxt} disabled={!text}>
              <LuDownload /> Download .txt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
