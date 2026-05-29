"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { formatBytes } from "@/lib/format";

type ExportRecord = {
  id: string;
  toolName: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTool(toolName: string) {
  return toolName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HistoryPage() {
  const { user, isPro, loading, openAuthModal } = useAuth();
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isPro) return;
    setFetching(true);
    fetch("/api/history")
      .then((r) => r.json())
      .then((data: { exports?: ExportRecord[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setExports(data.exports ?? []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load history"))
      .finally(() => setFetching(false));
  }, [user, isPro]);

  return (
    <main className="page">
      <div className="page-hero">
        <h1>Export History</h1>
        <p className="lede">Your last 30 days of processed files.</p>
      </div>

      {loading ? (
        <div className="batch-empty">Loading…</div>
      ) : !user ? (
        <div className="history-empty">
          <p>Sign in to save and access your export history.</p>
          <Button onClick={openAuthModal}>Sign in</Button>
        </div>
      ) : !isPro ? (
        <div className="history-empty">
          <p>Export history is a Pro feature.</p>
          <Link href="/pricing">
            <Button>Upgrade to Pro</Button>
          </Link>
        </div>
      ) : fetching ? (
        <div className="batch-empty">Loading history…</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : exports.length === 0 ? (
        <div className="batch-empty">
          Your export history will appear here once you start downloading files.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                <th style={{ textAlign: "left", padding: "0.625rem 1rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Tool</th>
                <th style={{ textAlign: "left", padding: "0.625rem 1rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>File</th>
                <th style={{ textAlign: "right", padding: "0.625rem 1rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Size</th>
                <th style={{ textAlign: "right", padding: "0.625rem 1rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((ex, i) => (
                <tr
                  key={ex.id}
                  style={{ borderBottom: i < exports.length - 1 ? "1px solid var(--border)" : undefined }}
                >
                  <td style={{ padding: "0.625rem 1rem", fontSize: "0.875rem" }}>
                    <Link href={`/${ex.toolName}`} className="underline underline-offset-2 text-muted-foreground hover:text-foreground">
                      {formatTool(ex.toolName)}
                    </Link>
                  </td>
                  <td style={{ padding: "0.625rem 1rem", fontSize: "0.875rem", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ex.fileName}
                  </td>
                  <td style={{ padding: "0.625rem 1rem", fontSize: "0.875rem", textAlign: "right", color: "var(--muted-foreground)" }}>
                    {formatBytes(ex.fileSize)}
                  </td>
                  <td style={{ padding: "0.625rem 1rem", fontSize: "0.875rem", textAlign: "right", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                    {formatDate(ex.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
