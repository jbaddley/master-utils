import type { Metadata } from "next";
import ExifScrubberTool from "@/features/privacy/ExifScrubberTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Remove EXIF Data — strip GPS & metadata from photos free",
  description:
    "Remove EXIF metadata from images in your browser. View GPS, camera, and date fields, then strip them before sharing — no upload.",
  path: "remove-exif",
});

const PRIVACY =
  "Private by design — metadata is read and removed locally. Your photos are never uploaded to a server.";

export default function Page() {
  return (
    <ToolPage
      slug="remove-exif"
      h1="Remove EXIF"
      appName="EXIF Metadata Scrubber"
      privacyNote={PRIVACY}
      lede="Inspect EXIF metadata (GPS, camera model, timestamps) and export a clean copy with all metadata stripped via canvas re-encode."
      steps={[
        "Drop a JPG, PNG, or WebP photo.",
        "Review detected metadata in the table (copy values if needed).",
        "Click Strip all metadata, then download the clean image.",
      ]}
      body={
        <>
          <h2>How to remove GPS data from photos without uploading them</h2>
          <p>
            Photos often embed GPS coordinates and device details in EXIF. This tool shows what is present, then
            re-encodes the image in your browser so metadata is not included in the download.
          </p>
        </>
      }
      faqs={[
        {
          q: "Does PNG also have metadata?",
          a: "Yes, though JPEG is most common for GPS tags. Re-encoding removes embedded metadata for supported raster formats.",
        },
        {
          q: "Will image quality change?",
          a: "JPEG export uses a high default quality. PNG is lossless. Slight visual change is possible when converting formats.",
        },
      ]}
      related={[
        { href: "/redact-image", label: "Privacy redactor" },
        { href: "/compress-image", label: "Compress image" },
      ]}
    >
      <ExifScrubberTool />
    </ToolPage>
  );
}
