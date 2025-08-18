import { create } from "zustand";
import type { MediaItem } from "./media-store";
import { usePlaybackStore } from "./playback-store";

interface MediaPreviewState {
  isMediaPreviewMode: boolean;
  previewMedia: MediaItem | null;
  mediaCurrentTime: number;
  mediaIsPlaying: boolean;

  // Actions
  setMediaCurrentTime: (time: number) => void;
  setMediaIsPlaying: (playing: boolean) => void;
  setPreviewMedia: (media: MediaItem | null) => void;
  togglePreviewMode: () => void;
  clearPreview: () => void;
  toggleMediaPlayback: () => void;
  exitPreviewMode: () => void;
}

export const useMediaPreviewStore = create<MediaPreviewState>((set, get) => ({
  isMediaPreviewMode: false,
  previewMedia: null,
  mediaCurrentTime: 0,
  mediaIsPlaying: false,

  setMediaCurrentTime: (time) => set({ mediaCurrentTime: time }),
  
  setMediaIsPlaying: (playing) => set({ mediaIsPlaying: playing }),

  setPreviewMedia: (media) => {
    // Pause timeline when setting preview media
    const { isPlaying, pause } = usePlaybackStore.getState();
    if (isPlaying) {
      pause();
    }
    
    set({ 
      previewMedia: media, 
      isMediaPreviewMode: media !== null,
      mediaCurrentTime: 0,
      mediaIsPlaying: false
    });
  },

  togglePreviewMode: () => {
    const { previewMedia, isMediaPreviewMode } = get();
    if (!previewMedia) return;
    
    // Get current playback state
    const { isPlaying, pause } = usePlaybackStore.getState();
    
    // If switching FROM timeline TO media preview while timeline is playing
    if (!isMediaPreviewMode && isPlaying) {
      pause(); // Pause timeline
    }
    
    set((state) => ({ 
      isMediaPreviewMode: !state.isMediaPreviewMode,
      mediaIsPlaying: false // Start media preview paused
    }));
  },

  toggleMediaPlayback: () => {
    set((state) => ({ 
      mediaIsPlaying: !state.mediaIsPlaying 
    }));
  },

  clearPreview: () => set({ 
    previewMedia: null, 
    isMediaPreviewMode: false,
    mediaCurrentTime: 0,
    mediaIsPlaying: false
  }),

  exitPreviewMode: () =>
    set({
      isMediaPreviewMode: false,
      mediaIsPlaying: false,
    })
}));