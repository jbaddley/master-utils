import type { Metadata } from "next";
import Base64Tool from "@/features/data/Base64Tool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Base64 Encoder & Decoder — encode text and files free",
  description:
    "Encode and decode Base64 text or files in your browser. Copy results or decode Base64 back to a file — no upload.",
  path: "base64-encoder",
});

const PRIVACY =
  "Private by design — Base64 encoding and decoding runs in your browser. Files are never uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="base64-encoder"
      h1="Base64 Encoder"
      appName="Base64 Encoder"
      privacyNote={PRIVACY}
      lede="Encode text or files to Base64, or decode Base64 back to text or a downloadable file. Supports standard Base64 and data URLs."
      steps={[
        "Choose Encode or Decode.",
        "Enter text, paste Base64, or drop a file.",
        "Copy the result or download a decoded file.",
      ]}
      body={<h2>How to encode or decode Base64 without uploading files</h2>}
      faqs={[
        {
          q: "What is a data URL?",
          a: "A data URL looks like data:image/png;base64,... and embeds the MIME type plus Base64 payload. This tool can decode those to files.",
        },
        {
          q: "Unicode text?",
          a: "Text encoding uses UTF-8 via standard browser APIs so accented characters work correctly.",
        },
      ]}
      related={[
        { href: "/json-formatter", label: "JSON formatter" },
        { href: "/csv-to-json", label: "CSV to JSON" },
      ]}
    >
      <Base64Tool />
    </ToolPage>
  );
}
