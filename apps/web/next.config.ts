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
    // For Electron static export - clean configuration without problematic features
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true,
    
    // PHASE 2: Enhanced experimental settings for Electron
    experimental: {
      scrollRestoration: false,
      optimizeCss: false,
      linkNoTouchStart: true,
      // Remove invalid options for Next.js 15.3.4 compatibility
    },
    
    // PHASE 3: Disable problematic features for Electron static export
    
    // REMOVED: rewrites, headers, redirects - these cause warnings in static export
    // Data fetching prevention is now handled entirely in preload.js
    
    // PHASE 5: NUCLEAR OPTION - Disable ALL Next.js data fetching mechanisms
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
    poweredByHeader: false,
    compress: false,
    
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
        
        // PHASE 3: Enhanced font handling for Electron
        config.module.rules.push({
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          use: {
            loader: 'file-loader',
            options: {
              publicPath: './',
              outputPath: 'static/fonts/',
              name: '[name].[ext]',
            },
          },
        });
      }
      
      console.log('✅ [NEXT-CONFIG] Webpack configured for Electron compatibility');
      return config;
    },
    
    // PHASE 2: Override data directory behavior to prevent JSON requests
    // Note: headers() is not compatible with output: 'export', so it's removed
  }),
};

export default nextConfig;
