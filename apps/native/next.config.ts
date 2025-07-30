import type { NextConfig } from "next";


const isProd = process.env.NODE_ENV === 'production';

const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

const nextConfig: NextConfig = {
    // Ensure Next.js uses SSG instead of SSR
    // https://nextjs.org/docs/pages/building-your-application/deploying/static-exports
    output: 'export',
    // Note: This feature is required to use the Next.js Image component in SSG mode.
    // See https://nextjs.org/docs/messages/export-image-api for different workarounds.
    images: {
        unoptimized: true,
    },
    // Configure assetPrefix or else the server won't properly resolve your assets.
    assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
};

export default nextConfig;
