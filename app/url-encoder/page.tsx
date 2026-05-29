import type { Metadata } from "next";
import UrlEncoderTool from "@/features/url/UrlEncoderTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "URL Encoder & Decoder — encodeURIComponent online free",
  description:
    "Encode or decode URL components and full URLs in your browser. Instant results, copy output — no upload.",
  path: "url-encoder",
});

const PRIVACY =
  "Private by design — encoding runs in your browser. Text is never sent to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="url-encoder"
      h1="URL Encoder"
      appName="URL Encoder"
      privacyNote={PRIVACY}
      lede="Encode or decode query values with encodeURIComponent, or encode/decode full URL strings. Copy results with one click."
      steps={[
        "Choose Encode or Decode and component vs full URL mode.",
        "Paste text and run.",
        "Copy the output.",
      ]}
      faqs={[
        {
          q: "Component vs full URL?",
          a: "Component mode is for query parameter values. Full URL mode encodes special characters while keeping URL structure readable.",
        },
      ]}
      related={[
        { href: "/url-parser", label: "URL parser" },
        { href: "/url-unshortener", label: "URL unshortener" },
      ]}
    >
      <UrlEncoderTool />
    </ToolPage>
  );
}
