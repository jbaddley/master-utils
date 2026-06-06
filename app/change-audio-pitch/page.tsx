import type { Metadata } from "next";
import AudioEffectsTool from "@/features/audio/AudioEffectsTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Change Audio Pitch — shift pitch up or down free online",
  description:
    "Shift the pitch of any audio file up or down by up to 6 semitones free online. Runs entirely in your browser — no upload needed.",
  path: "change-audio-pitch",
});

export default function Page() {
  return (
    <ToolPage
      slug="change-audio-pitch"
      h1="Change Audio Pitch"
      appName="Audio Pitch Shifter"
      lede="Shift the pitch of any audio file up or down by semitones. Transpose vocals or instruments without expensive software — runs in your browser — free for single-file use."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Drag the pitch slider to the desired semitone shift (−6 to +6).",
        "Click Shift Pitch and wait for processing to finish.",
        "Download the pitch-shifted audio file.",
      ]}
      faqs={[
        {
          q: "Does pitch shifting affect the speed of the audio?",
          a: "Yes, slightly. This tool uses sample-rate resampling which shifts pitch but also affects tempo proportionally. A note is shown in the UI. For tempo-independent pitch shifting, dedicated audio software is needed.",
        },
        {
          q: "How many semitones can I shift?",
          a: "You can shift from −6 semitones (down a tritone) to +6 semitones (up a tritone). That covers a range of a full octave centered on the original pitch.",
        },
        {
          q: "Which audio formats are accepted?",
          a: "MP3, WAV, OGG, M4A, FLAC, and AAC. The output is saved in the same format as the input.",
        },
        {
          q: "Is my audio file uploaded anywhere?",
          a: "No. All processing happens locally in your browser using WebAssembly. For this tool, files are processed in your browser and are not uploaded to Utilio servers.",
        },
      ]}
      related={[
        { href: "/convert-audio", label: "Audio Converter" },
        { href: "/audio-pitch-and-speed", label: "Pitch & Speed Changer" },
        { href: "/change-audio-speed", label: "Change Audio Speed" },
        { href: "/audio-fade", label: "Audio Fade In/Out" },
        { href: "/trim-audio", label: "Trim Audio" },
      ]}
    >
      <AudioEffectsTool mode="pitch" />
    </ToolPage>
  );
}
