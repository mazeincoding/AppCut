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
    // =================== PHASE 2: ENHANCED ELECTRON CONFIGURATION ===================
    // For Electron static export, ensure proper client-side hydration
    generateBuildId: async () => 'electron-static-build',
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true,
    
    // PHASE 2: Enhanced experimental settings for Electron
    experimental: {
      scrollRestoration: false,
      // Remove invalid options for Next.js 15.3.4 compatibility
    },
    
    // PHASE 3: Disable runtime data fetching for static export
    // Note: generateStaticParams and dynamicParams are not valid for this Next.js version
    
    // PHASE 2: Configure webpack for static export compatibility
    webpack: (config, { isServer, dev }) => {
      // Add verification print
      console.log('🔧 [NEXT-CONFIG] Configuring webpack for Electron static export...');
      
      if (!isServer) {
        // PHASE 2: Disable client-side data fetching expectations
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          os: false,
          crypto: false,
          stream: false,
          buffer: false,
        };
        
        // PHASE 2: Optimize for static export
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            ...config.optimization.splitChunks,
            cacheGroups: {
              ...config.optimization.splitChunks?.cacheGroups,
              // Prevent problematic chunking that expects server-side data
              default: false,
              vendors: false,
              framework: {
                chunks: 'all',
                name: 'framework',
                test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
                priority: 40,
                enforce: true,
              },
            },
          },
        };
      }
      
      console.log('✅ [NEXT-CONFIG] Webpack configured for Electron compatibility');
      return config;
    },
    
    // PHASE 2: Override data directory behavior to prevent JSON requests
    // Note: headers() is not compatible with output: 'export', so it's removed
  }),
};

export default nextConfig;
