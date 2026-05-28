import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ConvertTool from "@/features/convert/ConvertTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { CONVERSIONS, parseConversion } from "@/lib/tools";

// Only the listed conversion slugs are generated; everything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return CONVERSIONS.map((conversion) => ({ conversion }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion } = await params;
  const info = parseConversion(conversion);
  if (!info) return {};
  return buildMetadata({
    title: `${info.fromLabel} to ${info.toLabel} — free online converter`,
    description: `Convert ${info.fromLabel} to ${info.toLabel} online for free. Fast, private, batch-free conversion that runs entirely in your browser — no upload, no watermark.`,
    path: conversion,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ conversion: string }>;
}) {
  const { conversion } = await params;
  const info = parseConversion(conversion);
  if (!info) notFound();

  return (
    <ToolPage
      slug={conversion}
      h1={`${info.fromLabel} to ${info.toLabel} Converter`}
      appName={`${info.fromLabel} to ${info.toLabel} Converter`}
      lede={`Convert ${info.fromLabel} images to ${info.toLabel} instantly in your browser. Drop a file, preview the result, and download — nothing is uploaded.`}
      steps={[
        `Drop or select a ${info.fromLabel} image.`,
        `It is converted to ${info.toLabel} automatically.`,
        `Download the ${info.toLabel} file.`,
      ]}
      faqs={[
        {
          q: `How do I convert ${info.fromLabel} to ${info.toLabel}?`,
          a: `Just drop your ${info.fromLabel} file above — it is re-encoded to ${info.toLabel} in your browser and ready to download in seconds.`,
        },
        {
          q: "Is it free and private?",
          a: "Yes. There is no sign-up or watermark, and your image never leaves your device.",
        },
        {
          q: "Will I lose quality?",
          a:
            info.toMime === "image/png"
              ? "No — PNG is lossless, so the result is pixel-perfect."
              : `${info.toLabel} is a compressed format; the converter uses a high-quality setting that keeps the image looking sharp.`,
        },
      ]}
      related={[
        { href: "/compress-image", label: "Compress image" },
        { href: "/resize-image", label: "Resize image" },
        { href: "/image-to-svg", label: "Image to SVG" },
      ]}
    >
      <ConvertTool toMime={info.toMime} toLabel={info.toLabel} toExt={info.toExt} />
    </ToolPage>
  );
}
