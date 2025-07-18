/**
 * Electron-specific storage adapter
 * Provides fallbacks for web APIs not available in Electron
 */

// Check if we're running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.electronAPI !== undefined;
};

// Storage adapter interface matching the web storage service
export interface StorageAdapter {
  isAvailable(): boolean;
  hasOPFS(): boolean;
  getStorageEstimate(): Promise<{ usage: number; quota: number }>;
}

// Electron storage adapter using native file system
export class ElectronStorageAdapter implements StorageAdapter {
  isAvailable(): boolean {
    // IndexedDB is available in Electron
    return typeof window !== 'undefined' && !!window.indexedDB;
  }

  hasOPFS(): boolean {
    // OPFS is not available in Electron, but we can use native file system
    return false;
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    // Electron doesn't have navigator.storage.estimate()
    // Return large values since desktop apps have more storage
    return {
      usage: 0, // Would need to calculate from IndexedDB
      quota: 10 * 1024 * 1024 * 1024 // 10GB default for desktop
    };
  }
}

// Web storage adapter (original implementation)
export class WebStorageAdapter implements StorageAdapter {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 
           !!window.indexedDB && 
           !!navigator.storage;
  }

  hasOPFS(): boolean {
    return typeof navigator !== 'undefined' && 
           'storage' in navigator && 
           'getDirectory' in navigator.storage;
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    throw new Error('Storage estimate not available');
  }
}

// Factory function to get the appropriate storage adapter
export function getStorageAdapter(): StorageAdapter {
  if (isElectron()) {
    console.log('Using Electron storage adapter');
    return new ElectronStorageAdapter();
  }
  console.log('Using Web storage adapter');
  return new WebStorageAdapter();
}

// Export a singleton instance
export const storageAdapter = getStorageAdapter();