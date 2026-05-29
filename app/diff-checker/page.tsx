import type { Metadata } from "next";
import DiffTool from "@/features/text/DiffTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Diff Checker — compare text and find differences free",
  description:
    "Compare two blocks of text and see added, removed, and unchanged lines highlighted — runs entirely in your browser.",
  path: "diff-checker",
});

const PRIVACY =
  "Private by design — text comparison runs entirely in your browser. Your content is never uploaded to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="diff-checker"
      h1="Diff Checker"
      appName="Diff Checker"
      privacyNote={PRIVACY}
      lede="Paste two versions of any text side by side and click Compare to see exactly what changed — added lines in green, removed lines in red."
      steps={[
        "Paste the original text in the left panel.",
        "Paste the modified text in the right panel.",
        'Click "Compare" to generate the diff.',
        "Review additions (green +) and deletions (red −) in the output.",
      ]}
      faqs={[
        {
          q: "What diff algorithm is used?",
          a: "This tool uses the diffLines algorithm from the 'diff' npm package, which computes a line-by-line diff similar to the Unix diff command.",
        },
        {
          q: "Can I compare code files?",
          a: "Yes — paste any plain text content including source code, JSON, configuration files, or prose. The diff is purely text-based.",
        },
        {
          q: "Does it support word-level or character-level diffs?",
          a: "Currently the tool shows line-level diffs. Word and character-level diffing may be added in a future update.",
        },
        {
          q: "Is there a size limit?",
          a: "There is no hard limit — the diff runs in your browser's JavaScript engine. Very large files (hundreds of thousands of lines) may be slow to compute.",
        },
      ]}
      related={[
        { href: "/text-case-converter", label: "Text case converter" },
        { href: "/code-formatter", label: "Code formatter" },
        { href: "/json-formatter", label: "JSON formatter" },
      ]}
    >
      <DiffTool />
    </ToolPage>
  );
}
