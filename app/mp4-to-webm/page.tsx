import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "MP4 to WebM Converter — free online, no upload",
  description:
    "Convert MP4 video to WebM format online for free. VP9 encoding for smaller file sizes — all processing happens in your browser.",
  path: "mp4-to-webm",
});

export default function Page() {
  return (
    <ToolPage
      slug="mp4-to-webm"
      h1="MP4 to WebM Converter"
      appName="MP4 to WebM"
      lede="Convert MP4 video to WebM (VP9) format for smaller file sizes and open-format compatibility. Processing happens entirely in your browser."
      steps={[
        "Drop or select an MP4 video file.",
        "WebM (VP9) output is pre-selected.",
        "Click Convert and wait for encoding to finish.",
        "Download the WebM file.",
      ]}
      faqs={[
        {
          q: "Why convert MP4 to WebM?",
          a: "WebM (VP9) typically produces smaller files than H.264 MP4 at the same visual quality. It is also a fully open, royalty-free format supported by all modern browsers.",
        },
        {
          q: "Is WebM compatible with all browsers?",
          a: "WebM VP9 is supported by Chrome, Firefox, Edge, and most modern browsers. Safari added support in macOS Big Sur. For maximum compatibility, MP4 is safer.",
        },
        {
          q: "Are my files kept private?",
          a: "Yes. All conversion runs locally in your browser using WebAssembly. Nothing is uploaded to any server.",
        },
      ]}
      related={[
        { href: "/webm-to-mp4", label: "WebM to MP4" },
        { href: "/mov-to-mp4", label: "MOV to MP4" },
        { href: "/video-converter", label: "Video converter" },
        { href: "/compress-video", label: "Compress video" },
      ]}
    >
      <VideoConverterTool initialTo="webm" />
    </ToolPage>
  );
}
