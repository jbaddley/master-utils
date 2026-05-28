import type { Metadata } from "next";
import VideoToMp3Tool from "@/features/video/VideoToMp3Tool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video to MP3 — extract audio from any video free",
  description:
    "Extract the audio track from any video as MP3, WAV, AAC, OGG, or FLAC. Completely private — runs in your browser.",
  path: "video-to-mp3",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-to-mp3"
      h1="Video to MP3"
      appName="Video to MP3 Converter"
      lede="Extract the audio track from any video as MP3, WAV, AAC, OGG, or FLAC. Completely private — runs in your browser."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV, AVI, MKV, OGG, or M4V).",
        "Choose your desired audio output format from the dropdown.",
        "Click Extract Audio and wait for processing to finish.",
        "Download the extracted audio file.",
      ]}
      faqs={[
        {
          q: "Which video formats are supported?",
          a: "You can extract audio from MP4, WebM, MOV, AVI, MKV, OGG, and M4V files. Any video with an audio track will work.",
        },
        {
          q: "What audio formats can I save to?",
          a: "You can save the extracted audio as MP3, WAV, AAC (M4A), OGG, or FLAC. MP3 is the most compatible choice; WAV and FLAC are lossless.",
        },
        {
          q: "Is my video file uploaded to a server?",
          a: "No. All processing happens locally in your browser using WebAssembly (ffmpeg.wasm). Your video never leaves your device.",
        },
        {
          q: "Will the audio quality match the original?",
          a: "When saving to WAV or FLAC the audio is decoded losslessly from the video. MP3, AAC, and OGG are re-encoded, which involves a small quality reduction compared to the original stream.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio Converter" },
        { href: "/trim-audio", label: "Trim Audio" },
        { href: "/mute-video", label: "Mute Video" },
      ]}
    >
      <VideoToMp3Tool />
    </ToolPage>
  );
}
