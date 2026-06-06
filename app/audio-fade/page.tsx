import type { Metadata } from "next";
import AudioEffectsTool from "@/features/audio/AudioEffectsTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Audio Fade In/Out — add fade effects to audio free",
  description:
    "Add fade in and fade out effects to any audio file free online. Customize fade duration and download instantly. Runs in your browser.",
  path: "audio-fade",
});

export default function Page() {
  return (
    <ToolPage
      slug="audio-fade"
      h1="Audio Fade In/Out"
      appName="Audio Fade Tool"
      lede="Add smooth fade in and fade out effects to any audio file. Set the duration for each fade and download instantly — runs in your browser — free for single-file use."
      steps={[
        "Drop or select an audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).",
        "Set the fade in duration (seconds from the start).",
        "Set the fade out duration (seconds fading to the end).",
        "Click Apply Fade and download the processed file.",
      ]}
      faqs={[
        {
          q: "How does the fade out work if I don't know the file duration?",
          a: "The fade out is applied to the very end of the audio regardless of length. ffmpeg handles the end-of-file timing automatically, so no duration information is needed.",
        },
        {
          q: "What fade duration should I use?",
          a: "For music, 2–3 seconds is typical for fade in and 3–5 seconds for fade out. For speech or podcasts, shorter fades of 0.5–1 second work well.",
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
        { href: "/trim-audio", label: "Trim Audio" },
        { href: "/change-audio-speed", label: "Change Audio Speed" },
        { href: "/change-audio-pitch", label: "Change Audio Pitch" },
      ]}
    >
      <AudioEffectsTool mode="fade" />
    </ToolPage>
  );
}
