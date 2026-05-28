import type { Metadata } from "next";
import AudioRecorderTool from "@/features/audio/AudioRecorderTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Online Voice Recorder — free, no login, no install",
  description:
    "Record your voice online for free with no login or installation. Works in any modern browser — download recordings as WebM audio instantly.",
  path: "online-voice-recorder",
});

export default function Page() {
  return (
    <ToolPage
      slug="online-voice-recorder"
      h1="Online Voice Recorder"
      appName="Online Voice Recorder"
      lede="Record audio from your microphone directly in the browser. Free, instant, no account needed — just click record and start speaking."
      steps={[
        "Click Start Recording and grant microphone permission.",
        "Record your voice or audio.",
        "Click Stop when finished.",
        "Listen back in the preview player, then download as .webm.",
      ]}
      faqs={[
        {
          q: "Do I need an account to use this?",
          a: "No account, login, or installation required. The recorder works entirely in your browser.",
        },
        {
          q: "How long can I record?",
          a: "There is no time limit imposed by this tool. Recording length is limited only by your device's available memory.",
        },
        {
          q: "Can I convert the WebM file to MP3?",
          a: "Yes — after downloading your WebM recording, use the Audio Converter tool on this site to convert it to MP3, WAV, or any other format.",
        },
      ]}
      related={[
        { href: "/voice-recorder", label: "Voice recorder" },
        { href: "/audio-converter", label: "Convert WebM to MP3" },
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/merge-audio", label: "Merge audio files" },
      ]}
    >
      <AudioRecorderTool />
    </ToolPage>
  );
}
