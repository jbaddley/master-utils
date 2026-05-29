"use client";

import { useEffect, useMemo, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function JsonTree({ value, name }: { value: JsonValue; name?: string }) {
  const [open, setOpen] = useState(true);

  if (value === null) {
    return (
      <div className="json-line">
        {name !== undefined && <span className="json-key">{name}: </span>}
        <span className="json-null">null</span>
      </div>
    );
  }
  if (typeof value !== "object") {
    return (
      <div className="json-line">
        {name !== undefined && <span className="json-key">{name}: </span>}
        <span className={typeof value === "string" ? "json-string" : "json-number"}>
          {typeof value === "string" ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
  const preview = isArray ? `[${value.length}]` : `{${entries.length}}`;

  return (
    <div className="json-node">
      <button type="button" className="json-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "▾" : "▸"} {name !== undefined && <span className="json-key">{name}: </span>}
        <span className="json-brace">{isArray ? "[" : "{"}</span>
        {!open && <span className="json-preview">{preview}{isArray ? "]" : "}"}</span>}
      </button>
      {open && (
        <div className="json-children">
          {entries.map(([k, v]) => (
            <JsonTree key={k} name={isArray ? undefined : k} value={v as JsonValue} />
          ))}
          <div className="json-line">
            <span className="json-brace">{isArray ? "]" : "}"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatJsonError(err: unknown, input: string): string {
  if (!(err instanceof SyntaxError)) return err instanceof Error ? err.message : "Invalid JSON";
  const m = err.message.match(/position (\d+)/i);
  if (!m) return err.message;
  const pos = Number.parseInt(m[1], 10);
  const before = input.slice(0, pos);
  const line = before.split("\n").length;
  const col = before.length - before.lastIndexOf("\n");
  return `Syntax error at line ${line}, column ${col}: ${err.message}`;
}

export default function JsonFormatterTool() {
  const [input, setInput] = useState('{\n  "hello": "world"\n}');
  const [parsed, setParsed] = useState<JsonValue | null>(null);
  const [formatted, setFormatted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const format = () => {
    try {
      const value = JSON.parse(input) as JsonValue;
      const out = JSON.stringify(value, null, 2);
      setParsed(value);
      setFormatted(out);
      setError(null);
    } catch (e) {
      setParsed(null);
      setFormatted("");
      setError(formatJsonError(e, input));
    }
  };

  // Auto-format the pre-filled sample on mount
  useEffect(() => {
    format();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const output = useMemo(() => formatted || (parsed ? JSON.stringify(parsed, null, 2) : ""), [formatted, parsed]);

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-ui">
      <textarea
        className="code-area"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
        spellCheck={false}
        aria-label="JSON input"
      />
      <div className="actionbar">
        <Button type="button" onClick={format}>
          Format & validate
        </Button>
        {output && (
          <>
            <CopyButton getText={() => output} label="Copy JSON" />
            <Button type="button" variant="outline" onClick={download}>
              <LuDownload /> Download
            </Button>
          </>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {parsed !== null && !error && (
        <div className="card json-tree-wrap">
          <p className="field-label">Tree view</p>
          <JsonTree value={parsed} />
        </div>
      )}
      {output && !error && (
        <pre className="code-output" aria-label="Formatted JSON">
          {output}
        </pre>
      )}
    </div>
  );
}
