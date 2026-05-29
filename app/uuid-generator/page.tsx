import type { Metadata } from "next";
import UuidGeneratorTool from "@/features/generators/UuidGeneratorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "UUID Generator — v4, v1, v5 GUIDs online free",
  description:
    "Generate UUIDs and GUIDs in your browser. v4 random, v1 timestamp, v5 namespace — bulk up to 100, multiple formats, copy or download.",
  path: "uuid-generator",
});

const PRIVACY =
  "Private by design — UUIDs are generated locally. No network calls are made.";

export default function Page() {
  return (
    <ToolPage
      slug="uuid-generator"
      h1="UUID Generator"
      appName="UUID Generator"
      privacyNote={PRIVACY}
      lede="Create UUID v4 (random), v1 (time-based), or v5 (namespace + name). Export up to 100 at once in standard, uppercase, brace, or hyphen-free formats."
      steps={[
        "Pick UUID version and output format.",
        "For v5, enter a namespace and name string.",
        "Generate, copy, or download as a .txt file.",
      ]}
      faqs={[
        {
          q: "Which UUID version should I use?",
          a: "v4 is the default for most apps. v1 includes a timestamp. v5 is deterministic from a namespace and name (DNS or URL namespace built in).",
        },
        {
          q: "Are these RFC-compliant?",
          a: "Yes — versions follow standard bit layout for variant and version fields.",
        },
      ]}
      related={[
        { href: "/password-generator", label: "Password generator" },
        { href: "/json-formatter", label: "JSON formatter" },
      ]}
    >
      <UuidGeneratorTool />
    </ToolPage>
  );
}
