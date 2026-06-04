import type { Metadata } from "next";
import AudioPitchSpeedTool from "@/features/audio/AudioPitchSpeedTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Audio Pitch and Speed Changer — transpose key & tempo free online",
  description:
    "Change audio pitch and speed independently with live key and BPM hints. Free browser tool — waveform preview, no upload to servers.",
  path: "audio-pitch-and-speed",
});

export default function Page() {
  return (
    <ToolPage
      slug="audio-pitch-and-speed"
      h1="Audio Pitch and Speed Changer"
      appName="Pitch & Speed"
      lede="Upload a song and adjust pitch and tempo on one screen. Detects musical key and BPM, shows a waveform, and exports your mix — all locally in your browser."
      steps={[
        "Drop or browse for an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Use the Pitch slider to transpose up or down; toggle semitones for whole-step snapping.",
        "Use the Speed slider to slow down or speed up without re-uploading.",
        "Preview with play, pick an output format, and click Save.",
      ]}
      faqs={[
        {
          q: "Can I change pitch and speed at the same time?",
          a: "Yes. Pitch and speed are applied independently — pitch shifts transpose the audio while speed adjusts tempo. Key and BPM readouts update to reflect your settings.",
        },
        {
          q: "How accurate are the key and BPM detections?",
          a: "They are estimates based on your file’s audio content. Complex mixes or live recordings may be harder to analyze; use the readouts as a helpful guide rather than studio-grade analysis.",
        },
        {
          q: "Does my audio leave my device?",
          a: "No. Analysis, preview processing, and export all run locally with WebAssembly ffmpeg in your browser.",
        },
        {
          q: "What pitch and speed ranges are supported?",
          a: "Pitch from −12 to +12 semitones (toggle semitones for whole steps). Speed from 0.5× to 2.0×.",
        },
      ]}
      related={[
        { href: "/convert-audio", label: "Audio Converter" },
        { href: "/change-audio-pitch", label: "Change Audio Pitch" },
        { href: "/change-audio-speed", label: "Change Audio Speed" },
        { href: "/trim-audio", label: "Trim Audio" },
      ]}
    >
      <AudioPitchSpeedTool />
    </ToolPage>
  );
}
