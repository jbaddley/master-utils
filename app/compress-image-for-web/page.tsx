import type { Metadata } from "next";
import CompressTool from "@/features/compress/CompressTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";
import { PLATFORM_PAGES } from "@/lib/platform-pages";

const page = PLATFORM_PAGES.find((p) => p.slug === "compress-image-for-web")!;

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
      <CompressTool />
    </ToolPage>
  );
}
