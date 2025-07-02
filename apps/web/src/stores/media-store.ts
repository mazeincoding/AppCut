import { create } from "zustand";
import { storageService } from "@/lib/storage/storage-service";

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  file: File;
  url: string; // Object URL for preview
  thumbnailUrl?: string; // For video thumbnails
  duration?: number; // For video/audio duration
  width?: number; // For video/image width
  height?: number; // For video/image height
}

interface MediaStore {
  mediaItems: MediaItem[];
  isLoading: boolean;

  // Actions
  addMediaItem: (item: Omit<MediaItem, "id">) => Promise<void>;
  removeMediaItem: (id: string) => Promise<void>;
  loadAllMedia: () => Promise<void>;
  clearAllMedia: () => Promise<void>;
}

// Helper function to determine file type
export const getFileType = (file: File): "image" | "video" | "audio" | null => {
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
    const img = new Image();

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
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
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
    ) as HTMLVideoElement | HTMLAudioElement;

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

  addMediaItem: async (item) => {
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
      await storageService.saveMediaItem(newItem);
    } catch (error) {
      console.error("Failed to save media item:", error);
      // Remove from local state if save failed
      set((state) => ({
        mediaItems: state.mediaItems.filter((item) => item.id !== newItem.id),
      }));
    }
  },

  removeMediaItem: async (id) => {
    const state = get();
    const item = state.mediaItems.find((item) => item.id === id);

    // Cleanup object URLs to prevent memory leaks
    if (item) {
      URL.revokeObjectURL(item.url);
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    }

    // Remove from local state immediately
    set((state) => ({
      mediaItems: state.mediaItems.filter((item) => item.id !== id),
    }));

    // Remove from persistent storage
    try {
      await storageService.deleteMediaItem(id);
    } catch (error) {
      console.error("Failed to delete media item:", error);
      // Could re-add to local state here if needed
    }
  },

  loadAllMedia: async () => {
    set({ isLoading: true });

    try {
      const mediaItems = await storageService.loadAllMediaItems();
      set({ mediaItems });
    } catch (error) {
      console.error("Failed to load media items:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearAllMedia: async () => {
    const state = get();

    // Cleanup all object URLs
    state.mediaItems.forEach((item) => {
      URL.revokeObjectURL(item.url);
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
        mediaIds.map((id) => storageService.deleteMediaItem(id))
      );
    } catch (error) {
      console.error("Failed to clear media items from storage:", error);
    }
  },
}));
