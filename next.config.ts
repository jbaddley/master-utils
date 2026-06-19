import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: "/crop-image",
        destination: "/image-studio/",
        permanent: true,
      },
      {
        source: "/ocr",
        destination: "/image-to-text/",
        permanent: true,
      },
      {
        source: "/audio-converter",
        destination: "/audio-studio/",
        permanent: true,
      },
      {
        source: "/video-converter",
        destination: "/convert-video/",
        permanent: true,
      },
      {
        source: "/strip-metadata",
        destination: "/image-studio/",
        permanent: true,
      },
      {
        source: "/blackout-tool",
        destination: "/image-studio/",
        permanent: true,
      },
      {
        source: "/browse/media",
        destination: "/image-studio/",
        permanent: true,
      },
      {
        source: "/browse/documents",
        destination: "/document-tools/",
        permanent: true,
      },
      {
        source: "/browse/ai",
        destination: "/dev-tools/",
        permanent: true,
      },
      {
        source: "/browse/utilities",
        destination: "/dev-tools/",
        permanent: true,
      },
      {
        source: "/browse/:path*",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // AI pages: relax COEP so browsers can call a user's local Ollama
        // when NEXT_PUBLIC_LLM_MODE=client (deployed app + local Ollama scenario).
        source: "/:path((?:ai-)[^/]+)/",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
      {
        // All other routes: strict COEP required for ffmpeg.wasm / SharedArrayBuffer
        source: "/((?!ai-).*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
