"use client";

import { useState } from "react";
import { LuCopy, LuCheck, LuSquare } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./shared/ModelPicker";
import { useLLM, getSavedModel, saveModel } from "./shared/useLLM";

const SYSTEM = `Extract the key points, facts, and important information from the provided text.
Format the output as a concise bullet list. Each bullet should be a standalone fact or insight.
Use sub-bullets for supporting details. Do not include opinions or information not in the source text.
Respond with only the bullet list, no preamble.`;

export default function AiExtractTool() {
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

  return (
    <div className="tool-ui">
      {error && <div className="error">{error.message}</div>}

      <div className="toolbar">
        <ModelPicker value={model} onChange={(m) => { setModel(m); saveModel(m); }} />
        <div className="toolbar-spacer" />
        {isLoading ? (
          <Button variant="outline" onClick={stop}><LuSquare /> Stop</Button>
        ) : (
          <Button disabled={!inputText.trim()} onClick={run}>Extract Key Points</Button>
        )}
      </div>

      <div className="duo">
        <div className="pane">
          <div className="panel-head">
            <span className="tag">Source text</span>
            <span className="meta">{inputText.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(); }}
            placeholder="Paste an article, document, or any text… (⌘+Enter to run)"
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
            <span className="tag">Key points</span>
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
            {isLoading && !completion && <span style={{ color: "var(--muted-foreground)" }}>Extracting…</span>}
            {completion}
            {isLoading && completion && <span className="llm-cursor" />}
            {!isLoading && !completion && (
              <span style={{ color: "var(--muted-foreground)" }}>Key points will appear here.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
