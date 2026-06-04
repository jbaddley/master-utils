"use client";

import { useEffect, useMemo, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type ViewerTab = "tree" | "formatted";

function JsonTree({ value, name }: { value: JsonValue; name?: string }) {
  const [open, setOpen] = useState(true);

  if (value === null) {
    return (
      <div className="json-line">
        {name !== undefined && (
          <>
            <span className="json-key">&quot;{name}&quot;</span>
            <span className="json-punct">: </span>
          </>
        )}
        <span className="json-null">null</span>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className="json-line">
        {name !== undefined && (
          <>
            <span className="json-key">&quot;{name}&quot;</span>
            <span className="json-punct">: </span>
          </>
        )}
        <span className="json-boolean">{String(value)}</span>
      </div>
    );
  }

  if (typeof value !== "object") {
    const isString = typeof value === "string";
    return (
      <div className="json-line">
        {name !== undefined && (
          <>
            <span className="json-key">&quot;{name}&quot;</span>
            <span className="json-punct">: </span>
          </>
        )}
        <span className={isString ? "json-string" : "json-number"}>
          {isString ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
  const preview = isArray ? `${value.length} item${value.length === 1 ? "" : "s"}` : `${entries.length} key${entries.length === 1 ? "" : "s"}`;

  return (
    <div className="json-node">
      <button type="button" className="json-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="json-caret" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        {name !== undefined && (
          <>
            <span className="json-key">&quot;{name}&quot;</span>
            <span className="json-punct">: </span>
          </>
        )}
        <span className="json-brace">{isArray ? "[" : "{"}</span>
        {!open && (
          <>
            <span className="json-preview">{preview}</span>
            <span className="json-brace">{isArray ? "]" : "}"}</span>
          </>
        )}
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

/** Lightweight syntax highlight for the formatted JSON tab. */
function FormattedJson({ text }: { text: string }) {
  const parts = useMemo(() => {
    const tokens: { key: string; text: string }[] = [];
    const re =
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],:]|[^\s{}[\],:]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      if (m[2]) tokens.push({ key: "key", text: raw });
      else if (m[1] && !m[2]) tokens.push({ key: "string", text: raw });
      else if (m[3]) tokens.push({ key: m[3] === "null" ? "null" : "boolean", text: raw });
      else if (/^-?\d/.test(raw)) tokens.push({ key: "number", text: raw });
      else if (/^[{}\[\],:]$/.test(raw)) tokens.push({ key: "punct", text: raw });
      else tokens.push({ key: "plain", text: raw });
    }
    return tokens;
  }, [text]);

  return (
    <pre className="json-formatted" aria-label="Formatted JSON">
      <code>
        {parts.map((p, i) => (
          <span key={i} className={`json-hl-${p.key}`}>
            {p.text}
          </span>
        ))}
      </code>
    </pre>
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
  const [viewerTab, setViewerTab] = useState<ViewerTab>("formatted");

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

  useEffect(() => {
    format();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const output = useMemo(() => formatted || (parsed ? JSON.stringify(parsed, null, 2) : ""), [formatted, parsed]);
  const hasResult = parsed !== null && !error;

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
    <div className="tool-ui json-formatter">
      <div className="json-formatter-workspace">
        <section className="json-formatter-pane" aria-label="JSON input">
          <div className="json-formatter-pane-head">
            <span className="tag">Input</span>
          </div>
          <textarea
            className="code-area json-formatter-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            aria-label="JSON input"
            placeholder="Paste JSON here…"
          />
          <div className="json-formatter-pane-foot">
            <Button type="button" onClick={format}>
              Format & validate
            </Button>
          </div>
        </section>

        <section className="json-formatter-pane json-formatter-viewer" aria-label="JSON output">
          <div className="json-formatter-pane-head">
            <div className="json-viewer-tabs" role="tablist" aria-label="Output view">
              <button
                type="button"
                role="tab"
                aria-selected={viewerTab === "tree"}
                className={cn("json-viewer-tab", viewerTab === "tree" && "active")}
                onClick={() => setViewerTab("tree")}
              >
                Tree view
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewerTab === "formatted"}
                className={cn("json-viewer-tab", viewerTab === "formatted" && "active")}
                onClick={() => setViewerTab("formatted")}
              >
                Formatted JSON
              </button>
            </div>
          </div>

          <div className="json-formatter-viewer-body" role="tabpanel">
            {error ? (
              <p className="json-viewer-placeholder text-[#ffb3bb]">{error}</p>
            ) : !hasResult ? (
              <p className="json-viewer-placeholder">Format JSON to see the tree or pretty-printed output.</p>
            ) : viewerTab === "tree" ? (
              <div className="json-tree-root">
                <JsonTree value={parsed} />
              </div>
            ) : (
              <FormattedJson text={output} />
            )}
          </div>

          <div className="json-formatter-pane-foot json-formatter-output-actions">
            <CopyButton getText={() => output} label="Copy JSON" disabled={!output} />
            <Button type="button" variant="outline" onClick={download} disabled={!output}>
              <LuDownload /> Download
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
