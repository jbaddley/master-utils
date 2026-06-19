import type { Metadata } from "next";
import ImageStudio from "@/features/studio/ImageStudio";
import { ToolPage } from "@/components/ToolPage";
import {
  OtherUtilityHubs,
  UtilityHubSections,
} from "@/components/UtilityHubPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Image Studio — compress, resize, crop, convert & more in one page",
  description:
    "Drop your image once, then compress, resize, crop, convert, remove background, strip EXIF metadata, redact sensitive areas, or upscale — all in one place. Private, browser-only.",
  path: "image-studio",
});

export default function Page() {
  return (
    <ToolPage
      wide
      slug="image-studio"
      h1="Image Studio"
      appName="Image Studio"
      lede="Drop your image once and edit it like a pro — crop, resize, rotate, remove the background, redact, and upscale, with every edit stacking on the last. Download a single finished file when you're done."
      steps={[
        "Drop or select any image (JPG, PNG, WebP, AVIF, GIF, BMP).",
        "Pick tools from the left rail — each edit applies to your image and stacks on the previous one, with full undo.",
        "Choose an output format and quality, then download your finished image once.",
      ]}
      faqs={[
        {
          q: "Does this upload my image anywhere?",
          a: "No. All editing runs in your browser via the Canvas API — your image never leaves your device.",
        },
        {
          q: "Can I chain multiple edits together?",
          a: "Yes — that's the point. Crop, then resize, then redact, then export. Every edit stacks on the previous one, and you can undo (Cmd/Ctrl+Z) or jump back to any step in the history panel.",
        },
        {
          q: "How do I compress or convert my image?",
          a: "Use the Export panel: pick PNG, JPEG, WebP, or AVIF, and drag the quality slider while watching the live file-size estimate. Compression and conversion happen at download time.",
        },
        {
          q: "Does the exported image keep EXIF metadata?",
          a: "No — exports are re-encoded from the canvas, which strips all EXIF metadata (GPS, camera info) automatically. You can inspect the original metadata in the Info tool first.",
        },
        {
          q: "Can I convert between SVG and raster images?",
          a: "Both directions. Drop an SVG and export it as PNG, JPEG, WebP, or AVIF. Or use the To SVG tool to trace any raster image into vector paths — your tracing settings are saved once (to your account if signed in) and reused for every conversion.",
        },
      ]}
      related={[
        { href: "/batch-compress", label: "Batch Compress" },
        { href: "/batch-resize", label: "Batch Resize" },
        { href: "/image-to-svg", label: "Image to SVG" },
        { href: "/svg-to-image", label: "SVG to Image" },
        { href: "/image-to-pdf", label: "Image to PDF" },
        { href: "/workflow", label: "Workflow Templates" },
      ]}
      afterTool={
        <div className="utility-hub-after-tool">
          <div className="tool-directory-header">
            <h2 className="tool-directory-title">Image utility categories</h2>
          </div>
          <p className="tool-directory-desc">
            Image Studio is the best place to chain edits. Use these category
            links when you need a specific preset, workflow, or AI helper.
          </p>
          <UtilityHubSections groupId="image-studio" />
          <OtherUtilityHubs currentGroupId="image-studio" />
        </div>
      }
    >
      <ImageStudio />
    </ToolPage>
  );
}
