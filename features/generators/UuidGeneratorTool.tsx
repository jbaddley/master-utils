"use client";

import { useState } from "react";
import { LuDownload } from "react-icons/lu";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  formatUuid,
  generateUuid,
  type UuidFormat,
  type UuidVersion,
} from "@/lib/uuid-gen";
import { copyToClipboard } from "@/lib/clipboard";
import { saveAs } from "@/lib/download";

export default function UuidGeneratorTool() {
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [format, setFormat] = useState<UuidFormat>("standard");
  const [count, setCount] = useState(5);
  const [v5Name, setV5Name] = useState("example.com");
  const [v5Namespace, setV5Namespace] = useState<"dns" | "url">("dns");
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setError(null);
    const n = Math.max(1, Math.min(100, count));
    const next: string[] = [];
    try {
      for (let i = 0; i < n; i++) {
        const raw = await generateUuid(version, { v5Name, v5Namespace });
        next.push(formatUuid(raw, format));
      }
      setUuids(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    }
  };

  const copyAll = async () => {
    if (uuids.length === 0) return;
    await copyToClipboard(uuids.join("\n"));
  };

  const download = () => {
    if (uuids.length === 0) return;
    const text = uuids.join("\n");
    void saveAs({
      suggestedName: "uuids.txt",
      description: "Text",
      mime: "text/plain",
      ext: ".txt",
      getBlob: () => new Blob([text], { type: "text/plain" }),
      toolName: "uuid-generator",
    });
  };

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <div className="settings">
        <div className="field">
          <Label>Version</Label>
          <select value={version} onChange={(e) => setVersion(e.target.value as UuidVersion)}>
            <option value="v4">v4 (random)</option>
            <option value="v1">v1 (timestamp)</option>
            <option value="v5">v5 (namespace + name)</option>
          </select>
        </div>

        {version === "v5" && (
          <>
            <div className="field">
              <Label>Namespace</Label>
              <select value={v5Namespace} onChange={(e) => setV5Namespace(e.target.value as "dns" | "url")}>
                <option value="dns">DNS</option>
                <option value="url">URL</option>
              </select>
            </div>
            <div className="field">
              <Label>Name</Label>
              <Input value={v5Name} onChange={(e) => setV5Name(e.target.value)} placeholder="example.com" />
            </div>
          </>
        )}

        <div className="field">
          <Label>Format</Label>
          <select value={format} onChange={(e) => setFormat(e.target.value as UuidFormat)}>
            <option value="standard">Standard (lowercase)</option>
            <option value="uppercase">Uppercase</option>
            <option value="nohyphens">No hyphens</option>
            <option value="braces">Braces {"{...}"}</option>
          </select>
        </div>

        <div className="field">
          <Label>Count ({count})</Label>
          <Slider value={[count]} onValueChange={(v) => setCount(Array.isArray(v) ? v[0]! : v)} min={1} max={100} />
        </div>

        <div className="actionbar">
          <Button type="button" onClick={() => void generate()}>
            Generate UUIDs
          </Button>
          {uuids.length > 0 && (
            <>
              <Button type="button" variant="outline" onClick={() => void copyAll()}>
                Copy all
              </Button>
              <Button type="button" variant="outline" onClick={download}>
                <LuDownload /> Download .txt
              </Button>
            </>
          )}
        </div>
      </div>

      {uuids.length > 0 && (
        <pre className="code-output">{uuids.join("\n")}</pre>
      )}
    </div>
  );
}
