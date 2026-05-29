import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompressTool from "@/features/compress/CompressTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { PLATFORM_PAGES } from "@/lib/platform-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return PLATFORM_PAGES.filter((p) => p.tool === "compress").map((p) => ({
    platform: p.slug.replace("compress-image-for-", ""),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  const page = PLATFORM_PAGES.find(
    (p) => p.slug === `compress-image-for-${platform}`,
  );
  if (!page) return {};
  return buildMetadata({ title: page.title, description: page.description, path: page.slug });
}

export default async function Page({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const page = PLATFORM_PAGES.find(
    (p) => p.slug === `compress-image-for-${platform}`,
  );
  if (!page) notFound();

  return (
    <ToolPage
      slug={page.slug}
      h1={page.h1}
      appName={page.h1}
      lede={page.lede}
      steps={page.steps}
      faqs={page.faqs}
      related={page.related}
    >
      <CompressTool />
    </ToolPage>
  );
}
