"use client";

import { useState } from "react";
import { LuDownload } from "react-icons/lu";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { csvToObjects, objectsToCsv } from "@/lib/csv";
import { saveAs } from "@/lib/download";

type Mode = "csv-to-json" | "json-to-csv";

export default function CsvJsonTool({ mode }: { mode: Mode }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const convert = () => {
    setError(null);
    try {
      if (mode === "csv-to-json") {
        const rows = csvToObjects(input);
        setOutput(JSON.stringify(rows, null, 2));
      } else {
        const data = JSON.parse(input) as unknown;
        if (!Array.isArray(data)) throw new Error("JSON must be an array of objects.");
        setOutput(objectsToCsv(data as Record<string, unknown>[]));
      }
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  const download = () => {
    if (!output) return;
    const isJson = mode === "csv-to-json";
    void saveAs({
      suggestedName: isJson ? "data.json" : "data.csv",
      description: isJson ? "JSON" : "CSV",
      mime: isJson ? "application/json" : "text/csv",
      ext: isJson ? ".json" : ".csv",
      getBlob: () => new Blob([output], { type: isJson ? "application/json" : "text/csv" }),
      toolName: mode,
    });
  };

  const inputLabel = mode === "csv-to-json" ? "CSV input" : "JSON array input";
  const outputLabel = mode === "csv-to-json" ? "JSON output" : "CSV output";

  return (
    <div className="tool-ui">
      <p className="field-label">{inputLabel}</p>
      <textarea
        className="code-area"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
        spellCheck={false}
        placeholder={mode === "csv-to-json" ? "name,age\nAlice,30\nBob,25" : '[{"name":"Alice","age":30}]'}
      />
      <div className="actionbar">
        <Button type="button" onClick={convert}>
          Convert
        </Button>
        {output && (
          <>
            <CopyButton getText={() => output} />
            <Button type="button" variant="outline" onClick={download}>
              <LuDownload /> Download
            </Button>
          </>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {output && (
        <>
          <p className="field-label">{outputLabel}</p>
          <pre className="code-output">{output}</pre>
        </>
      )}
    </div>
  );
}
