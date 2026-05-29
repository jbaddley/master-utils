import type { Metadata } from "next";
import CodeFormatterTool from "@/features/text/CodeFormatterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Code Formatter — format HTML, CSS, JS, TS & JSON free",
  description:
    "Format and beautify HTML, CSS, JavaScript, TypeScript, and JSON using Prettier — runs entirely in your browser, nothing uploaded.",
  path: "code-formatter",
});

const PRIVACY =
  "Private by design — Prettier runs in your browser using WebAssembly. Your code is never uploaded to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="code-formatter"
      h1="Code Formatter"
      appName="Code Formatter"
      privacyNote={PRIVACY}
      lede="Paste HTML, CSS, JavaScript, TypeScript, or JSON and click Format to get clean, consistently indented code powered by Prettier."
      steps={[
        "Select the language from the dropdown.",
        "Paste your code into the input area.",
        'Click "Format" — Prettier runs in your browser.',
        "Copy the formatted output or keep editing.",
      ]}
      faqs={[
        {
          q: "Which Prettier version is used?",
          a: "The formatter uses the latest version of Prettier bundled with this page. It runs entirely client-side via the Prettier standalone build.",
        },
        {
          q: "Why does formatting fail sometimes?",
          a: "Prettier requires syntactically valid code. If your code has parse errors, the formatter will show an inline error message describing the problem.",
        },
        {
          q: "Can I format minified code?",
          a: "Yes — minified JavaScript, CSS, and JSON will be expanded and re-indented. HTML minification reversal also works.",
        },
        {
          q: "Is TypeScript supported?",
          a: "Yes. Select TypeScript from the dropdown and Prettier will use its TypeScript parser, which handles JSX, generics, decorators, and more.",
        },
      ]}
      related={[
        { href: "/json-formatter", label: "JSON formatter" },
        { href: "/diff-checker", label: "Diff checker" },
        { href: "/text-case-converter", label: "Text case converter" },
      ]}
    >
      <CodeFormatterTool />
    </ToolPage>
  );
}
