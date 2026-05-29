import type { Metadata } from "next";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { ConversionHubSeoContent } from "@/components/ConversionSeoContent";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Audio Converter — MP3, WAV, OGG, FLAC & more free online",
  description:
    "Convert audio and extract audio from video in your browser. MP3, WAV, OGG, M4A, FLAC, AAC — valid outputs depend on your input file.",
  path: "convert-audio",
});

export default function Page() {
  return (
    <ToolPage
      slug="convert-audio"
      h1="Audio Converter"
      appName="Audio Converter"
      lede="Convert between audio formats or extract audio from video. Output options are limited to compatible formats for your input."
      steps={[
        "Choose input and output formats.",
        "Drop an audio or video file.",
        "Convert or extract, then download.",
      ]}
      body={<ConversionHubSeoContent media="audio" />}
      faqs={[
        {
          q: "Can I extract audio from video here?",
          a: "Yes — drop MP4, WebM, MOV, or other video files. The converter strips the video track and saves audio only.",
        },
        {
          q: "Are files uploaded?",
          a: "No. ffmpeg.wasm runs locally in your browser.",
        },
      ]}
      related={[
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/video-to-mp3", label: "Video to MP3" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <AudioConverterTool />
    </ToolPage>
  );
}
