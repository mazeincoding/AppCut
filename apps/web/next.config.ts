import type { NextConfig } from "next";

const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";
const isElectronProd = isElectron && process.env.NODE_ENV === "production";

// Debug logging to detect environment variables
console.log('🔧 [DETECTION]', {
  isElectron, 
  isElectronProd,
  nodeEnv: process.env.NODE_ENV,
  envVar: process.env.NEXT_PUBLIC_ELECTRON, 
  allElectronEnv: Object.keys(process.env).filter(k => k.includes('ELECTRON')).map(k => `${k}=${process.env[k]}`)
});

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  output: isElectronProd ? "export" : "standalone", // Only use export for Electron PRODUCTION
  // 强制相对路径用于 Electron PRODUCTION
  assetPrefix: isElectronProd ? "." : undefined,
  basePath: isElectronProd ? "" : undefined,
  trailingSlash: false, // 避免重定向死循环
  distDir: isElectronProd ? "out" : ".next",
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
  ...(isElectronProd && {
    // ROOT CAUSE FIX: Complete data fetching disable for Electron
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true,
    
    experimental: {
      scrollRestoration: false,
      optimizeCss: false,
      linkNoTouchStart: true,
    },
    
    // Disable ALL data mechanisms
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
    poweredByHeader: false,
    compress: false,
    generateBuildId: () => 'electron-static',
    
    // Font optimization is now handled automatically in Next.js 15
    
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
        
        // PHASE 2: Optimize for static export with font handling
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
