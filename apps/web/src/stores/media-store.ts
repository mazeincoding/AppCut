import { create } from "zustand";

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  file: File;
  url: string; // Object URL for preview
  thumbnailUrl?: string; // For video thumbnails
  duration?: number; // For video/audio duration
  aspectRatio: number; // width / height
  width?: number; // Resolution width in pixels
  height?: number; // Resolution height in pixels
  resolution?: string; // Human-readable resolution (e.g., "1920x1080", "4K", "HD")
}

interface MediaStore {
  mediaItems: MediaItem[];

  // Actions
  addMediaItem: (item: Omit<MediaItem, "id">) => void;
  removeMediaItem: (id: string) => void;
  clearAllMedia: () => void;
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

// Helper function to get image dimensions and aspect ratio
export const getImageDimensions = (file: File): Promise<{ width: number; height: number; aspectRatio: number; resolution: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.addEventListener("load", () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / height;
      const resolution = getResolutionLabel(width, height);
      
      resolve({ width, height, aspectRatio, resolution });
      img.remove();
    });

    img.addEventListener("error", () => {
      reject(new Error("Could not load image"));
      img.remove();
    });

    img.src = URL.createObjectURL(file);
  });
};

// Helper function to get image aspect ratio (legacy - use getImageDimensions for full info)
export const getImageAspectRatio = (file: File): Promise<number> => {
  return getImageDimensions(file).then(({ aspectRatio }) => aspectRatio);
};

// Helper function to generate video thumbnail and get full video metadata
export const generateVideoThumbnail = (
  file: File
): Promise<{ 
  thumbnailUrl: string; 
  aspectRatio: number; 
  width: number; 
  height: number; 
  resolution: string;
}> => {
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
      const aspectRatio = width / height;
      const resolution = getResolutionLabel(width, height);

      resolve({ thumbnailUrl, aspectRatio, width, height, resolution });

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

// Helper function to get human-readable resolution labels
export const getResolutionLabel = (width: number, height: number): string => {
  // Common resolution names
  if (width === 7680 && height === 4320) return "8K UHD (7680x4320)";
  if (width === 3840 && height === 2160) return "4K UHD (3840x2160)";
  if (width === 2560 && height === 1440) return "QHD (2560x1440)";
  if (width === 1920 && height === 1080) return "Full HD (1920x1080)";
  if (width === 1280 && height === 720) return "HD (1280x720)";
  if (width === 854 && height === 480) return "SD (854x480)";
  if (width === 640 && height === 360) return "360p (640x360)";
  
  // For non-standard resolutions, check general categories
  if (width >= 7680) return `8K (${width}x${height})`;
  if (width >= 3840) return `4K (${width}x${height})`;
  if (width >= 2560) return `QHD (${width}x${height})`;
  if (width >= 1920) return `Full HD (${width}x${height})`;
  if (width >= 1280) return `HD (${width}x${height})`;
  if (width >= 854) return `SD (${width}x${height})`;
  
  return `${width}x${height}`;
};

export const useMediaStore = create<MediaStore>((set, get) => ({
  mediaItems: [],

  addMediaItem: (item) => {
    const newItem: MediaItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    set((state) => ({
      mediaItems: [...state.mediaItems, newItem],
    }));
  },

  removeMediaItem: (id) => {
    const state = get();
    const item = state.mediaItems.find((item) => item.id === id);

    // Cleanup object URLs to prevent memory leaks
    if (item) {
      URL.revokeObjectURL(item.url);
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    }

    set((state) => ({
      mediaItems: state.mediaItems.filter((item) => item.id !== id),
    }));
  },

  clearAllMedia: () => {
    const state = get();

    // Cleanup all object URLs
    state.mediaItems.forEach((item) => {
      URL.revokeObjectURL(item.url);
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    });

    set({ mediaItems: [] });
  },
}));
