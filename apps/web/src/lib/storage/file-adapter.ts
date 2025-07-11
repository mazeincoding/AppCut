import { StorageAdapter } from "./types";

// Safari-compatible file storage using IndexedDB with ArrayBuffer
export class SafariFileAdapter implements StorageAdapter<File> {
  private dbName: string;
  private storeName: string;
  private version: number;

  constructor(dbName: string, storeName: string = "files", version: number = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  async get(key: string): Promise<File | null> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readonly");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        try {
          // Reconstruct File from stored ArrayBuffer and metadata
          const file = new File([result.buffer], result.name, {
            type: result.type,
            lastModified: result.lastModified,
          });
          resolve(file);
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  async set(key: string, file: File): Promise<void> {
    try {
      // Convert File to ArrayBuffer BEFORE creating the transaction
      // This prevents the transaction from timing out during the async operation
      const buffer = await file.arrayBuffer();

      const fileData = {
        id: key,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        buffer: buffer,
      };

      // Now create the transaction and store the data immediately
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        // Add transaction error handler
        transaction.onerror = () => {
          reject(transaction.error);
        };

        transaction.onabort = () => {
          reject(new Error("Transaction was aborted"));
        };

        const request = store.put(fileData);
        
        request.onerror = () => {
          reject(request.error);
        };
        
        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async list(): Promise<string[]> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readonly");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // Helper method to check if this adapter should be used
  static shouldUse(): boolean {
    // Use for Safari or when OPFS is not supported
    const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
    const hasOPFS = 'storage' in navigator && 'getDirectory' in navigator.storage;
    
    return isSafari || !hasOPFS;
  }
}
