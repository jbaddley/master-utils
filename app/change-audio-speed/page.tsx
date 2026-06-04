import type { Metadata } from "next";
import AudioEffectsTool from "@/features/audio/AudioEffectsTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Change Audio Speed — speed up or slow down audio free",
  description:
    "Speed up or slow down any audio file free online. Adjust playback speed from 0.5× to 2.0× without changing pitch. Runs in your browser.",
  path: "change-audio-speed",
});

export default function Page() {
  return (
    <ToolPage
      slug="change-audio-speed"
      h1="Change Audio Speed"
      appName="Audio Speed Changer"
      lede="Speed up or slow down any audio file without changing the pitch. Adjust from 0.5× to 2.0× — completely free, runs in your browser."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Drag the speed slider to your desired playback rate.",
        "Click Apply Speed and wait for processing to finish.",
        "Download the processed audio file.",
      ]}
      faqs={[
        {
          q: "Will the pitch change when I speed up or slow down audio?",
          a: "No. This tool uses the atempo filter which time-stretches audio while preserving the original pitch.",
        },
        {
          q: "What speed range is supported?",
          a: "You can adjust speed from 0.5× (half speed) to 2.0× (double speed). Speeds outside this range are not supported by the underlying filter.",
        },
        {
          q: "Which audio formats are accepted?",
          a: "MP3, WAV, OGG, M4A, FLAC, and AAC. The output is saved in the same format as the input.",
        },
        {
          q: "Is my audio file uploaded anywhere?",
          a: "No. All processing happens locally in your browser using WebAssembly. Your files never leave your device.",
        },
      ]}
      related={[
        { href: "/convert-audio", label: "Audio Converter" },
        { href: "/audio-pitch-and-speed", label: "Pitch & Speed Changer" },
        { href: "/trim-audio", label: "Trim Audio" },
        { href: "/audio-fade", label: "Audio Fade In/Out" },
        { href: "/change-audio-pitch", label: "Change Audio Pitch" },
      ]}
    >
      <AudioEffectsTool mode="speed" />
    </ToolPage>
  );
}
