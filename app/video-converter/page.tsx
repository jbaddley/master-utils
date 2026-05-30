import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video Converter — convert MP4, WebM, MOV free online",
  description:
    "Free online video converter. Convert MP4, WebM, MOV, AVI, and MKV files in your browser — no upload required, completely private.",
  path: "video-converter",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-converter"
      h1="Video Converter"
      appName="Video Converter"
      lede="Convert MP4, WebM, MOV, AVI, and MKV videos between formats. Everything runs in your browser using WebAssembly — your files never leave your device."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, or MKV).",
        "Choose the output format: MP4 (H.264), WebM (VP9), or OGV (Theora).",
        "Click Convert and wait for processing to finish.",
        "Download the converted video.",
      ]}
      faqs={[
        {
          q: "Which output formats are supported?",
          a: "You can convert to MP4 (H.264, widest device compatibility), WebM (VP9, smaller file size), or OGV (Theora, open format).",
        },
        {
          q: "Will the video quality be affected?",
          a: "MP4 and WebM conversions re-encode the video using high-quality settings (CRF 23 for H.264, CRF 30 for VP9). The output quality is very close to the original.",
        },
        {
          q: "Are my video files kept private?",
          a: "Yes. All conversion happens locally in your browser using ffmpeg.wasm. Your files are never uploaded to any server.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim video" },
        { href: "/compress-video", label: "Compress video" },
        { href: "/mute-video", label: "Mute video" },
        { href: "/video-to-mp3", label: "Video to MP3" },
        { href: "/mp4-to-webm", label: "MP4 to WebM" },
        { href: "/webm-to-mp4", label: "WebM to MP4" },
      ]}
    >
      <VideoConverterTool />
    </ToolPage>
  );
}
