import type { Metadata } from "next";
import VideoToGifTool from "@/features/video/VideoToGifTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video to GIF — convert MP4 to animated GIF free online",
  description:
    "Convert video clips to animated GIF online for free. Turn MP4, WebM, or MOV into high-quality GIFs in your browser — no upload required.",
  path: "video-to-gif",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-to-gif"
      h1="Video to GIF"
      appName="Video to GIF Converter"
      lede="Convert video clips to animated GIFs with palette-optimized color quality. Works with MP4, WebM, and MOV — best results with clips under 30 seconds."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Choose a frame rate and max width to control quality and file size.",
        "Click Convert to GIF — two-pass palette optimization runs automatically.",
        "Download the animated GIF.",
      ]}
      faqs={[
        {
          q: "Why should clips be under 30 seconds?",
          a: "GIF files are uncompressed video — a 30-second clip at 15 fps and 480px wide can easily exceed 50 MB. Keep clips short or use a lower frame rate and smaller width.",
        },
        {
          q: "What is palette optimization?",
          a: "The converter uses a two-pass approach: it first analyzes the video to build an optimal 256-color palette, then applies it to the GIF. This produces much better color accuracy than single-pass GIF conversion.",
        },
        {
          q: "How do I reduce the GIF file size?",
          a: "Lower the frame rate (10 fps) and max width (320px) for the smallest file size. Higher settings produce smoother, sharper GIFs but larger files.",
        },
      ]}
      related={[
        { href: "/video-converter", label: "Video converter" },
        { href: "/trim-video", label: "Trim video first" },
        { href: "/compress-video", label: "Compress video" },
        { href: "/video-thumbnail-generator", label: "Video thumbnail generator" },
      ]}
    >
      <VideoToGifTool />
    </ToolPage>
  );
}
