import type { Metadata } from "next";
import AudioRecorderTool from "@/features/audio/AudioRecorderTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Voice Recorder — record audio online free, no account needed",
  description:
    "Record audio directly in your browser. Click to record, stop, preview, and download as WebM — free, private, no sign-up required.",
  path: "voice-recorder",
});

export default function Page() {
  return (
    <ToolPage
      slug="voice-recorder"
      h1="Voice Recorder"
      appName="Online Voice Recorder"
      lede="Record your voice or any audio directly in your browser. No app to install, no account needed — just click record and download."
      steps={[
        "Click the red microphone button and allow microphone access.",
        "Speak or play the audio you want to record.",
        "Click the stop button when finished.",
        "Preview the recording and download it.",
      ]}
      faqs={[
        {
          q: "What format is the recording saved in?",
          a: "Recordings are saved as WebM/Opus, which is the native browser recording format. It is supported by most modern editors and players. Use the Audio Converter to convert to MP3 or WAV if needed.",
        },
        {
          q: "Does the recording get uploaded?",
          a: "No. Recording uses the browser's built-in MediaRecorder API — everything stays on your device.",
        },
        {
          q: "Can I record system audio (music, videos playing on screen)?",
          a: "This recorder captures microphone input only. To record system audio, you would need a desktop app like Audacity or OBS.",
        },
        {
          q: "Is there a time limit?",
          a: "No time limit — record as long as you need. Be aware that very long recordings produce large files.",
        },
      ]}
      related={[
        { href: "/audio-converter", label: "Convert recording to MP3" },
        { href: "/trim-audio", label: "Trim your recording" },
        { href: "/normalize-audio", label: "Normalize volume" },
        { href: "/remove-silence-from-audio", label: "Remove silence" },
      ]}
      showAds
    >
      <AudioRecorderTool />
    </ToolPage>
  );
}
