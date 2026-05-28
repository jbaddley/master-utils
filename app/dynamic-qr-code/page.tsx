"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { SITE_URL } from "@/lib/seo";

type QRCodeRecord = {
  id: string;
  code: string;
  label: string;
  destination: string;
  active: boolean;
  createdAt: string;
  darkColor: string;
  lightColor: string;
  _count: { scans: number };
};

type FormState = {
  label: string;
  destination: string;
  darkColor: string;
  lightColor: string;
};

export default function DynamicQRCodePage() {
  const { user, isPro, loading, openAuthModal } = useAuth();
  const [qrCodes, setQrCodes] = useState<QRCodeRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ label: "", destination: "", darkColor: "#000000", lightColor: "#ffffff" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ destination: string; label: string }>({ destination: "", label: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isPro) return;
    setFetching(true);
    fetch("/api/qr")
      .then((r) => r.json())
      .then((data: { codes?: QRCodeRecord[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setQrCodes(data.codes ?? []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load QR codes"))
      .finally(() => setFetching(false));
  }, [user, isPro]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: form.destination, label: form.label, darkColor: form.darkColor, lightColor: form.lightColor }),
      });
      const data = await res.json() as { code?: QRCodeRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      if (data.code) {
        setQrCodes((prev) => [{ ...data.code!, _count: { scans: 0 } }, ...prev]);
        setForm({ label: "", destination: "", darkColor: "#000000", lightColor: "#ffffff" });
      }
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create QR code");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(qr: QRCodeRecord) {
    const updated = await fetch(`/api/qr/${qr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !qr.active }),
    });
    const data = await updated.json() as { code?: QRCodeRecord };
    if (data.code) {
      setQrCodes((prev) => prev.map((q) => (q.id === qr.id ? { ...data.code!, _count: q._count } : q)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this QR code? All scan data will be lost.")) return;
    await fetch(`/api/qr/${id}`, { method: "DELETE" });
    setQrCodes((prev) => prev.filter((q) => q.id !== id));
  }

  function startEdit(qr: QRCodeRecord) {
    setEditingId(qr.id);
    setEditForm({ destination: qr.destination, label: qr.label });
  }

  async function handleSaveEdit(qr: QRCodeRecord) {
    setSaving(true);
    const res = await fetch(`/api/qr/${qr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: editForm.destination, label: editForm.label }),
    });
    const data = await res.json() as { code?: QRCodeRecord };
    if (data.code) {
      setQrCodes((prev) => prev.map((q) => (q.id === qr.id ? { ...data.code!, _count: q._count } : q)));
    }
    setSaving(false);
    setEditingId(null);
  }

  function copyShortUrl(code: string) {
    const url = `${SITE_URL}/qr/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <main className="page">
      <div className="page-hero">
        <h1>Dynamic QR Codes</h1>
        <p className="lede">Create QR codes whose destination URL you can update any time. Track every scan.</p>
      </div>

      {loading ? (
        <div className="batch-empty">Loading…</div>
      ) : !user ? (
        <div className="history-empty">
          <p>Sign in to create and manage dynamic QR codes.</p>
          <Button onClick={openAuthModal}>Sign in</Button>
        </div>
      ) : !isPro ? (
        <div className="history-empty">
          <p>Dynamic QR codes are a Pro feature.</p>
          <Link href="/pricing">
            <Button>Upgrade to Pro</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Create form */}
          <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Create a new dynamic QR code</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  style={{ flex: "1 1 160px", padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "0.375rem", background: "var(--background)", color: "var(--foreground)" }}
                />
                <input
                  type="url"
                  placeholder="Destination URL (required)"
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  required
                  style={{ flex: "2 1 280px", padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "0.375rem", background: "var(--background)", color: "var(--foreground)" }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                  QR color
                  <input
                    type="color"
                    value={form.darkColor}
                    onChange={(e) => setForm((f) => ({ ...f, darkColor: e.target.value }))}
                    style={{ width: "2.25rem", height: "2.25rem", cursor: "pointer", borderRadius: "0.375rem", border: "1px solid var(--border)", padding: "0.125rem" }}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                  Background
                  <input
                    type="color"
                    value={form.lightColor}
                    onChange={(e) => setForm((f) => ({ ...f, lightColor: e.target.value }))}
                    style={{ width: "2.25rem", height: "2.25rem", cursor: "pointer", borderRadius: "0.375rem", border: "1px solid var(--border)", padding: "0.125rem" }}
                  />
                </label>
                <Button type="submit" disabled={creating || !form.destination}>
                  {creating ? "Creating…" : "Create QR Code"}
                </Button>
              </div>
              {createError && <p style={{ color: "var(--destructive)", fontSize: "0.875rem" }}>{createError}</p>}
            </form>
          </div>

          {/* List */}
          {fetching ? (
            <div className="batch-empty">Loading QR codes…</div>
          ) : error ? (
            <div className="batch-empty" style={{ color: "var(--destructive)" }}>{error}</div>
          ) : qrCodes.length === 0 ? (
            <div className="batch-empty">No dynamic QR codes yet. Create one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {qrCodes.map((qr) => {
                const shortUrl = `${SITE_URL}/qr/${qr.code}`;
                const dark = (qr.darkColor ?? "#000000").slice(1);
                const light = (qr.lightColor ?? "#ffffff").slice(1);
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shortUrl)}&color=${dark}&bgcolor=${light}`;
                const isEditing = editingId === qr.id;
                return (
                  <div
                    key={qr.id}
                    className="card"
                    style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap", opacity: qr.active ? 1 : 0.6 }}
                  >
                    {/* QR image */}
                    <img
                      src={qrImageUrl}
                      alt={`QR code for ${qr.label || qr.destination}`}
                      width={120}
                      height={120}
                      style={{ border: "1px solid var(--border)", borderRadius: "0.375rem", flexShrink: 0 }}
                    />

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <input
                            type="text"
                            placeholder="Label"
                            value={editForm.label}
                            onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                            style={{ padding: "0.375rem 0.625rem", border: "1px solid var(--border)", borderRadius: "0.375rem", background: "var(--background)", color: "var(--foreground)", fontSize: "0.875rem" }}
                          />
                          <input
                            type="url"
                            placeholder="Destination URL"
                            value={editForm.destination}
                            onChange={(e) => setEditForm((f) => ({ ...f, destination: e.target.value }))}
                            style={{ padding: "0.375rem 0.625rem", border: "1px solid var(--border)", borderRadius: "0.375rem", background: "var(--background)", color: "var(--foreground)", fontSize: "0.875rem" }}
                          />
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Button size="sm" onClick={() => handleSaveEdit(qr)} disabled={saving}>
                              {saving ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                            {qr.label || <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>No label</span>}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "0.25rem", wordBreak: "break-all" }}>
                            {qr.destination}
                          </div>
                        </>
                      )}

                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>
                        Short URL: <span style={{ fontFamily: "monospace" }}>{shortUrl}</span>
                        &nbsp;&bull;&nbsp;
                        {qr._count.scans} scan{qr._count.scans !== 1 ? "s" : ""}
                        &nbsp;&bull;&nbsp;
                        {qr.active ? "Active" : "Inactive"}
                      </div>

                      {!isEditing && (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <Button size="sm" variant="outline" onClick={() => startEdit(qr)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleActive(qr)}>
                            {qr.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copyShortUrl(qr.code)}>
                            {copied === qr.code ? "Copied!" : "Copy URL"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(qr.id)} style={{ color: "var(--destructive)" }}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
