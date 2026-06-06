import type { Metadata } from "next";
import VideoMuteTool from "@/features/video/VideoMuteTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Remove Audio from Video — strip sound track free",
  description:
    "Remove the audio track from any video file online for free. Fast stream-copy processing means no quality loss — works with MP4, WebM, MOV, and more.",
  path: "remove-audio-from-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="remove-audio-from-video"
      h1="Remove Audio from Video"
      appName="Remove Audio from Video"
      lede="Permanently delete the sound track from any video file. Uses stream copy — so video quality is never touched and processing takes just seconds."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, MKV, or OGG).",
        "Click Remove Audio to strip the sound track.",
        "Download the silent video — same quality, no audio.",
      ]}
      faqs={[
        {
          q: "Does removing audio affect video quality?",
          a: "No. The tool discards the audio stream and copies the video stream as-is using ffmpeg's stream copy mode. The video bitrate, resolution, and codec are completely unchanged.",
        },
        {
          q: "What file formats can I remove audio from?",
          a: "MP4, WebM, MOV, AVI, MKV, and OGG are supported. The output preserves the same container format as your original file.",
        },
        {
          q: "Will the file size get smaller?",
          a: "Yes — removing the audio track reduces the file size by whatever the audio bitrate contributed. For a typical 128 kbps audio track in a longer video, the saving can be noticeable.",
        },
        {
          q: "Is this tool private?",
          a: "Yes. Processing runs in your browser via WebAssembly. Your video file is not uploaded to Utilio servers for this tool.",
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
