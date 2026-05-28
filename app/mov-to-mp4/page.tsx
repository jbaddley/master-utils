import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "MOV to MP4 Converter — free online, no upload",
  description:
    "Convert MOV (QuickTime) video to MP4 (H.264) format online for free. Works in your browser — no upload required.",
  path: "mov-to-mp4",
});

export default function Page() {
  return (
    <ToolPage
      slug="mov-to-mp4"
      h1="MOV to MP4 Converter"
      appName="MOV to MP4"
      lede="Convert MOV (QuickTime) video files from iPhone, iPad, or Mac to universally compatible MP4 (H.264). All processing happens in your browser."
      steps={[
        "Drop or select a MOV video file.",
        "MP4 (H.264) output is pre-selected.",
        "Click Convert and wait for encoding to finish.",
        "Download the MP4 file.",
      ]}
      faqs={[
        {
          q: "Why convert MOV to MP4?",
          a: "MOV is Apple's QuickTime format and works best on Apple devices. MP4 (H.264) is universally supported on Windows, Android, web browsers, and all major platforms.",
        },
        {
          q: "Does this work with iPhone videos?",
          a: "Yes. Videos recorded on iPhone and iPad in the default .mov format are fully supported. Note that HEVC/H.265 MOV files are also accepted but converted to H.264 MP4.",
        },
        {
          q: "Are my files kept private?",
          a: "Yes. All conversion runs locally in your browser using WebAssembly. Your videos are never uploaded to any server.",
        },
      ]}
      related={[
        { href: "/video-converter", label: "Video converter" },
        { href: "/webm-to-mp4", label: "WebM to MP4" },
        { href: "/compress-video", label: "Compress video" },
        { href: "/trim-video", label: "Trim video" },
      ]}
    >
      <VideoConverterTool defaultOutputFormat="mp4" />
    </ToolPage>
  );
}
