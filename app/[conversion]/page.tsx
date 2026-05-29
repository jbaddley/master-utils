import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ConvertTool from "@/features/convert/ConvertTool";
import AudioConverterTool from "@/features/audio/AudioConverterTool";
import VideoConverterTool from "@/features/video/VideoConverterTool";
import { ToolPage } from "@/components/ToolPage";
import { ConversionSeoContent } from "@/components/ConversionSeoContent";
import { buildMetadata } from "@/lib/seo";
import { CONVERSION_SLUGS, getMediaConversion } from "@/lib/media-conversions";

export const dynamicParams = false;

export function generateStaticParams() {
  return CONVERSION_SLUGS.map((conversion) => ({ conversion }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion } = await params;
  const info = getMediaConversion(conversion);
  if (!info) return {};
  return buildMetadata({
    title: `${info.fromLabel} to ${info.toLabel} — free online converter`,
    description: `Convert ${info.fromLabel} to ${info.toLabel} online for free. Fast, private conversion in your browser — no upload, no watermark.`,
    path: conversion,
  });
}

function ConversionTool({ conversion }: { conversion: string }) {
  const info = getMediaConversion(conversion);
  if (!info) notFound();

  if (info.media === "image") {
    return <ConvertTool initialFrom={info.fromKey} initialTo={info.toKey} />;
  }
  if (info.media === "audio") {
    return (
      <AudioConverterTool
        initialFrom={info.fromKey}
        initialTo={info.toKey}
        acceptedInputs={info.acceptedInputs}
        extractAudio={info.extractAudio}
      />
    );
  }
  return (
    <VideoConverterTool
      initialFrom={info.fromKey}
      initialTo={info.toKey}
      acceptedInputs={info.acceptedInputs}
    />
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ conversion: string }>;
}) {
  const { conversion } = await params;
  const info = getMediaConversion(conversion);
  if (!info) notFound();

  const action =
    info.media === "audio" && info.extractAudio ? "Extract" : "Convert";

  return (
    <ToolPage
      slug={conversion}
      h1={`${info.fromLabel} to ${info.toLabel}`}
      appName={`${info.fromLabel} to ${info.toLabel} Converter`}
      lede={`${action} ${info.fromLabel} to ${info.toLabel} instantly in your browser. Choose formats, drop a file, and download — nothing is uploaded.`}
      steps={[
        `Select ${info.fromLabel} as input and ${info.toLabel} as output (or drop a file to auto-detect).`,
        `Drop or select your ${info.fromLabel} file.`,
        `${action} and download the ${info.toLabel} file.`,
      ]}
      faqs={[
        {
          q: `How do I convert ${info.fromLabel} to ${info.toLabel}?`,
          a: `Open this page, confirm the format pair, drop your file, and download the result. Processing runs locally in your browser.`,
        },
        {
          q: "Is it free and private?",
          a: "Yes. There is no sign-up or watermark, and your file never leaves your device.",
        },
        {
          q: "Can I use other format pairs?",
          a: `Yes — use the full ${info.media} converter to change input/output freely, or pick another pairing from the list below.`,
        },
      ]}
      body={<ConversionSeoContent conversion={info} />}
      related={
        info.media === "image"
          ? [
              { href: "/convert-image", label: "Image converter" },
              { href: "/compress-image", label: "Compress image" },
              { href: "/resize-image", label: "Crop & resize" },
            ]
          : info.media === "audio"
            ? [
                { href: "/convert-audio", label: "Audio converter" },
                { href: "/trim-audio", label: "Trim audio" },
                { href: "/video-to-mp3", label: "Video to MP3" },
              ]
            : [
                { href: "/convert-video", label: "Video converter" },
                { href: "/compress-video", label: "Compress video" },
                { href: "/trim-video", label: "Trim video" },
              ]
      }
    >
      <ConversionTool conversion={conversion} />
    </ToolPage>
  );
}
