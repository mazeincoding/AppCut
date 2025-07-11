import { create } from "zustand";
import { storageService } from "@/lib/storage/storage-service";

export type MediaType = "image" | "video" | "audio";

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  file: File;
  url?: string; // Object URL for preview
  thumbnailUrl?: string; // For video thumbnails
  duration?: number; // For video/audio duration
  width?: number; // For video/image width
  height?: number; // For video/image height
  // Text-specific properties
  content?: string; // Text content
  fontSize?: number; // Font size
  fontFamily?: string; // Font family
  color?: string; // Text color
  backgroundColor?: string; // Background color
  textAlign?: "left" | "center" | "right"; // Text alignment
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
    // Check if this is Safari
    const isSafari = storageService.isSafari();
    
    if (isSafari) {
      // Use FileReader with base64 data URL for Safari compatibility
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        if (!base64data) {
          reject(new Error("Could not read image file"));
          return;
        }
        
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
        
        img.src = base64data;
      };
      
      reader.onerror = () => {
        reject(new Error("Could not read image file"));
      };
      
      reader.readAsDataURL(file);
      
    } else {
      // Use standard blob URL approach for other browsers
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.addEventListener("load", () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        resolve({ width, height });
        URL.revokeObjectURL(objectUrl);
        img.remove();
      });
      
      img.addEventListener("error", () => {
        reject(new Error("Could not load image"));
        URL.revokeObjectURL(objectUrl);
        img.remove();
      });
      
      img.src = objectUrl;
    }
  });
};

// Helper function to generate video thumbnail and get dimensions
export const generateVideoThumbnail = (
  file: File
): Promise<{ thumbnailUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    // Check if this is Safari
    const isSafari = storageService.isSafari();
    
    if (isSafari) {
      // Use FileReader with base64 data URL for Safari compatibility
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        if (!base64data) {
          reject(new Error("Could not read video file"));
          return;
        }
        
        const video = document.createElement("video") as HTMLVideoElement;
        const canvas = document.createElement("canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Safari-specific settings
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        
        // Add timeout for Safari
        const timeout = setTimeout(() => {
          video.remove();
          canvas.remove();
          reject(new Error("Timeout loading video"));
        }, 15000);
        
        video.addEventListener("loadedmetadata", () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Seek to 1 second or 10% of duration, whichever is smaller
          const seekTime = Math.min(1, video.duration * 0.1);
          video.currentTime = seekTime;
        });
        
        video.addEventListener("seeked", () => {
          clearTimeout(timeout);
          
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to blob for better Safari compatibility
            canvas.toBlob((blob) => {
              if (!blob) {
                video.remove();
                canvas.remove();
                reject(new Error("Could not create thumbnail blob"));
                return;
              }
              
              const thumbnailUrl = URL.createObjectURL(blob);
              const width = video.videoWidth;
              const height = video.videoHeight;
              
              resolve({ thumbnailUrl, width, height });
              
              // Cleanup
              video.remove();
              canvas.remove();
            }, 'image/jpeg', 0.8);
          } catch (drawError) {
            clearTimeout(timeout);
            video.remove();
            canvas.remove();
            reject(new Error("Could not draw video frame to canvas"));
          }
        });
        
        video.addEventListener("error", (event) => {
          clearTimeout(timeout);
          video.remove();
          canvas.remove();
          reject(new Error("Could not load video"));
        });
        
        try {
          // Use base64 data URL instead of blob URL for Safari
          video.src = base64data;
          video.load();
        } catch (srcError) {
          clearTimeout(timeout);
          video.remove();
          canvas.remove();
          reject(new Error("Could not set video source"));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Could not read video file"));
      };
      
      // Read file as data URL for Safari
      reader.readAsDataURL(file);
      
    } else {
      // Use standard blob URL approach for other browsers
      const video = document.createElement("video") as HTMLVideoElement;
      const canvas = document.createElement("canvas") as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      
      video.addEventListener("loadedmetadata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Seek to 1 second or 10% of duration, whichever is smaller
        video.currentTime = Math.min(1, video.duration * 0.1);
      });
      
      video.addEventListener("seeked", () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            URL.revokeObjectURL(objectUrl);
            video.remove();
            canvas.remove();
            reject(new Error("Could not create thumbnail blob"));
            return;
          }
          
          const thumbnailUrl = URL.createObjectURL(blob);
          const width = video.videoWidth;
          const height = video.videoHeight;
          
          resolve({ thumbnailUrl, width, height });
          
          // Cleanup
          URL.revokeObjectURL(objectUrl);
          video.remove();
          canvas.remove();
        }, 'image/jpeg', 0.8);
      });
      
      video.addEventListener("error", () => {
        reject(new Error("Could not load video"));
        URL.revokeObjectURL(objectUrl);
        video.remove();
        canvas.remove();
      });
      
      video.src = objectUrl;
      video.load();
    }
  });
};

// Helper function to get media duration
export const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Check if this is Safari
    const isSafari = storageService.isSafari();
    
    if (isSafari) {
      // Use FileReader with base64 data URL for Safari compatibility
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        if (!base64data) {
          resolve(0); // Return default duration
          return;
        }
        
        const element = document.createElement(
          file.type.startsWith("video/") ? "video" : "audio"
        ) as HTMLVideoElement;
        
        // Safari-specific settings
        if (element.tagName === 'VIDEO') {
          (element as HTMLVideoElement).muted = true;
          (element as HTMLVideoElement).playsInline = true;
        }
        element.preload = "metadata";
        
        // Add timeout for Safari
        const timeout = setTimeout(() => {
          element.remove();
          resolve(0);
        }, 10000);
        
        element.addEventListener("loadedmetadata", () => {
          clearTimeout(timeout);
          resolve(element.duration || 0);
          element.remove();
        });
        
        element.addEventListener("error", (event) => {
          clearTimeout(timeout);
          element.remove();
          resolve(0); // Return default duration instead of rejecting
        });
        
        try {
          // Use base64 data URL instead of blob URL
          element.src = base64data;
          element.load();
        } catch (srcError) {
          clearTimeout(timeout);
          element.remove();
          resolve(0);
        }
      };
      
      reader.onerror = () => {
        resolve(0); // Return default duration
      };
      
      // Read file as data URL for Safari
      reader.readAsDataURL(file);
      
    } else {
      // Use standard blob URL approach for other browsers
      const element = document.createElement(
        file.type.startsWith("video/") ? "video" : "audio"
      ) as HTMLVideoElement;
      
      const objectUrl = URL.createObjectURL(file);
      
      element.addEventListener("loadedmetadata", () => {
        resolve(element.duration);
        URL.revokeObjectURL(objectUrl);
        element.remove();
      });
      
      element.addEventListener("error", () => {
        resolve(0); // Return default duration on error
        URL.revokeObjectURL(objectUrl);
        element.remove();
      });
      
      element.src = objectUrl;
      element.load();
    }
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
      id: crypto.randomUUID(),
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
}));
