import type { Metadata } from "next";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "OGG to MP3 Converter — convert Vorbis audio free online",
  description:
    "Convert OGG Vorbis files to MP3 online for free. Works entirely in your browser using WebAssembly — no upload required.",
  path: "ogg-to-mp3",
});

export default function Page() {
  return (
    <ToolPage
      slug="ogg-to-mp3"
      h1="OGG to MP3"
      appName="OGG to MP3 Converter"
      lede="Convert OGG Vorbis audio to MP3 for maximum device compatibility. All processing is done locally in your browser."
      steps={[
        "Drop or select an OGG file.",
        "MP3 is pre-selected as the output format.",
        "Click Convert and wait for processing to complete.",
        "Download the MP3 file.",
      ]}
      faqs={[
        {
          q: "Why convert OGG to MP3?",
          a: "OGG Vorbis has excellent quality but is not supported by all devices and platforms. MP3 is the most universally compatible audio format.",
        },
        {
          q: "Will the conversion affect audio quality?",
          a: "Since both OGG and MP3 are lossy formats, converting between them involves a second round of compression. Keep the source OGG file if you need the best quality.",
        },
        {
          q: "Are my files private?",
          a: "Yes — conversion uses WebAssembly running in your browser. Your OGG files are never uploaded to any server.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/wav-to-mp3", label: "WAV to MP3" },
        { href: "/m4a-to-mp3", label: "M4A to MP3" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <AudioConverterTool defaultOutputFormat="mp3" acceptedInputs={["ogg"]} />
    </ToolPage>
  );
}
