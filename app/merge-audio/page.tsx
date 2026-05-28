import type { Metadata } from "next";
import AudioMergeTool from "@/features/audio/AudioMergeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Merge Audio Files — join MP3, WAV, OGG online free",
  description:
    "Merge and concatenate multiple audio files into one online for free. Join MP3, WAV, OGG, M4A, FLAC or AAC files in your browser — no upload required.",
  path: "merge-audio",
});

export default function Page() {
  return (
    <ToolPage
      slug="merge-audio"
      h1="Merge Audio Files"
      appName="Audio Merger"
      lede="Combine multiple audio files into one by concatenating them in order. Works with MP3, WAV, OGG, M4A, FLAC, and AAC — all processing happens in your browser."
      steps={[
        "Drop or click to select multiple audio files.",
        "Review the list — files will be joined in the order shown.",
        "Click Merge Files to concatenate them.",
        "Download the merged audio file.",
      ]}
      faqs={[
        {
          q: "What formats can be merged?",
          a: "MP3, WAV, OGG, M4A, FLAC, and AAC are all supported. For best results, merge files of the same format and encoding.",
        },
        {
          q: "Does merging re-encode the audio?",
          a: "No — the merger uses stream copy mode (-c copy) which joins files without re-encoding. This means no quality loss and fast processing.",
        },
        {
          q: "What determines the output format?",
          a: "The output format matches the first file in the list. Add all your files, then download the merged result.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/change-audio-speed", label: "Change audio speed" },
        { href: "/audio-fade", label: "Audio fade in/out" },
      ]}
    >
      <AudioMergeTool />
    </ToolPage>
  );
}
