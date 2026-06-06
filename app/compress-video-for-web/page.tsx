import type { Metadata } from "next";
import VideoCompressorTool from "@/features/video/VideoCompressorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compress Video for Web — optimize video for website upload",
  description:
    "Compress and optimize video for websites. Reduce file size without losing quality — H.264 MP4 output, browser-based, no upload needed.",
  path: "compress-video-for-web",
});

export default function Page() {
  return (
    <ToolPage
      slug="compress-video-for-web"
      h1="Compress Video for Web"
      appName="Video Web Optimizer"
      lede="Reduce video file size for fast web page loading. Output is H.264 MP4 with the faststart flag so playback begins immediately in browsers."
      steps={[
        "Upload your video (MP4, MOV, WebM, AVI).",
        "Select Medium quality for the best size/quality balance for web.",
        "Click Compress and download the optimized MP4.",
        "Upload to your website or CMS.",
      ]}
      faqs={[
        {
          q: "What video format is best for websites?",
          a: "H.264 MP4 is the most universally compatible format for web. All major browsers support it, and it can be served directly or via a CDN.",
        },
        {
          q: "What bitrate should I target for web video?",
          a: "For HD 1080p web video, 2–5 Mbps is a good target. For 720p, 1–2.5 Mbps. This compressor uses CRF-based encoding which targets quality rather than a fixed bitrate, resulting in smaller files for simple scenes.",
        },
        {
          q: "What is the faststart flag and why does it matter?",
          a: "The -movflags +faststart flag moves the MP4 metadata to the beginning of the file, allowing browsers to start playing the video before it has fully downloaded — just like streaming.",
        },
        {
          q: "Is my video uploaded to a server?",
          a: "No. All compression runs in your browser using WebAssembly. Your files are not uploaded to Utilio servers for this tool.",
        },
      ]}
      related={[
        { href: "/compress-video", label: "Compress video" },
        { href: "/compress-video-for-email", label: "Compress for email" },
        { href: "/trim-video", label: "Trim video" },
        { href: "/convert-video", label: "Convert video format" },
      ]}
      showAds
    >
      <VideoCompressorTool />
    </ToolPage>
  );
}
