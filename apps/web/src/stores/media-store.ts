import { create } from "zustand";
import { storageService } from "@/lib/storage/storage-service";
import { useTimelineStore } from "./timeline-store";
import { generateUUID } from "@/lib/utils";
import { generateEnhancedThumbnails, type EnhancedThumbnailOptions } from "@/lib/ffmpeg-utils";
import { thumbnailCache } from "@/lib/thumbnail-cache";

export type MediaType = "image" | "video" | "audio";

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  file?: File; // Optional for generated images
  url?: string; // Object URL for preview or direct URL for generated
  thumbnailUrl?: string; // For video thumbnails
  duration?: number; // For video/audio duration
  width?: number; // For video/image width
  height?: number; // For video/image height
  fps?: number; // For video frame rate
  size?: number; // File size in bytes
  // Text-specific properties
  content?: string; // Text content
  fontSize?: number; // Font size
  fontFamily?: string; // Font family
  color?: string; // Text color
  backgroundColor?: string; // Background color
  textAlign?: "left" | "center" | "right"; // Text alignment
  // Generated image metadata
  metadata?: {
    source?: "text2image" | "upload";
    model?: string;
    prompt?: string;
    settings?: any;
    generatedAt?: Date;
  };
  // Enhanced thumbnail properties
  thumbnails?: string[]; // Multiple thumbnail URLs for scrubbing
  thumbnailTimestamps?: number[]; // Timestamps for each thumbnail
  thumbnailResolution?: 'low' | 'medium' | 'high'; // Current quality level
  thumbnailError?: string; // Error message if generation failed
  thumbnailMetadata?: {
    sceneDetected?: boolean;
    generatedAt: number;
    cacheSize: number;
  };
  // Timeline preview properties
  timelinePreviews?: {
    thumbnails: string[]; // Timeline-specific thumbnail URLs
    timestamps: number[]; // Corresponding timestamps for timeline
    quality: 'low' | 'medium' | 'high'; // Quality level for timeline previews
    density: number; // Thumbnails per second for timeline
    elementDuration?: number; // Duration this was generated for
    generatedAt: number; // When timeline previews were generated
    zoomLevel?: number; // Zoom level these previews were optimized for
  };
}

interface MediaStore {
  mediaItems: MediaItem[];
  isLoading: boolean;

  // Actions - now require projectId
  addMediaItem: (
    projectId: string,
    item: Omit<MediaItem, "id">
  ) => Promise<void>;
  removeMediaItem: (projectId: string, id: string) => Promise<void>;
  loadProjectMedia: (projectId: string) => Promise<void>;
  clearProjectMedia: (projectId: string) => Promise<void>;
  clearAllMedia: () => void; // Clear local state only
  
  // Generated image actions
  addGeneratedImages: (items: Array<Omit<MediaItem, "id">>) => void;
  
  // Enhanced thumbnail methods
  generateEnhancedThumbnails: (mediaId: string, options?: EnhancedThumbnailOptions) => Promise<void>;
  getThumbnailAtTime: (mediaId: string, timestamp: number) => string | null;
  setThumbnailQuality: (mediaId: string, quality: 'low' | 'medium' | 'high') => Promise<void>;
  clearThumbnailCache: () => void;
  
  // Timeline preview methods
  generateTimelinePreviews: (mediaId: string, options: {
    density?: number;
    elementDuration?: number; 
    quality?: 'low' | 'medium' | 'high';
    zoomLevel?: number;
  }) => Promise<void>;
  getTimelinePreviewStrip: (mediaId: string, elementDuration: number, zoomLevel: number) => string[];
  getTimelinePreviewAtPosition: (mediaId: string, relativePosition: number, elementDuration: number) => {
    thumbnailUrl: string;
    timestamp: number;
    exactTimestamp: number;
  } | null;
  clearTimelinePreviews: (mediaId: string) => void;
  shouldRegenerateTimelinePreviews: (mediaId: string, currentZoomLevel: number, elementDuration: number) => boolean;
}

// Helper function to determine file type
export const getFileType = (file: File): MediaType | null => {
  const { type } = file;

  if (type.startsWith("image/")) {
    return "image";
  }
  if (type.startsWith("video/")) {
    return "video";
  }
  if (type.startsWith("audio/")) {
    return "audio";
  }

  return null;
};

