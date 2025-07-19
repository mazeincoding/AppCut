"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * ULTRASYNC DEEPSYNC FACE-IT: ROOT CAUSE NUCLEAR SOLUTION
 * 
 * This component completely disables Next.js client-side routing for Electron builds
 * to prevent any data URL fetching that causes the /_next/data/ errors.
 */
export function ElectronRouterWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('🔧 [ELECTRON-ROUTER] Disabling Next.js client-side routing completely...');
      
      // NUCLEAR OPTION: Completely disable all router methods that trigger data fetching
      const originalPush = router.push;
      const originalReplace = router.replace;
      const originalPrefetch = router.prefetch;
      const originalReload = router.reload;

      // Override push to use window.location.href instead
      router.push = function(url: any, as?: any, options?: any) {
        console.log('🚫 [ELECTRON-ROUTER] Blocked router.push, using window.location:', url);
        
        if (typeof url === 'string') {
          window.location.href = url;
        } else if (url.pathname) {
          window.location.href = url.pathname + (url.search || '') + (url.hash || '');
        }
        
        return Promise.resolve(true);
      };

      // Override replace to use window.location.replace instead
      router.replace = function(url: any, as?: any, options?: any) {
        console.log('🚫 [ELECTRON-ROUTER] Blocked router.replace, using window.location.replace:', url);
        
        if (typeof url === 'string') {
          window.location.replace(url);
        } else if (url.pathname) {
          window.location.replace(url.pathname + (url.search || '') + (url.hash || ''));
        }
        
        return Promise.resolve(true);
      };

      // Completely disable prefetch
      router.prefetch = function() {
        console.log('🚫 [ELECTRON-ROUTER] Blocked router.prefetch');
        return Promise.resolve();
      };

      // Disable reload (use window.location.reload instead)
      router.reload = function() {
        console.log('🚫 [ELECTRON-ROUTER] Blocked router.reload, using window.location.reload');
        window.location.reload();
      };

      // Block router events that might trigger data fetching
      const originalEmit = router.events.emit;
      router.events.emit = function(type: any, ...args: any[]): boolean {
        const eventName = typeof type === 'string' ? type : String(type);
        if (eventName.includes('routeChange') || eventName.includes('beforeHistoryChange')) {
          console.log(`🚫 [ELECTRON-ROUTER] Blocked router event: ${eventName}`);
          return false;
        }
        // Cast to boolean since originalEmit might return void
        const result = originalEmit.call(this, type, ...args);
        return result !== undefined ? Boolean(result) : true;
      };

      console.log('✅ [ELECTRON-ROUTER] Next.js client-side routing completely disabled');

      // Cleanup function to restore original methods if needed
      return () => {
        router.push = originalPush;
        router.replace = originalReplace;
        router.prefetch = originalPrefetch;
        router.reload = originalReload;
      };
    }
  }, [router]);

  return <>{children}</>;
}