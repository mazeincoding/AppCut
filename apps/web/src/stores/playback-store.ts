import { create } from "zustand";
import type { PlaybackState, PlaybackControls } from "@/types/playback";

interface PlaybackStore extends PlaybackState, PlaybackControls {
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
}

let playbackTimer: number | null = null;

const startTimer = (store: any) => {
  if (playbackTimer) cancelAnimationFrame(playbackTimer);
  
  // Use requestAnimationFrame for smoother updates
  const updateTime = () => {
    const state = store();
    if (state.isPlaying && state.currentTime < state.duration) {
      const now = performance.now();
      const delta = (now - lastUpdate) / 1000; // Convert to seconds
      lastUpdate = now;
      
      const newTime = state.currentTime + (delta * state.speed);
      if (newTime >= state.duration) {
        state.pause();
      } else {
        state.setCurrentTime(newTime);
        // Notify video elements to sync
        window.dispatchEvent(new CustomEvent('playback-update', { detail: { time: newTime } }));
      }
    }
    playbackTimer = requestAnimationFrame(updateTime);
  };

  let lastUpdate = performance.now();
  playbackTimer = requestAnimationFrame(updateTime);
};

const stopTimer = () => {
  if (playbackTimer) {
    cancelAnimationFrame(playbackTimer);
    playbackTimer = null;
  }
};

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  speed: 1.0,

  play: () => {
    set({ isPlaying: true });
    startTimer(get);
  },

  pause: () => {
    set({ isPlaying: false });
    stopTimer();
  },

  toggle: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  seek: (time: number) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(duration, time));
    set({ currentTime: clampedTime });
    
    // Notify video elements to seek
    const event = new CustomEvent('playback-seek', { detail: { time: clampedTime } });
    window.dispatchEvent(event);
  },
  
  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  
  setSpeed: (speed: number) => {
    const newSpeed = Math.max(0.1, Math.min(2.0, speed));
    set({ speed: newSpeed });
    
    const event = new CustomEvent('playback-speed', { detail: { speed: newSpeed } });
    window.dispatchEvent(event);
  },

  setDuration: (duration: number) => set({ duration }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
})); 