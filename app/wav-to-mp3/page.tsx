import type { Metadata } from "next";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "WAV to MP3 Converter — compress audio files free online",
  description:
    "Convert WAV files to MP3 online for free. Shrink uncompressed audio to a smaller MP3 — all processing stays in your browser.",
  path: "wav-to-mp3",
});

export default function Page() {
  return (
    <ToolPage
      slug="wav-to-mp3"
      h1="WAV to MP3"
      appName="WAV to MP3 Converter"
      lede="Convert uncompressed WAV audio to the universally compatible MP3 format. Processing runs locally in your browser — no file uploads."
      steps={[
        "Drop or select a WAV file.",
        "MP3 is pre-selected as the output format.",
        "Click Convert and wait for ffmpeg.wasm to finish.",
        "Download the MP3 file.",
      ]}
      faqs={[
        {
          q: "How much smaller will the MP3 be?",
          a: "MP3 files are typically 8–12× smaller than equivalent WAV files. A 50 MB WAV might compress to around 5 MB as an MP3 with no perceptible quality difference for most listeners.",
        },
        {
          q: "Is there any quality loss?",
          a: "MP3 is lossy, so some detail is removed during encoding. For archival use, the Audio Converter also supports lossless FLAC output.",
        },
        {
          q: "Are my audio files uploaded?",
          a: "No — all conversion happens locally in your browser using WebAssembly. Your WAV file never leaves your device.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/mp3-to-wav", label: "MP3 to WAV" },
        { href: "/ogg-to-mp3", label: "OGG to MP3" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <AudioConverterTool defaultOutputFormat="mp3" acceptedInputs={["wav"]} />
    </ToolPage>
  );
}
