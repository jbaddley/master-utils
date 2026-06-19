"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import type { PDFImage } from "pdf-lib";
import {
  LuDownload,
  LuFilePlus2,
  LuFiles,
  LuRedo2,
  LuScissors,
  LuTrash2,
  LuUndo2,
  LuX,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { getPdfJs } from "@/lib/pdfjs";
import { saveAs } from "@/lib/download";

/* ---------- types ---------- */

type Snapshot = {
  bytes: Uint8Array;
  label: string;
  pageCount: number;
};

type PageThumb = { dataUrl: string };

type ImportItem = {
  name: string;
  kind: "pdf" | "image";
  bytes: Uint8Array;
  mime: string;
};

/* ---------- constants ---------- */

const THUMB_SCALE = 0.4;
const ACCEPT = ".pdf,application/pdf,image/*,.zip,application/zip";
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif|tiff?)$/i;

/* ---------- file-type helpers ---------- */

function isPdf(f: { name: string; type?: string }) {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}
function isZip(f: { name: string; type?: string }) {
  return (
    /\.zip$/i.test(f.name) ||
    f.type === "application/zip" ||
    f.type === "application/x-zip-compressed"
  );
}
function isImage(f: { name: string; type?: string }) {
  return (f.type?.startsWith("image/") ?? false) || IMAGE_EXT.test(f.name);
}
function kindOf(name: string, mime?: string): "pdf" | "image" | null {
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if ((mime?.startsWith("image/") ?? false) || IMAGE_EXT.test(name))
    return "image";
  return null;
}
function baseName(name: string) {
  return name.replace(/\.[^./\\]+$/, "").replace(/.*[/\\]/, "") || "document";
}

/* ---------- import expansion (handles zip) ---------- */

async function expandToItems(files: File[]): Promise<ImportItem[]> {
  const items: ImportItem[] = [];
  for (const f of files) {
    if (isZip(f)) {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      const entries = Object.values(zip.files)
        .filter((e) => !e.dir && !/(^|\/)__MACOSX\//.test(e.name))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
        );
      for (const e of entries) {
        const kind = kindOf(e.name);
        if (!kind) continue;
        items.push({
          name: e.name,
          kind,
          bytes: await e.async("uint8array"),
          mime: "",
        });
      }
    } else {
      const kind = kindOf(f.name, f.type);
      if (!kind) continue;
      items.push({
        name: f.name,
        kind,
        bytes: new Uint8Array(await f.arrayBuffer()),
        mime: f.type,
      });
    }
  }
  return items;
}

/* ---------- image → PDF page ---------- */

async function toPngBytes(bytes: Uint8Array, mime: string): Promise<Uint8Array> {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], {
    type: mime || "application/octet-stream",
  });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const out = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/png"),
  );
  if (!out) throw new Error("Image conversion failed");
  return new Uint8Array(await out.arrayBuffer());
}

async function embedImagePage(
  outDoc: PDFDocument,
  item: ImportItem,
): Promise<void> {
  let img: PDFImage;
  const looksJpg = /\.jpe?g$/i.test(item.name) || item.mime === "image/jpeg";
  const looksPng = /\.png$/i.test(item.name) || item.mime === "image/png";
  if (looksJpg) {
    img = await outDoc.embedJpg(item.bytes);
  } else if (looksPng) {
    img = await outDoc.embedPng(item.bytes);
  } else {
    img = await outDoc.embedPng(await toPngBytes(item.bytes, item.mime));
  }
  const page = outDoc.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
}

async function appendItems(outDoc: PDFDocument, items: ImportItem[]) {
  for (const item of items) {
    if (item.kind === "pdf") {
      const src = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
      const copied = await outDoc.copyPages(src, src.getPageIndices());
      copied.forEach((p) => outDoc.addPage(p));
    } else {
      await embedImagePage(outDoc, item);
    }
  }
}

/* ---------- component ---------- */

