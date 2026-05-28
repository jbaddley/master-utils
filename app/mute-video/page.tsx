import type { Metadata } from "next";
import VideoMuteTool from "@/features/video/VideoMuteTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Mute Video — remove audio from video free online",
  description:
    "Strip the audio track from any video in seconds. No re-encoding — the video quality stays exactly the same. Free, private, runs in your browser.",
  path: "mute-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="mute-video"
      h1="Mute Video"
      appName="Video Muter"
      lede="Strip the audio track from any video in seconds. No re-encoding — the video quality is unchanged."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, MKV, or OGG).",
        "Click Remove Audio and wait a moment while the audio track is stripped.",
        "Download your muted video.",
      ]}
      faqs={[
        {
          q: "Will the video quality change?",
          a: "No — the tool uses stream copy mode which simply removes the audio track without touching the video stream. There is zero quality loss and processing is near-instant.",
        },
        {
          q: "What formats are supported?",
          a: "MP4, WebM, MOV, AVI, MKV, and OGG are all supported. The output file keeps the same container format as your input.",
        },
        {
          q: "Why would I want to mute a video?",
          a: "Common reasons include removing background noise or unwanted speech before sharing, replacing the audio track with music, creating silent loops for websites, or stripping copyrighted music to avoid content ID issues.",
        },
        {
          q: "Are my files private?",
          a: "Yes — all processing uses WebAssembly running locally in your browser. Your video is never sent to any server.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim video" },
        { href: "/video-thumbnail-generator", label: "Video thumbnail generator" },
        { href: "/video-to-mp3", label: "Video to MP3" },
      ]}
      showAds
    >
      <VideoMuteTool />
    </ToolPage>
  );
}
