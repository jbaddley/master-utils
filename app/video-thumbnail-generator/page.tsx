import type { Metadata } from "next";
import VideoThumbnailTool from "@/features/video/VideoThumbnailTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video Thumbnail Generator — extract frames from video free",
  description:
    "Extract any frame from a video as a PNG image. Pick the exact timestamp with a scrubber — free, private, no upload.",
  path: "video-thumbnail-generator",
});

export default function Page() {
  return (
    <ToolPage
      slug="video-thumbnail-generator"
      h1="Video Thumbnail Generator"
      appName="Video Thumbnail Generator"
      lede="Scrub to any frame in your video and save it as a high-quality PNG. Works entirely in your browser — your video never leaves your device."
      steps={[
        "Drop or select a video file (MP4, WebM, MOV).",
        "Drag the time scrubber to the frame you want.",
        "Click Extract Frame and download the PNG.",
      ]}
      faqs={[
        {
          q: "What video formats are supported?",
          a: "MP4, WebM, MOV, AVI, and MKV are all supported. Most modern browsers can decode these formats natively without any plugins.",
        },
        {
          q: "What resolution will the thumbnail be?",
          a: "The thumbnail is extracted at the full native resolution of your video — exactly as many pixels as the video frame itself, with no upscaling or downscaling applied.",
        },
        {
          q: "Is my video private?",
          a: "Yes — the tool uses the browser's built-in Canvas API. Your video file is never uploaded to any server; all processing stays entirely on your device.",
        },
        {
          q: "What can I use video thumbnails for?",
          a: "Common uses include creating cover images for video players, social media preview images, blog post illustrations, storyboards, and archiving memorable frames from home videos.",
        },
      ]}
      related={[
        { href: "/trim-video", label: "Trim video" },
        { href: "/mute-video", label: "Mute video" },
        { href: "/convert-video", label: "Video converter" },
      ]}
      showAds
    >
      <VideoThumbnailTool />
    </ToolPage>
  );
}
