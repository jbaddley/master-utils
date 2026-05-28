import Link from "next/link";
import { TOOLS, CONVERSIONS, parseConversion } from "@/lib/tools";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export default function Home() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Free Online Image Tools</h1>
        <p className="lede">
          Fast, private image utilities that run entirely in your browser — no
          uploads, no sign-up, no watermarks. Convert, compress, resize, crop,
          vectorize and more.
        </p>
      </div>

      <div className="tool-grid">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.slug} href={`/${t.slug}`} className="tool-card">
              <Icon className="tc-icon" />
              <h3>{t.title}</h3>
              <p>{t.tagline}</p>
            </Link>
          );
        })}
      </div>

      <div className="prose">
        <h2>Popular conversions</h2>
        <div className="related">
          {CONVERSIONS.map((c) => {
            const info = parseConversion(c);
            return (
              <Link key={c} href={`/${c}`}>
                {info ? `${info.fromLabel} to ${info.toLabel}` : c}
              </Link>
            );
          })}
        </div>

        <h2>Why these tools?</h2>
        <p>
          Every utility here is 100% client-side: your images are processed
          locally and never sent to a server. That means instant results,
          complete privacy, and no file-size limits beyond your own device.
        </p>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
        }}
      />
    </main>
  );
}
