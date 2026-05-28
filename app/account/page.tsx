"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuCopy, LuCheck, LuTrash2, LuPlus } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";

type ApiKeyRecord = {
  id: string;
  label: string;
  key: string;
  dailyLimit: number;
  requestsToday: number;
  active: boolean;
  createdAt: string;
};

export default function AccountPage() {
  const { user, isPro, loading, openAuthModal } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d: { keys?: ApiKeyRecord[] }) => setKeys(d.keys ?? []))
      .finally(() => setFetching(false));
  }, [user]);

  const createKey = async () => {
    setCreating(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel || "Default" }),
      });
      const data = await res.json() as { key?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create key");
      setNewKey(data.key ?? null);
      setNewLabel("");
      // Refresh list (key shown masked)
      const r2 = await fetch("/api/keys");
      const d2 = await r2.json() as { keys?: ApiKeyRecord[] };
      setKeys(d2.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    await fetch("/api/keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <main className="page"><div className="batch-empty">Loading…</div></main>;

  if (!user) {
    return (
      <main className="page">
        <div className="page-hero"><h1>Account</h1></div>
        <div className="history-empty">
          <p>Sign in to manage your account and API keys.</p>
          <Button onClick={openAuthModal}>Sign in</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-hero">
        <h1>Account</h1>
        <p className="lede">{user.email}</p>
      </div>

      <section className="card settings" style={{ marginBottom: "1.5rem" }}>
        <div className="field">
          <span className="field-label">Plan</span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontWeight: 600 }}>{isPro ? "Pro" : "Free"}</span>
            {isPro ? (
              <ManageSubscriptionButton />
            ) : (
              <Link href="/pricing"><Button size="sm">Upgrade to Pro</Button></Link>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>API Keys</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
          Use API keys to call <Link href="/api-docs" className="underline underline-offset-2">the developer API</Link>.
          Free accounts: 100 requests/day. Pro: 10,000 requests/day.
        </p>

        {error && <div className="error" style={{ marginBottom: "0.75rem" }}>{error}</div>}

        {newKey && (
          <div className="card" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid var(--primary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <code style={{ flex: 1, fontSize: "13px", wordBreak: "break-all" }}>{newKey}</code>
            <Button size="sm" variant="outline" onClick={() => copyKey(newKey)}>
              {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
        {newKey && (
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
            Save this key now — it will not be shown again in full.
          </p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <Input
            placeholder="Key label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Button onClick={createKey} disabled={creating}>
            <LuPlus size={14} />
            {creating ? "Creating…" : "Create key"}
          </Button>
        </div>

        {fetching ? (
          <div className="batch-empty">Loading keys…</div>
        ) : keys.length === 0 ? (
          <div className="batch-empty">No API keys yet.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 1rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Label</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 1rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Key</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 1rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Usage today</th>
                  <th style={{ padding: "0.5rem 1rem" }} />
                </tr>
              </thead>
              <tbody>
                {keys.map((k, i) => (
                  <tr key={k.id} style={{ borderBottom: i < keys.length - 1 ? "1px solid var(--border)" : undefined }}>
                    <td style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 500 }}>{k.label}</td>
                    <td style={{ padding: "0.5rem 1rem" }}>
                      <code style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{k.key}</code>
                    </td>
                    <td style={{ padding: "0.5rem 1rem", textAlign: "right", fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                      {k.requestsToday} / {k.dailyLimit.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.5rem 1rem", textAlign: "right" }}>
                      <Button size="sm" variant="outline" onClick={() => revokeKey(k.id)}>
                        <LuTrash2 size={13} /> Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
