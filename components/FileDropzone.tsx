"use client";

import { useRef, useState } from "react";
import { LuFileUp } from "react-icons/lu";

export function FileDropzone({
  onFiles,
  onError,
  label = "Drop files here",
  accept,
  multiple = false,
}: {
  onFiles: (files: File[]) => void;
  onError?: (msg: string) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list?: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    if (accept) {
      const tokens = accept.split(",").map((a) => a.trim().toLowerCase());
      /** Returns true when the file matches any accept token. */
      const isAccepted = (f: File): boolean =>
        tokens.some((t) => {
          // Wildcard MIME — "image/*" matches "image/png", "video/*" matches "video/mp4" …
          if (t.endsWith("/*")) return f.type.startsWith(t.slice(0, -1));
          // Exact MIME — "image/jpeg"
          if (t.includes("/")) return f.type === t;
          // Extension — ".heic", ".svg"
          if (t.startsWith(".")) return f.name.toLowerCase().endsWith(t);
          return false;
        });
      const bad = files.find((f) => !isAccepted(f));
      if (bad) {
        onError?.(`Unsupported file type: ${bad.name}`);
        return;
      }
    }
    onFiles(files);
  };

  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="dropzone-inner">
        <LuFileUp className="dropzone-icon" />
        <strong>{label}</strong>
        <span>or click to browse</span>
      </div>
    </div>
  );
}
