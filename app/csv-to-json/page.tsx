import type { Metadata } from "next";
import CsvJsonTool from "@/features/data/CsvJsonTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "CSV to JSON — convert CSV to JSON array free online",
  description:
    "Convert CSV to JSON in your browser. Auto-detects comma, tab, or semicolon delimiters. Copy or download — no upload.",
  path: "csv-to-json",
});

const PRIVACY =
  "Private by design — conversion runs locally in your browser. Your spreadsheet data is not uploaded to Utilio servers for this tool.";

export default function Page() {
  return (
    <ToolPage
      slug="csv-to-json"
      h1="CSV to JSON"
      appName="CSV to JSON Converter"
      privacyNote={PRIVACY}
      lede="Paste CSV and get a JSON array of objects. Delimiters are detected automatically from the header row."
      steps={[
        "Paste CSV data (first row = column headers).",
        "Click Convert.",
        "Copy JSON or download data.json.",
      ]}
      body={<h2>How to convert CSV to JSON without uploading files</h2>}
      faqs={[
        {
          q: "Does the first row need to be headers?",
          a: "Yes — the first line is treated as column names for the JSON object keys.",
        },
        {
          q: "What delimiters work?",
          a: "Comma, tab, semicolon, and pipe are auto-detected from the first line.",
        },
      ]}
      related={[
        { href: "/json-to-csv", label: "JSON to CSV" },
        { href: "/json-formatter", label: "JSON formatter" },
      ]}
    >
      <CsvJsonTool mode="csv-to-json" />
    </ToolPage>
  );
}
