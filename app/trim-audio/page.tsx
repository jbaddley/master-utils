import type { Metadata } from "next";
import AudioTrimTool from "@/features/audio/AudioTrimTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Trim Audio Online — cut MP3, WAV & more free",
  description:
    "Trim or cut any audio file online for free. Set a start and end time to extract a clip from MP3, WAV, OGG, M4A, FLAC or AAC — all in your browser.",
  path: "trim-audio",
});

export default function Page() {
  return (
    <ToolPage
      slug="trim-audio"
      h1="Trim Audio"
      appName="Audio Trimmer"
      lede="Cut audio files to a precise start and end time. Works with MP3, WAV, OGG, M4A, FLAC, AAC, and MP4 — processing happens entirely in your browser."
      steps={[
        "Drop or select an audio file.",
        "Enter a start time (e.g. 0:30 or 30 seconds) and an end time (e.g. 1:45).",
        "Leave the end time blank to trim to the end of the file.",
        "Click Trim and download the clipped audio.",
      ]}
      faqs={[
        {
          q: "What time formats are accepted?",
          a: "You can enter times as MM:SS (e.g. 1:30), HH:MM:SS (e.g. 0:01:30), or plain seconds (e.g. 90). All formats refer to the same point in the audio.",
        },
        {
          q: "Will trimming reduce audio quality?",
          a: "No — the trimmer uses stream copy mode (-c copy) which cuts the file without re-encoding the audio, so there is no quality loss.",
        },
        {
          q: "What formats are supported?",
          a: "MP3, WAV, OGG, M4A, FLAC, AAC, and MP4 are all supported for trimming. The output keeps the same format as the input.",
        },
        {
          q: "Are my files private?",
          a: "Yes — all trimming uses WebAssembly running locally in your browser. Your audio files are never uploaded to any server.",
        },
      ]}
      related={[
        { href: "/convert-audio", label: "Audio converter" },
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/wav-to-mp3", label: "WAV to MP3" },
        { href: "/mp3-to-wav", label: "MP3 to WAV" },
      ]}
    >
      <AudioTrimTool />
    </ToolPage>
  );
}
