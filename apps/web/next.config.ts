import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  ...(process.env.ELECTRON_BUILD
    ? {
        output: "export",
        basePath: "",
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
