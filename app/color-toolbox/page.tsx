import type { Metadata } from "next";
import ColorToolbox from "@/features/design/ColorToolbox";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Color Toolbox — HEX RGB HSL Converter & WCAG Contrast Checker",
  description:
    "Convert colors between HEX, RGB, and HSL instantly. Check WCAG AA/AAA contrast ratios for accessible color pairs — all in your browser.",
  path: "color-toolbox",
});

const PRIVACY =
  "Private by design — all color calculations run in your browser. No data is ever uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="color-toolbox"
      h1="Color Toolbox"
      appName="Color Toolbox"
      privacyNote={PRIVACY}
      lede="Convert colors between HEX, RGB, and HSL formats, and check WCAG accessibility contrast ratios for any foreground/background pair."
      steps={[
        "Enter a HEX color, pick from the color swatch, or type RGB/HSL values.",
        "All three formats update instantly — copy any with one click.",
        "Scroll to the contrast checker, pick a foreground and background color.",
        "See the contrast ratio and WCAG AA/AAA pass/fail results with a live preview.",
      ]}
      body={<h2>Why color conversion and contrast checking matters</h2>}
      faqs={[
        {
          q: "What is WCAG contrast ratio?",
          a: "WCAG (Web Content Accessibility Guidelines) defines minimum contrast ratios between text and background to ensure readability for users with visual impairments. AA requires 4.5:1 for normal text, AAA requires 7:1.",
        },
        {
          q: "What counts as large text for WCAG?",
          a: "Large text is 18pt (24px) or larger, or 14pt (approximately 18.67px) bold or larger.",
        },
        {
          q: "How is relative luminance calculated?",
          a: "Each RGB channel is linearized then combined as L = 0.2126R + 0.7152G + 0.0722B. The contrast ratio is (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color.",
        },
      ]}
      related={[
        { href: "/image-studio", label: "Image Studio" },
        { href: "/image-to-svg", label: "Image to SVG" },
        { href: "/pattern-generator", label: "Pattern Generator" },
      ]}
    >
      <ColorToolbox />
    </ToolPage>
  );
}
