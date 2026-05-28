import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "WebM to MP4 — convert WebM video free online",
  description:
    "Convert WebM video to MP4 free online. No upload required — runs entirely in your browser using WebAssembly.",
  path: "webm-to-mp4",
});

export default function Page() {
  return (
    <ToolPage
      slug="webm-to-mp4"
      h1="WebM to MP4"
      appName="WebM to MP4 Converter"
      lede="Convert WebM video to MP4 free in your browser. No upload, no account, completely private."
      steps={[
        "Drop or select a WebM file.",
        "MP4 is pre-selected as the output format.",
        "Click Convert and wait for processing to finish.",
        "Download the converted MP4 file.",
      ]}
      faqs={[
        {
          q: "Why convert WebM to MP4?",
          a: "MP4 with H.264 is the most widely compatible video format, supported by virtually every device, media player, and social network. WebM may not play on older devices or be accepted by all upload platforms.",
        },
        {
          q: "Will the video quality change?",
          a: "The converter uses H.264 with a fast preset and CRF 23, which is near-transparent quality. Minor quality differences versus the original VP9 source are possible but generally imperceptible.",
        },
        {
          q: "Is my WebM file uploaded anywhere?",
          a: "No. All conversion is done locally using WebAssembly in your browser. Your files never leave your device.",
        },
        {
          q: "How long does conversion take?",
          a: "Processing time depends on file size and device speed. Expect roughly one minute per 100 MB. A warning is shown for files over 300 MB.",
        },
      ]}
      related={[
        { href: "/video-converter", label: "Video Converter" },
        { href: "/mp4-to-webm", label: "MP4 to WebM" },
        { href: "/mute-video", label: "Mute Video" },
      ]}
    >
      <VideoConverterTool defaultOutputFormat="mp4" acceptedInputs={["webm"]} />
    </ToolPage>
  );
}
