import type { Metadata } from "next";
import CsvJsonTool from "@/features/data/CsvJsonTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "JSON to CSV — convert JSON array to CSV free online",
  description:
    "Turn a JSON array of objects into CSV in your browser. Copy or download — private, instant, no upload.",
  path: "json-to-csv",
});

const PRIVACY =
  "Private by design — conversion happens in your browser. Your data is never uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="json-to-csv"
      h1="JSON to CSV"
      appName="JSON to CSV Converter"
      privacyNote={PRIVACY}
      lede="Paste a JSON array of objects and download a CSV file. Keys from all rows become column headers."
      steps={[
        "Paste a JSON array (each item should be an object).",
        "Click Convert.",
        "Copy CSV or download data.csv.",
      ]}
      body={<h2>How to convert JSON to CSV without uploading files</h2>}
      faqs={[
        {
          q: "What JSON shape is required?",
          a: "A top-level array of objects, e.g. [{\"name\":\"Ada\",\"score\":99}].",
        },
        {
          q: "Nested objects?",
          a: "Nested values are stringified in the cell. Flat objects work best.",
        },
      ]}
      related={[
        { href: "/csv-to-json", label: "CSV to JSON" },
        { href: "/json-formatter", label: "JSON formatter" },
      ]}
    >
      <CsvJsonTool mode="json-to-csv" />
    </ToolPage>
  );
}
