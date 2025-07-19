"use client";

import { useEffect } from 'react';

/**
 * Enhanced Electron Router Wrapper - prevents data fetching and handles app:// protocol navigation
 */
export function ElectronRouterWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('🔧 [ELECTRON-ROUTER] Enhanced routing override for Electron...');
      
      // Block fetch requests for Next.js data
      const originalFetch = window.fetch;
      window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
        let url: string;
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof Request) {
          url = input.url;
        } else if (input instanceof URL) {
          url = input.href;
        } else {
          url = String(input);
        }
        
        if (url && url.includes('/_next/data/')) {
          console.log('🚫 [ELECTRON-ROUTER] Blocked data fetch:', url);
          return Promise.reject(new Error('Data fetching disabled in Electron'));
        }
        return originalFetch.call(this, input, init);
      };

      // Handle Link clicks for app:// protocol navigation
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const link = target.closest('a[href]') as HTMLAnchorElement;
        
        if (link && link.href) {
          const href = link.getAttribute('href');
          
          // Handle internal links (starting with / or relative paths)
          if (href && (href.startsWith('/') || (!href.includes('://') && !href.startsWith('#')))) {
            event.preventDefault();
            
            // Convert to app:// protocol URL
            const cleanPath = href.startsWith('/') ? href.substring(1) : href;
            const appUrl = cleanPath ? `app://${cleanPath}/index.html` : 'app://index.html';
            
            console.log('🔗 [ELECTRON-ROUTER] Navigating to:', appUrl);
            window.location.href = appUrl;
          }
        }
      });

      // Override history.pushState for programmatic navigation
      const originalPushState = history.pushState;
      history.pushState = function(state: any, title: string, url?: string | URL | null) {
        if (url && typeof url === 'string' && url.startsWith('/')) {
          const cleanPath = url.substring(1);
          const appUrl = cleanPath ? `app://${cleanPath}/index.html` : 'app://index.html';
          console.log('🔗 [ELECTRON-ROUTER] History pushState converted to:', appUrl);
          window.location.href = appUrl;
          return;
        }
        return originalPushState.call(this, state, title, url);
      };

      console.log('✅ [ELECTRON-ROUTER] Enhanced navigation handling enabled');
    }
  }, []);

  return <>{children}</>;
}