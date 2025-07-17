import type { NextConfig } from "next";

const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  output: isElectron ? "export" : "standalone",
  assetPrefix: isElectron ? "" : undefined,
  trailingSlash: isElectron,
  distDir: isElectron ? "out" : ".next",
  images: {
    unoptimized: isElectron,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  ...(isElectron && {
    // Exclude API routes for static export
    generateBuildId: async () => 'electron-static-build',
  }),
};

export default nextConfig;
