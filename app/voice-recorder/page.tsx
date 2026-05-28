import type { Metadata } from "next";
import AudioRecorderTool from "@/features/audio/AudioRecorderTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Voice Recorder — record audio online free, no install",
  description:
    "Record voice or audio directly in your browser for free. No app or installation required — uses your microphone and saves as WebM.",
  path: "voice-recorder",
});

export default function Page() {
  return (
    <ToolPage
      slug="voice-recorder"
      h1="Voice Recorder"
      appName="Voice Recorder"
      lede="Record audio directly in your browser using your microphone. No app to install — press record, speak, stop, and download your recording as a WebM audio file."
      steps={[
        "Click Start Recording and allow microphone access when prompted.",
        "Speak or record whatever audio you need.",
        "Click Stop Recording when done.",
        "Preview the recording and download as .webm.",
      ]}
      faqs={[
        {
          q: "What format is the recording saved as?",
          a: "Recordings are saved as WebM with Opus audio codec, which provides excellent quality at small file sizes. WebM is supported in all modern browsers.",
        },
        {
          q: "Is my recording uploaded anywhere?",
          a: "No. The recording is created entirely in your browser using the MediaRecorder API. No audio data is sent to any server.",
        },
        {
          q: "Why do I need to allow microphone access?",
          a: "The browser requires explicit permission before any website can access your microphone. You can revoke this permission at any time in your browser settings.",
        },
      ]}
      related={[
        { href: "/online-voice-recorder", label: "Online voice recorder" },
        { href: "/audio-converter", label: "Audio converter" },
        { href: "/trim-audio", label: "Trim audio" },
        { href: "/merge-audio", label: "Merge audio files" },
      ]}
    >
      <AudioRecorderTool />
    </ToolPage>
  );
}
