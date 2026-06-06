import { ToolSearch } from "@/components/ToolSearch";
import { ToolDirectory } from "@/components/ToolDirectory";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import {
  SITE_HERO_LEDE,
  SITE_HERO_TITLE,
  SITE_WHY_SECTION,
} from "@/lib/utilio-messaging";

export default function Home() {
  return (
    <main className="page">
      <div className="hero">
        <h1>{SITE_HERO_TITLE}</h1>
        <p className="lede">{SITE_HERO_LEDE}</p>
        <div className="hero-search">
          <ToolSearch variant="hero" placeholder="Search all tools — e.g. mp3, instagram, trim…" />
        </div>
        <p className="browse-search-hint">
          Press <kbd>⌘K</kbd> or <kbd>/</kbd> to search from anywhere
        </p>
      </div>

      <ToolDirectory />

      <div className="prose">
        <h2>Why these tools?</h2>
        <p>{SITE_WHY_SECTION}</p>
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
