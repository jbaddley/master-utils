import type { Metadata } from "next";
import VideoCompressorTool from "@/features/video/VideoCompressorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compress Video for Web — optimize MP4 for streaming free",
  description:
    "Optimize video files for web streaming and embedding. Compress MP4, WebM, or MOV to web-friendly sizes in your browser — no upload required.",
  path: "compress-video-for-web",
});

export default function Page() {
  return (
    <ToolPage
      slug="compress-video-for-web"
      h1="Compress Video for Web"
      appName="Video Compressor for Web"
      lede="Optimize your video for web streaming, embedding, and fast loading. H.264 MP4 output works in all browsers — processing happens entirely in your browser."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Choose a quality level suitable for web delivery.",
        "Click Compress to encode with H.264.",
        "Download the web-optimized MP4.",
      ]}
      faqs={[
        {
          q: "Which quality setting is best for web video?",
          a: "Medium (CRF 23) is recommended for most web use cases — it produces good quality at a reasonable file size. Use Low (CRF 28) for faster loading on mobile connections.",
        },
        {
          q: "Is H.264 MP4 compatible with all browsers?",
          a: "Yes. H.264 MP4 is the most widely supported video format on the web, compatible with Chrome, Firefox, Safari, Edge, and all major mobile browsers.",
        },
        {
          q: "Are my files kept private?",
          a: "Yes. Everything runs locally in your browser using WebAssembly. No data is sent to any server.",
        },
      ]}
      related={[
        { href: "/compress-video", label: "Compress video" },
        { href: "/compress-video-for-email", label: "Compress for email" },
        { href: "/video-to-gif", label: "Video to GIF" },
        { href: "/video-converter", label: "Video converter" },
      ]}
    >
      <VideoCompressorTool />
    </ToolPage>
  );
}
