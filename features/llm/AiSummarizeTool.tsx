"use client";

import { useState } from "react";
import { LuCopy, LuCheck, LuSquare } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./shared/ModelPicker";
import { useLLM, getSavedModel, saveModel } from "./shared/useLLM";

const SYSTEM = `You are a precise summarizer. When given text, produce a concise summary using bullet points.
Each bullet should capture one key idea. Be factual — do not add opinions or information not in the source.
Respond with only the bullet points, no preamble.`;

export default function AiSummarizeTool() {
  const [model, setModel]     = useState(getSavedModel);
  const [inputText, setInput] = useState("");
  const [copied, setCopied]   = useState(false);

  const { complete, completion, isLoading, stop, error } = useLLM({ model, system: SYSTEM });

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

  const charCount = inputText.length;

  return (
    <div className="tool-ui">
      {error && <div className="error">{error.message}</div>}

      {/* Toolbar */}
      <div className="toolbar">
        <ModelPicker value={model} onChange={(m) => { setModel(m); saveModel(m); }} />
        <div className="toolbar-spacer" />
        {isLoading ? (
          <Button variant="outline" onClick={stop}><LuSquare /> Stop</Button>
        ) : (
          <Button disabled={!inputText.trim()} onClick={run}>Summarize</Button>
        )}
      </div>

      {/* Panes */}
      <div className="duo">
        {/* Input */}
        <div className="pane">
          <div className="panel-head">
            <span className="tag">Input text</span>
            <span className="meta">{charCount.toLocaleString()} chars</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(); }}
            placeholder="Paste the text you want to summarize… (⌘+Enter to run)"
            style={{
              width: "100%", height: "22rem", resize: "vertical",
              padding: "0.75rem", fontSize: "14px", lineHeight: 1.6,
              background: "var(--card)", color: "var(--foreground)",
              border: "none", outline: "none", fontFamily: "inherit",
            }}
          />
        </div>

        {/* Output */}
        <div className="pane">
          <div className="panel-head">
            <span className="tag">Summary</span>
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
            {isLoading && !completion && (
              <span style={{ color: "var(--muted-foreground)" }}>Summarizing…</span>
            )}
            {completion || (!isLoading && !completion && (
              <span style={{ color: "var(--muted-foreground)" }}>
                Summary will appear here.
              </span>
            ))}
            {isLoading && completion && <span className="llm-cursor" />}
          </div>
        </div>
      </div>
    </div>
  );
}
