import type { Metadata } from "next";
import VideoTrimTool from "@/features/video/VideoTrimTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Trim Video — cut video online free",
  description:
    "Cut any video to a precise start and end time online for free. Stream-copy mode means no quality loss and near-instant processing. Works with MP4, WebM, MOV, and more.",
  path: "trim-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="trim-video"
      h1="Trim Video"
      appName="Video Trimmer"
      lede="Cut out the exact segment you want from any video. Stream-copy mode means no quality loss and near-instant processing."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, MKV, or OGG).",
        "Enter a start time and end time — use MM:SS, HH:MM:SS, or plain seconds.",
        "Click Trim and download the clipped video.",
      ]}
      faqs={[
        {
          q: "What time formats are accepted?",
          a: "You can enter times as MM:SS (e.g. 1:30), HH:MM:SS (e.g. 0:01:30), or plain seconds (e.g. 90). All formats refer to the same point in the video.",
        },
        {
          q: "Will trimming affect video quality?",
          a: "No — the trimmer uses stream copy mode which cuts the file without re-encoding the video or audio, so there is no quality loss at all.",
        },
        {
          q: "What video formats are supported?",
          a: "MP4, WebM, MOV, AVI, MKV, and OGG are all supported. The trimmed output keeps the same container format as your input file.",
        },
        {
          q: "Are my videos uploaded to a server?",
          a: "No — all trimming runs locally in your browser using WebAssembly. Your video file never leaves your device.",
        },
      ]}
      related={[
        { href: "/mute-video", label: "Mute video" },
        { href: "/compress-video", label: "Compress video" },
        { href: "/video-thumbnail-generator", label: "Video thumbnail generator" },
      ]}
      showAds
    >
      <VideoTrimTool />
    </ToolPage>
  );
}
