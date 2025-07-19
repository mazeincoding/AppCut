import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import { metadata } from '../lib/metadata'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { UrlValidationProvider } from '@/components/url-validation-provider'
import { StorageProvider } from '@/components/storage-provider'
import { Toaster } from '@/components/ui/sonner'
import { DevelopmentDebug } from '@/components/development-debug'
import { ElectronHydrationFix } from '@/components/electron-hydration-fix'
import { ElectronErrorBoundary } from '@/components/electron-error-boundary'
import { ElectronImmediateFix } from '@/components/electron-immediate-fix'
import { ElectronRouterWrapper } from '@/components/electron-router-wrapper'
import { ElectronReactProvider } from '@/components/electron-react-provider'
import '../styles/globals.css'
import '@/lib/electron-font-fix'
// Removed problematic router override

// =================== PHASE 4: ERROR BOUNDARY INTEGRATION ===================
console.log('🚀 [APP] Loading OpenCut app with Electron error boundary and font fix...');

const inter = Inter({ subsets: ['latin'] })

export default function App({ Component, pageProps }: AppProps) {
  // PHASE 4: Error boundary handler
  const handleError = (error: Error, errorInfo: any) => {
    console.error('🔥 [APP] React error in Electron app:', error, errorInfo);
    
    // Add Electron-specific error context
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('🔧 [APP] Error occurred in Electron environment');
    }
  };

  // Single consistent render tree to prevent hydration mismatches
  return (
    <ElectronErrorBoundary onError={handleError}>
      <ElectronReactProvider>
        <ElectronRouterWrapper>
          <div className={`${inter.className} font-sans antialiased`}>
            <ThemeProvider
              attribute="class"
              forcedTheme="dark"
            >
              <TooltipProvider>
                <UrlValidationProvider>
                  <StorageProvider>
                    <Component {...pageProps} />
                    <Toaster />
                    <DevelopmentDebug />
                  </StorageProvider>
                </UrlValidationProvider>
              </TooltipProvider>
            </ThemeProvider>
            <ElectronHydrationFix />
            <ElectronImmediateFix />
          </div>
        </ElectronRouterWrapper>
      </ElectronReactProvider>
    </ElectronErrorBoundary>
  )
}

// =================== VERIFICATION PRINTS ===================
console.log('🎯 [APP] App configuration:');
console.log('- Error boundary: ENABLED');
console.log('- Electron hydration fix: ENABLED');
console.log('- Theme provider: ENABLED');
console.log('- Storage provider: ENABLED');
console.log('🚀 [APP] All providers and error boundaries configured');