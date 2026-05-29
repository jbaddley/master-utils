import type { Metadata } from "next";
import JsonFormatterTool from "@/features/data/JsonFormatterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "JSON Formatter & Validator — pretty-print JSON free online",
  description:
    "Format and validate JSON in your browser. See syntax errors with line hints, explore a tree view, copy or download — no upload.",
  path: "json-formatter",
});

const PRIVACY =
  "Private by design — JSON is parsed and formatted entirely in your browser. Nothing is sent to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="json-formatter"
      h1="JSON Formatter"
      appName="JSON Formatter"
      privacyNote={PRIVACY}
      lede="Paste JSON to validate, pretty-print with indentation, and browse a collapsible tree. Copy or download the formatted output."
      steps={[
        "Paste or type JSON in the editor.",
        "Click Format & validate.",
        "Copy the result or download formatted.json.",
      ]}
      body={<h2>How to format JSON without uploading files</h2>}
      faqs={[
        {
          q: "Does it fix invalid JSON?",
          a: "It reports errors with line and column hints but does not auto-repair. Fix the syntax and format again.",
        },
        {
          q: "Is there a size limit?",
          a: "Very large JSON may slow the browser. For huge payloads, use a desktop editor or split the file.",
        },
      ]}
      related={[
        { href: "/csv-to-json", label: "CSV to JSON" },
        { href: "/base64-encoder", label: "Base64 encoder" },
      ]}
    >
      <JsonFormatterTool />
    </ToolPage>
  );
}
