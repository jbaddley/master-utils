import { notFound } from "next/navigation";
import ConvertTool from "@/features/convert/ConvertTool";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import ImageStudio from "@/features/studio/ImageStudio";
import AudioStudio from "@/features/studio/AudioStudio";
import SvgTool from "@/features/svg/SvgTool";
import { CONVERSION_SLUGS, getMediaConversion } from "@/lib/media-conversions";
import { isAudioStudioSlug, isImageStudioSlug } from "@/lib/studio-links";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    "image-studio",
    "audio-studio",
    "image-to-svg",
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

  if (tool === "image-studio" || isImageStudioSlug(tool)) {
    return <ImageStudio />;
  }
  if (tool === "audio-studio" || isAudioStudioSlug(tool)) {
    return <AudioStudio />;
  }

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
    case "image-to-svg":
      return <SvgTool />;
    case "convert-image":
      return <ImageStudio />;
    case "convert-audio":
      return <AudioStudio />;
    case "convert-video":
      return <VideoConverterTool />;
    default:
      return notFound();
  }
}
