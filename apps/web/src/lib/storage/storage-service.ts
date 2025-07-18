import { TProject } from "@/types/project";
import { MediaItem } from "@/stores/media-store";
import { IndexedDBAdapter } from "./indexeddb-adapter";
import { OPFSAdapter } from "./opfs-adapter";
import { ElectronOPFSAdapter } from "./electron-opfs-adapter";
import {
  MediaFileData,
  StorageConfig,
  SerializedProject,
  TimelineData,
} from "./types";
import { TimelineTrack } from "@/types/timeline";

// Check if we're running in Electron
const isElectron = () => {
  // Check multiple ways to detect Electron
  if (typeof window !== 'undefined') {
    // Primary check: electronAPI exists
    if (window.electronAPI !== undefined) {
      console.log('🔍 [STORAGE] Electron detected via electronAPI');
      return true;
    }
    
    // Secondary check: environment variable
    if (process.env.NEXT_PUBLIC_ELECTRON === 'true') {
      console.log('🔍 [STORAGE] Electron detected via env var');
      return true;
    }
    
    // Tertiary check: user agent contains Electron
    if (navigator.userAgent.toLowerCase().includes('electron')) {
      console.log('🔍 [STORAGE] Electron detected via user agent');
      return true;
    }
    
    // Additional check: look for Electron in global
    if (typeof window.require !== 'undefined') {
      console.log('🔍 [STORAGE] Electron detected via require function');
      return true;
    }
    
    // Check document body for electron attribute
    if (document.body && document.body.hasAttribute('data-electron')) {
      console.log('🔍 [STORAGE] Electron detected via body data-electron attribute');
      return true;
    }
  }
  
  console.log('🔍 [STORAGE] No Electron environment detected');
  return false;
};

class StorageService {
  private projectsAdapter: IndexedDBAdapter<SerializedProject>;
  private config: StorageConfig;

  constructor() {
    console.log('🏗️ StorageService: Initializing storage service...');
    console.log('🔍 StorageService: Environment check:', {
      isElectron: isElectron(),
      hasElectronAPI: typeof window !== 'undefined' ? !!window.electronAPI : 'window undefined',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'navigator undefined',
      electronEnvVar: process.env.NEXT_PUBLIC_ELECTRON
    });
    
    this.config = {
      projectsDb: "video-editor-projects",
      mediaDb: "video-editor-media",
      timelineDb: "video-editor-timelines",
      version: 1,
    };

    this.projectsAdapter = new IndexedDBAdapter<SerializedProject>(
      this.config.projectsDb,
      "projects",
      this.config.version
    );
    
    console.log('✅ StorageService: Constructor completed');
  }

  // Helper to get project-specific media adapters
  private getProjectMediaAdapters(projectId: string) {
    const mediaMetadataAdapter = new IndexedDBAdapter<MediaFileData>(
      `${this.config.mediaDb}-${projectId}`,
      "media-metadata",
      this.config.version
    );

    // Re-check Electron environment at runtime (not just at initialization)
    const isElectronEnv = isElectron();
    console.log(`🔧 StorageService: Creating media adapter for project ${projectId}:`, {
      isElectronEnv,
      adapterType: isElectronEnv ? 'ElectronOPFSAdapter' : 'OPFSAdapter',
      hasElectronAPI: typeof window !== 'undefined' ? !!window.electronAPI : 'no window',
      bodyDataElectron: typeof document !== 'undefined' && document.body ? document.body.getAttribute('data-electron') : 'no document'
    });
    
    const mediaFilesAdapter = isElectronEnv 
      ? new ElectronOPFSAdapter(`media-files-${projectId}`)
      : new OPFSAdapter(`media-files-${projectId}`);

    return { mediaMetadataAdapter, mediaFilesAdapter };
  }

  // Helper to get project-specific timeline adapter
  private getProjectTimelineAdapter(projectId: string) {
    return new IndexedDBAdapter<TimelineData>(
      `${this.config.timelineDb}-${projectId}`,
      "timeline",
      this.config.version
    );
  }

