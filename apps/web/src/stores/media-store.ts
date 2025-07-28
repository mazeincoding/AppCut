import { create } from "zustand";
import { storageService } from "@/lib/storage/storage-service";

// Debug flag - set to false to disable console logs
const DEBUG_MEDIA_STORE = process.env.NODE_ENV === 'development' && false;
import { useTimelineStore } from "./timeline-store";
import { generateUUID } from "@/lib/utils";
import { generateEnhancedThumbnails, type EnhancedThumbnailOptions } from "@/lib/ffmpeg-utils";
import { thumbnailCache } from "@/lib/thumbnail-cache";

// Track ongoing thumbnail requests to prevent duplicates
const thumbnailRequests = new Map<string, Promise<void>>();
// Track ongoing timeline preview requests to prevent duplicates
const timelinePreviewRequests = new Map<string, Promise<void>>();

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
  // AI Video Processing state tracking
  processingComplete?: boolean;
  lastThumbnailUpdate?: number;
  processingStage?: 'uploading' | 'thumbnail-canvas' | 'thumbnail-ffmpeg' | 'complete' | 'error';
  source?: 'upload' | 'ai' | 'text2image';
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
  ) => Promise<string>;
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
  
  // AI Video Processing methods
  isMediaItemReady: (id: string) => boolean;
  updateProcessingStage: (id: string, stage: MediaItem['processingStage']) => void;
  updateMediaItem: (id: string, updates: Partial<MediaItem>) => void;
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
      
      // ✨ AUTO-GENERATE TIMELINE PREVIEWS: Auto-generate timeline previews for video files
      if (newItem.type === 'video' && newItem.file) {
        console.log('🚫 Auto-generation of timeline previews disabled to prevent FFmpeg errors');
        // Temporarily disabled auto-generation to prevent FFmpeg filesystem errors
        // setTimeout(() => {
        //   get().generateTimelinePreviews(newItem.id, {
        //     density: 2,
        //     quality: 'medium',
        //     zoomLevel: 1,
        //     elementDuration: newItem.duration || 10
        //   }).catch(error => {
        //     console.warn('Failed to auto-generate timeline previews:', error);
        //   });
        // }, 500); // Small delay to ensure file is ready
      }
      
    } catch (error) {
      console.error("Failed to save media item:", error);
      // Remove from local state if save failed
      set((state) => ({
        mediaItems: state.mediaItems.filter((media) => media.id !== newItem.id),
      }));
    }
    
    return newItem.id; // Return media ID for external use
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
    console.log("🎨 MEDIA-STORE: addGeneratedImages() called with", items.length, "items");
    console.log("🎨 MEDIA-STORE: Current mediaItems count before adding:", get().mediaItems.length);
    
    // Convert items to full MediaItem objects with IDs
    const newItems: MediaItem[] = items.map((item) => ({
      ...item,
      id: generateUUID(),
      metadata: {
        ...item.metadata,
        source: "text2image",
      },
    }));

    console.log("🎨 MEDIA-STORE: Generated IDs for new items:", newItems.map(item => ({
      id: item.id,
      name: item.name,
      url: item.url?.substring(0, 50) + '...'
    })));

    // Add to local state immediately (non-breaking)
    set((state) => {
      const updatedItems = [...state.mediaItems, ...newItems];
      if (DEBUG_MEDIA_STORE) console.log("🎨 MEDIA-STORE: Updating mediaItems array from", state.mediaItems.length, "to", updatedItems.length, "items");
      return {
        mediaItems: updatedItems
      };
    });

    if (DEBUG_MEDIA_STORE) {
      console.log(`✅ MEDIA-STORE: Successfully added ${newItems.length} generated images to media panel`);
      console.log("✅ MEDIA-STORE: New total mediaItems count:", get().mediaItems.length);
      console.log("🔄 MEDIA-STORE: Starting background URL to File conversion for generated images");
    }
    
    // Fetch and convert URLs to Files in background
    newItems.forEach(async (item, index) => {
      if (item.url && !item.file) {
        if (DEBUG_MEDIA_STORE) console.log(`🔄 MEDIA-STORE: Converting URL to File for item ${index + 1}/${newItems.length}:`, item.name);
        try {
          const response = await fetch(item.url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          if (DEBUG_MEDIA_STORE) console.log(`📦 MEDIA-STORE: Fetched blob for ${item.name}, size:`, blob.size, "type:", blob.type);
          
          // Extract filename from URL or use default
          const urlParts = item.url.split('/');
          const urlFilename = urlParts[urlParts.length - 1].split('?')[0];
          
          // Ensure generated images have proper file extension
          let fileName = item.name || urlFilename || 'generated-image';
          
          // Add extension if missing for generated images
          if (item.metadata?.source === 'text2image' && !fileName.includes('.')) {
            // Determine extension from blob type
            const mimeType = blob.type || 'image/png';
            const extension = mimeType.split('/')[1] || 'png';
            fileName = `${fileName}.${extension}`;
            console.log('🔧 MEDIA-STORE: Added extension to generated image filename', {
              originalName: item.name,
              newFileName: fileName,
              mimeType: mimeType
            });
          }
          
          // Create File object with proper MIME type
          const file = new File([blob], fileName, { 
            type: blob.type || 'image/png',
            lastModified: Date.now()
          });
          
          if (DEBUG_MEDIA_STORE) {
            console.log(`✅ MEDIA-STORE: Created File object for ${item.name}:`, {
              name: file.name,
              size: file.size,
              type: file.type
            });
          }
          
          // Update the item with the File object
          set((state) => ({
            mediaItems: state.mediaItems.map(mediaItem =>
              mediaItem.id === item.id
                ? { 
                    ...mediaItem, 
                    file,
                    size: file.size // Update size from the actual file
                  }
                : mediaItem
            ),
          }));
          
          if (DEBUG_MEDIA_STORE) console.log(`✅ MEDIA-STORE: Updated media item ${item.name} with File object`);
          
          // Convert the File to data URL for export stability
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            console.log('🔄 MEDIA-STORE: Converting to data URL for export stability', {
              mediaId: item.id,
              originalSize: blob.size,
              dataUrlSize: dataUrl.length,
              mimeType: blob.type
            });
            
            // Update with data URL instead of blob URL
            set((state) => ({
              mediaItems: state.mediaItems.map(mediaItem =>
                mediaItem.id === item.id
                  ? { 
                      ...mediaItem, 
                      url: dataUrl, // Replace blob URL with data URL
                      metadata: {
                        ...mediaItem.metadata,
                        originalBlobSize: blob.size,
                        convertedAt: Date.now()
                      }
                    }
                  : mediaItem
              )
            }));
            
            console.log('✅ MEDIA-STORE: Replaced blob URL with data URL for', item.name);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          if (DEBUG_MEDIA_STORE) console.error(`❌ MEDIA-STORE: Failed to fetch/convert image for ${item.name}:`, error);
          // Optionally mark the item as having an error
          set((state) => ({
            mediaItems: state.mediaItems.map(mediaItem =>
              mediaItem.id === item.id
                ? { 
                    ...mediaItem, 
                    thumbnailError: `Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`
                  }
                : mediaItem
            ),
          }));
        }
      }
    });
  },

  generateEnhancedThumbnails: async (mediaId, options = {}) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item || !item.file || item.type !== 'video') return;
    
    // Check for existing request
    const existingRequest = thumbnailRequests.get(mediaId);
    if (existingRequest) {
      console.log(`⏳ Thumbnail generation already in progress for ${mediaId}, waiting...`);
      return existingRequest;
    }
    
    // Store file reference to ensure type safety
    const videoFile = item.file;
    
    // Create new request
    const request = (async () => {
      // Update processing stage at start
      get().updateProcessingStage(mediaId, 'thumbnail-ffmpeg');
      
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

      const startTime = Date.now();
      let thumbnails: string[] = [];
      let metadata: any = { timestamps: [], duration: 0 };
      
      try {
        const result = await generateEnhancedThumbnails(videoFile, defaultOptions);
        thumbnails = result.thumbnails;
        metadata = result.metadata;
        
        // Debug FFmpeg thumbnail completion (disabled by default)
        // console.log('🎬 FFMPEG THUMBNAIL COMPLETE:', {
        //   mediaItemId: mediaId,
        //   thumbnailCount: thumbnails.length,
        //   duration: metadata.duration,
        //   processingTime: Date.now() - startTime
        // });
      } catch (thumbnailError) {
        console.error('❌ Thumbnail generation failed:', {
          mediaId,
          error: thumbnailError,
          fileName: videoFile?.name,
          fileType: videoFile?.type
        });
        // Continue with empty thumbnails rather than throwing
        thumbnails = [];
        metadata = { timestamps: [], duration: 0 };
      }
      
      // Cache thumbnails
      for (let i = 0; i < thumbnails.length; i++) {
        await thumbnailCache.cacheThumbnail(
          mediaId,
          metadata.timestamps[i],
          thumbnails[i],
          defaultOptions.resolution!
        );
      }
      
      // Update processing stage to complete
      get().updateProcessingStage(mediaId, 'complete');
      
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
        
        // Update processing stage to error
        get().updateProcessingStage(mediaId, 'error');
        
        set((state) => ({
          mediaItems: state.mediaItems.map(existing => 
            existing.id === mediaId 
              ? { ...existing, thumbnailError: error instanceof Error ? error.message : 'Unknown error' }
              : existing
          )
        }));
      } finally {
        // Clean up request tracking
        thumbnailRequests.delete(mediaId);
      }
    })();
    
    // Store the request promise
    thumbnailRequests.set(mediaId, request);
    return request;
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
    // Temporarily disabled to prevent FFmpeg errors and timeouts
    console.log('🚫 MEDIA-STORE: Timeline preview generation disabled to prevent FFmpeg errors');
    return;
    
    /* ALL CODE BELOW IS UNREACHABLE AND DISABLED
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item) {
      console.warn('Cannot generate timeline previews: media item not found', { mediaId });
      return;
    }
    
    if (!item.file || item.type !== 'video') {
      console.warn('Cannot generate timeline previews: invalid media item', { 
        mediaId, 
        type: item.type,
        hasFile: !!item.file,
        fileName: item.file?.name 
      });
      return;
    }
    
    // ✨ ENHANCED: Better file validation for AI videos
    const itemVideoFile = item.file;
    
    // Validate MIME type (important for AI videos)
    if (!itemVideoFile.type || !itemVideoFile.type.startsWith('video/')) {
      const fileName = itemVideoFile.name.toLowerCase();
      let inferredType = '';
      
      if (fileName.endsWith('.mp4')) {
        inferredType = 'video/mp4';
      } else if (fileName.endsWith('.webm')) {
        inferredType = 'video/webm';
      } else if (fileName.endsWith('.mov')) {
        inferredType = 'video/quicktime';
      }
      
      if (inferredType) {
        console.warn('TIMELINE-PREVIEWS: Missing MIME type, inferred:', inferredType, 'for file:', itemVideoFile.name);
        // Create new file with correct MIME type
        const correctedFile = new File([itemVideoFile], itemVideoFile.name, { 
          type: inferredType 
        });
        
        // Update the media item with corrected file
        set((state) => ({
          mediaItems: state.mediaItems.map(existing => 
            existing.id === mediaId 
              ? { ...existing, file: correctedFile }
              : existing
          )
        }));
      } else {
        console.error('TIMELINE-PREVIEWS: Invalid file type for AI video:', itemVideoFile.type, 'filename:', itemVideoFile.name);
        return;
      }
    }

    // Create a unique key for this request based on mediaId and options
    const requestKey = `${mediaId}-${options.zoomLevel || 1}-${options.quality || 'medium'}`;
    
    // Check for existing request
    const existingRequest = timelinePreviewRequests.get(requestKey);
    if (existingRequest) {
      console.log(`⏳ Timeline preview generation already in progress for ${requestKey}, waiting...`);
      return existingRequest;
    }

    // Store file reference to ensure type safety
    const videoFile = item.file;

    // Add file readiness validation
    if (!videoFile || videoFile.size === 0) {
      console.warn('MEDIA-STORE: File not ready for timeline preview generation - empty or invalid file');
      return;
    }

    // Check if file appears to be downloading or processing
    if (item.processingStage?.includes('downloading')) {
      console.warn('MEDIA-STORE: File still downloading, skipping timeline preview generation');
      return;
    }

    // Try to access file to ensure it's actually ready
    try {
      const fileBuffer = await videoFile.arrayBuffer();
      if (fileBuffer.byteLength === 0) {
        console.warn('MEDIA-STORE: File appears to be empty, skipping timeline preview generation');
        return;
      }
    } catch (error) {
      console.warn('MEDIA-STORE: File not accessible for timeline preview generation:', error);
      return;
    }

    // Create new request
    const request = (async () => {
      // Update processing stage at start  
      get().updateProcessingStage(mediaId, 'thumbnail-ffmpeg');
      
      try {
      console.log('🎬 MEDIA-STORE: Starting timeline preview generation for:', mediaId, {
        fileName: videoFile.name,
        fileSize: videoFile.size,
        options
      });
      
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
      
      console.log('📋 Timeline preview timestamps:', timestamps);
      
      // Generate thumbnails using existing enhanced thumbnail system
      console.log('🎬 MEDIA-STORE: About to call generateEnhancedThumbnails with:', {
        fileName: videoFile.name,
        timestampsCount: timestamps.length,
        timestamps: timestamps.slice(0, 3), // Show first 3 timestamps for debugging
        resolution: quality,
        format: 'jpeg'
      });
      
      let thumbnailResult;
      try {
        thumbnailResult = await generateEnhancedThumbnails(videoFile, {
          timestamps,
          resolution: quality,
          quality: 0.7, // Optimized for timeline display
          format: 'jpeg'
        });
      } catch (error) {
        console.error('🚨 MEDIA-STORE: generateEnhancedThumbnails threw error:', error);
        throw error;
      }
      
      const { thumbnails } = thumbnailResult;
      
      console.log('📸 Generated thumbnails:', thumbnails.length);
      
      // Cache each thumbnail individually for efficient retrieval
      for (let i = 0; i < thumbnails.length; i++) {
        await thumbnailCache.cacheThumbnail(
          mediaId,
          timestamps[i],
          thumbnails[i],
          quality
        );
      }
      
      // Update processing stage to complete
      get().updateProcessingStage(mediaId, 'complete');
      
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
      console.error('❌ MEDIA-STORE: Failed to generate timeline previews:', error);
      
      // Update processing stage to error
      get().updateProcessingStage(mediaId, 'error');
      
      // Provide more helpful error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred during timeline preview generation';
      
      // Update item with error state but also provide empty timeline previews to prevent crashes
      set((state) => ({
        mediaItems: state.mediaItems.map(existing => 
          existing.id === mediaId 
            ? { 
                ...existing, 
                thumbnailError: `Timeline preview generation failed: ${errorMessage}`,
                timelinePreviews: {
                  thumbnails: [], // Empty array instead of undefined
                  timestamps: [],
                  quality: 'medium',
                  density: 2,
                  elementDuration: existing.duration || 10,
                  generatedAt: Date.now(),
                  zoomLevel: 1
                }
              }
            : existing
        )
      }));
      
        // Don't re-throw error to prevent app crashes
        console.warn('MEDIA-STORE: Timeline preview generation failed but continuing safely');
      } finally {
        // Clean up request tracking
        timelinePreviewRequests.delete(requestKey);
      }
    })();
    
    // Store the request promise
    timelinePreviewRequests.set(requestKey, request);
    return request;
    */
  },

  getTimelinePreviewStrip: (mediaId, elementDuration, zoomLevel) => {
    const item = get().mediaItems.find(item => item.id === mediaId);
    if (!item?.timelinePreviews) {
      console.log('No timeline previews available for:', mediaId);
      return [];
    }
    
    // Return appropriate thumbnails based on zoom level and duration
    const { thumbnails, density, generatedAt } = item.timelinePreviews;
    
    console.log('🔍 Timeline previews found:', {
      mediaId,
      thumbnailCount: thumbnails.length,
      firstThumbnailUrl: thumbnails[0]?.substring(0, 50) + '...',
      density,
      zoomLevel
    });
    
    // Check if previews are stale (older than 5 minutes)
    const isStale = Date.now() - generatedAt > 5 * 60 * 1000;
    if (isStale) {
      console.log('Timeline previews are stale, regeneration recommended');
    }
    
    // Adjust thumbnail density based on zoom level
    const targetDensity = Math.max(1, Math.floor(zoomLevel * density));
    const step = Math.max(1, Math.floor(thumbnails.length / targetDensity));
    
    const selectedThumbnails = thumbnails.filter((_, index) => index % step === 0);
    console.log('📊 Timeline preview strip:', {
      selectedCount: selectedThumbnails.length,
      totalCount: thumbnails.length,
      zoomLevel,
      step,
      sampleUrls: selectedThumbnails.slice(0, 2).map(url => url.substring(0, 50) + '...')
    });
    
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
    
    const { zoomLevel, elementDuration: cachedDuration, generatedAt, thumbnails } = item.timelinePreviews;
    
    // Always regenerate if no thumbnails
    if (!thumbnails || thumbnails.length === 0) {
      console.log('🔄 shouldRegenerateTimelinePreviews: true - no thumbnails exist');
      return true;
    }
    
    // Regenerate if zoom level changed significantly
    const zoomChanged = Math.abs((zoomLevel || 1) - currentZoomLevel) > 0.5;
    
    // Regenerate if duration changed
    const durationChanged = Math.abs((cachedDuration || 0) - elementDuration) > 0.1;
    
    // Regenerate if previews are old (over 10 minutes)
    const isOld = Date.now() - generatedAt > 10 * 60 * 1000;
    
    const shouldRegenerate = zoomChanged || durationChanged || isOld;
    console.log('🔄 shouldRegenerateTimelinePreviews:', shouldRegenerate, {
      mediaId,
      thumbnailCount: thumbnails.length,
      zoomChanged,
      durationChanged,
      isOld
    });
    
    return shouldRegenerate;
  },

  // AI Video Processing methods implementation
  isMediaItemReady: (id: string) => {
    const item = get().mediaItems.find(item => item.id === id);
    return !!(item && 
             item.file instanceof File && 
             item.duration && 
             (item.thumbnails?.length || 0) > 0 &&
             item.processingComplete);
  },

  updateProcessingStage: (id: string, stage: MediaItem['processingStage']) => {
    set(state => ({
      mediaItems: state.mediaItems.map(item =>
        item.id === id 
          ? { 
              ...item, 
              processingStage: stage,
              processingComplete: stage === 'complete',
              lastThumbnailUpdate: Date.now()
            }
          : item
      )
    }));
  },

  updateMediaItem: (id: string, updates: Partial<MediaItem>) => {
    set(state => ({
      mediaItems: state.mediaItems.map(item =>
        item.id === id 
          ? { ...item, ...updates }
          : item
      )
    }));
  },
}));
