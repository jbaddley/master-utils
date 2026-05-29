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
      const exts = accept.split(",").map((a) => a.trim().toLowerCase());
      const bad = files.find((f) => {
        const mimeOk = exts.some((e) => e.includes("/") && f.type && e === f.type);
        const extOk = exts.some((e) => e.startsWith(".") && f.name.toLowerCase().endsWith(e));
        return !mimeOk && !extOk && !exts.includes(f.type);
      });
      if (bad && !files.every((f) => exts.some((e) => (e.startsWith(".") && f.name.toLowerCase().endsWith(e)) || f.type === e || (e.includes("/") && f.type === e)))) {
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
