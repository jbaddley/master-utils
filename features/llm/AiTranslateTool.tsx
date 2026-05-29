"use client";

import { useState } from "react";
import { LuCopy, LuCheck, LuSquare } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./shared/ModelPicker";
import { useLLM, getSavedModel, saveModel } from "./shared/useLLM";

const LANGUAGES = [
  "Spanish", "French", "German", "Italian", "Portuguese",
  "Dutch", "Russian", "Polish", "Japanese", "Chinese (Simplified)",
  "Chinese (Traditional)", "Korean", "Arabic", "Hindi", "Turkish",
  "Swedish", "Norwegian", "Danish", "Greek", "Hebrew",
];

function buildSystem(lang: string) {
  return `You are a professional translator. Translate the provided text to ${lang}.
Preserve tone, formatting, and paragraph structure. Respond with only the translated text, no explanations.`;
}

export default function AiTranslateTool() {
  const [model, setModel]     = useState(getSavedModel);
  const [lang, setLang]       = useState("Spanish");
  const [inputText, setInput] = useState("");
  const [copied, setCopied]   = useState(false);

  const { complete, completion, isLoading, stop, error } = useLLM({
    model,
    system: buildSystem(lang),
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
          <span className="field-label">Translate to</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              fontSize: "13px", height: "2rem", padding: "0 0.5rem",
              background: "var(--card)", color: "var(--foreground)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              cursor: "pointer", minWidth: "12rem",
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
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
            Translate to {lang}
          </Button>
        )}
      </div>

      {/* Panes */}
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
            placeholder="Paste text to translate… (⌘+Enter to run)"
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
            <span className="tag">{lang} translation</span>
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
            {isLoading && !completion && <span style={{ color: "var(--muted-foreground)" }}>Translating…</span>}
            {completion}
            {isLoading && completion && <span className="llm-cursor" />}
            {!isLoading && !completion && (
              <span style={{ color: "var(--muted-foreground)" }}>Translation will appear here.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
