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
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function App({ Component, pageProps }: AppProps) {
  return (
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
              <ElectronHydrationFix />
            </StorageProvider>
          </UrlValidationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </div>
  )
}