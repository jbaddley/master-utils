import type { Metadata } from "next";
import CaseConverterTool from "@/features/text/CaseConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Text Case Converter — camelCase, snake_case, kebab-case & more",
  description:
    "Convert text between camelCase, PascalCase, snake_case, SCREAMING_SNAKE_CASE, kebab-case and Title Case instantly in your browser.",
  path: "text-case-converter",
});

const PRIVACY = "Private by design — text conversion happens entirely in your browser. Nothing is uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="text-case-converter"
      h1="Text Case Converter"
      appName="Text Case Converter"
      privacyNote={PRIVACY}
      lede="Convert any text or identifier between camelCase, PascalCase, snake_case, SCREAMING_SNAKE_CASE, kebab-case, and Title Case in one click."
      steps={[
        "Type or paste your text into the input field.",
        "All six case formats update instantly below.",
        "Click Copy next to the format you need.",
      ]}
      faqs={[
        {
          q: "How does the converter handle acronyms and numbers?",
          a: "The tokenizer splits on spaces, hyphens, underscores, and camelCase/PascalCase boundaries, then reassembles tokens into each format. Numbers are preserved as-is within their token.",
        },
        {
          q: "Does it work with multi-word sentences?",
          a: "Yes — sentences with spaces are tokenized just like identifiers, so 'hello world' becomes helloWorld, HelloWorld, hello_world, etc.",
        },
        {
          q: "Is the conversion reversible?",
          a: "All conversions start from the same set of tokens, so converting in any direction and back produces consistent results as long as the original tokenization is unambiguous.",
        },
      ]}
      related={[
        { href: "/json-formatter", label: "JSON formatter" },
        { href: "/url-encoder", label: "URL encoder" },
        { href: "/diff-checker", label: "Diff checker" },
      ]}
    >
      <CaseConverterTool />
    </ToolPage>
  );
}
