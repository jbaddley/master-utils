import type { Metadata } from "next";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "MP3 to WAV Converter — convert to uncompressed audio free",
  description:
    "Convert MP3 files to uncompressed WAV audio online for free. Ideal for audio editing software that requires WAV input — runs entirely in your browser.",
  path: "mp3-to-wav",
});

export default function Page() {
  return (
    <ToolPage
      slug="mp3-to-wav"
      h1="MP3 to WAV"
      appName="MP3 to WAV Converter"
      lede="Convert MP3 audio to uncompressed WAV format for use in audio editing software, DAWs, and other tools that need a lossless container. Processing runs locally in your browser."
      steps={[
        "Drop or select an MP3 file.",
        "WAV is pre-selected as the output format.",
        "Click Convert and wait for processing to complete.",
        "Download the WAV file.",
      ]}
      faqs={[
        {
          q: "Why convert MP3 to WAV?",
          a: "Audio editing tools like Audacity, Adobe Audition, and DAWs often work better with uncompressed WAV files. Converting to WAV avoids repeated lossy re-encoding.",
        },
        {
          q: "Will converting MP3 to WAV improve the quality?",
          a: "No — converting from lossy MP3 to WAV does not restore the detail lost during original MP3 encoding. The WAV file will simply be an uncompressed copy of the MP3 audio.",
        },
        {
          q: "Are my files private?",
          a: "Yes — all conversion happens locally in your browser using WebAssembly. Your MP3 files are never uploaded to any server.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/wav-to-mp3", label: "WAV to MP3" },
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/trim-audio", label: "Trim audio" },
      ]}
    >
      <AudioConverterTool defaultOutputFormat="wav" acceptedInputs={["mp3"]} />
    </ToolPage>
  );
}
