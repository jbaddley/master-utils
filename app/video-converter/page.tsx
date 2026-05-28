import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video Converter — convert MP4, WebM, MOV free online",
  description:
    "Convert video between MP4, WebM, and OGG formats in your browser. No upload, no account needed.",
  path: "video-converter",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-converter"
      h1="Video Converter"
      appName="Video Converter"
      lede="Convert video between MP4, WebM, and OGG formats in your browser. No upload, no account needed."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, MKV, or OGG).",
        "Choose the output format: MP4, WebM, or OGG.",
        "Click Convert and wait for processing to finish.",
        "Download the converted video.",
      ]}
      faqs={[
        {
          q: "Which output formats are supported?",
          a: "You can convert to MP4 (H.264), WebM (VP9), or OGG (Theora). MP4 is the most widely compatible choice for sharing and playback.",
        },
        {
          q: "Why only three output formats?",
          a: "The converter uses ffmpeg.wasm running entirely in your browser. Only codecs compiled into the WebAssembly build are available — H.264, VP9, and Theora are reliably supported without server-side processing.",
        },
        {
          q: "Large files take a long time — is that normal?",
          a: "Yes. WebAssembly runs in a single thread without GPU acceleration, so encoding large files can take several minutes. A warning is shown for files over 300 MB.",
        },
        {
          q: "Is my video uploaded anywhere?",
          a: "No. All conversion is done locally using WebAssembly in your browser. Your files never leave your device.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim Video" },
        { href: "/compress-video", label: "Compress Video" },
        { href: "/mute-video", label: "Mute Video" },
      ]}
    >
      <VideoConverterTool />
    </ToolPage>
  );
}
