import type { Metadata } from "next";
import VideoMuteTool from "@/features/video/VideoMuteTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Remove Audio from Video Online — free, no upload",
  description:
    "Remove audio from any video file for free. Strip the sound track from MP4, WebM, or MOV files — all processing happens locally in your browser.",
  path: "remove-audio-from-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="remove-audio-from-video"
      h1="Remove Audio from Video"
      appName="Remove Audio from Video"
      lede="Strip the audio track from any video file instantly. Works with MP4, WebM, and MOV — no upload needed, everything runs in your browser."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Click Remove Audio to strip the audio track.",
        "Download the silent video.",
      ]}
      faqs={[
        {
          q: "Does removing audio re-encode the video?",
          a: "No — the tool uses stream copy mode which simply discards the audio stream without touching the video. Quality and file size changes are minimal.",
        },
        {
          q: "What formats are supported?",
          a: "MP4, WebM, and MOV are supported. The output keeps the same video format as the input.",
        },
        {
          q: "Is this tool free and private?",
          a: "Yes. Processing uses ffmpeg.wasm running entirely in your browser. Nothing is uploaded to any server.",
        },
      ]}
      related={[
        { href: "/mute-video", label: "Mute video" },
        { href: "/video-to-mp3", label: "Extract audio from video" },
        { href: "/trim-video", label: "Trim video" },
        { href: "/compress-video", label: "Compress video" },
      ]}
    >
      <VideoMuteTool />
    </ToolPage>
  );
}
