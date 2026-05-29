"use client";

import { useState } from "react";
import { LuCopy, LuCheck, LuSquare } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./shared/ModelPicker";
import { useLLM, getSavedModel, saveModel } from "./shared/useLLM";

type CodeMode = "explain" | "fix" | "generate" | "convert" | "review";

const LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "C#",
  "C++", "Swift", "Kotlin", "Ruby", "PHP", "SQL",
];

const MODES: { value: CodeMode; label: string; buildSystem: (lang: string) => string }[] = [
  {
    value: "explain",
    label: "Explain",
    buildSystem: () =>
      "You are an expert programmer. Explain the following code clearly: what it does, how it works, and any notable patterns or gotchas. Use plain language a developer can understand.",
  },
  {
    value: "fix",
    label: "Fix Bugs",
    buildSystem: () =>
      "You are an expert programmer. Identify and fix all bugs in the following code. Show the corrected code in a code block, then briefly explain each fix below it.",
  },
  {
    value: "generate",
    label: "Generate",
    buildSystem: (lang) =>
      `You are an expert ${lang} programmer. Generate clean, well-commented ${lang} code based on the description provided. Respond with only the code in a code block.`,
  },
  {
    value: "convert",
    label: "Convert",
    buildSystem: (lang) =>
      `You are an expert programmer. Convert the following code to ${lang}. Preserve the logic exactly. Respond with only the converted code in a code block.`,
  },
  {
    value: "review",
    label: "Review",
    buildSystem: () =>
      "You are a senior code reviewer. Review the following code for: correctness, performance, security, readability, and best practices. Structure your feedback with clear sections and bullet points.",
  },
];

export default function AiCodeTool() {
  const [model, setModel]     = useState(getSavedModel);
  const [mode, setMode]       = useState<CodeMode>("explain");
  const [targetLang, setLang] = useState("TypeScript");
  const [inputText, setInput] = useState("");
  const [copied, setCopied]   = useState(false);

  const activeMode  = MODES.find((m) => m.value === mode) ?? MODES[0]!;
  const showLangPicker = mode === "generate" || mode === "convert";
  const system = activeMode.buildSystem(targetLang);

  const { complete, completion, isLoading, stop, error } = useLLM({ model, system });

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
          <span className="field-label">Mode</span>
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
        {showLangPicker && (
          <div className="field">
            <span className="field-label">
              {mode === "generate" ? "Generate in" : "Convert to"}
            </span>
            <select
              value={targetLang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                fontSize: "13px", height: "2rem", padding: "0 0.5rem",
                background: "var(--card)", color: "var(--foreground)",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                cursor: "pointer", minWidth: "10rem",
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Toolbar */}
      <div className="toolbar">
        <ModelPicker value={model} onChange={(m) => { setModel(m); saveModel(m); }} />
        <div className="toolbar-spacer" />
        {isLoading ? (
          <Button variant="outline" onClick={stop}><LuSquare /> Stop</Button>
        ) : (
          <Button disabled={!inputText.trim()} onClick={run}>{activeMode.label}</Button>
        )}
      </div>

      {/* Panes */}
      <div className="duo">
        <div className="pane">
          <div className="panel-head">
            <span className="tag">
              {mode === "generate" ? "Description / requirements" : "Code input"}
            </span>
            <span className="meta">{inputText.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(); }}
            placeholder={
              mode === "generate"
                ? "Describe the function or module you want generated… (⌘+Enter)"
                : "Paste your code here… (⌘+Enter to run)"
            }
            style={{
              width: "100%", height: "22rem", resize: "vertical",
              padding: "0.75rem", fontSize: "13px", lineHeight: 1.6,
              background: "var(--card)", color: "var(--foreground)",
              border: "none", outline: "none", fontFamily: "monospace",
            }}
          />
        </div>
        <div className="pane">
          <div className="panel-head">
            <span className="tag">Output</span>
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
              padding: "0.75rem", minHeight: "22rem", fontSize: "13px",
              lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--foreground)",
              fontFamily: "monospace",
            }}
          >
            {isLoading && !completion && <span style={{ color: "var(--muted-foreground)" }}>Processing…</span>}
            {completion}
            {isLoading && completion && <span className="llm-cursor" />}
            {!isLoading && !completion && (
              <span style={{ color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                Output will appear here.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