export default function DocumentStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("document");
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [dragOverDrop, setDragOverDrop] = useState(false);

  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [largeUrl, setLargeUrl] = useState<string | null>(null);
  const [largeLoading, setLargeLoading] = useState(false);

  const [activePage, setActivePage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const anchorRef = useRef<number | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const current = history[index] ?? null;
  const pageCount = current?.pageCount ?? 0;
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  // pdf.js doc cache for the large viewer (re-opened only when bytes change)
  const largeDocRef = useRef<{
    bytes: Uint8Array;
    doc: Awaited<
      ReturnType<
        Awaited<ReturnType<typeof getPdfJs>>["getDocument"]
      >["promise"]
    >;
  } | null>(null);

  /* ---- snapshot navigation ---- */

  const goTo = useCallback((i: number) => {
    setIndex(i);
    setSelected(new Set());
    anchorRef.current = null;
  }, []);

  const apply = useCallback(
    (
      bytes: Uint8Array,
      label: string,
      newCount: number,
      nextActive: number,
    ) => {
      setHistory((h) => [
        ...h.slice(0, index + 1),
        { bytes, label, pageCount: newCount },
      ]);
      setIndex((i) => i + 1);
      setSelected(new Set());
      anchorRef.current = null;
      setActivePage(Math.min(Math.max(1, nextActive), Math.max(1, newCount)));
    },
    [index],
  );

  /* ---- thumbnail rendering ---- */

  const renderThumbs = useCallback(async (bytes: Uint8Array) => {
    setThumbs([]);
    try {
      const pdfJs = await getPdfJs();
      const doc = await pdfJs.getDocument({ data: bytes.slice() }).promise;
      const acc: PageThumb[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: THUMB_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx)
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        acc.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.7) });
        setThumbs([...acc]);
        page.cleanup();
      }
      await doc.destroy();
    } catch {
      /* thumbnails are best-effort */
    }
  }, []);

  /* ---- large page rendering ---- */

  const renderLarge = useCallback(async (bytes: Uint8Array, num: number) => {
    setLargeLoading(true);
    try {
      const pdfJs = await getPdfJs();
      if (largeDocRef.current?.bytes !== bytes) {
        if (largeDocRef.current) await largeDocRef.current.doc.destroy();
        const doc = await pdfJs.getDocument({ data: bytes.slice() }).promise;
        largeDocRef.current = { bytes, doc };
      }
      const doc = largeDocRef.current.doc;
      const page = await doc.getPage(Math.min(num, doc.numPages));
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, 1600 / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx)
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      setLargeUrl(canvas.toDataURL("image/jpeg", 0.85));
      page.cleanup();
    } catch {
      setLargeUrl(null);
    } finally {
      setLargeLoading(false);
    }
  }, []);

  // Re-render thumbs + reset viewer doc cache when the working document changes.
  useEffect(() => {
    if (!current) {
      setThumbs([]);
      setLargeUrl(null);
      return;
    }
    void renderThumbs(current.bytes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.bytes]);

  // Render the large viewer whenever the active page or document changes.
  useEffect(() => {
    if (!current) return;
    const num = Math.min(Math.max(1, activePage), current.pageCount);
    void renderLarge(current.bytes, num);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.bytes, activePage]);

  // Clamp active page when the page count shrinks.
  useEffect(() => {
    if (pageCount > 0 && activePage > pageCount) setActivePage(pageCount);
  }, [pageCount, activePage]);

  // Keyboard: undo / redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (index < history.length - 1) goTo(index + 1);
        } else if (index > 0) {
          goTo(index - 1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, history.length, goTo]);

  /* ---- load / import ---- */

  const loadFiles = useCallback(async (fileList: File[]) => {
    setError(null);
    setWorking("Importing…");
    try {
      const pdfs = fileList.filter(isPdf);
      const others = fileList.filter((f) => isZip(f) || isImage(f));
      // Fast path: a single plain PDF — keep its bytes verbatim.
      if (pdfs.length === 1 && others.length === 0 && fileList.length === 1) {
        const bytes = new Uint8Array(await pdfs[0].arrayBuffer());
        const probe = await PDFDocument.load(bytes, { ignoreEncryption: true });
        setFileName(baseName(pdfs[0].name));
        setHistory([
          { bytes, label: "Original", pageCount: probe.getPageCount() },
        ]);
        setIndex(0);
        setActivePage(1);
        setSelected(new Set());
        return;
      }
      const items = await expandToItems(fileList);
      if (items.length === 0)
        throw new Error("No PDFs or images found in the dropped files.");
      const out = await PDFDocument.create();
      await appendItems(out, items);
      const bytes = await out.save();
      setFileName(baseName(fileList[0]?.name ?? "document"));
      setHistory([{ bytes, label: "Imported", pageCount: out.getPageCount() }]);
      setIndex(0);
      setActivePage(1);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import files.");
    } finally {
      setWorking(null);
    }
  }, []);

  const addFiles = useCallback(
    async (fileList: File[]) => {
      if (!current) return void loadFiles(fileList);
      setError(null);
      setWorking("Adding pages…");
      try {
        const items = await expandToItems(fileList);
        if (items.length === 0)
          throw new Error("No PDFs or images found in the added files.");
        const out = await PDFDocument.load(current.bytes, {
          ignoreEncryption: true,
        });
        const before = out.getPageCount();
        await appendItems(out, items);
        const bytes = await out.save();
        const added = out.getPageCount() - before;
        apply(
          bytes,
          `Add ${added} page${added !== 1 ? "s" : ""}`,
          out.getPageCount(),
          before + 1,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add pages.");
      } finally {
        setWorking(null);
      }
    },
    [current, apply, loadFiles],
  );

  /* ---- page operations (rebuild from an order) ---- */

  const rebuild = useCallback(
    async (order1: number[], label: string, nextActive: number) => {
      if (!current || order1.length === 0) return;
      setError(null);
      setWorking("Working…");
      try {
        const src = await PDFDocument.load(current.bytes, {
          ignoreEncryption: true,
        });
        const out = await PDFDocument.create();
        const copied = await out.copyPages(
          src,
          order1.map((n) => n - 1),
        );
        copied.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        apply(bytes, label, order1.length, nextActive);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Operation failed.");
      } finally {
        setWorking(null);
      }
    },
    [current, apply],
  );

  const allPages = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1),
    [pageCount],
  );

  const deletePages = (pages: Set<number>) => {
    if (pages.size === 0 || pages.size >= pageCount) return;
    const order = allPages.filter((n) => !pages.has(n));
    const firstGone = Math.min(...pages);
    void rebuild(
      order,
      `Delete ${pages.size} page${pages.size > 1 ? "s" : ""}`,
      firstGone,
    );
  };

  const extractPages = (pages: Set<number>) => {
    if (pages.size === 0) return;
    const order = [...pages].sort((a, b) => a - b);
    void rebuild(
      order,
      `Keep ${order.length} page${order.length > 1 ? "s" : ""}`,
      1,
    );
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const order = [...allPages];
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    void rebuild(order, "Reorder pages", to + 1);
  };

  /* ---- selection ---- */

  const onThumbClick = (e: React.MouseEvent, page: number) => {
    setActivePage(page);
    if (e.shiftKey && anchorRef.current !== null) {
      const lo = Math.min(anchorRef.current, page);
      const hi = Math.max(anchorRef.current, page);
      const next = new Set<number>();
      for (let n = lo; n <= hi; n++) next.add(n);
      setSelected(next);
    } else if (e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(page)) next.delete(page);
        else next.add(page);
        return next;
      });
      anchorRef.current = page;
    } else {
      setSelected(new Set([page]));
      anchorRef.current = page;
    }
  };

  /* ---- download ---- */

  const download = () => {
    if (!current) return;
    const bytes = current.bytes;
    void saveAs({
      suggestedName: `${fileName}.pdf`,
      description: "PDF",
      mime: "application/pdf",
      ext: ".pdf",
      toolName: "document-studio",
      getBlob: () =>
        new Blob([bytes.slice().buffer as ArrayBuffer], {
          type: "application/pdf",
        }),
    });
  };

  /* ---- drag-drop file import ---- */

  const onDropFiles = (e: React.DragEvent, add: boolean) => {
    e.preventDefault();
    setDragOverDrop(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void (add ? addFiles(files) : loadFiles(files));
  };

  /* ---- empty state ---- */

  if (!current) {
    return (
      <div className="docstudio">
        {error && <div className="error">{error}</div>}
        <div
          className={`dropzone${dragOverDrop ? " dragging" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverDrop(true);
          }}
          onDragLeave={() => setDragOverDrop(false)}
          onDrop={(e) => onDropFiles(e, false)}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void loadFiles(files);
              e.target.value = "";
            }}
          />
          <div className="dropzone-inner">
            <LuFiles className="dropzone-icon" />
            <strong>Drop PDFs, images, or a ZIP</strong>
            <span>
              Combine and edit them into a single PDF — reorder, delete, extract,
              and download, all in your browser
            </span>
          </div>
        </div>
        {working && <div className="studio-loading">{working}</div>}
      </div>
    );
  }

  /* ---- editor ---- */

  return (
    <div className="docstudio">
      {error && <div className="error">{error}</div>}

      <div className="studio-shell">
        {/* Topbar */}
        <div className="doc-topbar">
          <div className="doc-title">
            <strong title={`${fileName}.pdf`}>{fileName}.pdf</strong>
            <span>
              {pageCount} page{pageCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="doc-topbar-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => canUndo && goTo(index - 1)}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <LuUndo2 />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => canRedo && goTo(index + 1)}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <LuRedo2 />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addInputRef.current?.click()}
              disabled={!!working}
            >
              <LuFilePlus2 />
              Add pages
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change file
            </Button>
            <Button size="sm" onClick={download} disabled={!!working}>
              <LuDownload />
              Download
            </Button>
            <input
              ref={addInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void addFiles(files);
                e.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void loadFiles(files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="doc-body">
          {/* Page selector */}
          <div className="doc-pagelist" aria-label="Pages">
            {allPages.map((page, idx) => {
              const thumb = thumbs[idx];
              const cls = [
                "doc-thumb",
                page === activePage ? "is-active" : "",
                selected.has(page) ? "is-selected" : "",
                dragIndex === idx ? "is-dragging" : "",
                dragOverIndex === idx && dragIndex !== null && dragIndex !== idx
                  ? "is-dropbefore"
                  : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div
                  key={`${page}-${idx}`}
                  className={cls}
                  draggable
                  onClick={(e) => onThumbClick(e, page)}
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(idx);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null) reorder(dragIndex, idx);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb.dataUrl}
                      alt={`Page ${page}`}
                      draggable={false}
                    />
                  ) : (
                    <div className="doc-thumb-skeleton" />
                  )}
                  <span className="doc-thumb-num">{page}</span>
                  <button
                    type="button"
                    className="doc-thumb-del"
                    aria-label={`Delete page ${page}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pageCount > 1)
                        void rebuild(
                          allPages.filter((n) => n !== page),
                          `Delete page ${page}`,
                          page,
                        );
                    }}
                  >
                    <LuX size={12} />
                  </button>
                </div>
              );
            })}

            <div
              className={`doc-add-tile${dragOverDrop ? " dragging" : ""}`}
              onClick={() => addInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDrop(true);
              }}
              onDragLeave={() => setDragOverDrop(false)}
              onDrop={(e) => onDropFiles(e, true)}
            >
              <LuFilePlus2 size={16} />
              Add pages
            </div>
          </div>

          {/* Viewer */}
          <div className="doc-viewer">
            {largeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={largeUrl} alt={`Page ${activePage}`} />
            ) : (
              <div className="doc-viewer-empty">
                {largeLoading ? "Rendering page…" : "Select a page"}
              </div>
            )}

            {selected.size > 0 && (
              <div className="doc-selbar">
                <span className="doc-selbar-count">{selected.size} selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => extractPages(selected)}
                  disabled={!!working}
                >
                  <LuScissors />
                  Extract
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deletePages(selected)}
                  disabled={!!working || selected.size >= pageCount}
                >
                  <LuTrash2 />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelected(new Set());
                    anchorRef.current = null;
                  }}
                  aria-label="Clear selection"
                >
                  <LuX />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {working && <div className="studio-loading">{working}</div>}
    </div>
  );
}
