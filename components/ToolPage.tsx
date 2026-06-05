import type { ReactNode } from "react";
import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { canonical } from "@/lib/seo";
import { AdSlot } from "@/components/AdSlot";
import { AffiliateCards } from "@/components/AffiliateCards";
import { FavoriteToggle } from "@/components/FavoriteToggle";

export type QA = { q: string; a: string };
export type RelatedLink = { href: string; label: string };

/**
 * Shared scaffold for every utility page: H1 + intro, the client tool, then
 * SEO content (How-to steps, optional body, FAQ, privacy note) and JSON-LD
 * (WebApplication + HowTo + FAQPage). Keeps individual pages tiny.
 */
export function ToolPage(props: {
  slug: string;
  h1: string;
  appName: string;
  lede: ReactNode;
  steps: string[];
  faqs: QA[];
  children: ReactNode;
  body?: ReactNode;
  related?: RelatedLink[];
  showAds?: boolean;
  privacyNote?: string;
}) {
  const ads = props.showAds !== false;
  const url = canonical(props.slug);
  return (
    <main className="page">
      <div className="page-hero">
        <div className="page-hero-title-row">
          <h1>{props.h1}</h1>
          <FavoriteToggle slug={props.slug} title={props.h1} />
        </div>
        <p className="lede">{props.lede}</p>
      </div>

      {props.children}

      <div className="prose">
        <h2>How to {props.h1.replace(/^./, (c) => c.toLowerCase())}</h2>
        <ol>
          {props.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        {props.body}

        {ads && <AdSlot variant="rectangle" />}

        <p className="privacy">
          {props.privacyNote ??
            "Private by design — all processing happens in your browser. Your images are never uploaded to a server."}
        </p>

        {props.related && props.related.length > 0 && (
          <>
            <h2>Related tools</h2>
            <div className="related">
              {props.related.map((r) => (
                <Link key={r.href} href={r.href}>
                  {r.label}
                </Link>
              ))}
            </div>
          </>
        )}

        <h2>Frequently asked questions</h2>
        {props.faqs.map((f, i) => (
          <div className="faq-item" key={i}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        {ads && <AdSlot variant="leaderboard" />}

        <AffiliateCards toolSlug={props.slug} />
      </div>

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: props.appName,
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            url,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: props.h1,
            step: props.steps.map((s, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              text: s,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: props.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
    </main>
  );
}
