import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Artistic QR Code Generator — blend QR codes with AI art",
  description:
    "Generate artistic QR codes using ControlNet AI. Blend scannable QR codes with beautiful art styles — watercolor, oil painting, anime, and more. Pro feature.",
  path: "ai-artistic-qr-code-generator",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
