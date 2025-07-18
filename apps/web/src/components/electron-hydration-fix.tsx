"use client";

import { useEffect } from "react";
import * as React from "react";

export function ElectronHydrationFix() {
  useEffect(() => {
    // Force React to be available globally for debugging
    if (typeof window !== "undefined") {
      console.log("🔧 [HYDRATION FIX] React hydration fix loaded");
      
      // Make React available globally for debugging
      (window as any).React = React;
      try {
        const ReactDOM = require("react-dom");
        (window as any).ReactDOM = ReactDOM;
      } catch (error) {
        console.error("🔧 [HYDRATION FIX] Failed to load ReactDOM:", error);
      }
      
      console.log("🔧 [HYDRATION FIX] Global React objects set:", {
        React: typeof (window as any).React,
        ReactDOM: typeof (window as any).ReactDOM,
        ReactVersion: React.version,
      });
      
      // Check if Next.js is properly initialized
      console.log("🔧 [HYDRATION FIX] Next.js status:", {
        nextData: typeof (window as any).__NEXT_DATA__,
        nextHydrated: (window as any).__NEXT_HYDRATED,
        nextLoaded: (window as any).__NEXT_LOADED_PAGES__,
      });
    }
  }, []);

  return null;
}