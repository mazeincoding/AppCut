import { create } from 'zustand';

interface PlaybackStoreState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  speed: number;
  
  // Actions
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setSpeed: (speed: number) => void;
  
  // Convenience methods
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  toggleMute: () => void;
}

export const usePlaybackStore = create<PlaybackStoreState>((set, get) => ({
  currentTime: 0,
  duration: 10,
  isPlaying: false,
  volume: 1,
  muted: false,
  speed: 1,
  
  setCurrentTime: (time: number) => {
    const state = get();
    const clampedTime = Math.max(0, Math.min(state.duration, time));
    set({ currentTime: clampedTime });
  },
  
  setDuration: (duration: number) => {
    set({ duration: Math.max(0, duration) });
  },
  
  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },
  
  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },
  
  setMuted: (muted: boolean) => {
    set({ muted });
  },
  
  setSpeed: (speed: number) => {
    set({ speed: Math.max(0.1, Math.min(4, speed)) });
  },
  
  play: () => {
    const { currentTime, duration } = get();
    
    // If at end, restart from beginning
    if (currentTime >= duration) {
      set({ currentTime: 0, isPlaying: true });
    } else {
      set({ isPlaying: true });
    }
  },
  
  pause: () => {
    set({ isPlaying: false });
  },
  
  toggle: () => {
    const { isPlaying, currentTime, duration } = get();
    
    if (isPlaying) {
      set({ isPlaying: false });
    } else {
      // If at end, restart from beginning
      if (currentTime >= duration) {
        set({ currentTime: 0, isPlaying: true });
      } else {
        set({ isPlaying: true });
      }
    }
  },
  
  seek: (time: number) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(duration, time));
    set({ currentTime: clampedTime });
  },
  
  toggleMute: () => {
    set((state) => ({ muted: !state.muted }));
  },
}));
