import type { Metadata } from "next";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "MOV to MP4 — convert iPhone video free online",
  description:
    "Convert MOV video from iPhone or Mac to MP4 free online. No upload required — runs entirely in your browser.",
  path: "mov-to-mp4",
});

export default function Page() {
  return (
    <ToolPage
      slug="mov-to-mp4"
      h1="MOV to MP4"
      appName="MOV to MP4 Converter"
      lede="Convert MOV video (from iPhone, Mac, or any camera) to MP4 free in your browser. No upload, no account needed."
      steps={[
        "Drop or select a MOV file from your iPhone or camera.",
        "MP4 is pre-selected as the output format.",
        "Click Convert and wait for processing to finish.",
        "Download the converted MP4 file.",
      ]}
      faqs={[
        {
          q: "Why do iPhone videos come as MOV files?",
          a: "Apple's iPhone and Mac cameras record in the QuickTime MOV container by default. While MOV plays fine on Apple devices, MP4 is more universally accepted by social networks, messaging apps, and non-Apple devices.",
        },
        {
          q: "Will the video quality change?",
          a: "The converter re-encodes to H.264 with a fast preset and CRF 23, producing near-original quality. Some quality reduction versus the original HEVC (H.265) source from newer iPhones is expected.",
        },
        {
          q: "Is my MOV file uploaded anywhere?",
          a: "No. All conversion is done locally using WebAssembly in your browser. Your files never leave your device.",
        },
        {
          q: "My file is very large — how long will it take?",
          a: "Processing time depends on file size and device speed. iPhone videos are often large; a warning is shown for files over 300 MB. Expect several minutes for very large files.",
        },
      ]}
      related={[
        { href: "/video-converter", label: "Video Converter" },
        { href: "/mp4-to-webm", label: "MP4 to WebM" },
        { href: "/mute-video", label: "Mute Video" },
      ]}
    >
      <VideoConverterTool defaultOutputFormat="mp4" acceptedInputs={["mov"]} />
    </ToolPage>
  );
}
