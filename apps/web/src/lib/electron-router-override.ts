/**
 * ULTRASYNC DEEPSYNC FACE-IT: NUCLEAR ROUTER OVERRIDE
 * 
 * This module provides the ultimate solution to prevent Next.js data fetching
 * by completely overriding the router system at the lowest level.
 */

// Override Next.js router at the module level for Electron builds
if (typeof window !== 'undefined' && window.electronAPI) {
  console.log('🔧 [ROUTER-OVERRIDE] Applying nuclear router override...');

  // Intercept any dynamic imports of Next.js router
  const originalImport = window.eval;
  window.eval = function(code: string) {
    if (code.includes('next/router') || code.includes('useRouter')) {
      console.log('🚫 [ROUTER-OVERRIDE] Blocked dynamic router import');
      return {};
    }
    return originalImport.call(this, code);
  };

  // Override require for router modules
  if ((window as any).require) {
    const originalRequire = (window as any).require;
    (window as any).require = function(module: string) {
      if (module === 'next/router' || module.includes('router')) {
        console.log('🚫 [ROUTER-OVERRIDE] Blocked router require:', module);
        return {
          useRouter: () => ({
            push: (url: string) => { window.location.href = url; return Promise.resolve(true); },
            replace: (url: string) => { window.location.replace(url); return Promise.resolve(true); },
            prefetch: () => Promise.resolve(),
            reload: () => window.location.reload(),
            back: () => window.history.back(),
            forward: () => window.history.forward(),
            events: { emit: () => false, on: () => {}, off: () => {} },
            query: {},
            pathname: window.location.pathname,
            asPath: window.location.pathname + window.location.search
          }),
          default: {
            push: (url: string) => { window.location.href = url; return Promise.resolve(true); },
            replace: (url: string) => { window.location.replace(url); return Promise.resolve(true); },
            prefetch: () => Promise.resolve()
          }
        };
      }
      return originalRequire.call(this, module);
    };
  }

  console.log('✅ [ROUTER-OVERRIDE] Nuclear router override applied');
}

export {};