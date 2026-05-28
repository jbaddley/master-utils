import type { Metadata } from "next";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Audio Converter — convert MP3, WAV, OGG, FLAC & more free",
  description:
    "Free online audio converter. Convert MP3, WAV, OGG, M4A, FLAC and AAC files in your browser — fast, private, no upload required.",
  path: "audio-converter",
});

export default function Page() {
  return (
    <ToolPage
      slug="audio-converter"
      h1="Audio Converter"
      appName="Audio Converter"
      lede="Convert audio files between MP3, WAV, OGG, M4A, FLAC and AAC formats. Processing happens entirely in your browser — your files never leave your device."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, AAC, or MP4).",
        "Choose the output format from the dropdown.",
        "Click Convert and wait for processing to finish.",
        "Download the converted file.",
      ]}
      faqs={[
        {
          q: "Which audio formats are supported?",
          a: "You can convert between MP3, WAV, OGG, M4A, FLAC, and AAC. MP4 files with audio tracks are also accepted as input.",
        },
        {
          q: "Will the audio quality be affected?",
          a: "Converting between lossy formats (like MP3 to AAC) may involve a small quality reduction. Converting to WAV or FLAC produces lossless output from the source audio stream.",
        },
        {
          q: "Why does it take a moment on first use?",
          a: "The converter uses ffmpeg.wasm, which is downloaded once from a CDN and then cached in your browser. Subsequent conversions start immediately.",
        },
        {
          q: "Are my audio files uploaded anywhere?",
          a: "No. All conversion is done locally using WebAssembly in your browser. Your files never leave your device.",
        },
      ]}
      related={[
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/wav-to-mp3", label: "WAV to MP3" },
        { href: "/ogg-to-mp3", label: "OGG to MP3" },
        { href: "/m4a-to-mp3", label: "M4A to MP3" },
        { href: "/mp3-to-wav", label: "MP3 to WAV" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <AudioConverterTool />
    </ToolPage>
  );
}
