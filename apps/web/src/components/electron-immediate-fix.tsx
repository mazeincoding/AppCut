'use client';

import { useEffect } from 'react';

export function ElectronImmediateFix() {
  useEffect(() => {
    // Only run in Electron
    if (typeof window === 'undefined' || !window.electronAPI) return;

    console.log('🔧 [ELECTRON-FIX] Applying immediate visibility fixes...');

    // Force show all content immediately
    const forceShowContent = () => {
      // Remove opacity:0 from all elements
      const hiddenElements = document.querySelectorAll('[style*="opacity:0"], [style*="opacity: 0"]');
      hiddenElements.forEach((el: Element) => {
        if (el instanceof HTMLElement) {
          el.style.opacity = '1';
          el.style.transform = 'none';
          el.style.visibility = 'visible';
        }
      });

      // Force show main content areas
      const mainContent = document.querySelector('.max-w-3xl.mx-auto.w-full.flex-1.flex.flex-col.justify-center');
      if (mainContent instanceof HTMLElement) {
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'none';
        mainContent.style.visibility = 'visible';
      }

      // Force show footer
      const footer = document.querySelector('footer');
      if (footer instanceof HTMLElement) {
        footer.style.opacity = '1';
        footer.style.transform = 'none';
        footer.style.visibility = 'visible';
      }

      console.log(`✅ [ELECTRON-FIX] Fixed visibility on ${hiddenElements.length} elements`);
    };

    // Apply fixes immediately and repeatedly
    forceShowContent();
    setTimeout(forceShowContent, 100);
    setTimeout(forceShowContent, 500);
    setTimeout(forceShowContent, 1000);

    // Add mutation observer to catch dynamically added hidden content
    const observer = new MutationObserver(() => {
      forceShowContent();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, []);

  return null;
}