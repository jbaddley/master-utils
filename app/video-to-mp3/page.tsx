import type { Metadata } from "next";
import VideoToMp3Tool from "@/features/video/VideoToMp3Tool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video to MP3 — extract audio from MP4, WebM, MOV free",
  description:
    "Extract audio from any video file online for free. Convert MP4, WebM, MOV, AVI, or MKV to MP3, WAV, AAC, OGG, or FLAC — all in your browser.",
  path: "video-to-mp3",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-to-mp3"
      h1="Video to MP3"
      appName="Video to MP3 Extractor"
      lede="Extract the audio track from any video file and save it as MP3, WAV, AAC, OGG, or FLAC. Works with MP4, WebM, MOV, AVI, and MKV — all in your browser."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, or MKV).",
        "Choose the audio output format (MP3, WAV, AAC, OGG, or FLAC).",
        "Click Extract Audio and wait for processing.",
        "Download the extracted audio file.",
      ]}
      faqs={[
        {
          q: "Which video formats are supported?",
          a: "MP4, WebM, MOV, AVI, and MKV are all supported as input. The audio is extracted without re-encoding the video stream.",
        },
        {
          q: "What audio format should I choose?",
          a: "MP3 is the most compatible and works everywhere. WAV is lossless PCM. FLAC is lossless compressed. AAC and OGG offer good quality at smaller sizes.",
        },
        {
          q: "Are my video files uploaded anywhere?",
          a: "No. Audio extraction uses ffmpeg.wasm running entirely in your browser. Your files never leave your device.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/mute-video", label: "Mute video" },
      ]}
    >
      <VideoToMp3Tool />
    </ToolPage>
  );
}
