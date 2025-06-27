import { create } from 'zustand';
import { ProcessedMediaItem } from '@/lib/media-processing';

export interface MediaItem extends ProcessedMediaItem {
  id: string;
  addedAt: Date;
}

interface MediaStoreState {
  mediaItems: MediaItem[];
  addMediaItem: (item: ProcessedMediaItem) => void;
  removeMediaItem: (id: string) => void;
  clearAllMedia: () => void;
  getMediaById: (id: string) => MediaItem | undefined;
}

export const useMediaStore = create<MediaStoreState>((set, get) => ({
  mediaItems: [],
  
  addMediaItem: (item: ProcessedMediaItem) => {
    const newItem: MediaItem = {
      ...item,
      id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date(),
    };
    
    set((state) => ({
      mediaItems: [...state.mediaItems, newItem],
    }));
  },
  
  removeMediaItem: (id: string) => {
    set((state) => ({
      mediaItems: state.mediaItems.filter(item => item.id !== id),
    }));
  },
  
  clearAllMedia: () => {
    set({ mediaItems: [] });
  },
  
  getMediaById: (id: string) => {
    return get().mediaItems.find(item => item.id === id);
  },
}));