  // Project operations
  async saveProject(project: TProject): Promise<void> {
    console.log("🚀 [STORAGE DEBUG] Saving project:", project);
    
    // Convert TProject to serializable format
    const serializedProject: SerializedProject = {
      id: project.id,
      name: project.name,
      thumbnail: project.thumbnail,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      backgroundColor: project.backgroundColor,
      backgroundType: project.backgroundType,
      blurIntensity: project.blurIntensity,
    };

    console.log("🚀 [STORAGE DEBUG] Serialized project:", serializedProject);
    console.log("🚀 [STORAGE DEBUG] Using adapter:", this.projectsAdapter.constructor.name);
    
    try {
      await this.projectsAdapter.set(project.id, serializedProject);
      console.log("🚀 [STORAGE DEBUG] Project saved successfully to storage");
    } catch (error) {
      console.error("🚀 [STORAGE DEBUG] Failed to save project to adapter:", error);
      throw error;
    }
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
      backgroundColor: serializedProject.backgroundColor,
      backgroundType: serializedProject.backgroundType,
      blurIntensity: serializedProject.blurIntensity,
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

  // Media operations - now project-specific
  async saveMediaItem(projectId: string, mediaItem: MediaItem): Promise<void> {
    const { mediaMetadataAdapter, mediaFilesAdapter } =
      this.getProjectMediaAdapters(projectId);

    // Save file to project-specific OPFS
    await mediaFilesAdapter.set(mediaItem.id, mediaItem.file);

    // Save metadata to project-specific IndexedDB
    const metadata: MediaFileData = {
      id: mediaItem.id,
      name: mediaItem.name,
      type: mediaItem.type,
      size: mediaItem.file.size,
      lastModified: mediaItem.file.lastModified,
      width: mediaItem.width,
      height: mediaItem.height,
      duration: mediaItem.duration,
    };

    await mediaMetadataAdapter.set(mediaItem.id, metadata);
  }

  async loadMediaItem(
    projectId: string,
    id: string
  ): Promise<MediaItem | null> {
    const { mediaMetadataAdapter, mediaFilesAdapter } =
      this.getProjectMediaAdapters(projectId);

    const [file, metadata] = await Promise.all([
      mediaFilesAdapter.get(id),
      mediaMetadataAdapter.get(id),
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
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      // thumbnailUrl would need to be regenerated or cached separately
    };
  }

  async loadAllMediaItems(projectId: string): Promise<MediaItem[]> {
    const { mediaMetadataAdapter } = this.getProjectMediaAdapters(projectId);

    const mediaIds = await mediaMetadataAdapter.list();
    const mediaItems: MediaItem[] = [];

    for (const id of mediaIds) {
      const item = await this.loadMediaItem(projectId, id);
      if (item) {
        mediaItems.push(item);
      }
    }

    return mediaItems;
  }

  async deleteMediaItem(projectId: string, id: string): Promise<void> {
    const { mediaMetadataAdapter, mediaFilesAdapter } =
      this.getProjectMediaAdapters(projectId);

    await Promise.all([
      mediaFilesAdapter.remove(id),
      mediaMetadataAdapter.remove(id),
    ]);
  }

  async deleteProjectMedia(projectId: string): Promise<void> {
    const { mediaMetadataAdapter, mediaFilesAdapter } =
      this.getProjectMediaAdapters(projectId);

    await Promise.all([
      mediaMetadataAdapter.clear(),
      mediaFilesAdapter.clear(),
    ]);
  }

  // Timeline operations - now project-specific
  async saveTimeline(
    projectId: string,
    tracks: TimelineTrack[]
  ): Promise<void> {
    const timelineAdapter = this.getProjectTimelineAdapter(projectId);
    const timelineData: TimelineData = {
      tracks,
      lastModified: new Date().toISOString(),
    };
    await timelineAdapter.set("timeline", timelineData);
  }

  async loadTimeline(projectId: string): Promise<TimelineTrack[] | null> {
    const timelineAdapter = this.getProjectTimelineAdapter(projectId);
    const timelineData = await timelineAdapter.get("timeline");
    return timelineData ? timelineData.tracks : null;
  }

  async deleteProjectTimeline(projectId: string): Promise<void> {
    const timelineAdapter = this.getProjectTimelineAdapter(projectId);
    await timelineAdapter.remove("timeline");
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    // Clear all projects
    await this.projectsAdapter.clear();

    // Note: Project-specific media and timelines will be cleaned up when projects are deleted
  }

  async getStorageInfo(): Promise<{
    projects: number;
    isOPFSSupported: boolean;
    isIndexedDBSupported: boolean;
  }> {
    const projectIds = await this.projectsAdapter.list();

    return {
      projects: projectIds.length,
      isOPFSSupported: this.isOPFSSupported(),
      isIndexedDBSupported: this.isIndexedDBSupported(),
    };
  }

  async getProjectStorageInfo(projectId: string): Promise<{
    mediaItems: number;
    hasTimeline: boolean;
  }> {
    const { mediaMetadataAdapter } = this.getProjectMediaAdapters(projectId);
    const timelineAdapter = this.getProjectTimelineAdapter(projectId);

    const [mediaIds, timelineData] = await Promise.all([
      mediaMetadataAdapter.list(),
      timelineAdapter.get("timeline"),
    ]);

    return {
      mediaItems: mediaIds.length,
      hasTimeline: !!timelineData,
    };
  }

  // Check browser support
  isOPFSSupported(): boolean {
    // In Electron, we use IndexedDB fallback which is always supported
    if (isElectron()) {
      return true;
    }
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
