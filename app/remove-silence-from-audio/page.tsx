import type { Metadata } from "next";
import AudioProcessorTool from "@/features/audio/AudioProcessorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Remove Silence from Audio — free silence stripper",
  description:
    "Strip silent gaps from podcasts, lectures, and recordings automatically. Browser-based — free for single files, no upload to Utilio servers.",
  path: "remove-silence-from-audio",
});

export default function Page() {
  return (
    <ToolPage
      slug="remove-silence-from-audio"
      h1="Remove Silence from Audio"
      appName="Audio Silence Remover"
      lede="Automatically strip silent gaps and dead air from your recordings. Perfect for podcasts, lectures, and interviews."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Click Remove Silence to strip silent gaps automatically.",
        "Download the processed file once it is ready.",
      ]}
      faqs={[
        {
          q: "What silence threshold does this tool use?",
          a: "The tool uses a -50 dB threshold with a 0.5-second minimum silence duration. Audio below -50 dB for more than half a second is considered silence and removed. This setting works well for most speech recordings without cutting off natural breathing or brief pauses.",
        },
        {
          q: "What kind of recordings benefit most from silence removal?",
          a: "Podcast episodes, recorded lectures, interview recordings, and voiceover takes all benefit significantly. Removing dead air and long pauses tightens the pacing and makes listening more engaging without manual editing.",
        },
        {
          q: "How does the silence detection work?",
          a: "The tool uses ffmpeg's silenceremove filter, which scans the audio in real time and drops segments that fall below the configured volume threshold for the specified minimum duration. It removes leading silence at the start and strips silent gaps throughout the file.",
        },
        {
          q: "Are my audio files uploaded to a server?",
          a: "No. All processing runs locally in your browser using WebAssembly (ffmpeg.wasm). Your files are not uploaded to Utilio servers for this tool.",
        },
      ]}
      related={[
        { href: "/convert-audio", label: "Audio Converter" },
        { href: "/trim-audio", label: "Trim Audio" },
        { href: "/normalize-audio", label: "Normalize Audio" },
      ]}
    >
      <AudioProcessorTool mode="remove-silence" />
    </ToolPage>
  );
}
