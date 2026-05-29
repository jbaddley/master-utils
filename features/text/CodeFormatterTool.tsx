"use client";

import { useState } from "react";
import type { Plugin } from "prettier";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";

type Language = "html" | "css" | "javascript" | "typescript" | "json";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
];

async function formatCode(code: string, lang: Language): Promise<string> {
  const prettier = await import("prettier/standalone");

  let parser: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plugins: Plugin<any>[];

  if (lang === "html") {
    const pluginHtml = await import("prettier/plugins/html");
    plugins = [pluginHtml.default as Plugin];
    parser = "html";
  } else if (lang === "css") {
    const pluginPostcss = await import("prettier/plugins/postcss");
    plugins = [pluginPostcss.default as Plugin];
    parser = "css";
  } else if (lang === "javascript") {
    const [pluginBabel, pluginEstree] = await Promise.all([
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);
    plugins = [pluginBabel.default as Plugin, pluginEstree.default as Plugin];
    parser = "babel";
  } else if (lang === "typescript") {
    const [pluginTs, pluginEstree] = await Promise.all([
      import("prettier/plugins/typescript"),
      import("prettier/plugins/estree"),
    ]);
    plugins = [pluginTs.default as Plugin, pluginEstree.default as Plugin];
    parser = "typescript";
  } else {
    // json
    const [pluginBabel, pluginEstree] = await Promise.all([
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);
    plugins = [pluginBabel.default as Plugin, pluginEstree.default as Plugin];
    parser = "json";
  }

  return prettier.format(code, { parser, plugins, printWidth: 80, tabWidth: 2 });
}

export default function CodeFormatterTool() {
  const [lang, setLang] = useState<Language>("javascript");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const format = async () => {
    setError(null);
    setOutput("");
    setLoading(true);
    try {
      const result = await formatCode(input, lang);
      setOutput(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Formatting failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-ui">
      <div className="actionbar">
        <div className="field" style={{ flex: "0 0 auto" }}>
          <label className="field-label" htmlFor="lang-select">
            Language
          </label>
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => {
              setLang(e.target.value as Language);
              setOutput("");
              setError(null);
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setInput("");
            setOutput("");
            setError(null);
          }}
          disabled={!input && !output}
        >
          Clear
        </Button>
        <Button type="button" onClick={() => void format()} disabled={loading || !input.trim()}>
          {loading ? "Formatting…" : "Format"}
        </Button>

        {output && <CopyButton getText={() => output} label="Copy" />}
      </div>

      <textarea
        className="code-area"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOutput("");
          setError(null);
        }}
        rows={14}
        placeholder={`Paste ${LANGUAGES.find((l) => l.value === lang)?.label ?? ""} code here…`}
        spellCheck={false}
        aria-label="Code input"
      />

      {error && <div className="error">{error}</div>}

      {output && (
        <pre className="code-output mt-4" aria-label="Formatted code">
          {output}
        </pre>
      )}
    </div>
  );
}
