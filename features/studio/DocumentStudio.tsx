"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  LuDownload,
  LuFileText,
  LuGripVertical,
  LuInfo,
  LuLayers,
  LuPlus,
  LuRedo2,
  LuScissors,
  LuUndo2,
  LuX,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Button } from "@/components/ui/button";
import { getPdfJs } from "@/lib/pdfjs";
import { saveAs } from "@/lib/download";
import { formatBytes } from "@/lib/format";

/* ---------- types ---------- */

type Snapshot = {
  bytes: Uint8Array;
  label: string;
  name: string;
  pageCount: number;
};

type ToolId = "reorder" | "split" | "merge" | "info";

type PageThumb = {
  num: number;
  dataUrl: string;
};

const TOOLS: { id: ToolId; label: string; icon: IconType }[] = [
  { id: "reorder", label: "Reorder", icon: LuGripVertical },
  { id: "split", label: "Split", icon: LuScissors },
  { id: "merge", label: "Merge", icon: LuLayers },
  { id: "info", label: "Info", icon: LuInfo },
];

const THUMB_SCALE = 0.28;
const THUMB_WIDTH = 140;

/* ---------- helpers ---------- */

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "document";
}

async function renderThumbnails(
  pdfJs: Awaited<ReturnType<typeof getPdfJs>>,
  data: Uint8Array,
  onThumb: (pageNum: number, url: string) => void,
): Promise<number> {
  const doc = await pdfJs.getDocument({ data: data.slice() }).promise;
  const count = doc.numPages;
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: THUMB_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }
    onThumb(i, canvas.toDataURL("image/jpeg", 0.7));
    page.cleanup();
  }
  await doc.destroy();
  return count;
}

async function bytesFromDoc(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save();
}

/* ---------- component ---------- */

