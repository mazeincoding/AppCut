/**
 * Navigation utilities for Electron environment
 * Handles navigation using window.location instead of Next.js router for static exports
 */

export function useElectronNavigation() {
  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // In Electron, use window.location to navigate to the static pages
      // Handle root path specially
      if (path === '/' || path === '') {
        const url = 'app://index.html';
        console.log('🔄 Electron navigation to home:', url);
        window.location.href = url;
      } else {
        // Remove leading slash and add proper path structure
        const cleanPath = path.replace(/^\//, '');
        const url = `app://${cleanPath}/index.html`;
        console.log('🔄 Electron navigation to:', url);
        window.location.href = url;
      }
    } else {
      // In browser, use normal navigation (this won't be called in our case but good fallback)
      window.location.href = path;
    }
  };

  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

  return { navigateTo, isElectron };
}

/**
 * Hook for Link components to handle navigation in Electron
 */
export function useElectronLink() {
  const { navigateTo, isElectron } = useElectronNavigation();

  const isStorageReady = () => {
    if (typeof window === 'undefined') return true;
    return window.__OPENCUT_STORAGE_STATE__?.hasGloballyInitialized || false;
  };

  const handleClick = (e: React.MouseEvent, href: string) => {
    if (isElectron) {
      e.preventDefault();
      
      // Check if we're navigating to a page that needs storage
      const needsStorage = href.includes('/projects') || href.includes('/editor');
      
      if (needsStorage && !isStorageReady()) {
        console.log('⏳ Navigation delayed - waiting for storage initialization...');
        
        // Wait for storage to be ready, then navigate
        const checkAndNavigate = () => {
          if (isStorageReady()) {
            console.log('✅ Storage ready - proceeding with navigation');
            navigateTo(href);
          } else {
            // Check again in 100ms
            setTimeout(checkAndNavigate, 100);
          }
        };
        
        checkAndNavigate();
      } else {
        navigateTo(href);
      }
    }
    // If not Electron, let the normal Link behavior happen
  };

  return { handleClick, isElectron };
}