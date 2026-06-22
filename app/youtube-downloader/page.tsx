import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import YouTubeDownloader from "@/features/youtube/YouTubeDownloader";

export const metadata: Metadata = buildMetadata({
  title: "YouTube Downloader — download video, audio, or transcript",
  description:
    "Download YouTube videos (up to 720p), extract audio as M4A, or grab the auto-generated transcript. Set a From/To range to clip a specific segment. Runs in your browser — no sign-in needed.",
  path: "youtube-downloader",
});

export default function Page() {
  return (
    <ToolPage
      slug="youtube-downloader"
      h1="YouTube Downloader"
      appName="YouTube Downloader"
      lede="Download video, audio, or the auto-generated transcript from any YouTube URL. Set a time range to clip exactly the segment you need."
      steps={[
        "Paste a YouTube video URL and click Fetch.",
        "Choose Video, Audio, or Transcript.",
        "Optionally set From and To times to clip a segment.",
        "Click Download (or Fetch Transcript) and save your file.",
      ]}
      faqs={[
        {
          q: "What video quality is available?",
          a: "Up to 720p MP4 using combined video+audio streams. Higher resolutions (1080p+) use separate DASH streams that require server-side merging, which is not yet supported.",
        },
        {
          q: "How does the time range work?",
          a: "The full video or audio stream is downloaded first, then the clip is cut in your browser using ffmpeg — no server processing needed. For short clips from long videos, this means waiting for the full download before the cut.",
        },
        {
          q: "What audio format is downloaded?",
          a: "Audio is saved as M4A (AAC) at the highest available bitrate from YouTube's audio-only stream — typically 128–256kbps.",
        },
        {
          q: "Why is my video not available?",
          a: "Age-restricted, private, or region-locked videos may not be downloadable. The tool uses the publicly available stream data YouTube exposes.",
        },
        {
          q: "Does this work with YouTube Shorts?",
          a: "Yes — Shorts are regular YouTube videos with short durations. Paste the Shorts URL and it will work like any other video.",
        },
      ]}
    >
      <YouTubeDownloader />
    </ToolPage>
  );
}
