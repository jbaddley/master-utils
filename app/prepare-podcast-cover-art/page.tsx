import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { WORKFLOWS } from "@/lib/workflows";
import WorkflowRunner from "@/features/workflow/WorkflowRunner";

const workflow = WORKFLOWS.find((w) => w.id === "podcast-cover-art")!;

export const metadata: Metadata = buildMetadata({
  title: "Prepare Podcast Cover Art — resize to 3000×3000 WebP free",
  description:
    "Free tool to prepare podcast cover art: automatically resize to 3000×3000 and compress as WebP 85% — meets Apple Podcasts, Spotify, and Google Podcasts specs instantly.",
  path: "prepare-podcast-cover-art",
});

export default function Page() {
  return (
    <ToolPage
      slug="prepare-podcast-cover-art"
      h1="Prepare Podcast Cover Art"
      appName="Podcast Cover Art Optimizer"
      lede="Get your podcast artwork ready in one click. This tool automatically resizes your image to 3000×3000 pixels and compresses it as WebP at 85% quality — meeting every major podcast directory's requirements."
      steps={[
        "Drop or select your artwork image (PNG, JPG, or WebP).",
        "The tool resizes it to exactly 3000×3000 pixels.",
        "The image is compressed as WebP at 85% quality.",
        "Download and upload to Apple Podcasts, Spotify, or your podcast host.",
      ]}
      faqs={[
        {
          q: "What size does Apple Podcasts require for cover art?",
          a: "Apple Podcasts requires artwork between 1400×1400 and 3000×3000 pixels, in JPEG or PNG format, in the RGB color space. This tool outputs 3000×3000 WebP which is accepted by all major platforms.",
        },
        {
          q: "What size does Spotify require for podcast cover art?",
          a: "Spotify recommends 3000×3000 pixels as the ideal podcast artwork size.",
        },
        {
          q: "Should my original artwork be square before using this tool?",
          a: "Yes. The resize step fills the canvas exactly, so a non-square image will be stretched. Crop your artwork to a square first using the Crop Image tool.",
        },
        {
          q: "Is there a file size limit for podcast artwork?",
          a: "Most podcast hosts have a limit between 500 KB and 1 MB. WebP at 85% quality usually keeps a 3000×3000 artwork well under 1 MB.",
        },
        {
          q: "Are my images uploaded anywhere?",
          a: "No. All processing runs entirely in your browser. Your artwork never leaves your device.",
        },
      ]}
      related={[
        { href: "/workflow/podcast-cover-art", label: "Podcast Cover Art workflow" },
        { href: "/resize-image", label: "Resize image" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/crop-image", label: "Crop image" },
        { href: "/workflow", label: "All workflow templates" },
      ]}
      showAds
    >
      <WorkflowRunner workflow={workflow} />
    </ToolPage>
  );
}
