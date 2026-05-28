import type { Metadata } from "next";
import UpscaleTool from "@/features/upscale/UpscaleTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Photo Enhancer — restore and sharpen images with AI",
  description: "Enhance and restore photo quality using AI. Upscale resolution, recover detail, and sharpen images — Pro users get Real-ESRGAN neural network processing.",
  path: "ai-photo-enhancer",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-photo-enhancer"
      h1="AI Photo Enhancer"
      appName="AI Photo Enhancer"
      lede="Enhance and restore photo quality using AI. Upscale resolution, recover detail, and sharpen images — Pro users get Real-ESRGAN neural network processing."
      steps={[
        "Upload your photo (JPG, PNG, WebP, AVIF, or GIF).",
        "Select AI mode (Pro) for Real-ESRGAN neural network enhancement, or Smooth for free bicubic upscaling.",
        "Choose your desired scale factor (2× or 4×).",
        "Download the enhanced, high-resolution image.",
      ]}
      faqs={[
        { q: "What is the difference between enhancement and upscaling?", a: "Upscaling simply increases pixel count, while AI enhancement uses a neural network to reconstruct fine details, reduce noise, and improve sharpness — resulting in a visually superior image beyond just a larger canvas." },
        { q: "What image formats are supported?", a: "You can upload JPG, PNG, WebP, AVIF, and GIF images. The output is always a high-quality PNG file." },
        { q: "Is a Pro plan required for AI enhancement?", a: "AI mode (Real-ESRGAN) requires a Pro subscription since it uses cloud GPU processing. Free users can still use Smooth (bicubic) or Crisp (nearest-neighbor) modes, which run entirely in the browser." },
        { q: "Are my photos stored or shared?", a: "Photos processed in AI mode are sent to Replicate's servers for GPU processing and immediately discarded after. Free canvas modes never leave your device. We do not store or share your images." },
      ]}
      related={[
        { href: "/ai-image-upscaler", label: "AI Image Upscaler" },
        { href: "/upscale-image", label: "Upscale image" },
        { href: "/compress-image", label: "Compress image" },
      ]}
    >
      <UpscaleTool />
    </ToolPage>
  );
}
