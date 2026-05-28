import type { Metadata } from "next";
import VideoThumbnailTool from "@/features/video/VideoThumbnailTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video Thumbnail Generator — capture frame from video free",
  description:
    "Generate a thumbnail image from any video frame. Scrub to the perfect moment and capture it as PNG — all in your browser, no upload needed.",
  path: "video-thumbnail-generator",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-thumbnail-generator"
      h1="Video Thumbnail Generator"
      appName="Video Thumbnail Generator"
      lede="Capture any frame from a video as a PNG thumbnail. Scrub through the video with a time slider and capture the perfect moment — instant, no ffmpeg required."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Use the time slider to scrub to the desired frame.",
        "Click Capture Frame to extract the image.",
        "Preview the thumbnail and download as PNG.",
      ]}
      faqs={[
        {
          q: "What format is the thumbnail saved as?",
          a: "Thumbnails are saved as PNG, which preserves full quality without compression artifacts.",
        },
        {
          q: "How precise is the frame capture?",
          a: "The slider allows 0.1 second precision. For very precise frames, you can type a value directly into the range input or scrub slowly.",
        },
        {
          q: "Does this tool upload my video?",
          a: "No. The video is loaded directly in your browser using an object URL. No data is sent to any server.",
        },
      ]}
      related={[
        { href: "/video-to-gif", label: "Video to GIF" },
        { href: "/trim-video", label: "Trim video" },
        { href: "/video-converter", label: "Video converter" },
        { href: "/compress-video", label: "Compress video" },
      ]}
    >
      <VideoThumbnailTool />
    </ToolPage>
  );
}
