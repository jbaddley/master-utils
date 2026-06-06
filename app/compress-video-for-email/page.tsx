import type { Metadata } from "next";
import VideoCompressorTool from "@/features/video/VideoCompressorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compress Video for Email — shrink video to send by email",
  description:
    "Compress video files small enough to send by email. Most email providers limit attachments to 25 MB — reduce your video here for free.",
  path: "compress-video-for-email",
});

export default function Page() {
  return (
    <ToolPage
      slug="compress-video-for-email"
      h1="Compress Video for Email"
      appName="Video Email Compressor"
      lede="Shrink your video file to fit email attachment limits (typically 25 MB). Select Low quality for maximum size reduction, or Medium for a better quality/size balance."
      steps={[
        "Upload your video file.",
        "Select Low quality for the smallest file size (best for email).",
        "Click Compress Video and wait for processing.",
        "Download and attach the compressed MP4 to your email.",
      ]}
      faqs={[
        {
          q: "What is the maximum email attachment size?",
          a: "Most email providers (Gmail, Outlook, Yahoo) limit attachments to 20–25 MB. For larger videos, consider sharing a link via Google Drive, Dropbox, or WeTransfer instead.",
        },
        {
          q: "How small can this make my video?",
          a: "Low quality compression typically achieves 70–80% size reduction. A 100 MB video might compress to 20–30 MB, though results vary by content complexity.",
        },
        {
          q: "Will the quality be noticeably worse?",
          a: "Low quality reduces bitrate significantly, which can cause visible compression artefacts in fast-moving scenes. For talking-head videos or screencasts, quality loss is minimal.",
        },
        {
          q: "Are my videos uploaded anywhere?",
          a: "No. Compression runs entirely in your browser using WebAssembly. For this tool, files are processed in your browser and are not uploaded to Utilio servers.",
        },
      ]}
      related={[
        { href: "/compress-video", label: "Compress video" },
        { href: "/compress-video-for-web", label: "Compress for web" },
        { href: "/trim-video", label: "Trim video first" },
        { href: "/mute-video", label: "Mute video" },
      ]}
      showAds
    >
      <VideoCompressorTool />
    </ToolPage>
  );
}