export default function DocumentStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ current: number; total: number } | null>(null);

  // Page thumbnails for the viewport
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);

  // Reorder drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [pendingOrder, setPendingOrder] = useState<number[] | null>(null);

  // Split state
  const [splitRange, setSplitRange] = useState("");
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitPages, setSplitPages] = useState<Set<number>>(new Set());

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [mergeDragIdx, setMergeDragIdx] = useState<number | null>(null);

  const current = history[index] ?? null;
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  /* ---- thumbnail rendering ---- */

  const renderThumbs = useCallback(async (bytes: Uint8Array) => {
    setThumbsLoading(true);
    setThumbs([]);
    try {
      const pdfJs = await getPdfJs();
      const newThumbs: PageThumb[] = [];
      await renderThumbnails(pdfJs, bytes, (pageNum, url) => {
        newThumbs.push({ num: pageNum, dataUrl: url });
        setThumbs([...newThumbs]);
        setLoadProgress({ current: pageNum, total: 0 });
      });
      setThumbs(newThumbs);
    } catch {
      // thumbnails are optional
    } finally {
      setThumbsLoading(false);
      setLoadProgress(null);
    }
  }, []);

  // Re-render thumbs when snapshot changes
  useEffect(() => {
    if (current) {
      setPendingOrder(null);
      void renderThumbs(current.bytes);
    } else {
      setThumbs([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Keyboard undo/redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (index < history.length - 1) {
            setIndex((i) => i + 1);
            setTool(null);
          }
        } else if (index > 0) {
          setIndex((i) => i - 1);
          setTool(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, history.length]);

  const apply = useCallback(
    (bytes: Uint8Array, label: string, pageCount: number) => {
      const snap: Snapshot = {
        bytes,
        label,
        name: current?.name ?? "document",
        pageCount,
      };
      setHistory((h) => [...h.slice(0, index + 1), snap]);
      setIndex((i) => i + 1);
      setTool(null);
      setPendingOrder(null);
      setSplitRange("");
      setSplitPages(new Set());
      setMergeFiles([]);
    },
    [index, current?.name],
  );

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setWorking(true);
    setTool(null);
    setThumbs([]);
    setPendingOrder(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfJs = await getPdfJs();
      const doc = await pdfJs.getDocument({ data: bytes.slice() }).promise;
      const count = doc.numPages;
      await doc.destroy();
      const snap: Snapshot = {
        bytes,
        label: "Original",
        name: baseName(file.name),
        pageCount: count,
      };
      setOriginalFile(file);
      setHistory([snap]);
      setIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PDF.");
    } finally {
      setWorking(false);
    }
  }, []);

  /* ---- split helper ---- */

  const parseSplitRange = useCallback(
    (val: string): Set<number> | null => {
      if (!val.trim()) return new Set();
      const count = current?.pageCount ?? 0;
      try {
        const parts = val.split(",").flatMap((part) => {
          const t = part.trim();
          if (/^\d+$/.test(t)) {
            const n = parseInt(t, 10);
            return [n];
          }
          const m = t.match(/^(\d+)-(\d+)$/);
          if (m) {
            const a = parseInt(m[1], 10);
            const b = parseInt(m[2], 10);
            if (a > b) throw new Error(`Range ${a}-${b} is invalid.`);
            return Array.from({ length: b - a + 1 }, (_, k) => a + k);
          }
          throw new Error(`Invalid range segment: "${t}".`);
        });
        const invalid = parts.find((n) => n < 1 || n > count);
        if (invalid !== undefined)
          throw new Error(`Page ${invalid} is out of range (1–${count}).`);
        return new Set(parts);
      } catch (e) {
        setSplitError(e instanceof Error ? e.message : "Invalid range.");
        return null;
      }
    },
    [current?.pageCount],
  );

  const onSplitRangeChange = (val: string) => {
    setSplitRange(val);
    setSplitError(null);
    const pages = parseSplitRange(val);
    setSplitPages(pages ?? new Set());
  };

  /* ---- operations ---- */

  const applyReorder = async () => {
    if (!current || !pendingOrder) return;
    setWorking(true);
    setError(null);
    try {
      const srcDoc = await PDFDocument.load(current.bytes);
      const outDoc = await PDFDocument.create();
      const indices = pendingOrder.map((n) => n - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => outDoc.addPage(p));
      const bytes = await bytesFromDoc(outDoc);
      apply(bytes, "Reorder pages", bytes.length > 0 ? pendingOrder.length : current.pageCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed.");
    } finally {
      setWorking(false);
    }
  };

  const applyRemovePage = async (pageNum: number) => {
    if (!current) return;
    setWorking(true);
    setError(null);
    try {
      const srcDoc = await PDFDocument.load(current.bytes);
      const outDoc = await PDFDocument.create();
      const indices = Array.from(
        { length: current.pageCount },
        (_, i) => i,
      ).filter((i) => i !== pageNum - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => outDoc.addPage(p));
      const bytes = await bytesFromDoc(outDoc);
      apply(bytes, `Delete page ${pageNum}`, indices.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Page deletion failed.");
    } finally {
      setWorking(false);
    }
  };

  const applySplit = async () => {
    if (!current || splitPages.size === 0) return;
    setWorking(true);
    setError(null);
    try {
      const srcDoc = await PDFDocument.load(current.bytes);
      const outDoc = await PDFDocument.create();
      const sortedPages = [...splitPages].sort((a, b) => a - b);
      const indices = sortedPages.map((n) => n - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => outDoc.addPage(p));
      const bytes = await bytesFromDoc(outDoc);
      apply(bytes, `Split (${buildRangeLabel(sortedPages)})`, sortedPages.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed.");
    } finally {
      setWorking(false);
    }
  };

  const applyMerge = async () => {
    if (!current || mergeFiles.length === 0) return;
    setWorking(true);
    setError(null);
    try {
      const outDoc = await PDFDocument.create();
      // Add current document first
      const srcDoc = await PDFDocument.load(current.bytes);
      const srcCopied = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      srcCopied.forEach((p) => outDoc.addPage(p));
      // Add merge files
      for (const file of mergeFiles) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        const copied = await outDoc.copyPages(doc, doc.getPageIndices());
        copied.forEach((p) => outDoc.addPage(p));
      }
      const bytes = await bytesFromDoc(outDoc);
      const totalPages = outDoc.getPageCount();
      apply(bytes, `Merge +${mergeFiles.length} file${mergeFiles.length > 1 ? "s" : ""}`, totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed.");
    } finally {
      setWorking(false);
    }
  };

  const download = () => {
    if (!current) return;
    const bytes = current.bytes;
    void saveAs({
      suggestedName: `${current.name}.pdf`,
      description: "PDF",
      mime: "application/pdf",
      ext: ".pdf",
      getBlob: () => new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    });
  };

  /* ---- reorder drag handlers (in viewport) ---- */

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };
  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIdx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const currentThumbs = pendingOrder
      ? thumbs.map((_, i) => pendingOrder[i] ?? thumbs[i].num)
      : thumbs.map((t) => t.num);
    const next = [...currentThumbs];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIdx, 0, moved);
    setPendingOrder(next);
    // Re-sort thumbs display
    setThumbs((prev) => {
      const byNum = new Map(prev.map((t) => [t.num, t]));
      return next.map((n) => byNum.get(n)!).filter(Boolean);
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  /* ---- helpers ---- */

  function buildRangeLabel(pages: number[]): string {
    if (pages.length === 0) return "";
    const parts: string[] = [];
    let start = pages[0];
    let end = pages[0];
    for (let i = 1; i < pages.length; i++) {
      if (pages[i] === end + 1) {
        end = pages[i];
      } else {
        parts.push(start === end ? `${start}` : `${start}–${end}`);
        start = pages[i];
        end = pages[i];
      }
    }
    parts.push(start === end ? `${start}` : `${start}–${end}`);
    return parts.join(", ");
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void loadFile(f);
  };

  /* ---- dropzone ---- */

  if (!current) {
    return (
      <div className="studio">
        {error && <div className="error">{error}</div>}
        <div
          className="dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = "";
            }}
          />
          <div className="dropzone-inner">
            <LuFileText className="dropzone-icon" />
            <strong>Drop a PDF to start editing</strong>
            <span>Reorder pages, split, merge, and download — all in your browser</span>
          </div>
        </div>
        {working && <div className="studio-loading">Loading…</div>}
      </div>
    );
  }

  /* ---- studio shell ---- */

  return (
    <div className="studio">
      {error && <div className="error">{error}</div>}

      <div className="studio-shell">
        {/* Topbar */}
        <div className="studio-topbar">
          <div className="studio-file">
            <strong title={originalFile?.name ?? current.name}>
              {originalFile?.name ?? current.name}
            </strong>
            <span>
              {current.pageCount} page{current.pageCount !== 1 ? "s" : ""}
              {history.length > 1
                ? ` · ${history.length - 1} edit${history.length > 2 ? "s" : ""}`
                : ""}
              {" · "}
              {formatBytes(current.bytes.length)}
            </span>
          </div>
          <div className="studio-topbar-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!canUndo) return;
                setIndex((i) => i - 1);
                setTool(null);
              }}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <LuUndo2 />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!canRedo) return;
                setIndex((i) => i + 1);
                setTool(null);
              }}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <LuRedo2 />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" onClick={download} disabled={working}>
              <LuDownload />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="studio-body">
          {/* Left rail */}
          <nav className="studio-rail" aria-label="Document tools">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`studio-rail-btn${tool === id ? " is-active" : ""}`}
                onClick={() => setTool((t) => (t === id ? null : id))}
                aria-pressed={tool === id}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Viewport: page thumbnails */}
          <div className="studio-viewport studio-pdf-viewport">
            {thumbsLoading && thumbs.length === 0 && (
              <div className="placeholder">
                {loadProgress
                  ? `Rendering page ${loadProgress.current}…`
                  : "Rendering pages…"}
              </div>
            )}

            {thumbs.length > 0 && (
              <>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    marginBottom: 8,
                  }}
                >
                  {tool === "reorder"
                    ? "Drag to reorder · × to delete"
                    : tool === "split"
                      ? "Click pages to select for split"
                      : `${current.pageCount} page${current.pageCount !== 1 ? "s" : ""}`}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_WIDTH}px, 1fr))`,
                    gap: "0.6rem",
                  }}
                >
                  {thumbs.map((thumb, idx) => {
                    const isDragging = dragIndex === idx;
                    const isOver =
                      dragOverIndex === idx && dragIndex !== idx;
                    const isSelected =
                      tool === "split" && splitPages.has(thumb.num);
                    return (
                      <div
                        key={`${thumb.num}-${idx}`}
                        draggable={tool === "reorder"}
                        onDragStart={
                          tool === "reorder"
                            ? () => handleDragStart(idx)
                            : undefined
                        }
                        onDragOver={
                          tool === "reorder"
                            ? (e) => handleDragOver(e, idx)
                            : undefined
                        }
                        onDrop={
                          tool === "reorder"
                            ? (e) => handleDrop(e, idx)
                            : undefined
                        }
                        onDragEnd={
                          tool === "reorder" ? handleDragEnd : undefined
                        }
                        onClick={() => {
                          if (tool !== "split") return;
                          setSplitPages((prev) => {
                            const next = new Set(prev);
                            if (next.has(thumb.num)) next.delete(thumb.num);
                            else next.add(thumb.num);
                            return next;
                          });
                        }}
                        style={{
                          position: "relative",
                          borderRadius: "var(--radius-sm)",
                          border: isSelected
                            ? "2px solid var(--primary)"
                            : isOver
                              ? "2px solid var(--ring)"
                              : "1px solid var(--border)",
                          background: "var(--card)",
                          opacity: isDragging ? 0.4 : 1,
                          cursor:
                            tool === "reorder"
                              ? "grab"
                              : tool === "split"
                                ? "pointer"
                                : "default",
                          overflow: "hidden",
                          userSelect: "none",
                          transition: "border-color 0.1s, opacity 0.15s",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${idx + 1}`}
                          style={{
                            display: "block",
                            width: "100%",
                            height: "auto",
                          }}
                          draggable={false}
                        />

                        {/* Page badge */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: isSelected
                              ? "rgba(var(--primary-rgb, 0,0,0), 0.7)"
                              : "rgba(0,0,0,0.5)",
                            color: "#fff",
                            fontSize: 11,
                            textAlign: "center",
                            padding: "2px 0",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          {idx + 1}
                          {pendingOrder &&
                          pendingOrder[idx] !== undefined &&
                          pendingOrder[idx] !== idx + 1
                            ? ` (${pendingOrder[idx]})`
                            : ""}
                        </div>

                        {/* Delete button — only in reorder mode */}
                        {tool === "reorder" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void applyRemovePage(thumb.num);
                            }}
                            aria-label={`Delete page ${idx + 1}`}
                            style={{
                              position: "absolute",
                              top: 3,
                              right: 3,
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "rgba(220,53,69,0.85)",
                              border: "none",
                              color: "#fff",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <LuX size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="studio-side">
            {/* History */}
            {history.length > 1 && (
              <section className="studio-card">
                <h3 className="studio-card-title">History</h3>
                <ol
                  style={{
                    margin: 0,
                    padding: "0 0 0 1.1em",
                    fontSize: 12,
                    lineHeight: 1.9,
                  }}
                >
                  {history.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        cursor: "pointer",
                        fontWeight: i === index ? 600 : 400,
                        color:
                          i === index
                            ? "var(--primary)"
                            : "var(--foreground)",
                        opacity: i > index ? 0.4 : 1,
                      }}
                      onClick={() => {
                        setIndex(i);
                        setTool(null);
                      }}
                    >
                      {s.label}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {!tool && (
              <section className="studio-card">
                <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  Select a tool from the left rail to get started.
                </p>
              </section>
            )}

            {/* Reorder */}
            {tool === "reorder" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Reorder Pages</h3>
                <p className="studio-hint">
                  Drag pages in the viewport to reorder. Click × to delete a
                  page. Apply to save the new order.
                </p>
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={() => void applyReorder()}
                    disabled={working || !pendingOrder}
                  >
                    {working ? "Applying…" : "Apply Order"}
                  </Button>
                  {pendingOrder && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPendingOrder(null);
                        void renderThumbs(current.bytes);
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Split */}
            {tool === "split" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Split / Extract</h3>
                <p className="studio-hint">
                  Click pages in the viewport to toggle selection, or type a
                  range below.
                </p>
                <label className="field">
                  <span className="field-label">
                    Page range (e.g. 1-3, 5)
                  </span>
                  <input
                    type="text"
                    value={splitRange}
                    placeholder={`1-${current.pageCount}`}
                    disabled={working}
                    onChange={(e) => onSplitRangeChange(e.target.value)}
                    style={{
                      padding: "0.35rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: 13,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </label>
                {splitError && (
                  <p style={{ color: "var(--destructive)", fontSize: 12, margin: 0 }}>
                    {splitError}
                  </p>
                )}
                {splitPages.size > 0 && (
                  <p className="studio-hint">
                    {splitPages.size} page{splitPages.size !== 1 ? "s" : ""}{" "}
                    selected
                  </p>
                )}
                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={() => void applySplit()}
                    disabled={working || splitPages.size === 0}
                  >
                    {working ? "Working…" : "Extract Selected Pages"}
                  </Button>
                </div>
              </section>
            )}

            {/* Merge */}
            {tool === "merge" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Merge PDFs</h3>
                <p className="studio-hint">
                  Add more PDFs to append after the current document.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {mergeFiles.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      draggable
                      onDragStart={() => setMergeDragIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (mergeDragIdx !== null && mergeDragIdx !== i) {
                          setMergeFiles((prev) => {
                            const next = [...prev];
                            const [item] = next.splice(mergeDragIdx, 1);
                            next.splice(i, 0, item);
                            return next;
                          });
                        }
                        setMergeDragIdx(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0.35rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        background: "var(--muted)",
                        fontSize: 12,
                        cursor: "grab",
                      }}
                    >
                      <LuGripVertical size={12} aria-hidden />
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMergeFiles((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--muted-foreground)",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                        aria-label="Remove"
                      >
                        <LuX size={12} />
                      </button>
                    </div>
                  ))}

                  <div
                    onClick={() => mergeInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files).filter(
                        (f) =>
                          f.type === "application/pdf" ||
                          f.name.toLowerCase().endsWith(".pdf"),
                      );
                      if (files.length)
                        setMergeFiles((prev) => [...prev, ...files]);
                    }}
                    style={{
                      border: "2px dashed var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.5rem",
                      textAlign: "center",
                      cursor: "pointer",
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <LuPlus size={13} />
                    Add PDFs to merge
                  </div>
                  <input
                    ref={mergeInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    hidden
                    onChange={(e) => {
                      if (e.target.files) {
                        setMergeFiles((prev) => [
                          ...prev,
                          ...Array.from(e.target.files!),
                        ]);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="studio-tool-actions">
                  <Button
                    size="sm"
                    onClick={() => void applyMerge()}
                    disabled={working || mergeFiles.length === 0}
                  >
                    {working
                      ? "Merging…"
                      : `Merge ${mergeFiles.length > 0 ? `(+${mergeFiles.length})` : ""}`}
                  </Button>
                </div>
              </section>
            )}

            {/* Info */}
            {tool === "info" && (
              <section className="studio-card">
                <h3 className="studio-card-title">Info</h3>
                <dl
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    File
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontFamily: "ui-monospace, monospace",
                      wordBreak: "break-all",
                      fontSize: 12,
                    }}
                  >
                    {current.name}.pdf
                  </dd>
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                    }}
                  >
                    Pages
                  </dt>
                  <dd style={{ margin: 0 }}>{current.pageCount}</dd>
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                    }}
                  >
                    Size
                  </dt>
                  <dd style={{ margin: 0 }}>
                    {formatBytes(current.bytes.length)}
                  </dd>
                  <dt
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                    }}
                  >
                    Edits
                  </dt>
                  <dd style={{ margin: 0 }}>
                    {index} / {history.length - 1}
                  </dd>
                </dl>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
