import type { Metadata } from "next";
import RedactorTool from "@/features/privacy/RedactorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Redact Image — blackout sensitive text & regions online",
  description:
    "Redact images in your browser. Draw black or pixelated boxes over sensitive text on screenshots and documents — download PNG, no upload.",
  path: "redact-image",
});

const PRIVACY =
  "Private by design — redaction happens on a local canvas. Your image is never uploaded.";

export default function Page() {
  return (
    <ToolPage
      slug="redact-image"
      h1="Privacy Redactor"
      appName="Image Redactor"
      privacyNote={PRIVACY}
      lede="Draw rectangles over names, account numbers, or other sensitive areas. Choose solid black or pixelate, undo mistakes, and export a PNG."
      steps={[
        "Drop a screenshot or document image.",
        "Select black or pixelate style, then click-drag to redact regions.",
        "Use undo or clear, zoom for precision, and download the redacted PNG.",
      ]}
      body={
        <>
          <h2>How to redact sensitive information from images without uploading</h2>
          <p>
            All editing runs in your browser on a canvas. Nothing is sent to a server, so confidential screenshots stay
            on your browser and are not uploaded to Utilio servers.
          </p>
        </>
      }
      faqs={[
        {
          q: "Black vs pixelate?",
          a: "Black is fastest and hides content completely. Pixelate obscures details while keeping some visual context.",
        },
        {
          q: "Can I redact multiple areas?",
          a: "Yes — draw as many boxes as you need. Undo removes the last box; Clear all resets the image.",
        },
      ]}
      related={[
        { href: "/remove-exif", label: "Remove EXIF" },
        { href: "/compress-image", label: "Compress image" },
      ]}
    >
      <RedactorTool />
    </ToolPage>
  );
}
