import type { Metadata } from "next";
import AudioEffectsTool from "@/features/audio/AudioEffectsTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Change Audio Speed — speed up or slow down MP3 free",
  description:
    "Change the playback speed of any audio file online for free. Speed up or slow down MP3, WAV, OGG and more — all in your browser.",
  path: "change-audio-speed",
});

export default function Page() {
  return (
    <ToolPage
      slug="change-audio-speed"
      h1="Change Audio Speed"
      appName="Audio Speed Changer"
      lede="Speed up or slow down any audio file without changing the pitch. Adjust from 0.5x to 2.0x — all processing happens in your browser using ffmpeg.wasm."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Drag the speed slider to set a value between 0.5x and 2.0x.",
        "Click Apply Speed to process the audio.",
        "Download the speed-adjusted audio.",
      ]}
      faqs={[
        {
          q: "Does changing speed affect pitch?",
          a: "No — the tool uses the atempo filter which changes playback speed while preserving the original pitch. The audio sounds natural at any speed.",
        },
        {
          q: "What speed range is supported?",
          a: "The slider supports 0.5x to 2.0x. The atempo filter technically supports values in this range natively; for speeds above 2.0x, two filters are chained automatically.",
        },
        {
          q: "Does the output format change?",
          a: "No — the output keeps the same format as the input. An MP3 in produces an MP3 out.",
        },
      ]}
      related={[
        { href: "/change-audio-pitch", label: "Change audio pitch" },
        { href: "/audio-fade", label: "Audio fade in/out" },
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/audio-converter", label: "Audio converter" },
      ]}
    >
      <AudioEffectsTool mode="speed" />
    </ToolPage>
  );
}
