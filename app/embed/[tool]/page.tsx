import { notFound } from "next/navigation";
import CompressTool from "@/features/compress/CompressTool";
import ResizeTool from "@/features/resize/ResizeTool";
import CropTool from "@/features/crop/CropTool";
import ConvertTool from "@/features/convert/ConvertTool";
import FaviconTool from "@/features/favicon/FaviconTool";
import SvgTool from "@/features/svg/SvgTool";
import BackgroundTool from "@/features/background/BackgroundTool";
import { CONVERSIONS, parseConversion } from "@/lib/tools";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    "compress-image",
    "resize-image",
    "crop-image",
    "favicon-generator",
    "image-to-svg",
    "remove-background",
    ...CONVERSIONS,
  ].map((tool) => ({ tool }));
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;

  const convInfo = parseConversion(tool);
  if (convInfo) {
    return (
      <ConvertTool
        toMime={convInfo.toMime}
        toLabel={convInfo.toLabel}
        toExt={convInfo.toExt}
      />
    );
  }

  switch (tool) {
    case "compress-image":    return <CompressTool />;
    case "resize-image":      return <ResizeTool />;
    case "crop-image":        return <CropTool />;
    case "favicon-generator": return <FaviconTool />;
    case "image-to-svg":      return <SvgTool />;
    case "remove-background": return <BackgroundTool />;
    default:                  return notFound();
  }
}
