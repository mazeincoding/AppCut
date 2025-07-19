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
import '../styles/globals.css'

// =================== PHASE 4: ERROR BOUNDARY INTEGRATION ===================
console.log('🚀 [APP] Loading OpenCut app with Electron error boundary...');

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

  return (
    <ElectronErrorBoundary onError={handleError}>
      <div className={`${inter.className} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
        >
          <TooltipProvider>
            <UrlValidationProvider>
              <StorageProvider>
                <ElectronErrorBoundary>
                  <Component {...pageProps} />
                </ElectronErrorBoundary>
                <Toaster />
                <DevelopmentDebug />
                <ElectronHydrationFix />
              </StorageProvider>
            </UrlValidationProvider>
          </TooltipProvider>
        </ThemeProvider>
      </div>
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