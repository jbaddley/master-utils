import type { Metadata } from "next";
import PatternGeneratorTool from "@/features/design/PatternGeneratorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "SVG & CSS Pattern Generator — repeating background patterns free",
  description:
    "Generate repeating SVG and CSS background patterns: stripes, dots, grids, checkerboards, herringbone, hexagons. Customize colors, size, and rotation.",
  path: "pattern-generator",
});

const PRIVACY =
  "Private by design — patterns are generated entirely in your browser. No data is uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="pattern-generator"
      h1="SVG & CSS Pattern Generator"
      appName="Pattern Generator"
      privacyNote={PRIVACY}
      lede="Generate repeating SVG/CSS background patterns for your designs. Choose from stripes, dots, grids, checkerboards, herringbone, and hexagons — then customize colors, size, and rotation."
      steps={[
        "Select a pattern type from the dropdown.",
        "Choose your primary and background colors.",
        "Adjust the size and rotation sliders.",
        "Copy the CSS, copy the SVG markup, or download the SVG tile.",
      ]}
      body={<h2>How to use SVG patterns in CSS</h2>}
      faqs={[
        {
          q: "How do I use the CSS output?",
          a: 'Paste the CSS output into any element style or class. The background-image is a data URI so no external file is needed.',
        },
        {
          q: "Can I use the SVG tile in Figma or Sketch?",
          a: "Yes — download the SVG tile and import it into Figma, Sketch, or any vector editor. You can then use it as a fill pattern.",
        },
        {
          q: "Does rotation work for all patterns?",
          a: "Rotation is applied to all patterns. Some like checkerboards look best at 0° or 45°, while stripes shine at any angle.",
        },
      ]}
      related={[
        { href: "/color-toolbox", label: "Color Toolbox" },
        { href: "/image-to-svg", label: "Image to SVG" },
        { href: "/favicon-generator", label: "Favicon Generator" },
      ]}
    >
      <PatternGeneratorTool />
    </ToolPage>
  );
}
