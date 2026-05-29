import type { Metadata } from "next";
import UrlParserTool from "@/features/url/UrlParserTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "URL Parser — break down URL components online",
  description:
    "Parse URLs into protocol, host, port, path, query parameters, and hash. Edit parts and see the reconstructed URL update live.",
  path: "url-parser",
});

const PRIVACY =
  "Private by design — parsing happens in your browser. URLs are not logged or uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="url-parser"
      h1="URL Parser"
      appName="URL Parser"
      privacyNote={PRIVACY}
      lede="Paste any URL to inspect and edit protocol, hostname, port, pathname, query string key/value pairs, and hash — with a live reconstructed URL."
      steps={[
        "Paste a URL in the input field.",
        "Review and edit components in the table.",
        "Copy the reconstructed URL at the bottom.",
      ]}
      faqs={[
        {
          q: "Do edits update automatically?",
          a: "The reconstructed URL updates as you edit fields. Blur the main URL input to re-parse a completely new link.",
        },
      ]}
      related={[
        { href: "/url-encoder", label: "URL encoder" },
        { href: "/url-unshortener", label: "URL unshortener" },
      ]}
    >
      <UrlParserTool />
    </ToolPage>
  );
}
