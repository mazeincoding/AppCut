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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{metadata.title as string}</title>
        <meta name="description" content={metadata.description as string} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="robots" content="index, follow" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="OpenCut" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta property="og:title" content="OpenCut" />
        <meta property="og:description" content="A simple but powerful video editor that gets the job done. In your browser." />
        <meta property="og:url" content="https://opencut.app/" />
        <meta property="og:site_name" content="OpenCut" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content="https://opencut.app/opengraph-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="OpenCut" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@opencutapp" />
        <meta name="twitter:title" content="OpenCut" />
        <meta name="twitter:description" content="A simple but powerful video editor that gets the job done. In your browser." />
        <meta name="twitter:image" content="http://localhost:3000/opengraph-image.jpg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/icons/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/icons/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/favicon-96x96.png" sizes="96x96" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-57x57.png" sizes="57x57" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-60x60.png" sizes="60x60" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-72x72.png" sizes="72x72" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-76x76.png" sizes="76x76" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-114x114.png" sizes="114x114" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-120x120.png" sizes="120x120" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-144x144.png" sizes="144x144" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-152x152.png" sizes="152x152" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-180x180.png" sizes="180x180" type="image/png" />
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
                  
                  // Create a simple project and navigate to editor
                  const projectId = 'project-' + Date.now();
                  const projectName = 'New Project';
                  
                  // Save basic project data to localStorage as fallback
                  try {
                    const project = {
                      id: projectId,
                      name: projectName,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      backgroundColor: '#000000',
                      backgroundType: 'color',
                      blurIntensity: 8,
                      thumbnail: ''
                    };
                    
                    localStorage.setItem('opencut-fallback-project', JSON.stringify(project));
                    console.log('🚀 [FALLBACK] Project saved to localStorage:', project);
                    
                    // Navigate to editor
                    const editorUrl = '/editor/project/' + encodeURIComponent(projectId);
                    console.log('🚀 [FALLBACK] Navigating to:', editorUrl);
                    window.location.href = editorUrl;
                  } catch (error) {
                    console.error('🚀 [FALLBACK] Error creating project:', error);
                  }
                  
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
                
                // Handle navigation clicks for static export
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                  const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                  const href = link.getAttribute('href');
                  
                  if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
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
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
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
      </body>
    </html>
  )
}