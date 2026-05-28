import type { Metadata } from "next";
import UpscaleTool from "@/features/upscale/UpscaleTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Image Upscaler — enlarge photos with Real-ESRGAN",
  description: "Upscale photos 2× or 4× using Real-ESRGAN AI — sharper than bicubic interpolation. Free canvas mode or Pro AI mode. No upload, runs in your browser.",
  path: "ai-image-upscaler",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-image-upscaler"
      h1="AI Image Upscaler"
      appName="AI Image Upscaler"
      lede="Enlarge images 2× or 4× with Real-ESRGAN neural network upscaling (Pro) or smooth bicubic interpolation (free). All processing runs locally in your browser."
      steps={[
        "Drop or select your image.",
        "Choose AI (ESRGAN) mode for Pro AI upscaling, or Smooth/Crisp for free canvas upscaling.",
        "Select 2× or 4× scale factor.",
        "Click Upscale and download the enlarged image.",
      ]}
      faqs={[
        { q: "What is Real-ESRGAN?", a: "Real-ESRGAN is a neural network trained to enhance photo details during upscaling, producing sharper results than traditional bicubic interpolation. It excels at restoring fine textures in photos." },
        { q: "How does AI upscaling differ from regular upscaling?", a: "Regular upscaling (bicubic/Lanczos) mathematically interpolates pixels, which can look blurry at high magnifications. AI upscaling uses a trained model to intelligently reconstruct realistic detail." },
        { q: "Is there a file size limit?", a: "Free users can upscale images up to 10 MB. Pro users can upscale up to 100 MB. Very large images may take longer to process with AI mode." },
        { q: "Are my images uploaded?", a: "Canvas mode (Smooth/Crisp) runs entirely in your browser — nothing is uploaded. AI mode (ESRGAN) sends the image to Replicate for processing and immediately deletes it after." },
      ]}
      related={[
        { href: "/upscale-image", label: "Upscale image" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/resize-image", label: "Resize image" },
      ]}
    >
      <UpscaleTool />
    </ToolPage>
  );
}
