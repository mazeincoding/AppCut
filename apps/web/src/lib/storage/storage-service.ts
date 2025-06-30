import { TProject } from "@/types/project";
import { MediaItem } from "@/stores/media-store";
import { IndexedDBAdapter } from "./indexeddb-adapter";
import { OPFSAdapter } from "./opfs-adapter";
import { MediaFileData, StorageConfig, SerializedProject } from "./types";

class StorageService {
  private projectsAdapter: IndexedDBAdapter<SerializedProject>;
  private mediaMetadataAdapter: IndexedDBAdapter<MediaFileData>;
  private mediaFilesAdapter: OPFSAdapter;
  private config: StorageConfig;

  constructor() {
    this.config = {
      projectsDb: "video-editor-projects",
      mediaDb: "video-editor-media",
      version: 1,
    };

    this.projectsAdapter = new IndexedDBAdapter<SerializedProject>(
      this.config.projectsDb,
      "projects",
      this.config.version
    );

    this.mediaMetadataAdapter = new IndexedDBAdapter<MediaFileData>(
      this.config.mediaDb,
      "media-metadata",
      this.config.version
    );

    this.mediaFilesAdapter = new OPFSAdapter("media-files");
  }

  // Project operations
  async saveProject(project: TProject): Promise<void> {
    // Convert TProject to serializable format
    const serializedProject: SerializedProject = {
      id: project.id,
      name: project.name,
      thumbnail: project.thumbnail,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };

    await this.projectsAdapter.set(project.id, serializedProject);
  }

  async loadProject(id: string): Promise<TProject | null> {
    const serializedProject = await this.projectsAdapter.get(id);

    if (!serializedProject) return null;

    // Convert back to TProject format
    return {
      id: serializedProject.id,
      name: serializedProject.name,
      thumbnail: serializedProject.thumbnail,
      createdAt: new Date(serializedProject.createdAt),
      updatedAt: new Date(serializedProject.updatedAt),
    };
  }

  async loadAllProjects(): Promise<TProject[]> {
    const projectIds = await this.projectsAdapter.list();
    const projects: TProject[] = [];

    for (const id of projectIds) {
      const project = await this.loadProject(id);
      if (project) {
        projects.push(project);
      }
    }

    // Sort by last updated (most recent first)
    return projects.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async deleteProject(id: string): Promise<void> {
    await this.projectsAdapter.remove(id);
  }

  // Media operations
  async saveMediaItem(mediaItem: MediaItem): Promise<void> {
    // Save file to OPFS
    await this.mediaFilesAdapter.set(mediaItem.id, mediaItem.file);

    // Save metadata to IndexedDB
    const metadata: MediaFileData = {
      id: mediaItem.id,
      name: mediaItem.name,
      type: mediaItem.type,
      size: mediaItem.file.size,
      lastModified: mediaItem.file.lastModified,
      aspectRatio: mediaItem.aspectRatio,
      duration: mediaItem.duration,
    };

    await this.mediaMetadataAdapter.set(mediaItem.id, metadata);
  }

  async loadMediaItem(id: string): Promise<MediaItem | null> {
    const [file, metadata] = await Promise.all([
      this.mediaFilesAdapter.get(id),
      this.mediaMetadataAdapter.get(id),
    ]);

    if (!file || !metadata) return null;

    // Create new object URL for the file
    const url = URL.createObjectURL(file);

    return {
      id: metadata.id,
      name: metadata.name,
      type: metadata.type,
      file,
      url,
      aspectRatio: metadata.aspectRatio,
      duration: metadata.duration,
      // thumbnailUrl would need to be regenerated or cached separately
    };
  }

  async loadAllMediaItems(): Promise<MediaItem[]> {
    const mediaIds = await this.mediaMetadataAdapter.list();
    const mediaItems: MediaItem[] = [];

    for (const id of mediaIds) {
      const item = await this.loadMediaItem(id);
      if (item) {
        mediaItems.push(item);
      }
    }

    return mediaItems;
  }

  async deleteMediaItem(id: string): Promise<void> {
    await Promise.all([
      this.mediaFilesAdapter.remove(id),
      this.mediaMetadataAdapter.remove(id),
    ]);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.projectsAdapter.clear(),
      this.mediaMetadataAdapter.clear(),
      this.mediaFilesAdapter.clear(),
    ]);
  }

  async getStorageInfo(): Promise<{
    projects: number;
    mediaItems: number;
    isOPFSSupported: boolean;
    isIndexedDBSupported: boolean;
  }> {
    const [projectIds, mediaIds] = await Promise.all([
      this.projectsAdapter.list(),
      this.mediaMetadataAdapter.list(),
    ]);

    return {
      projects: projectIds.length,
      mediaItems: mediaIds.length,
      isOPFSSupported: this.isOPFSSupported(),
      isIndexedDBSupported: this.isIndexedDBSupported(),
    };
  }

  // Check browser support
  isOPFSSupported(): boolean {
    return OPFSAdapter.isSupported();
  }

  isIndexedDBSupported(): boolean {
    return "indexedDB" in window;
  }

  isFullySupported(): boolean {
    return this.isIndexedDBSupported() && this.isOPFSSupported();
  }
}

// Export singleton instance
export const storageService = new StorageService();
export { StorageService };
