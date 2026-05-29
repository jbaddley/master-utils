import type { Metadata } from "next";
import UrlUnshortenTool from "@/features/url/UrlUnshortenTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "URL Unshortener — preview short link destination safely",
  description:
    "Unshorten bit.ly and other short URLs. See the final destination and redirect chain before clicking — SSRF-safe server HEAD requests.",
  path: "url-unshortener",
});

const PRIVACY =
  "The short URL you submit is resolved server-side via HEAD requests only — your browser does not navigate to the destination. Private IP targets are blocked.";

export default function Page() {
  return (
    <ToolPage
      slug="url-unshortener"
      h1="URL Unshortener"
      appName="URL Unshortener"
      privacyNote={PRIVACY}
      lede="Paste a shortened link to see where it redirects. View the full redirect chain and final URL before you open it in a browser tab."
      steps={[
        "Paste a short URL (http or https).",
        "Click Unshorten URL.",
        "Review the final destination and redirect hops, then copy the expanded URL.",
      ]}
      faqs={[
        {
          q: "Why does this use a server?",
          a: "Following redirects requires HTTP requests browsers block from static pages (CORS). The API uses HEAD-only requests and blocks private networks.",
        },
        {
          q: "Is my URL stored?",
          a: "No — the URL is used only for the lookup request and is not saved.",
        },
      ]}
      related={[
        { href: "/url-parser", label: "URL parser" },
        { href: "/url-encoder", label: "URL encoder" },
      ]}
    >
      <UrlUnshortenTool />
    </ToolPage>
  );
}
