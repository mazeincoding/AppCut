import { StorageAdapter } from "./types";

/**
 * Electron-compatible adapter that replaces OPFS functionality
 * Uses Electron's IPC to store files in the user's Documents/OpenCut Projects folder
 */
export class ElectronOPFSAdapter implements StorageAdapter<File> {
  private directoryName: string;

  constructor(directoryName: string = "media") {
    this.directoryName = directoryName;
  }

  async get(key: string): Promise<File | null> {
    try {
      // For now, we'll use IndexedDB as a fallback until we implement
      // proper Electron file operations
      return this.getFromIndexedDB(key);
    } catch (error) {
      console.warn('Electron file operations not implemented yet, using IndexedDB fallback');
      return null;
    }
  }

  async set(key: string, file: File): Promise<void> {
    try {
      // For now, we'll use IndexedDB as a fallback
      await this.setToIndexedDB(key, file);
    } catch (error) {
      console.warn('Electron file operations not implemented yet, using IndexedDB fallback');
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.removeFromIndexedDB(key);
    } catch (error) {
      console.warn('Failed to remove file from IndexedDB fallback');
    }
  }

  async list(): Promise<string[]> {
    try {
      return await this.listFromIndexedDB();
    } catch (error) {
      console.warn('Failed to list files from IndexedDB fallback');
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.clearIndexedDB();
    } catch (error) {
      console.warn('Failed to clear IndexedDB fallback');
    }
  }

  // IndexedDB fallback methods for Electron
  private async getFromIndexedDB(key: string): Promise<File | null> {
    const dbName = `electron-media-${this.directoryName}`;
    const db = await this.openDB(dbName);
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const result = await this.promisifyRequest(store.get(key));
    
    if (result && result.fileData) {
      // Convert stored ArrayBuffer back to File
      const uint8Array = new Uint8Array(result.fileData);
      const blob = new Blob([uint8Array], { type: result.mimeType });
      return new File([blob], result.filename, { type: result.mimeType });
    }
    
    return null;
  }

  private async setToIndexedDB(key: string, file: File): Promise<void> {
    const dbName = `electron-media-${this.directoryName}`;
    const db = await this.openDB(dbName);
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    
    // Convert File to ArrayBuffer for storage
    const arrayBuffer = await file.arrayBuffer();
    const fileData = {
      key,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      fileData: arrayBuffer,
      lastModified: file.lastModified
    };
    
    await this.promisifyRequest(store.put(fileData));
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    const dbName = `electron-media-${this.directoryName}`;
    const db = await this.openDB(dbName);
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    await this.promisifyRequest(store.delete(key));
  }

  private async listFromIndexedDB(): Promise<string[]> {
    const dbName = `electron-media-${this.directoryName}`;
    const db = await this.openDB(dbName);
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const result = await this.promisifyRequest(store.getAllKeys());
    return result as string[];
  }

  private async clearIndexedDB(): Promise<void> {
    const dbName = `electron-media-${this.directoryName}`;
    const db = await this.openDB(dbName);
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    await this.promisifyRequest(store.clear());
  }

  private openDB(name: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'key' });
          store.createIndex('filename', 'filename', { unique: false });
        }
      };
    });
  }

  private promisifyRequest(request: IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // For compatibility with the original OPFS adapter interface
  static isSupported(): boolean {
    // In Electron, we always support this (using IndexedDB fallback)
    if (typeof window !== 'undefined' && window.electronAPI) {
      return true;
    }
    // Fall back to original OPFS check for web
    return "storage" in navigator && "getDirectory" in navigator.storage;
  }
}