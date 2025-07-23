// =================== ELECTRON-SAFE FONT LOADER ===================
// This provides an alternative font loading approach for Electron that avoids absolute paths

import { Inter } from 'next/font/google';

// Check if we're in Electron environment
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// For Electron, we need to handle fonts differently to avoid absolute path issues
export function getElectronSafeFont() {
  if (isElectron) {
    console.log('🔧 [ELECTRON-SAFE-FONTS] Using Electron-safe font configuration');
    
    // Return a fallback font configuration that doesn't use Next.js font optimization
    return {
      className: 'font-sans',
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }
    };
  }
  
  // For regular web builds, use Next.js font optimization
  const inter = Inter({ subsets: ['latin'] });
  return inter;
}

// Alternative approach: Patch the Inter font import for Electron
export function patchNextFontForElectron() {
  if (!isElectron) return;
  
  console.log('🔧 [ELECTRON-SAFE-FONTS] Patching Next.js font system for Electron...');
  
  // Override the global CSS variable that Next.js uses for fonts
  const style = document.createElement('style');
  style.textContent = `
    /* Electron-safe font override */
    :root {
      --font-inter: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
    
    /* Remove any @font-face rules that use absolute paths */
    @font-face {
      font-family: '__Inter_36bd41' !important;
      src: local('Inter'), local('Inter-Regular') !important;
      font-display: swap !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ [ELECTRON-SAFE-FONTS] Font system patched for Electron');
}

// Auto-patch on load if in Electron
if (typeof window !== 'undefined' && window.electronAPI) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchNextFontForElectron);
  } else {
    patchNextFontForElectron();
  }
}