import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "WebM to MP4 Converter — free online, no upload",
  description:
    "Convert WebM video to MP4 (H.264) format online for free. Maximum device compatibility — all processing happens in your browser.",
  path: "webm-to-mp4",
});

export default function Page() {
  return (
    <ToolPage
      slug="webm-to-mp4"
      h1="WebM to MP4 Converter"
      appName="WebM to MP4"
      lede="Convert WebM video to MP4 (H.264) for maximum device and platform compatibility. Processing happens entirely in your browser — no upload required."
      steps={[
        "Drop or select a WebM video file.",
        "MP4 (H.264) output is pre-selected.",
        "Click Convert and wait for encoding to finish.",
        "Download the MP4 file.",
      ]}
      faqs={[
        {
          q: "Why convert WebM to MP4?",
          a: "MP4 (H.264) is supported by virtually all devices, apps, and platforms including iOS, Android, Windows, and macOS. If your WebM won't play somewhere, converting to MP4 usually fixes it.",
        },
        {
          q: "Will video quality be preserved?",
          a: "The converter uses H.264 with CRF 23, which is a high-quality setting. There may be minor quality change due to re-encoding, but the result looks essentially identical to the source.",
        },
        {
          q: "Are my files kept private?",
          a: "Yes. All conversion runs locally in your browser using WebAssembly. For this tool, files are processed in your browser and are not uploaded to Utilio servers.",
        },
      ]}
      related={[
        { href: "/mp4-to-webm", label: "MP4 to WebM" },
        { href: "/mov-to-mp4", label: "MOV to MP4" },
        { href: "/video-converter", label: "Video converter" },
        { href: "/compress-video", label: "Compress video" },
      ]}
    >
      <VideoConverterTool initialTo="mp4" />
    </ToolPage>
  );
}
