"use client";

import { useRef, useState } from "react";
import { LuImagePlus } from "react-icons/lu";
import { ACCEPT_ATTR, isSupportedImage, UNSUPPORTED_MESSAGE } from "@/lib/files";
import { Button } from "@/components/ui/button";

export function Dropzone({
  onFile,
  onError,
  label = "Drop an image here",
}: {
  onFile: (file: File) => void;
  onError?: (msg: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file?: File) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      onError?.(UNSUPPORTED_MESSAGE);
      return;
    }
    onFile(file);
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
        handle(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="dropzone-inner">
        <LuImagePlus className="dropzone-icon" />
        <strong>{label}</strong>
        <span>or click to browse</span>
      </div>
    </div>
  );
}

/** A compact "Change image…" button that re-opens the file picker. */
export function ChangeImageButton({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && isSupportedImage(f)) onFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <LuImagePlus />
        Change image…
      </Button>
    </>
  );
}
