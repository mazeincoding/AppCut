import { StorageAdapter } from "./types";

export class IndexedDBAdapter<T> implements StorageAdapter<T> {
  private dbName: string;
  private storeName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string, version: number = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  // Static method to delete a database with proper connection handling
  static async deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        // onversionchange is triggered when deleteDatabase is called
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };

        resolve(this.db);
      };

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
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async set(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.put({ id: key, ...value });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
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
