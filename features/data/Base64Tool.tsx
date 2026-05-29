"use client";

import { useState } from "react";
import { LuDownload } from "react-icons/lu";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/FileDropzone";

type Tab = "encode" | "decode";

export default function Base64Tool() {
  const [tab, setTab] = useState<Tab>("encode");
  const [text, setText] = useState("");
  const [b64, setB64] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const encodeText = () => {
    setError(null);
    try {
      setB64(btoa(unescape(encodeURIComponent(text))));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encode failed.");
    }
  };

  const decodeText = () => {
    setError(null);
    try {
      setText(decodeURIComponent(escape(atob(b64.trim()))));
    } catch {
      setError("Invalid Base64 string.");
    }
  };

  const encodeFile = async (files: File[]) => {
    const file = files[0];
    setError(null);
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const encoded = btoa(binary);
    setB64(`data:${file.type || "application/octet-stream"};base64,${encoded}`);
  };

  const decodeToFile = () => {
    setError(null);
    try {
      let payload = b64.trim();
      let mime = "application/octet-stream";
      let name = "decoded.bin";
      const dataUrl = payload.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrl) {
        mime = dataUrl[1];
        payload = dataUrl[2];
        const ext = mime.split("/")[1]?.split("+")[0] ?? "bin";
        name = `decoded.${ext}`;
      }
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Invalid Base64 for file decode.");
    }
  };

  return (
    <div className="tool-ui">
      <div className="editbar" role="tablist">
        <Button variant={tab === "encode" ? "default" : "secondary"} size="sm" onClick={() => setTab("encode")}>
          Encode
        </Button>
        <Button variant={tab === "decode" ? "default" : "secondary"} size="sm" onClick={() => setTab("decode")}>
          Decode
        </Button>
      </div>

      {error && <div className="error">{error}</div>}

      {tab === "encode" ? (
        <>
          {!fileName ? (
            <>
              <textarea
                className="code-area"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Text to encode…"
                spellCheck={false}
              />
              <div className="actionbar">
                <Button type="button" onClick={encodeText}>
                  Encode text
                </Button>
              </div>
              <p className="field-label" style={{ marginTop: "1rem" }}>
                Or encode a file
              </p>
            </>
          ) : (
            <p className="field-label" style={{ marginTop: "1rem" }}>
              File selected:
            </p>
          )}
          <FileDropzone label="Drop any file" onFiles={(fs) => void encodeFile(fs)} onError={setError} />
          {fileName && (
            <p className="field-label">
              File: {fileName}{" "}
              <button
                type="button"
                className="text-muted-foreground underline text-xs ml-2"
                onClick={() => { setFileName(null); setB64(""); }}
              >
                Clear
              </button>
            </p>
          )}
        </>
      ) : (
        <>
          <textarea
            className="code-area"
            value={b64}
            onChange={(e) => setB64(e.target.value)}
            rows={8}
            placeholder="Base64 or data URL to decode…"
            spellCheck={false}
          />
          <div className="actionbar">
            <Button type="button" onClick={decodeText}>
              Decode to text
            </Button>
            <Button type="button" variant="outline" onClick={decodeToFile}>
              <LuDownload /> Decode to file
            </Button>
          </div>
        </>
      )}

      {b64 && (
        <div className="settings">
          <p className="field-label">Result</p>
          <pre className="code-output code-output--wrap">{b64.length > 2000 ? `${b64.slice(0, 2000)}…` : b64}</pre>
          <CopyButton getText={() => b64} />
        </div>
      )}
    </div>
  );
}
