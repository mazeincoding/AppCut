"use client";

import { useEffect } from 'react';

/**
 * Simplified Electron Router Wrapper - prevents data fetching without complex overrides
 */
export function ElectronRouterWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('🔧 [ELECTRON-ROUTER] Simple routing override for Electron...');
      
      // Simple approach: just block fetch requests, don't override router
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

      console.log('✅ [ELECTRON-ROUTER] Simple fetch blocking enabled');
    }
  }, []);

  return <>{children}</>;
}