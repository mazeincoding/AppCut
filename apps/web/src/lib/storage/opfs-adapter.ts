import { StorageAdapter } from "./types";

export class OPFSAdapter implements StorageAdapter<File> {
  private directoryName: string;

  constructor(directoryName: string = "media") {
    this.directoryName = directoryName;
  }
 
  private getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
    return navigator.storage.getDirectory();
  }

  private async getDirectory(): Promise<FileSystemDirectoryHandle> {
    const opfsRoot = await this.getOPFSRoot();
    return await opfsRoot.getDirectoryHandle(this.directoryName, {
      create: true,
    });
  }

  async get(key: string): Promise<File | null> {
    try {
      const directory = await this.getDirectory();
      const fileHandle = await directory.getFileHandle(key);
      return await fileHandle.getFile();
    } catch (error) {
      if ((error as Error).name === "NotFoundError") {
        return null;
      }
      throw error;
    }
  }

  async set(key: string, file: File): Promise<void> {
    const directory = await this.getDirectory();
    const fileHandle = await directory.getFileHandle(key, { create: true });
    const writable = await fileHandle.createWritable();

    await writable.write(file);
    await writable.close();
  }

  async remove(key: string): Promise<void> {
    try {
      const directory = await this.getDirectory();
      await directory.removeEntry(key);
    } catch (error) {
      if ((error as Error).name !== "NotFoundError") {
        throw error;
      }
    }
  }

  async list(): Promise<string[]> {
    const directory = await this.getDirectory();
    const keys: string[] = [];

    for await (const name of directory.keys()) {
      keys.push(name);
    }

    return keys;
  }

  async clear(): Promise<void> {
    const opfsRoot = await this.getOPFSRoot();

    // remove this directory and its contents
    await opfsRoot.removeEntry(this.directoryName, { recursive: true });
  }

  // Helper method to check OPFS support
  static isSupported(): boolean {
    return "storage" in navigator && "getDirectory" in navigator.storage;
  }
}
