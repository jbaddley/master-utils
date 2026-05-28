import type { Metadata } from "next";
import AudioRecorderTool from "@/features/audio/AudioRecorderTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Online Voice Recorder — record audio in your browser free",
  description:
    "Free online voice recorder. Record audio in your browser, preview it, and download — no software installation, no account, 100% private.",
  path: "online-voice-recorder",
});

export default function Page() {
  return (
    <ToolPage
      slug="online-voice-recorder"
      h1="Online Voice Recorder"
      appName="Online Voice Recorder"
      lede="Record high-quality audio directly in your browser without installing any software. Your recordings stay on your device — completely private."
      steps={[
        "Click the record button and grant microphone access when prompted.",
        "Record your audio — voice memo, podcast draft, meeting note.",
        "Click Stop when done and preview your recording.",
        "Download the audio file.",
      ]}
      faqs={[
        {
          q: "Do I need to install anything?",
          a: "No. This tool uses the browser's built-in recording capability (MediaRecorder API). It works in Chrome, Firefox, and Edge without any plugins.",
        },
        {
          q: "What audio quality does the recorder produce?",
          a: "Recordings use Opus codec in WebM container, which provides excellent quality at low file sizes — comparable to MP3 at 128 kbps but more efficient.",
        },
        {
          q: "Can I convert the recording to MP3?",
          a: "Yes — download the WebM file and use our Audio Converter to convert it to MP3, WAV, or any other format.",
        },
        {
          q: "Is my audio stored on your servers?",
          a: "No. Everything happens locally in your browser. The recording never leaves your device.",
        },
      ]}
      related={[
        { href: "/voice-recorder", label: "Voice recorder" },
        { href: "/audio-converter", label: "Convert to MP3" },
        { href: "/trim-audio", label: "Trim recording" },
        { href: "/normalize-audio", label: "Normalize volume" },
      ]}
      showAds
    >
      <AudioRecorderTool />
    </ToolPage>
  );
}
