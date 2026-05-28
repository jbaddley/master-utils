import type { Metadata } from "next";
import VideoMuteTool from "@/features/video/VideoMuteTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Mute Video Online — remove audio track free",
  description:
    "Remove the audio track from any video file online for free. Works with MP4, WebM, and MOV — all processing happens in your browser.",
  path: "mute-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="mute-video"
      h1="Mute Video"
      appName="Video Muter"
      lede="Remove the audio track from a video in one click. Works with MP4, WebM, and MOV — processing happens entirely in your browser using video stream copy."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Click Remove Audio to strip the audio track.",
        "Download the silent video.",
      ]}
      faqs={[
        {
          q: "Does removing audio affect video quality?",
          a: "No — the tool uses video stream copy (-c:v copy) which removes the audio without re-encoding the video. Picture quality is unchanged.",
        },
        {
          q: "Can I add different audio back to the video?",
          a: "This tool only removes audio. To add a new audio track, you would need a separate video editing tool.",
        },
        {
          q: "Are my files kept private?",
          a: "Yes. All processing uses WebAssembly running locally in your browser. Your video files are never uploaded to any server.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim video" },
        { href: "/video-converter", label: "Video converter" },
        { href: "/compress-video", label: "Compress video" },
        { href: "/remove-audio-from-video", label: "Remove audio from video" },
      ]}
    >
      <VideoMuteTool />
    </ToolPage>
  );
}
