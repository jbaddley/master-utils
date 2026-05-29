"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";

type Tab = "encode" | "decode";
type Mode = "component" | "full";

function encodeFull(input: string): string {
  return input
    .split("")
    .map((ch) => {
      if (/[A-Za-z0-9-_.~]/.test(ch)) return ch;
      return encodeURIComponent(ch);
    })
    .join("");
}

export default function UrlEncoderTool() {
  const [tab, setTab] = useState<Tab>("encode");
  const [mode, setMode] = useState<Mode>("component");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      if (tab === "encode") {
        setOutput(mode === "component" ? encodeURIComponent(input) : encodeFull(input));
      } else {
        setOutput(mode === "component" ? decodeURIComponent(input) : decodeURI(input));
      }
    } catch {
      setError("Invalid escape sequence for decode.");
      setOutput("");
    }
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  return (
    <div className="tool-ui">
      <div className="editbar">
        <Button variant={tab === "encode" ? "default" : "secondary"} size="sm" onClick={() => setTab("encode")}>
          Encode
        </Button>
        <Button variant={tab === "decode" ? "default" : "secondary"} size="sm" onClick={() => setTab("decode")}>
          Decode
        </Button>
      </div>

      <div className="field">
        <span className="field-label">Mode</span>
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="component">Query component (encodeURIComponent)</option>
          <option value="full">Full URL encode</option>
        </select>
      </div>

      <textarea
        className="code-area"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={6}
        placeholder={tab === "encode" ? "Text or URL to encode…" : "Encoded text to decode…"}
        spellCheck={false}
      />

      <div className="actionbar">
        <Button type="button" onClick={run}>
          {tab === "encode" ? "Encode" : "Decode"}
        </Button>
        <Button type="button" variant="outline" onClick={clear}>
          Clear
        </Button>
        {output && <CopyButton getText={() => output} />}
      </div>

      {error && <div className="error">{error}</div>}
      {output && <pre className="code-output code-output--wrap">{output}</pre>}
    </div>
  );
}
