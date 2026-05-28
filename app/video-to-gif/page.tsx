import type { Metadata } from "next";
import VideoToGifTool from "@/features/video/VideoToGifTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video to GIF — convert video clips to animated GIF free",
  description:
    "Convert a video clip to an animated GIF. Control frame rate, width, start time, and duration — high-quality two-pass palette encoding, browser-based.",
  path: "video-to-gif",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-to-gif"
      h1="Video to GIF"
      appName="Video to GIF Converter"
      lede="Turn a short video clip into a smooth, shareable animated GIF. Adjust frame rate and width to balance quality and file size — all in your browser."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV).",
        "Set the start time and duration (up to 30 seconds).",
        "Choose a frame rate and output width.",
        "Click Convert to GIF and download your animation.",
      ]}
      faqs={[
        {
          q: "Why is the duration limited to 30 seconds?",
          a: "GIF files grow very quickly with duration, frame rate, and resolution. A 30-second GIF at 10 FPS and 480px wide can already exceed 10 MB. Longer clips are better shared as video.",
        },
        {
          q: "How do I get a smaller GIF file?",
          a: "Lower the frame rate (6 FPS), reduce the width (320px), and shorten the duration. Each change significantly reduces file size.",
        },
        {
          q: "What makes this GIF converter better quality?",
          a: "This tool uses a two-pass approach: it first generates an optimized color palette from your specific clip, then uses it for dithering. This produces noticeably better color accuracy than a single-pass conversion.",
        },
        {
          q: "Is my video uploaded to a server?",
          a: "No. All conversion happens in your browser using ffmpeg.wasm (WebAssembly). Your files never leave your device.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim video first" },
        { href: "/compress-video", label: "Compress video" },
        { href: "/video-thumbnail-generator", label: "Extract video thumbnail" },
        { href: "/mute-video", label: "Mute video" },
      ]}
      showAds
    >
      <VideoToGifTool />
    </ToolPage>
  );
}
