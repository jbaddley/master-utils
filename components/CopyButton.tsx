"use client";

import { useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

export function CopyButton({
  getText,
  label = "Copy",
  size = "sm" as const,
  disabled = false,
}: {
  getText: () => string;
  label?: string;
  size?: "sm" | "default";
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = getText();
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button type="button" variant="outline" size={size} onClick={() => void onCopy()} disabled={disabled}>
      {copied ? <LuCheck /> : <LuCopy />}
      {copied ? "Copied" : label}
    </Button>
  );
}
