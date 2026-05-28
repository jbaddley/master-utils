import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "MP4 to WebM — convert video free online",
  description:
    "Convert MP4 video to WebM format free online. No upload required — conversion runs entirely in your browser.",
  path: "mp4-to-webm",
});

export default function Page() {
  return (
    <ToolPage
      slug="mp4-to-webm"
      h1="MP4 to WebM"
      appName="MP4 to WebM Converter"
      lede="Convert MP4 video to WebM format free in your browser. No upload, no account, no size limits."
      steps={[
        "Drop or select an MP4 file.",
        "WebM is pre-selected as the output format.",
        "Click Convert and wait for processing to finish.",
        "Download the converted WebM file.",
      ]}
      faqs={[
        {
          q: "Why convert MP4 to WebM?",
          a: "WebM uses the VP9 codec which is royalty-free and well-supported in all modern browsers. It is often preferred for web video embeds and HTML5 video elements.",
        },
        {
          q: "Will the video quality change?",
          a: "The converter uses VP9 with a constant-quality setting (CRF 30), which produces good quality at reasonable file sizes. Some quality reduction versus the original H.264 source is expected.",
        },
        {
          q: "Is my MP4 file uploaded anywhere?",
          a: "No. All conversion is done locally using WebAssembly in your browser. Your files never leave your device.",
        },
        {
          q: "How long does conversion take?",
          a: "Processing time depends on file size and your device. Expect roughly one minute per 100 MB. A warning is shown for files over 300 MB.",
        },
      ]}
      related={[
        { href: "/video-converter", label: "Video Converter" },
        { href: "/webm-to-mp4", label: "WebM to MP4" },
        { href: "/mute-video", label: "Mute Video" },
      ]}
    >
      <VideoConverterTool defaultOutputFormat="webm" />
    </ToolPage>
  );
}