// Helper function to get image dimensions
export const getImageDimensions = (
  file: File
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.addEventListener("load", () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      resolve({ width, height });
      img.remove();
    });

    img.addEventListener("error", () => {
      reject(new Error("Could not load image"));
      img.remove();
    });

    img.src = URL.createObjectURL(file);
  });
};

// Helper function to generate video thumbnail and get dimensions
export const generateVideoThumbnail = (
  file: File
): Promise<{ thumbnailUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video") as HTMLVideoElement;
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    video.addEventListener("loadedmetadata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to 1 second or 10% of duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    });

    video.addEventListener("seeked", () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
      const width = video.videoWidth;
      const height = video.videoHeight;

      resolve({ thumbnailUrl, width, height });

      // Cleanup
      video.remove();
      canvas.remove();
    });

    video.addEventListener("error", () => {
      reject(new Error("Could not load video"));
      video.remove();
      canvas.remove();
    });

    video.src = URL.createObjectURL(file);
    video.load();
  });
};

// Helper function to get media duration
export const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const element = document.createElement(
      file.type.startsWith("video/") ? "video" : "audio"
    ) as HTMLVideoElement;

    element.addEventListener("loadedmetadata", () => {
      resolve(element.duration);
      element.remove();
    });

    element.addEventListener("error", () => {
      reject(new Error("Could not load media"));
      element.remove();
    });

    element.src = URL.createObjectURL(file);
    element.load();
  });
};

// Helper to get aspect ratio from MediaItem
export const getMediaAspectRatio = (item: MediaItem): number => {
  if (item.width && item.height) {
    return item.width / item.height;
  }
  return 16 / 9; // Default aspect ratio
};

