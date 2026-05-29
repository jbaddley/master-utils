import type { Metadata } from "next";
import PasswordGeneratorTool from "@/features/generators/PasswordGeneratorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Password Generator — secure random & diceware passwords",
  description:
    "Free secure password generator in your browser. Random or memorable diceware passwords using crypto.getRandomValues — no server, no logging.",
  path: "password-generator",
});

const PRIVACY =
  "Private by design — passwords are generated locally with crypto.getRandomValues(). Nothing is sent to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="password-generator"
      h1="Password Generator"
      appName="Secure Password Generator"
      privacyNote={PRIVACY}
      lede="Generate strong random passwords or memorable diceware phrases. Adjust length and character sets, see entropy-based strength, and copy results instantly."
      steps={[
        "Choose Random or Memorable (Diceware) mode.",
        "Set length or word count and character options.",
        "Click Generate, then copy one or all passwords.",
      ]}
      body={
        <>
          <h2>How to generate a secure password without a server</h2>
          <p>
            This tool uses the browser&apos;s cryptographic random API only — never Math.random — so secrets are not
            transmitted or stored.
          </p>
        </>
      }
      faqs={[
        {
          q: "What is diceware?",
          a: "Memorable passwords built from random EFF wordlist words (e.g. correct-horse-battery-staple style). Four to six words provide strong entropy.",
        },
        {
          q: "How many passwords can I generate at once?",
          a: "Up to 20 per click for comparing options or team distribution.",
        },
      ]}
      related={[
        { href: "/uuid-generator", label: "UUID generator" },
        { href: "/base64-encoder", label: "Base64 encoder" },
      ]}
    >
      <PasswordGeneratorTool />
    </ToolPage>
  );
}
