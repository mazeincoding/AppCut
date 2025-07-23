"use client";

import { useEffect } from "react";
import * as React from "react";

export function ElectronHydrationFix() {
  useEffect(() => {
    // Only run in Electron environment
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    console.log("🔧 [HYDRATION FIX] Electron React hydration fix starting...");
    
    // Make React available globally immediately
    (window as any).React = React;
    
    // Load ReactDOM synchronously for Electron
    try {
      const ReactDOM = require("react-dom/client");
      (window as any).ReactDOM = ReactDOM;
      console.log("🔧 [HYDRATION FIX] ReactDOM loaded successfully");
      
      // Force hydration if needed
      setTimeout(() => {
        const rootElement = document.getElementById('__next');
        if (rootElement && !rootElement.hasChildNodes()) {
          console.log("🔧 [HYDRATION FIX] Root element empty, forcing render...");
          
          // Create a simple fallback render
          const root = ReactDOM.createRoot(rootElement);
          const FallbackComponent = React.createElement('div', {
            className: 'min-h-screen bg-background flex items-center justify-center',
            children: React.createElement('div', {
              className: 'text-center',
              children: [
                React.createElement('h1', { key: 'title', className: 'text-2xl font-bold mb-4' }, 'OpenCut'),
                React.createElement('p', { key: 'loading', className: 'text-muted-foreground' }, 'Loading...')
              ]
            })
          });
          
          root.render(FallbackComponent);
          console.log("✅ [HYDRATION FIX] Fallback component rendered");
        }
      }, 1000);
      
    } catch (error) {
      console.error("🔧 [HYDRATION FIX] Failed to load ReactDOM:", error);
    }
  }, []);

  return null;
}