/**
 * Electron Environment Detection
 * Utilities to detect when running in Electron and adjust behavior accordingly
 */

export function isElectron(): boolean {
  // Check for Electron environment variables
  if (typeof window !== 'undefined') {
    // Check for electron APIs
    return !!(window as any).electronAPI;
  }
  
  // Server-side check
  return process.env.NEXT_PUBLIC_ELECTRON === 'true';
}

export function isDesktopMode(): boolean {
  return isElectron();
}

export function getEnvironmentInfo() {
  return {
    isElectron: isElectron(),
    isDesktop: isDesktopMode(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
    platform: typeof window !== 'undefined' ? window.navigator.platform : 'Server'
  };
}