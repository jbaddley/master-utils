"use client";

import { useState } from "react";
import { diffLines } from "diff";
import { Button } from "@/components/ui/button";

type DiffLine = {
  text: string;
  type: "added" | "removed" | "unchanged";
};

export default function DiffTool() {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [lines, setLines] = useState<DiffLine[] | null>(null);

  const compare = () => {
    const changes = diffLines(original, modified);
    const result: DiffLine[] = [];
    for (const change of changes) {
      const rawLines = change.value.split("\n");
      // diffLines includes a trailing newline as an empty string — drop it from the last chunk
      if (rawLines[rawLines.length - 1] === "") rawLines.pop();
      for (const text of rawLines) {
        result.push({
          text,
          type: change.added ? "added" : change.removed ? "removed" : "unchanged",
        });
      }
    }
    setLines(result);
  };

  const additions = lines?.filter((l) => l.type === "added").length ?? 0;
  const deletions = lines?.filter((l) => l.type === "removed").length ?? 0;

  return (
    <div className="tool-ui">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        <div className="flex flex-col gap-1.5">
          <span className="field-label">Original</span>
          <textarea
            className="code-area"
            value={original}
            onChange={(e) => {
              setOriginal(e.target.value);
              setLines(null);
            }}
            rows={12}
            placeholder="Paste original text here…"
            spellCheck={false}
            aria-label="Original text"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="field-label">Modified</span>
          <textarea
            className="code-area"
            value={modified}
            onChange={(e) => {
              setModified(e.target.value);
              setLines(null);
            }}
            rows={12}
            placeholder="Paste modified text here…"
            spellCheck={false}
            aria-label="Modified text"
          />
        </div>
      </div>

      <div className="actionbar">
        <Button type="button" onClick={compare} disabled={!original && !modified}>
          Compare
        </Button>
        {lines !== null && (
          <span className="text-sm text-muted-foreground">
            <span className="text-[#8ef0b5] font-medium">{additions} addition{additions !== 1 ? "s" : ""}</span>
            {", "}
            <span className="text-[#ffb3bb] font-medium">{deletions} deletion{deletions !== 1 ? "s" : ""}</span>
          </span>
        )}
      </div>

      {lines !== null && (
        <div className="rounded-lg border border-border overflow-auto max-h-[32rem] font-mono text-xs leading-6">
          {lines.map((line, i) => {
            const isAdded = line.type === "added";
            const isRemoved = line.type === "removed";
            return (
              <div
                key={i}
                className="flex items-start px-3"
                style={{
                  backgroundColor: isAdded
                    ? "rgba(142,240,181,0.12)"
                    : isRemoved
                    ? "rgba(229,72,77,0.12)"
                    : undefined,
                }}
              >
                <span
                  className="w-4 shrink-0 select-none"
                  style={{
                    color: isAdded ? "#8ef0b5" : isRemoved ? "#ffb3bb" : "transparent",
                  }}
                >
                  {isAdded ? "+" : isRemoved ? "-" : " "}
                </span>
                <span
                  className="whitespace-pre-wrap break-all"
                  style={{
                    color: isAdded ? "#8ef0b5" : isRemoved ? "#ffb3bb" : undefined,
                  }}
                >
                  {line.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
