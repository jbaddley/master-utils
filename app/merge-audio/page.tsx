import type { Metadata } from "next";
import AudioMergeTool from "@/features/audio/AudioMergeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Merge Audio — join multiple audio files into one free",
  description:
    "Combine multiple MP3, WAV, OGG, or FLAC files into a single audio file. Free, browser-based — your files never leave your device.",
  path: "merge-audio",
});

export default function Page() {
  return (
    <ToolPage
      slug="merge-audio"
      h1="Merge Audio Files"
      appName="Audio Merger"
      lede="Join multiple audio files into one. Add your files in the order you want them joined, pick an output format, and download the merged result."
      steps={[
        "Click Add audio files or drop multiple files onto the list.",
        "Arrange the files — they will be merged in the order shown.",
        "Choose an output format (MP3, WAV, OGG, FLAC).",
        "Click Merge Audio and download the result.",
      ]}
      faqs={[
        {
          q: "Can I merge files in different formats?",
          a: "Yes. The tool will re-encode files to your chosen output format when the input formats differ. For fastest merging, use the same format for all inputs and select that format as output — this enables lossless stream copy.",
        },
        {
          q: "Is there a limit on how many files I can merge?",
          a: "No hard limit, but merging many large files requires significant browser memory. For large batches (10+ files), consider merging in groups.",
        },
        {
          q: "Will the quality degrade when merging?",
          a: "If all input files are the same format as the output, the tool uses stream copy — no re-encoding and no quality loss. When formats differ, re-encoding is required but uses high-quality settings.",
        },
        {
          q: "Are my files uploaded to a server?",
          a: "No. Merging happens entirely in your browser using ffmpeg.wasm. Your audio files never leave your device.",
        },
      ]}
      related={[
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/audio-converter", label: "Convert audio format" },
        { href: "/audio-fade", label: "Add fade in/out" },
        { href: "/normalize-audio", label: "Normalize volume" },
      ]}
      showAds
    >
      <AudioMergeTool />
    </ToolPage>
  );
}
