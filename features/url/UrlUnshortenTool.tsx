"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Hop = { from: string; status: number; to: string };
type Result = { finalUrl: string; hops: Hop[] };

export default function UrlUnshortenTool() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolve = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/url/unshorten?url=${encodeURIComponent(url.trim())}`);
      const data = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not resolve URL");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-ui">
      <p className="muted-text">
        Preview where a short link goes before you click. The server follows redirects with HEAD requests only — your
        browser never navigates to the target.
      </p>

      <div className="field">
        <Label htmlFor="short-url">Short URL</Label>
        <Input id="short-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://bit.ly/…" />
      </div>

      <div className="actionbar">
        <Button type="button" onClick={() => void resolve()} disabled={loading || !url.trim()}>
          {loading ? "Resolving…" : "Unshorten URL"}
        </Button>
        {result?.finalUrl && <CopyButton getText={() => result.finalUrl} label="Copy final URL" />}
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="card settings">
          <p className="field-label">Final destination</p>
          <pre className="code-output code-output--wrap">{result.finalUrl}</pre>
          {result.hops.length > 0 && (
            <>
              <p className="field-label">Redirect chain</p>
              <table className="meta-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Status</th>
                    <th>To</th>
                  </tr>
                </thead>
                <tbody>
                  {result.hops.map((h, i) => (
                    <tr key={i}>
                      <td className="meta-value">{h.from}</td>
                      <td>{h.status}</td>
                      <td className="meta-value">{h.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
