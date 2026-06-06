import type { Metadata } from "next";
import AudioProcessorTool from "@/features/audio/AudioProcessorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Normalize Audio Volume — free online audio normalizer",
  description:
    "Normalize audio volume to -14 LUFS (YouTube/Spotify standard) in your browser. Free, private, no upload required.",
  path: "normalize-audio",
});

export default function Page() {
  return (
    <ToolPage
      slug="normalize-audio"
      h1="Normalize Audio Volume"
      appName="Audio Normalizer"
      lede="Balance audio levels to the industry standard (-14 LUFS) for YouTube, Spotify, and podcasts. No software needed — runs entirely in your browser."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Click Normalize to apply the -14 LUFS loudness standard.",
        "Download the normalized file once processing is complete.",
      ]}
      faqs={[
        {
          q: "What is LUFS and why does it matter?",
          a: "LUFS (Loudness Units relative to Full Scale) is the standard measurement for perceived audio loudness. Streaming platforms like YouTube, Spotify, and Apple Music normalize audio to around -14 LUFS to ensure a consistent listening experience across all content.",
        },
        {
          q: "Why should I normalize my audio?",
          a: "Normalizing ensures your audio plays at a consistent, comfortable volume. Without normalization, videos or podcasts may be too quiet or too loud compared to other content on the same platform, leading to a poor listener experience.",
        },
        {
          q: "Which audio formats are supported?",
          a: "You can normalize MP3, WAV, OGG, M4A, FLAC, and AAC files. The output keeps the same format as your input file, so there is no quality loss from format conversion.",
        },
        {
          q: "Are my audio files uploaded to a server?",
          a: "No. All processing is done locally in your browser using WebAssembly (ffmpeg.wasm). Your files are not uploaded to Utilio servers for this tool.",
        },
      ]}
      related={[
        { href: "/convert-audio", label: "Audio Converter" },
        { href: "/trim-audio", label: "Trim Audio" },
        { href: "/remove-silence-from-audio", label: "Remove Silence from Audio" },
      ]}
    >
      <AudioProcessorTool mode="normalize" />
    </ToolPage>
  );
}
