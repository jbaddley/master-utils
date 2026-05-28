import type { Metadata } from "next";
import BackgroundTool from "@/features/background/BackgroundTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Background Remover — remove & replace image backgrounds",
  description: "Remove the background from any image and replace it with a transparent PNG, solid color, or gradient. Works entirely in your browser — no upload needed.",
  path: "ai-background-remover",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-background-remover"
      h1="AI Background Remover"
      appName="AI Background Remover"
      lede="Remove the background from any image and replace it with a transparent PNG, solid color, or gradient. Works entirely in your browser — no upload needed."
      steps={[
        "Drop or select your image (JPG, PNG, WebP, etc.).",
        "Adjust the tolerance slider if the default doesn't capture the background cleanly.",
        "Choose a background fill: Transparent, a solid Color, or a Gradient.",
        "Download your PNG with the background removed or replaced.",
      ]}
      faqs={[
        { q: "How does background removal work?", a: "The tool uses a flood-fill algorithm starting from the edges of the image, removing pixels that fall within the tolerance range of the edge color. This works well for images with solid or near-solid backgrounds." },
        { q: "What does the tolerance setting do?", a: "Tolerance controls how similar a pixel's color must be to the background color to be removed. Increase tolerance to remove gradients or shadows; decrease it to preserve fine edge detail." },
        { q: "What format is the output?", a: "The output is always PNG, which supports full transparency. If you choose a solid color or gradient fill, the background is baked into the PNG rather than being transparent." },
        { q: "Are my images uploaded to a server?", a: "No. All background removal and compositing happens in your browser using the Canvas API. Your images never leave your device." },
      ]}
      related={[
        { href: "/remove-background", label: "Remove background" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/png-to-jpg", label: "PNG to JPG" },
      ]}
    >
      <BackgroundTool />
    </ToolPage>
  );
}
