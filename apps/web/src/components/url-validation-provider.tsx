'use client';

import { useEffect } from 'react';
import { 
  patchLocationAssignment, 
  enableUrlValidationDebug,
  validateAppUrl 
} from '../lib/url-validation';

interface UrlValidationProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes URL validation middleware
 * for the entire application
 */
export function UrlValidationProvider({ children }: UrlValidationProviderProps) {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Check if we're in Electron
    const isElectron = typeof window !== 'undefined' && 
      (window as any).electronAPI !== undefined;

    if (isElectron) {
      console.log('🔗 URL Validation: Initializing Electron URL middleware');
      
      // Patch window.location methods to auto-fix URLs
      patchLocationAssignment();
      
      // Enable debug mode in development
      if (process.env.NODE_ENV === 'development') {
        enableUrlValidationDebug();
      }

      // Patch Next.js router if available
      patchNextRouter();
      
      // Patch fetch for API calls
      patchFetch();
      
      console.log('✅ URL Validation: Middleware initialized');
    }
  }, []);

  return <>{children}</>;
}

/**
 * Patches Next.js router to validate URLs before navigation
 */
function patchNextRouter() {
  // Wait for Next.js router to be available
  const checkRouter = () => {
    if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
      const router = (window as any).next?.router;
      if (router && router.push) {
        const originalPush = router.push.bind(router);
        const originalReplace = router.replace.bind(router);

        router.push = function(url: string, as?: string, options?: any) {
          const result = validateAppUrl(url, { autoFix: true, logIssues: true });
          const validatedUrl = result.correctedUrl || url;
          return originalPush(validatedUrl, as, options);
        };

        router.replace = function(url: string, as?: string, options?: any) {
          const result = validateAppUrl(url, { autoFix: true, logIssues: true });
          const validatedUrl = result.correctedUrl || url;
          return originalReplace(validatedUrl, as, options);
        };

        console.log('🔗 URL Validation: Next.js router patched');
      }
    }
  };

  // Check immediately and after a delay
  checkRouter();
  setTimeout(checkRouter, 1000);
}

/**
 * Patches fetch to validate URLs in API calls
 */
function patchFetch() {
  if (typeof window === 'undefined' || !window.fetch) return;

  const originalFetch = window.fetch;
  
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    let url: string;
    
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
    }

    // Only validate app:// URLs
    if (url.includes('app://')) {
      const result = validateAppUrl(url, { autoFix: true, logIssues: true });
      if (result.correctedUrl) {
        if (typeof input === 'string') {
          input = result.correctedUrl;
        } else if (input instanceof URL) {
          input = new URL(result.correctedUrl);
        } else {
          input = { ...input, url: result.correctedUrl };
        }
      }
    }

    return originalFetch(input, init);
  };

  console.log('🔗 URL Validation: Fetch patched');
}

/**
 * Hook for components to validate URLs manually
 */
export function useUrlValidation() {
  return {
    validateUrl: (url: string) => validateAppUrl(url, { autoFix: true, logIssues: true }),
    isElectron: typeof window !== 'undefined' && (window as any).electronAPI !== undefined
  };
}