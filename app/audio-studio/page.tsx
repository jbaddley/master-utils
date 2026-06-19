import type { Metadata } from "next";
import AudioStudio from "@/features/studio/AudioStudio";
import { ToolPage } from "@/components/ToolPage";
import {
  OtherUtilityHubs,
  UtilityHubSections,
} from "@/components/UtilityHubPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Audio Studio — trim, fade, mix lanes & convert in one page",
  description:
    "Drop your audio once, then trim with drag handles, add fades, change speed or pitch, mix tracks on lanes with crossfade, normalize, remove silence, and export — all in your browser.",
  path: "audio-studio",
});

export default function Page() {
  return (
    <ToolPage
      wide
      slug="audio-studio"
      h1="Audio Studio"
      appName="Audio Studio"
      lede="Drop your audio once and edit it like a timeline — trim with drag handles, fade in or out, mix two tracks on lanes with crossfade, normalize, and export. Video files are supported: audio is extracted automatically."
      steps={[
        "Drop or select any audio file (MP3, WAV, OGG, M4A, FLAC, AAC) or video (MP4, WebM, MOV) to extract audio.",
        "Pick tools from the left rail — each edit applies to your audio and stacks on the previous one, with full undo.",
        "Use Lanes to place a second track on lane 2, drag it to set timing, and crossfade where they overlap.",
        "Choose an output format and download your finished file once.",
      ]}
      faqs={[
        {
          q: "Does this upload my audio anywhere?",
          a: "No. All processing runs in your browser via ffmpeg.wasm — your files never leave your device.",
        },
        {
          q: "Can I extract audio from a video?",
          a: "Yes. Drop any MP4, WebM, MOV, AVI, or MKV file and the studio extracts the audio track automatically on load. You can also add video files to lane 2.",
        },
        {
          q: "How does the lane mixer work?",
          a: "Lane 1 holds your current audio. Add a second file to lane 2 and drag it horizontally to set when it starts. Where the clips overlap, a crossfade blends them smoothly. Click Mix lanes to commit the result.",
        },
        {
          q: "Can I chain multiple edits together?",
          a: "Yes — that's the point. Trim, then fade, then normalize, then export. Every edit stacks on the previous one, and you can undo (Cmd/Ctrl+Z) or jump back to any step in the history panel.",
        },
        {
          q: "How do I trim from the front or back?",
          a: "Select the Trim tool and drag the green handles on the waveform — left handle cuts the start, right handle cuts the end. You can also drag the middle of the selection to move the whole region.",
        },
      ]}
      related={[
        { href: "/voice-recorder", label: "Voice Recorder" },
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/convert-video", label: "Video Converter" },
      ]}
      afterTool={
        <div className="utility-hub-after-tool">
          <div className="tool-directory-header">
            <h2 className="tool-directory-title">Audio utility categories</h2>
          </div>
          <p className="tool-directory-desc">
            Audio Studio is the best place to chain edits. Use these links when
            you need a focused recorder, converter, or audio cleanup path.
          </p>
          <UtilityHubSections groupId="audio-studio" />
          <OtherUtilityHubs currentGroupId="audio-studio" />
        </div>
      }
    >
      <AudioStudio />
    </ToolPage>
  );
}
