"use client";

import { useEffect, useState } from 'react';
import * as React from 'react';

/**
 * Electron-specific React provider that ensures proper hydration
 */
export function ElectronReactProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if we're in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true);
      console.log('🔧 [ELECTRON-PROVIDER] Electron environment detected');
      
      // Make React available globally
      (window as any).React = React;
      
      // Force hydration completion
      setIsHydrated(true);
      console.log('✅ [ELECTRON-PROVIDER] Hydration completed');
    } else {
      setIsHydrated(true);
    }
  }, []);

  // Show loading state while hydrating in Electron
  if (isElectron && !isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">OpenCut</h1>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}