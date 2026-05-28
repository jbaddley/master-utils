import type { Metadata } from "next";
import AudioEffectsTool from "@/features/audio/AudioEffectsTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Audio Fade In / Fade Out — add fades to MP3, WAV free",
  description:
    "Add fade in and fade out effects to audio files online for free. Works with MP3, WAV, OGG, FLAC and more — all in your browser.",
  path: "audio-fade",
});

export default function Page() {
  return (
    <ToolPage
      slug="audio-fade"
      h1="Audio Fade In / Fade Out"
      appName="Audio Fade"
      lede="Add fade-in and fade-out effects to any audio file. Set the duration of each fade in seconds — all processing happens in your browser using ffmpeg.wasm."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Set the fade-in duration (0 for none) and fade-out duration (0 for none).",
        "Click Apply Fade to process the audio.",
        "Download the faded audio file.",
      ]}
      faqs={[
        {
          q: "Can I apply just a fade in without a fade out?",
          a: "Yes — set the fade-out duration to 0 to apply only a fade in, or set fade-in to 0 for only a fade out.",
        },
        {
          q: "What is the maximum fade duration?",
          a: "The input accepts values from 0 to 10 seconds. For longer fades on longer files, you can type a custom value directly.",
        },
        {
          q: "Does the output format change?",
          a: "No — the output keeps the same format as the input file. An MP3 input produces an MP3 output.",
        },
      ]}
      related={[
        { href: "/change-audio-speed", label: "Change audio speed" },
        { href: "/change-audio-pitch", label: "Change audio pitch" },
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/normalize-audio", label: "Normalize audio" },
      ]}
    >
      <AudioEffectsTool mode="fade" />
    </ToolPage>
  );
}
