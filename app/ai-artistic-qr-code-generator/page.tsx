"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function AiArtisticQRCodeGeneratorPage() {
  const { isPro, loading, openAuthModal, user } = useAuth();
  const [qrContent, setQrContent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qrContent.trim() || !prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append("qr_content", qrContent);
      formData.append("prompt", prompt);
      if (negativePrompt.trim()) {
        formData.append("negative_prompt", negativePrompt);
      }

      const res = await fetch("/api/v1/artistic-qr", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to generate artistic QR code");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "artistic-qr.png";
    a.click();
  }

  return (
    <main className="page">
      <div className="page-hero">
        <h1>AI Artistic QR Code Generator</h1>
        <p className="lede">Blend QR codes with stunning AI art using ControlNet. Create scannable QR codes that look like beautiful paintings.</p>
      </div>

      {loading ? (
        <div className="batch-empty">Loading…</div>
      ) : !user ? (
        <div className="history-empty">
          <p>Sign in to generate AI artistic QR codes.</p>
          <Button onClick={openAuthModal}>Sign in</Button>
        </div>
      ) : !isPro ? (
        <div className="history-empty">
          <p>AI Artistic QR Code Generator is a Pro feature.</p>
          <Link href="/pricing">
            <Button>Upgrade to Pro</Button>
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: "1.5rem", maxWidth: "640px", margin: "0 auto" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Content to encode</span>
              <input
                type="text"
                placeholder="https://example.com"
                value={qrContent}
                onChange={(e) => setQrContent(e.target.value)}
                required
                style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "0.375rem", background: "var(--background)", color: "var(--foreground)", fontSize: "0.875rem" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Art style description</span>
              <textarea
                placeholder="cherry blossom garden, watercolor painting, pastel colors"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                rows={3}
                style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "0.375rem", background: "var(--background)", color: "var(--foreground)", fontSize: "0.875rem", resize: "vertical" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Negative prompt <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></span>
              <input
                type="text"
                placeholder="ugly, blurry"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "0.375rem", background: "var(--background)", color: "var(--foreground)", fontSize: "0.875rem" }}
              />
            </label>

            <Button type="submit" disabled={generating || !qrContent.trim() || !prompt.trim()}>
              {generating ? "Generating… (this may take up to a minute)" : "Generate Artistic QR"}
            </Button>

            {error && <p style={{ color: "var(--destructive)", fontSize: "0.875rem" }}>{error}</p>}
          </form>

          {resultUrl && (
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <img
                src={resultUrl}
                alt="AI artistic QR code"
                style={{ maxWidth: "100%", borderRadius: "0.5rem", border: "1px solid var(--border)" }}
              />
              <Button onClick={handleDownload} variant="outline">
                Download Image
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
