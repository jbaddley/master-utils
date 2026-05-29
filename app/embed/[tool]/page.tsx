import { notFound } from "next/navigation";
import CompressTool from "@/features/compress/CompressTool";
import CropResizeTool from "@/features/resize/CropResizeTool";
import ConvertTool from "@/features/convert/ConvertTool";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import FaviconTool from "@/features/favicon/FaviconTool";
import SvgTool from "@/features/svg/SvgTool";
import BackgroundTool from "@/features/background/BackgroundTool";
import { CONVERSION_SLUGS, getMediaConversion } from "@/lib/media-conversions";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    "compress-image",
    "resize-image",
    "crop-image",
    "favicon-generator",
    "image-to-svg",
    "remove-background",
    "convert-image",
    "convert-audio",
    "convert-video",
    ...CONVERSION_SLUGS,
  ].map((tool) => ({ tool }));
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;

  const conv = getMediaConversion(tool);
  if (conv) {
    if (conv.media === "image") {
      return <ConvertTool initialFrom={conv.fromKey} initialTo={conv.toKey} />;
    }
    if (conv.media === "audio") {
      return (
        <AudioConverterTool
          initialFrom={conv.fromKey}
          initialTo={conv.toKey}
          acceptedInputs={conv.acceptedInputs}
          extractAudio={conv.extractAudio}
        />
      );
    }
    return (
      <VideoConverterTool
        initialFrom={conv.fromKey}
        initialTo={conv.toKey}
        acceptedInputs={conv.acceptedInputs}
      />
    );
  }

  switch (tool) {
    case "compress-image":
      return <CompressTool />;
    case "resize-image":
    case "crop-image":
      return <CropResizeTool />;
    case "favicon-generator":
      return <FaviconTool />;
    case "image-to-svg":
      return <SvgTool />;
    case "remove-background":
      return <BackgroundTool />;
    case "convert-image":
      return <ConvertTool />;
    case "convert-audio":
      return <AudioConverterTool />;
    case "convert-video":
      return <VideoConverterTool />;
    default:
      return notFound();
  }
}
