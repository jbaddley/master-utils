"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";

// Tokenize a string by splitting on spaces, hyphens, underscores, and camelCase/PascalCase boundaries
function tokenize(input: string): string[] {
  // Insert space before uppercase letters that follow lowercase letters or digits (camelCase / PascalCase)
  const withSpaces = input
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return withSpaces
    .split(/[\s\-_]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function toCamelCase(tokens: string[]): string {
  return tokens
    .map((t, i) => (i === 0 ? t.toLowerCase() : t[0].toUpperCase() + t.slice(1).toLowerCase()))
    .join("");
}

function toPascalCase(tokens: string[]): string {
  return tokens.map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase()).join("");
}

function toSnakeCase(tokens: string[]): string {
  return tokens.map((t) => t.toLowerCase()).join("_");
}

function toScreamingSnakeCase(tokens: string[]): string {
  return tokens.map((t) => t.toUpperCase()).join("_");
}

function toKebabCase(tokens: string[]): string {
  return tokens.map((t) => t.toLowerCase()).join("-");
}

function toTitleCase(tokens: string[]): string {
  return tokens.map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase()).join(" ");
}

type Conversion = {
  label: string;
  fn: (tokens: string[]) => string;
};

const CONVERSIONS: Conversion[] = [
  { label: "camelCase", fn: toCamelCase },
  { label: "PascalCase", fn: toPascalCase },
  { label: "snake_case", fn: toSnakeCase },
  { label: "SCREAMING_SNAKE_CASE", fn: toScreamingSnakeCase },
  { label: "kebab-case", fn: toKebabCase },
  { label: "Title Case", fn: toTitleCase },
];

export default function CaseConverterTool() {
  const [input, setInput] = useState("");

  const tokens = input.trim() ? tokenize(input) : [];

  return (
    <div className="tool-ui">
      <textarea
        className="code-area"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        placeholder="Type or paste text here…"
        spellCheck={false}
        aria-label="Text input"
      />

      <div className="mt-4 flex flex-col gap-2">
        {CONVERSIONS.map(({ label, fn }) => {
          const result = tokens.length > 0 ? fn(tokens) : "";
          return (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5"
            >
              <span className="field-label w-48 shrink-0">{label}</span>
              <code className="flex-1 font-mono text-sm text-foreground break-all">
                {result || (
                  <span className="text-muted-foreground/60">Type or paste text above…</span>
                )}
              </code>
              <CopyButton getText={() => result} size="sm" disabled={!input.trim()} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
