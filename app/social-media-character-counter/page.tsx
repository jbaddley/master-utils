import type { Metadata } from "next";
import SocialCounterTool from "@/features/text/SocialCounterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Social Media Character Counter — X, LinkedIn, Instagram & Facebook",
  description:
    "Count characters for X (Twitter), LinkedIn, Instagram, and Facebook posts with color-coded limits — works instantly in your browser.",
  path: "social-media-character-counter",
});

const PRIVACY =
  "Private by design — character counting happens entirely in your browser. Your text is never uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="social-media-character-counter"
      h1="Social Media Character Counter"
      appName="Social Media Character Counter"
      privacyNote={PRIVACY}
      lede="Type or paste your post and instantly see how it fits within X (Twitter), LinkedIn, Instagram, and Facebook character limits — with color-coded warnings."
      steps={[
        "Paste or type your post text in the text area.",
        "Platform cards update in real time showing your character count.",
        "Watch for amber (80%) and red (95%+) indicators — trim your text if needed.",
        "Copy and paste your finished post into your social platform of choice.",
      ]}
      faqs={[
        {
          q: "How does X (Twitter) count URLs?",
          a: "X shortens all URLs to 23 characters regardless of original length. The counter shows your raw character count — factor in URL shortening manually when your post contains links.",
        },
        {
          q: "What is Instagram's visible caption length?",
          a: "Instagram shows the first 125 characters before a 'more' link. The full caption can be up to 2,200 characters. The card highlights when you exceed the preview threshold.",
        },
        {
          q: "Does LinkedIn have different limits for posts vs. articles?",
          a: "This tool counts characters for LinkedIn Posts (3,000 char limit). LinkedIn Articles have a much higher limit and are managed in a separate editor.",
        },
        {
          q: "What is Facebook's character limit?",
          a: "Facebook allows up to 63,206 characters per post, far more than any other major platform. The counter will warn you if you somehow approach this limit.",
        },
      ]}
      related={[
        { href: "/text-case-converter", label: "Text case converter" },
        { href: "/url-encoder", label: "URL encoder" },
        { href: "/diff-checker", label: "Diff checker" },
      ]}
    >
      <SocialCounterTool />
    </ToolPage>
  );
}
