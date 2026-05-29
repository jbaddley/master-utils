"use client";

import { useState } from "react";
import { LuCopy, LuCheck } from "react-icons/lu";

export function PreWithCopy({
  code,
  style,
}: {
  code: string;
  style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <pre style={style}>
        <code>{code}</code>
      </pre>
      <button
        type="button"
        className="copy-btn"
        onClick={handleCopy}
        aria-label="Copy code"
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 10px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground)",
          cursor: "pointer",
          fontSize: "12px",
          fontFamily: "inherit",
        }}
      >
        {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
