"use client";

import { useState } from "react";
import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { SITE_URL } from "@/lib/seo";

const TOOL_OPTIONS = TOOLS.map((t) => ({ value: t.slug, label: t.title }));

export default function EmbedConfigPage() {
  const [selected, setSelected] = useState(TOOL_OPTIONS[0].value);
  const [hideBranding, setHideBranding] = useState(false);

  const label = TOOL_OPTIONS.find((t) => t.value === selected)?.label ?? "Image Tool";
  const baseSrc = `${SITE_URL}/embed/${selected}/`;
  const src = hideBranding ? `${baseSrc}?attribution=0` : baseSrc;
  const snippet =
    `<iframe\n  src="${src}"\n  width="100%"\n  height="600"\n  style="border:none;border-radius:12px"\n  title="${label}"\n></iframe>`;

  return (
    <main className="page">
      <div className="page-hero">
        <h1>Embed a Tool</h1>
        <p className="lede">
          Add any image utility to your website with a single line of HTML. Your visitors
          use the tool directly — no uploads to your servers, no sign-up required.
        </p>
      </div>

      <section className="card settings" style={{ marginTop: "1.5rem" }}>
        <label className="field">
          <span className="field-label">Choose tool</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {TOOL_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={hideBranding}
            onChange={(e) => setHideBranding(e.target.checked)}
          />
          <span className="field-label" style={{ margin: 0 }}>
            Hide &ldquo;Powered by&rdquo; branding{" "}
            <Link href="/pricing" style={{ fontSize: "0.75rem", opacity: 0.6 }}>(Business plan)</Link>
          </span>
        </label>

        <div className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
          <span className="field-label">Embed code</span>
          <pre style={{
            width: "100%",
            background: "var(--muted)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            fontSize: "13px",
            overflowX: "auto",
            userSelect: "all",
            margin: 0,
          }}>
            <code>{snippet}</code>
          </pre>
        </div>

        <div className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
          <span className="field-label">Preview</span>
          <iframe
            key={src}
            src={src}
            width="100%"
            height="500"
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
            title="Tool preview"
          />
        </div>
      </section>

      <div className="prose">
        <h2>White-label option</h2>
        <p>
          Need custom branding, your own domain, or usage analytics? The{" "}
          <a href="/pricing">Business plan</a> includes white-label embedding with your branding removed.
        </p>
      </div>
    </main>
  );
}
