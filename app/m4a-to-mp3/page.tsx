import type { Metadata } from "next";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "M4A to MP3 Converter — convert Apple audio free online",
  description:
    "Convert M4A files to MP3 online for free. Works entirely in your browser — no upload, no account, no software to install.",
  path: "m4a-to-mp3",
});

export default function Page() {
  return (
    <ToolPage
      slug="m4a-to-mp3"
      h1="M4A to MP3"
      appName="M4A to MP3 Converter"
      lede="Convert M4A (Apple AAC) audio files to the universally compatible MP3 format. All conversion happens locally in your browser."
      steps={[
        "Drop or select an M4A file.",
        "MP3 is pre-selected as the output format.",
        "Click Convert and wait for ffmpeg.wasm to finish.",
        "Download the converted MP3.",
      ]}
      faqs={[
        {
          q: "Why convert M4A to MP3?",
          a: "M4A files use Apple's container format and may not play on all devices or media players. MP3 is supported virtually everywhere.",
        },
        {
          q: "Is there any quality loss?",
          a: "Both M4A (AAC) and MP3 are lossy formats, so converting between them involves a second compression step. For lossless output, use the Audio Converter and choose WAV.",
        },
        {
          q: "Are my files private?",
          a: "Yes — all processing uses WebAssembly running locally in your browser. Your M4A files are never uploaded to any server.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/wav-to-mp3", label: "WAV to MP3" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <AudioConverterTool defaultOutputFormat="mp3" acceptedInputs={["m4a"]} />
    </ToolPage>
  );
}
