import { ToolSearch } from "@/components/ToolSearch";
import { ToolDirectory } from "@/components/ToolDirectory";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export default function Home() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Free Online Media Tools</h1>
        <p className="lede">
          Fast, private utilities for images, audio, video, and QR codes — all
          running entirely in your browser. No uploads, no sign-up, no watermarks.
          Convert, compress, resize, edit, and generate in one place.
        </p>
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
        <p>
          Every utility here is 100% client-side: your files are processed
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
