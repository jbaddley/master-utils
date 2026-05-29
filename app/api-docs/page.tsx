import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";
import { PreWithCopy } from "@/components/PreWithCopy";

export const metadata: Metadata = buildMetadata({
  title: "Developer API — image processing REST API",
  description:
    "REST API for image compression, conversion, resizing, and favicon generation. Integrate image processing into your app in minutes.",
  path: "api-docs",
});

const BASE = `${SITE_URL}/api/v1`;

const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/compress",
    description: "Compress an image with configurable format and quality.",
    params: [
      { name: "file", type: "File", required: true, desc: "The source image" },
      { name: "format", type: "string", required: false, desc: '"webp" | "jpeg" | "png" | "avif" — default: webp' },
      { name: "quality", type: "integer", required: false, desc: "1–100 — default: 80 (ignored for PNG)" },
    ],
    curl: `curl -X POST ${BASE}/compress \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@photo.jpg" \\
  -F "format=webp" \\
  -F "quality=80" \\
  --output compressed.webp`,
  },
  {
    method: "POST",
    path: "/api/v1/convert",
    description: "Convert an image from one format to another.",
    params: [
      { name: "file", type: "File", required: true, desc: "The source image" },
      { name: "to", type: "string", required: true, desc: '"webp" | "jpeg" | "png" | "avif"' },
    ],
    curl: `curl -X POST ${BASE}/convert \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@image.png" \\
  -F "to=webp" \\
  --output converted.webp`,
  },
  {
    method: "POST",
    path: "/api/v1/resize",
    description: "Resize an image to specified dimensions.",
    params: [
      { name: "file", type: "File", required: true, desc: "The source image" },
      { name: "width", type: "integer", required: false, desc: "Target width in px (provide at least one dimension)" },
      { name: "height", type: "integer", required: false, desc: "Target height in px" },
      { name: "fit", type: "string", required: false, desc: '"cover" | "contain" | "fill" | "inside" | "outside" — default: inside' },
      { name: "format", type: "string", required: false, desc: '"webp" | "jpeg" | "png" | "avif" — default: jpeg' },
    ],
    curl: `curl -X POST ${BASE}/resize \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@photo.jpg" \\
  -F "width=1280" \\
  -F "height=720" \\
  -F "fit=cover" \\
  -F "format=webp" \\
  --output resized.webp`,
  },
  {
    method: "POST",
    path: "/api/v1/favicon",
    description: "Generate a full favicon PNG pack (8 sizes + Apple touch icon) as a ZIP.",
    params: [
      { name: "file", type: "File", required: true, desc: "Source image — square works best" },
    ],
    curl: `curl -X POST ${BASE}/favicon \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@logo.png" \\
  --output favicons.zip`,
  },
  {
    method: "POST",
    path: "/api/v1/qr-code",
    description: "Generate a QR code PNG for any text or URL.",
    params: [
      { name: "text", type: "string", required: true, desc: "The text or URL to encode" },
      { name: "size", type: "integer", required: false, desc: "Output size in px (64–2048) — default: 256" },
      { name: "error_correction", type: "string", required: false, desc: '"L" | "M" | "Q" | "H" — default: M' },
      { name: "margin", type: "integer", required: false, desc: "Quiet zone modules (1–10) — default: 2" },
    ],
    curl: `curl -X POST ${BASE}/qr-code \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "text=https://example.com" \\
  -F "size=512" \\
  --output qrcode.png`,
  },
];

export default function ApiDocsPage() {
  return (
    <main className="page">
      <div className="page-hero">
        <h1>Developer API</h1>
        <p className="lede">
          Integrate image compression, conversion, resizing, and favicon generation directly
          into your application. All endpoints accept <code>multipart/form-data</code> and
          return the processed image binary.
        </p>
      </div>

      <div className="prose" style={{ maxWidth: "100%" }}>
        <h2>Authentication</h2>
        <p>
          Every request must include your API key in the <code>Authorization</code> header:
        </p>
        <PreWithCopy
          code="Authorization: Bearer YOUR_API_KEY"
          style={{ background: "var(--muted)", padding: "1rem", borderRadius: "var(--radius)", fontSize: "13px", overflowX: "auto", margin: 0 }}
        />
        <p>
          API keys are available on the <a href="/pricing">Pro and Business plans</a>. Generate
          your key from the account dashboard after subscribing.
        </p>

        <h2>Base URL</h2>
        <PreWithCopy
          code={BASE}
          style={{ background: "var(--muted)", padding: "1rem", borderRadius: "var(--radius)", fontSize: "13px", overflowX: "auto", margin: 0 }}
        />

        <h2>Rate limits</h2>
        <p>
          Free API keys: 100 requests/day. Pro: 10,000 requests/day. Business: unlimited.
          Exceeded limits return <code>HTTP 429</code>.
        </p>

        <h2>Endpoints</h2>
        {ENDPOINTS.map((ep) => (
          <div key={ep.path} style={{ marginBottom: "2.5rem", paddingBottom: "2.5rem", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <code style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 700 }}>
                {ep.method}
              </code>
              <code style={{ fontSize: "15px" }}>{ep.path}</code>
            </div>
            <p style={{ marginBottom: "1rem" }}>{ep.description}</p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "1rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.75rem 0.4rem 0", color: "var(--muted-foreground)" }}>Field</th>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.75rem", color: "var(--muted-foreground)" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.75rem", color: "var(--muted-foreground)" }}>Required</th>
                  <th style={{ textAlign: "left", padding: "0.4rem 0", color: "var(--muted-foreground)" }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {ep.params.map((p) => (
                  <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.4rem 0.75rem 0.4rem 0" }}><code>{p.name}</code></td>
                    <td style={{ padding: "0.4rem 0.75rem", color: "var(--muted-foreground)" }}>{p.type}</td>
                    <td style={{ padding: "0.4rem 0.75rem", color: p.required ? "var(--foreground)" : "var(--muted-foreground)" }}>{p.required ? "Yes" : "No"}</td>
                    <td style={{ padding: "0.4rem 0", color: "var(--muted-foreground)" }}>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PreWithCopy
              code={ep.curl}
              style={{ background: "var(--muted)", padding: "1rem", borderRadius: "var(--radius)", fontSize: "12px", overflowX: "auto", margin: 0 }}
            />
          </div>
        ))}

        <h2>Error responses</h2>
        <p>All errors return JSON with an <code>error</code> field:</p>
        <PreWithCopy
          code={`{ "error": "Invalid API key" }          // 401\n{ "error": "Daily rate limit exceeded" } // 429\n{ "error": "Failed to process image" }   // 422`}
          style={{ background: "var(--muted)", padding: "1rem", borderRadius: "var(--radius)", fontSize: "13px", overflowX: "auto", margin: 0 }}
        />
      </div>
    </main>
  );
}
