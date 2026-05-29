"use client";

import { useState } from "react";
import { LuCopy, LuCheck, LuSquare, LuSend } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./shared/ModelPicker";
import { useLLM, getSavedModel, saveModel } from "./shared/useLLM";

function buildSystem(doc: string) {
  return `You are a precise document Q&A assistant. Answer questions based ONLY on the document provided below.
If the answer is not in the document, say "I couldn't find that in the document."
Be concise and cite the relevant part when useful.

--- DOCUMENT START ---
${doc}
--- DOCUMENT END ---`;
}

export default function AiQaTool() {
  const [model, setModel]   = useState(getSavedModel);
  const [doc, setDoc]       = useState("");
  const [question, setQ]    = useState("");
  const [copied, setCopied] = useState(false);

  const { complete, completion, isLoading, stop, error } = useLLM({
    model,
    system: buildSystem(doc),
  });

  const run = () => {
    if (!doc.trim() || !question.trim() || isLoading) return;
    void complete(question);
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
      </div>

      {/* Document input */}
      <div className="pane" style={{ width: "100%" }}>
        <div className="panel-head">
          <span className="tag">Document / context</span>
          <span className="meta">{doc.length.toLocaleString()} chars</span>
        </div>
        <textarea
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="Paste your document, article, or any reference text here…"
          style={{
            width: "100%", height: "14rem", resize: "vertical",
            padding: "0.75rem", fontSize: "14px", lineHeight: 1.6,
            background: "var(--card)", color: "var(--foreground)",
            border: "none", outline: "none", fontFamily: "inherit",
          }}
        />
      </div>

      {/* Question + answer */}
      <div className="pane" style={{ width: "100%" }}>
        <div className="panel-head">
          <span className="tag">Your question</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="Ask a question about the document above… (Enter to ask)"
            disabled={isLoading || !doc.trim()}
            style={{
              flex: 1, fontSize: "14px", padding: "0.5rem 0.75rem",
              background: "var(--input)", color: "var(--foreground)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              outline: "none", fontFamily: "inherit",
            }}
          />
          {isLoading ? (
            <Button variant="outline" onClick={stop}><LuSquare /></Button>
          ) : (
            <Button disabled={!doc.trim() || !question.trim()} onClick={run}>
              <LuSend /> Ask
            </Button>
          )}
        </div>

        {/* Answer */}
        <div
          style={{
            padding: "0.75rem", minHeight: "8rem", fontSize: "14px",
            lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--foreground)",
          }}
        >
          {isLoading && !completion && <span style={{ color: "var(--muted-foreground)" }}>Thinking…</span>}
          {completion}
          {isLoading && completion && <span className="llm-cursor" />}
          {!isLoading && !completion && (
            <span style={{ color: "var(--muted-foreground)" }}>
              {doc.trim() ? "Ask a question above." : "Paste a document first, then ask a question."}
            </span>
          )}
        </div>
        {completion && !isLoading && (
          <div style={{ padding: "0 0.75rem 0.75rem" }}>
            <button
              onClick={() => void copyOutput()}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem",
                fontSize: "12px", color: "var(--muted-foreground)",
                background: "none", border: "none", cursor: "pointer" }}
            >
              {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
              {copied ? "Copied" : "Copy answer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
