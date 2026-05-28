import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is client-side; export a fully static site (no server needed).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
