import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { DevelopmentDebug } from "../components/development-debug";
import { StorageProvider } from "../components/storage-provider";
import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";
import { UrlValidationProvider } from "../components/url-validation-provider";
import { ElectronHydrationFix } from "../components/electron-hydration-fix";

export const metadata = baseMetaData;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('🏠 RootLayout: Component rendered');
  console.log('🏠 RootLayout: Environment check:', {
    isElectron: process.env.NEXT_PUBLIC_ELECTRON,
    hasElectronAPI: typeof window !== 'undefined' ? !!window.electronAPI : 'window undefined'
  });
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${defaultFont.className} font-sans antialiased`}>
        {/* Electron detection script - runs immediately to set data-electron attribute */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('🚀 [ELECTRON DEBUG] JavaScript executing in Electron');
              
              if (typeof window !== 'undefined' && window.electronAPI) {
                document.body.setAttribute('data-electron', 'true');
                console.log('🚀 [ELECTRON] ElectronAPI detected');
              }
              
              // Click debug logging and fallback handler for when React doesn't load
              document.addEventListener('click', function(e) {
                console.log('🚀 [CLICK DEBUG] Click:', e.target.tagName, e.target.textContent?.slice(0, 30));
                
                // Fallback handler for New Project button when React fails to hydrate
                if (e.target.textContent && e.target.textContent.includes('New project')) {
                  console.log('🚀 [FALLBACK] New project button clicked - React fallback handler');
                  console.log('🔄 [FALLBACK] Redirecting to projects page instead of creating fallback project');
                  
                  // Navigate to projects page where user can create proper project
                  try {
                    window.location.href = '/projects';
                  } catch (error) {
                    console.error('🚀 [FALLBACK] Error navigating to projects:', error);
                  }
                  
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
                
                // Handle navigation clicks for static export
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                  const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                  const href = link.getAttribute('href');
                  
                  if (href && href.startsWith('app://')) {
                    e.preventDefault();
                    console.log('🚀 [NAV DEBUG] Navigating to:', href);
                    window.location.href = href;
                  }
                }
              });
              
              console.log('🚀 [DEBUG] Page loaded, body data-electron:', document.body.getAttribute('data-electron'));
            `,
          }}
        />
        <ThemeProvider attribute="class" forcedTheme="dark">
          <TooltipProvider>
            <UrlValidationProvider>
              <StorageProvider>{children}</StorageProvider>
              {process.env.NEXT_PUBLIC_ELECTRON !== "true" && <Analytics />}
              <Toaster />
              <DevelopmentDebug />
              {process.env.NEXT_PUBLIC_ELECTRON === "true" && <ElectronHydrationFix />}
              {process.env.NEXT_PUBLIC_ELECTRON !== "true" && (
                <Script
                  src="https://cdn.databuddy.cc/databuddy.js"
                  strategy="afterInteractive"
                  async
                  data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
                  data-track-attributes={false}
                  data-track-errors={true}
                  data-track-outgoing-links={false}
                  data-track-web-vitals={false}
                  data-track-sessions={false}
                />
              )}
            </UrlValidationProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
