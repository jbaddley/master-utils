import type { Metadata } from "next";
import VideoCompressorTool from "@/features/video/VideoCompressorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compress Video — reduce video file size free online",
  description:
    "Compress video files for web, email, or social media. H.264 MP4 output with quality control — runs entirely in your browser, no upload needed.",
  path: "compress-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="compress-video"
      h1="Compress Video"
      appName="Video Compressor"
      lede="Reduce video file size for web, email, and social media sharing. Choose your quality level and download a compressed H.264 MP4 — all in your browser."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, MKV).",
        "Choose a quality level: High, Medium, or Low.",
        "Click Compress Video and wait for processing to complete.",
        "Download the compressed MP4.",
      ]}
      faqs={[
        {
          q: "How much smaller will my video get?",
          a: "It depends on the source codec and quality setting. Medium quality typically reduces file size by 30–60% with minimal visible quality loss. Low quality can reduce size by 70–80%.",
        },
        {
          q: "What format does the compressed video use?",
          a: "The output is always H.264 MP4, which is the most widely compatible video format for web, email, phones, and social media.",
        },
        {
          q: "Why does compression take a long time?",
          a: "Video re-encoding is computationally intensive. Unlike stream-copy operations, H.264 compression must analyze and re-encode every frame. Large files (500MB+) can take 5–15 minutes depending on your device.",
        },
        {
          q: "Is my video uploaded to a server?",
          a: "No. All processing happens locally in your browser using ffmpeg.wasm (WebAssembly). Your video files are not uploaded to Utilio servers for this tool.",
        },
        {
          q: "What is H.265 or HEVC — can you compress to that?",
          a: "H.265 (HEVC) produces smaller files than H.264 at the same quality, but it is not available in the browser-based version of ffmpeg due to patent restrictions. H.264 MP4 is the best available option here.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim video" },
        { href: "/mute-video", label: "Mute video" },
        { href: "/convert-video", label: "Convert video format" },
        { href: "/video-to-gif", label: "Video to GIF" },
      ]}
      showAds
    >
      <VideoCompressorTool />
    </ToolPage>
  );
}
