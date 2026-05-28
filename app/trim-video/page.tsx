import type { Metadata } from "next";
import VideoTrimTool from "@/features/video/VideoTrimTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Trim Video Online — cut MP4, WebM, MOV free",
  description:
    "Trim or cut any video file online for free. Set a start and end time to extract a clip from MP4, WebM, or MOV — all in your browser.",
  path: "trim-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="trim-video"
      h1="Trim Video"
      appName="Video Trimmer"
      lede="Cut video clips to a precise start and end time. Works with MP4, WebM, and MOV — processing happens entirely in your browser using stream copy for lossless trimming."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Enter a start time (e.g. 0:30 or 30 seconds).",
        "Enter an end time, or leave blank to trim to the end of the file.",
        "Click Trim and download the clipped video.",
      ]}
      faqs={[
        {
          q: "Does trimming reduce video quality?",
          a: "No — the trimmer uses stream copy mode (-c copy) which cuts the video without re-encoding, so there is no quality loss at all.",
        },
        {
          q: "What time formats are accepted?",
          a: "You can enter times as MM:SS (e.g. 1:30), HH:MM:SS (e.g. 0:01:30), or plain seconds (e.g. 90).",
        },
        {
          q: "Which video formats are supported?",
          a: "MP4, WebM, and MOV are all supported. The output keeps the same format as the input file.",
        },
      ]}
      related={[
        { href: "/video-converter", label: "Video converter" },
        { href: "/compress-video", label: "Compress video" },
        { href: "/mute-video", label: "Mute video" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <VideoTrimTool />
    </ToolPage>
  );
}
