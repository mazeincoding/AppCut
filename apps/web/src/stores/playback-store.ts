import { create } from "zustand";
import type { PlaybackState, PlaybackControls } from "@/types/playback";

interface PlaybackStore extends PlaybackState, PlaybackControls {
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
}

let playbackTimer: NodeJS.Timeout | null = null;

const startTimer = (store: any) => {
  if (playbackTimer) clearInterval(playbackTimer);
  
  playbackTimer = setInterval(() => {
    const state = store();
    if (state.isPlaying && state.currentTime < state.duration) {
      const newTime = state.currentTime + 0.1;
      if (newTime >= state.duration) {
        state.pause();
      } else {
        state.setCurrentTime(newTime);
        // Notify video elements to sync
        window.dispatchEvent(new CustomEvent('playback-update', { detail: { time: newTime } }));
      }
    }
  }, 100);
};

const stopTimer = () => {
  if (playbackTimer) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }
};

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,

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
    window.dispatchEvent(new CustomEvent('playback-seek', { detail: { time: clampedTime } }));
  },
  
  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setDuration: (duration: number) => set({ duration }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
})); 