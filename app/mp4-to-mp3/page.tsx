import type { Metadata } from "next";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "MP4 to MP3 Converter — extract audio from video free",
  description:
    "Convert MP4 video to MP3 audio online for free. Extract the audio track from any MP4 file right in your browser — no upload, no account needed.",
  path: "mp4-to-mp3",
});

export default function Page() {
  return (
    <ToolPage
      slug="mp4-to-mp3"
      h1="MP4 to MP3"
      appName="MP4 to MP3 Converter"
      lede="Extract the audio track from an MP4 video and save it as an MP3 file. Runs entirely in your browser — your video is never uploaded."
      steps={[
        "Drop or select an MP4 file.",
        "MP3 is pre-selected as the output format.",
        "Click Convert and wait for processing.",
        "Download the MP3 file.",
      ]}
      faqs={[
        {
          q: "Does this work with all MP4 files?",
          a: "Yes — any MP4 that contains an audio track (AAC, AC3, MP3, etc.) can be converted to MP3.",
        },
        {
          q: "Will I lose audio quality?",
          a: "MP3 is a lossy format, so there will be minor quality reduction from the original. For lossless output, use the Audio Converter and choose WAV or FLAC.",
        },
        {
          q: "Is my video file uploaded?",
          a: "No. Everything runs locally in your browser using WebAssembly. Your MP4 file never leaves your device.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/wav-to-mp3", label: "WAV to MP3" },
        { href: "/m4a-to-mp3", label: "M4A to MP3" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <AudioConverterTool defaultOutputFormat="mp3" acceptedInputs={["mp4"]} />
    </ToolPage>
  );
}