export const useMediaStore = create<MediaStore>((set, get) => ({
  mediaItems: [],
  isLoading: false,

  addMediaItem: async (projectId, item) => {
    const newItem: MediaItem = {
      ...item,
      id: generateUUID(),
    };

    // Add to local state immediately for UI responsiveness
    set((state) => ({
      mediaItems: [...state.mediaItems, newItem],
    }));

    // Save to persistent storage in background
    try {
      await storageService.saveMediaItem(projectId, newItem);
    } catch (error) {
      console.error("Failed to save media item:", error);
      // Remove from local state if save failed
      set((state) => ({
        mediaItems: state.mediaItems.filter((media) => media.id !== newItem.id),
      }));
    }
  },

  removeMediaItem: async (projectId, id: string) => {
    const state = get();
    const item = state.mediaItems.find((media) => media.id === id);

    // Cleanup object URLs to prevent memory leaks
    if (item && item.url) {
      URL.revokeObjectURL(item.url);
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    }

    // Remove from local state immediately
    set((state) => ({
      mediaItems: state.mediaItems.filter((media) => media.id !== id),
    }));

    // Remove from persistent storage
    try {
      await storageService.deleteMediaItem(projectId, id);
    } catch (error) {
      console.error("Failed to delete media item:", error);
    }
  },

  loadProjectMedia: async (projectId) => {
    set({ isLoading: true });

    try {
      const mediaItems = await storageService.loadAllMediaItems(projectId);
      set({ mediaItems });
    } catch (error) {
      console.error("Failed to load media items:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearProjectMedia: async (projectId) => {
    const state = get();

    // Cleanup all object URLs
    state.mediaItems.forEach((item) => {
      if (item.url) {
        URL.revokeObjectURL(item.url);
      }
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    });

    // Clear local state
    set({ mediaItems: [] });

    // Clear persistent storage
    try {
      const mediaIds = state.mediaItems.map((item) => item.id);
      await Promise.all(
        mediaIds.map((id) => storageService.deleteMediaItem(projectId, id))
      );
    } catch (error) {
      console.error("Failed to clear media items from storage:", error);
    }
  },

  clearAllMedia: () => {
    const state = get();

    // Cleanup all object URLs
    state.mediaItems.forEach((item) => {
      if (item.url) {
        URL.revokeObjectURL(item.url);
      }
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    });

    // Clear local state
    set({ mediaItems: [] });
  },

  addGeneratedImages: (items) => {
    // Convert items to full MediaItem objects with IDs
    const newItems: MediaItem[] = items.map((item) => ({
      ...item,
      id: generateUUID(),
      metadata: {
        ...item.metadata,
        source: "text2image",
      },
    }));

    // Add to local state
    set((state) => ({
      mediaItems: [...state.mediaItems, ...newItems],
    }));

    console.log(`Added ${newItems.length} generated images to media panel`);
  },

  generateEnhancedThumbnails: async (mediaId, options = {}) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item || !item.file || item.type !== 'video') return;
    
    try {
      // Default options for enhanced thumbnails
      const defaultOptions: EnhancedThumbnailOptions = {
        resolution: options.resolution || 'medium',
        timestamps: options.timestamps || [
          1,
          item.duration ? item.duration * 0.25 : 5,
          item.duration ? item.duration * 0.5 : 10,
          item.duration ? item.duration * 0.75 : 15
        ].filter(t => !item.duration || t < item.duration),
        sceneDetection: options.sceneDetection ?? true,
        quality: options.quality || 0.8,
        format: options.format || 'jpeg'
      };

      const { thumbnails, metadata } = await generateEnhancedThumbnails(item.file, defaultOptions);
      
      // Cache thumbnails
      for (let i = 0; i < thumbnails.length; i++) {
        await thumbnailCache.cacheThumbnail(
          mediaId,
          metadata.timestamps[i],
          thumbnails[i],
          defaultOptions.resolution!
        );
      }
      
      set((state) => ({
        mediaItems: state.mediaItems.map(existing => 
          existing.id === mediaId 
            ? { 
                ...existing, 
                thumbnails,
                thumbnailTimestamps: metadata.timestamps,
                thumbnailUrl: thumbnails[0], // Set first as primary
                thumbnailError: undefined,
                thumbnailResolution: defaultOptions.resolution,
                thumbnailMetadata: {
                  sceneDetected: defaultOptions.sceneDetection || false,
                  generatedAt: Date.now(),
                  cacheSize: thumbnails.length
                }
              }
            : existing
        )
      }));
    } catch (error) {
      console.error('Failed to generate enhanced thumbnails:', error);
      set((state) => ({
        mediaItems: state.mediaItems.map(existing => 
          existing.id === mediaId 
            ? { ...existing, thumbnailError: error instanceof Error ? error.message : 'Unknown error' }
            : existing
        )
      }));
    }
  },

  getThumbnailAtTime: (mediaId, timestamp) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item?.thumbnails || !item?.thumbnailTimestamps) {
      // Try to get from cache
      return thumbnailCache.getClosestThumbnail(mediaId, timestamp);
    }
    
    // Find closest thumbnail to requested timestamp
    let closestIndex = 0;
    let minDiff = Math.abs(item.thumbnailTimestamps[0] - timestamp);
    
    for (let i = 1; i < item.thumbnailTimestamps.length; i++) {
      const diff = Math.abs(item.thumbnailTimestamps[i] - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    return item.thumbnails[closestIndex];
  },

  setThumbnailQuality: async (mediaId, quality) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item || item.type !== 'video') return;

    // Clear existing thumbnails from cache
    thumbnailCache.clearVideoCache(mediaId);

    // Generate new thumbnails with specified quality
    await get().generateEnhancedThumbnails(mediaId, {
      resolution: quality,
      timestamps: item.thumbnailTimestamps || [1, 5, 10, 15, 20],
      sceneDetection: item.thumbnailMetadata?.sceneDetected ?? true
    });
  },

  clearThumbnailCache: () => {
    thumbnailCache.clearAllCache();
    console.log('Thumbnail cache cleared');
  },

  // Timeline preview methods
  generateTimelinePreviews: async (mediaId, options) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item || !item.file || item.type !== 'video') {
      console.warn('Cannot generate timeline previews: invalid media item', { mediaId, type: item?.type });
      return;
    }

    try {
      console.log('🎬 Generating timeline previews for:', mediaId, options);
      
      // Calculate timestamps based on density and duration
      const { density = 2, elementDuration = item.duration || 10, quality = 'medium', zoomLevel = 1 } = options;
      const interval = 1 / density;
      const timestamps: number[] = [];
      
      // Generate timestamps at regular intervals
      for (let t = 0; t < elementDuration; t += interval) {
        timestamps.push(Math.min(t, (item.duration || elementDuration) - 0.1));
      }
      
      // Ensure we have at least one timestamp
      if (timestamps.length === 0) {
        timestamps.push(0);
      }
      
      // Generate thumbnails using existing enhanced thumbnail system
      const { thumbnails } = await generateEnhancedThumbnails(item.file, {
        timestamps,
        resolution: quality,
        quality: 0.7, // Optimized for timeline display
        format: 'jpeg'
      });
      
      // Cache each thumbnail individually for efficient retrieval
      for (let i = 0; i < thumbnails.length; i++) {
        await thumbnailCache.cacheThumbnail(
          mediaId,
          timestamps[i],
          thumbnails[i],
          quality
        );
      }
      
      // Update media item with timeline preview metadata
      set((state) => ({
        mediaItems: state.mediaItems.map(existing => 
          existing.id === mediaId 
            ? { 
                ...existing, 
                timelinePreviews: {
                  thumbnails,
                  timestamps,
                  quality,
                  density,
                  elementDuration,
                  generatedAt: Date.now(),
                  zoomLevel
                }
              }
            : existing
        )
      }));
      
      console.log('✅ Timeline previews generated:', thumbnails.length, 'thumbnails');
      
    } catch (error) {
      console.error('❌ Failed to generate timeline previews:', error);
      
      // Provide more helpful error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred during timeline preview generation';
      
      // Update item with error state
      set((state) => ({
        mediaItems: state.mediaItems.map(existing => 
          existing.id === mediaId 
            ? { ...existing, thumbnailError: `Timeline preview generation failed: ${errorMessage}` }
            : existing
        )
      }));
      
      // Don't throw error to prevent UI crashes - let component handle gracefully
      console.log('Timeline preview generation failed, component will show fallback UI');
    }
  },

  getTimelinePreviewStrip: (mediaId, elementDuration, zoomLevel) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item?.timelinePreviews) {
      console.log('No timeline previews available for:', mediaId);
      return [];
    }
    
    // Return appropriate thumbnails based on zoom level and duration
    const { thumbnails, density, generatedAt } = item.timelinePreviews;
    
    // Check if previews are stale (older than 5 minutes)
    const isStale = Date.now() - generatedAt > 5 * 60 * 1000;
    if (isStale) {
      console.log('Timeline previews are stale, regeneration recommended');
    }
    
    // Adjust thumbnail density based on zoom level
    const targetDensity = Math.max(1, Math.floor(zoomLevel * density));
    const step = Math.max(1, Math.floor(thumbnails.length / targetDensity));
    
    const selectedThumbnails = thumbnails.filter((_, index) => index % step === 0);
    console.log('📊 Timeline preview strip:', selectedThumbnails.length, 'thumbnails for zoom', zoomLevel);
    
    return selectedThumbnails;
  },

  getTimelinePreviewAtPosition: (mediaId, relativePosition, elementDuration) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item?.timelinePreviews) return null;
    
    // Calculate timestamp from relative position (0-1)
    const timestamp = relativePosition * elementDuration;
    
    // Find closest thumbnail to the timestamp
    const { thumbnails, timestamps } = item.timelinePreviews;
    let closestIndex = 0;
    let minDiff = Math.abs(timestamps[0] - timestamp);
    
    for (let i = 1; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    return {
      thumbnailUrl: thumbnails[closestIndex],
      timestamp: timestamps[closestIndex],
      exactTimestamp: timestamp
    };
  },

  clearTimelinePreviews: (mediaId) => {
    set((state) => ({
      mediaItems: state.mediaItems.map(existing => 
        existing.id === mediaId 
          ? { ...existing, timelinePreviews: undefined }
          : existing
      )
    }));
    
    // Clear related cache entries
    thumbnailCache.clearVideoCache(mediaId);
    console.log('Timeline previews cleared for:', mediaId);
  },

  // Utility method to check if timeline previews need regeneration
  shouldRegenerateTimelinePreviews: (mediaId, currentZoomLevel, elementDuration) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item?.timelinePreviews) return true;
    
    const { zoomLevel, elementDuration: cachedDuration, generatedAt } = item.timelinePreviews;
    
    // Regenerate if zoom level changed significantly
    const zoomChanged = Math.abs((zoomLevel || 1) - currentZoomLevel) > 0.5;
    
    // Regenerate if duration changed
    const durationChanged = Math.abs((cachedDuration || 0) - elementDuration) > 0.1;
    
    // Regenerate if previews are old (over 10 minutes)
    const isOld = Date.now() - generatedAt > 10 * 60 * 1000;
    
    return zoomChanged || durationChanged || isOld;
  },
}));
