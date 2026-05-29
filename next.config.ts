import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: "/crop-image",
        destination: "/resize-image/",
        permanent: true,
      },
      {
        source: "/ocr",
        destination: "/image-to-text/",
        permanent: true,
      },
      {
        source: "/audio-converter",
        destination: "/convert-audio/",
        permanent: true,
      },
      {
        source: "/video-converter",
        destination: "/convert-video/",
        permanent: true,
      },
      {
        source: "/strip-metadata",
        destination: "/remove-exif/",
        permanent: true,
      },
      {
        source: "/blackout-tool",
        destination: "/redact-image/",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // COOP/COEP required for SharedArrayBuffer (ffmpeg.wasm multi-thread)
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
