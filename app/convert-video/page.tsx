import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { ConversionHubSeoContent } from "@/components/ConversionSeoContent";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Video Converter — MP4, WebM, MOV free online",
  description:
    "Convert video between MP4, WebM, and OGG in your browser. Output formats depend on your input — private WebAssembly conversion, no upload.",
  path: "convert-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="convert-video"
      h1="Video Converter"
      appName="Video Converter"
      lede="Convert video between common formats. Pick input and output types, drop your file, and download — processing runs in your browser."
      steps={[
        "Choose input and output video formats.",
        "Drop or select a video file.",
        "Convert and download the result.",
      ]}
      body={<ConversionHubSeoContent media="video" />}
      faqs={[
        {
          q: "Which video formats are supported?",
          a: "Input: MP4, WebM, MOV, AVI, MKV, OGG. Output options depend on the source — typically MP4 and WebM.",
        },
        {
          q: "Need audio only?",
          a: "Use Audio Studio to extract MP3, WAV, or other audio from video files.",
        },
      ]}
      related={[
        { href: "/mp4-to-webm", label: "MP4 to WebM" },
        { href: "/audio-studio", label: "Audio Studio" },
        { href: "/compress-video", label: "Compress video" },
      ]}
    >
      <VideoConverterTool />
    </ToolPage>
  );
}
