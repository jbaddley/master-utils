import type { Metadata } from "next";
import VideoCompressorTool from "@/features/video/VideoCompressorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compress Video for Email — reduce size for attachments free",
  description:
    "Compress video files to fit email attachment limits. Reduce MP4, WebM, or MOV size in your browser — no upload, completely private.",
  path: "compress-video-for-email",
});

export default function Page() {
  return (
    <ToolPage
      slug="compress-video-for-email"
      h1="Compress Video for Email"
      appName="Video Compressor for Email"
      lede="Shrink your video file to fit email attachment limits (typically 10–25 MB). Choose a lower quality preset for maximum size reduction — all in your browser."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Choose Low (CRF 28) or Very Low (CRF 35) for the smallest file size.",
        "Click Compress and wait for the encoding to finish.",
        "Download and attach the smaller MP4 to your email.",
      ]}
      faqs={[
        {
          q: "What file size can I expect?",
          a: "Results vary by video content and length. For a 1-minute clip, Very Low quality typically produces a file under 10 MB — suitable for most email providers.",
        },
        {
          q: "Which quality preset should I use for email?",
          a: "Use Low (CRF 28) to balance quality and size. If the file is still too large, try Very Low (CRF 35) for maximum compression.",
        },
        {
          q: "Is there a size limit for this tool?",
          a: "The tool is limited by your browser's available memory. Very large files (over 300 MB) may be slow. For email use, your source file is likely already small enough.",
        },
      ]}
      related={[
        { href: "/compress-video", label: "Compress video" },
        { href: "/compress-video-for-web", label: "Compress for web" },
        { href: "/trim-video", label: "Trim video to shorten" },
        { href: "/video-converter", label: "Video converter" },
      ]}
    >
      <VideoCompressorTool />
    </ToolPage>
  );
}
