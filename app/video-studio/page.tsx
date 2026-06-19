import type { Metadata } from "next";
import VideoStudio from "@/features/studio/VideoStudio";
import { ToolPage } from "@/components/ToolPage";
import {
  OtherUtilityHubs,
  UtilityHubSections,
} from "@/components/UtilityHubPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video Studio — trim, compress, convert & extract audio in one page",
  description:
    "Drop your video once, then trim, compress, convert, mute, extract audio, generate a GIF, or grab a thumbnail — all in your browser via ffmpeg.wasm.",
  path: "video-studio",
});

export default function VideoStudioPage() {
  return (
    <ToolPage
      wide
      slug="video-studio"
      h1="Video Studio"
      appName="Video Studio"
      lede="Drop your video once and do everything from here — trim clips, compress for sharing, convert formats, mute or extract the audio track, make an animated GIF, or grab a still frame. All processing runs in your browser."
      steps={[
        "Drop or select any video file (MP4, WebM, MOV, AVI, MKV).",
        "Pick a tool from the left rail — trim, compress, convert, mute, extract audio, make a GIF, or grab a thumbnail.",
        "Each edit stacks on the previous one with full undo history. Download when you're done.",
      ]}
      faqs={[
        {
          q: "Does this upload my video anywhere?",
          a: "No. All processing runs in your browser via ffmpeg.wasm — your files never leave your device.",
        },
        {
          q: "Can I chain multiple edits?",
          a: "Yes. Trim first, then compress, then mute — each operation stacks on the previous result with a full undo history.",
        },
        {
          q: "What formats can I convert to?",
          a: "You can convert to MP4 (H.264) or WebM (VP8). MP4 is the most compatible choice for sharing.",
        },
        {
          q: "Why does compression output MP4?",
          a: "The Compress tool uses H.264 + AAC, which produces the best size/quality ratio and is supported on every device.",
        },
        {
          q: "How do I extract a thumbnail?",
          a: "Select the Thumbnail tool, drag the scrubber to your desired frame, then click Extract Frame. The PNG downloads immediately.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim Video" },
        { href: "/compress-video", label: "Compress Video" },
        { href: "/convert-video", label: "Convert Video" },
        { href: "/video-to-gif", label: "Video to GIF" },
        { href: "/mp4-to-mp3", label: "MP4 to MP3" },
        { href: "/audio-studio", label: "Audio Studio" },
      ]}
      afterTool={
        <div className="utility-hub-after-tool">
          <div className="tool-directory-header">
            <h2 className="tool-directory-title">Video utility categories</h2>
          </div>
          <p className="tool-directory-desc">
            Video Studio is the best place to chain edits. Use these links when
            you need a dedicated converter, trimmer, or GIF maker.
          </p>
          <UtilityHubSections groupId="video-studio" />
          <OtherUtilityHubs currentGroupId="video-studio" />
        </div>
      }
    >
      <VideoStudio />
    </ToolPage>
  );
}
