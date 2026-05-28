import type { Metadata } from "next";
import ResizeTool from "@/features/resize/ResizeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { PLATFORM_PAGES } from "@/lib/platform-pages";

const page = PLATFORM_PAGES.find((p) => p.slug === "resize-image-for-tiktok")!;

export const metadata: Metadata = buildMetadata({
  title: page.title,
  description: page.description,
  path: page.slug,
});

export default function Page() {
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
      <ResizeTool defaultPresetId={page.defaultPresetId} />
    </ToolPage>
  );
}
