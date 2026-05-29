"use client";

import { useState } from "react";
import { LuCopy, LuCheck, LuSquare } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./shared/ModelPicker";
import { useLLM, getSavedModel, saveModel } from "./shared/useLLM";

type RewriteMode = "improve" | "shorten" | "formal" | "casual" | "expand";

const MODES: { value: RewriteMode; label: string; system: string }[] = [
  {
    value: "improve",
    label: "Improve",
    system:
      "Rewrite the text to improve clarity, flow, and readability. Fix awkward phrasing. Keep the original meaning and length. Respond with only the rewritten text.",
  },
  {
    value: "shorten",
    label: "Shorten",
    system:
      "Rewrite the text to be significantly shorter while keeping all essential information. Remove filler words and redundancy. Respond with only the shortened text.",
  },
  {
    value: "formal",
    label: "Make Formal",
    system:
      "Rewrite the text in a formal, professional tone suitable for business or academic writing. Respond with only the rewritten text.",
  },
  {
    value: "casual",
    label: "Make Casual",
    system:
      "Rewrite the text in a friendly, conversational tone. Use everyday language. Respond with only the rewritten text.",
  },
  {
    value: "expand",
    label: "Expand",
    system:
      "Expand the text with more detail, context, and explanation while keeping the core message. Respond with only the expanded text.",
  },
];

export default function AiRewriteTool() {
  const [model, setModel]     = useState(getSavedModel);
  const [mode, setMode]       = useState<RewriteMode>("improve");
  const [inputText, setInput] = useState("");
  const [copied, setCopied]   = useState(false);

  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0]!;
  const { complete, completion, isLoading, stop, error } = useLLM({
    model,
    system: activeMode.system,
  });

  const run = () => {
    if (!inputText.trim() || isLoading) return;
    void complete(inputText);
  };

  const copyOutput = async () => {
    if (!completion) return;
    await navigator.clipboard.writeText(completion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error.message}</div>}

      {/* Settings */}
      <section className="card settings">
        <div className="field">
          <span className="field-label">Rewrite style</span>
          <div className="row">
            {MODES.map((m) => (
              <Button
                key={m.value}
                variant={mode === m.value ? "default" : "outline"}
                size="sm"
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="toolbar">
        <ModelPicker value={model} onChange={(m) => { setModel(m); saveModel(m); }} />
        <div className="toolbar-spacer" />
        {isLoading ? (
          <Button variant="outline" onClick={stop}><LuSquare /> Stop</Button>
        ) : (
          <Button disabled={!inputText.trim()} onClick={run}>
            {activeMode.label}
          </Button>
        )}
      </div>

      {/* Panes */}
      <div className="duo">
        <div className="pane">
          <div className="panel-head">
            <span className="tag">Original text</span>
            <span className="meta">{inputText.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(); }}
            placeholder="Paste your text here… (⌘+Enter to run)"
            style={{
              width: "100%", height: "22rem", resize: "vertical",
              padding: "0.75rem", fontSize: "14px", lineHeight: 1.6,
              background: "var(--card)", color: "var(--foreground)",
              border: "none", outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
        <div className="pane">
          <div className="panel-head">
            <span className="tag">Rewritten</span>
            {completion && (
              <button
                onClick={() => void copyOutput()}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem",
                  fontSize: "12px", color: "var(--muted-foreground)",
                  background: "none", border: "none", cursor: "pointer" }}
              >
                {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <div
            style={{
              padding: "0.75rem", minHeight: "22rem", fontSize: "14px",
              lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--foreground)",
            }}
          >
            {isLoading && !completion && <span style={{ color: "var(--muted-foreground)" }}>Rewriting…</span>}
            {completion}
            {isLoading && completion && <span className="llm-cursor" />}
            {!isLoading && !completion && (
              <span style={{ color: "var(--muted-foreground)" }}>Rewritten text will appear here.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
