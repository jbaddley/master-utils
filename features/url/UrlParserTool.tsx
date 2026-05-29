"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Fields = {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  hash: string;
};

export default function UrlParserTool() {
  const [raw, setRaw] = useState("https://example.com:8080/path?q=1&foo=bar#section");
  const [fields, setFields] = useState<Fields>({
    protocol: "https:",
    hostname: "example.com",
    port: "8080",
    pathname: "/path",
    hash: "section",
  });
  const [params, setParams] = useState<{ key: string; value: string }[]>([
    { key: "q", value: "1" },
    { key: "foo", value: "bar" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const parseInput = (value: string) => {
    setError(null);
    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      setFields({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        hash: url.hash.replace(/^#/, ""),
      });
      setParams(Array.from(url.searchParams.entries()).map(([key, v]) => ({ key, value: v })));
    } catch {
      setError("Enter a valid URL.");
    }
  };

  useEffect(() => {
    parseInput(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reconstructed = useMemo(() => {
    try {
      const portPart =
        fields.port &&
        ((fields.protocol === "https:" && fields.port !== "443") ||
          (fields.protocol === "http:" && fields.port !== "80"))
          ? `:${fields.port}`
          : "";
      const base = `${fields.protocol}//${fields.hostname}${portPart}${fields.pathname || "/"}`;
      const url = new URL(base);
      for (const { key, value } of params) {
        if (key) url.searchParams.append(key, value);
      }
      if (fields.hash) url.hash = fields.hash;
      return url.href;
    } catch {
      return "";
    }
  }, [fields, params]);

  return (
    <div className="tool-ui">
      {error && <div className="error">{error}</div>}

      <div className="field">
        <Label htmlFor="url-in">URL</Label>
        <Input
          id="url-in"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => parseInput(raw)}
        />
      </div>

      <table className="meta-table">
        <tbody>
          {(
            [
              ["Protocol", "protocol"],
              ["Hostname", "hostname"],
              ["Port", "port"],
              ["Path", "pathname"],
              ["Hash", "hash"],
            ] as const
          ).map(([label, key]) => (
            <tr key={key}>
              <td>{label}</td>
              <td colSpan={2}>
                <Input
                  value={fields[key]}
                  onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="field-label">Query parameters</p>
      <table className="meta-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i}>
              <td>
                <Input
                  value={p.key}
                  onChange={(e) =>
                    setParams((prev) => prev.map((row, idx) => (idx === i ? { ...row, key: e.target.value } : row)))
                  }
                />
              </td>
              <td>
                <Input
                  value={p.value}
                  onChange={(e) =>
                    setParams((prev) => prev.map((row, idx) => (idx === i ? { ...row, value: e.target.value } : row)))
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="field-label">Reconstructed URL</p>
      <pre className="code-output code-output--wrap">{reconstructed}</pre>
      {reconstructed && <CopyButton getText={() => reconstructed} label="Copy URL" />}
    </div>
  );
}
