import { StorageAdapter } from "./types";

export class IndexedDBAdapter<T> implements StorageAdapter<T> {
  private dbName: string;
  private storeName: string;
  private version: number;

  constructor(dbName: string, storeName: string, version: number = 1) {
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

  async get(key: string): Promise<T | null> {
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
        
        // If this looks like a stored File object, reconstruct it
        if (result.buffer && result.name && result.type) {
          try {
            const file = new File([result.buffer], result.name, {
              type: result.type,
              lastModified: result.lastModified
            });
            resolve(file as T);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(result);
        }
      };
    });
  }

  async set(key: string, value: T): Promise<void> {
    let dataToStore: any;
    
    // Handle File objects specially for Safari compatibility
    // Convert File to ArrayBuffer BEFORE creating the transaction
    // This prevents the transaction from timing out during the async operation
    if (value instanceof File) {
      try {
        const buffer = await value.arrayBuffer();
        dataToStore = {
          id: key,
          name: value.name,
          type: value.type,
          size: value.size,
          lastModified: value.lastModified,
          buffer: buffer
        };
      } catch (error) {
        throw error;
      }
    } else {
      dataToStore = { id: key, ...value };
    }

    // Now create the transaction and store the data immediately
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      // Add transaction error handlers
      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.onabort = () => {
        reject(new Error("Transaction was aborted"));
      };

      const request = store.put(dataToStore);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
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
      request.onsuccess = () => resolve();
    });
  }
}
