import type { Metadata } from "next";
import AudioEffectsTool from "@/features/audio/AudioEffectsTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Change Audio Pitch — raise or lower pitch of MP3 free",
  description:
    "Change the pitch of any audio file online for free. Shift pitch up or down by up to 12 semitones — works with MP3, WAV, OGG and more in your browser.",
  path: "change-audio-pitch",
});

export default function Page() {
  return (
    <ToolPage
      slug="change-audio-pitch"
      h1="Change Audio Pitch"
      appName="Audio Pitch Shifter"
      lede="Raise or lower the pitch of any audio file by up to 12 semitones (one octave). Processing happens entirely in your browser using ffmpeg.wasm."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Drag the pitch slider to raise (+) or lower (-) by semitones.",
        "Click Shift Pitch to process the audio.",
        "Download the pitch-shifted audio.",
      ]}
      faqs={[
        {
          q: "How does pitch shifting work?",
          a: "The tool uses the asetrate + aresample technique: it changes the sample rate to shift pitch, then resamples back to 44100 Hz. This is a simple but effective method for moderate pitch shifts.",
        },
        {
          q: "What is a semitone?",
          a: "A semitone is the smallest interval in Western music — for example, from C to C# is one semitone. 12 semitones equals one full octave.",
        },
        {
          q: "Does pitch shifting change the speed?",
          a: "The asetrate method does slightly alter the playback duration. For perfect time-independent pitch shifting, professional audio software is recommended.",
        },
      ]}
      related={[
        { href: "/change-audio-speed", label: "Change audio speed" },
        { href: "/audio-fade", label: "Audio fade in/out" },
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/audio-converter", label: "Audio converter" },
      ]}
    >
      <AudioEffectsTool mode="pitch" />
    </ToolPage>
  );
}
