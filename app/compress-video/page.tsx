import type { Metadata } from "next";
import VideoCompressorTool from "@/features/video/VideoCompressorTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compress Video Online — reduce MP4 file size free",
  description:
    "Compress videos online for free using H.264 encoding. Reduce MP4, WebM, or MOV file size without uploading — all processing happens in your browser.",
  path: "compress-video",
});

export default function Page() {
  return (
    <ToolPage
      slug="compress-video"
      h1="Compress Video"
      appName="Video Compressor"
      lede="Reduce video file size using H.264 compression. Choose from four quality presets — all processing happens in your browser using WebAssembly."
      steps={[
        "Drop or select a video file (MP4, WebM, or MOV).",
        "Choose a quality level: High, Medium, Low, or Very Low.",
        "Click Compress and wait for processing to finish.",
        "Download the compressed MP4.",
      ]}
      faqs={[
        {
          q: "What do the CRF quality settings mean?",
          a: "CRF (Constant Rate Factor) controls quality vs file size. CRF 18 is high quality (larger file), CRF 35 is very compressed (smaller file). Medium (CRF 23) is a good balance for most videos.",
        },
        {
          q: "What format is the output?",
          a: "The output is always an MP4 file encoded with H.264, which is compatible with virtually all devices, browsers, and platforms.",
        },
        {
          q: "Will my video files be uploaded anywhere?",
          a: "No. All compression is done locally using ffmpeg.wasm in your browser. Your files never leave your device.",
        },
      ]}
      related={[
        { href: "/compress-video-for-web", label: "Compress video for web" },
        { href: "/compress-video-for-email", label: "Compress video for email" },
        { href: "/trim-video", label: "Trim video" },
        { href: "/video-converter", label: "Video converter" },
      ]}
    >
      <VideoCompressorTool />
    </ToolPage>
  );
}
