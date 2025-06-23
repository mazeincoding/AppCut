import { create } from "zustand";
import type { PlaybackState, PlaybackControls } from "@/types/playback";

interface PlaybackStore extends PlaybackState, PlaybackControls {
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  speed: 1.0,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
  seek: (time: number) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(duration, time));
    set({ currentTime: clampedTime });
    
    // Notify video element to seek
    const event = new CustomEvent('playback-seek', { detail: { time: clampedTime } });
    window.dispatchEvent(event);
  },
  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setSpeed: (speed: number) => {
    const newSpeed = Math.max(0.1, Math.min(2.0, speed));
    set({ speed: newSpeed });
    
    // Notify video element to update playback rate
    const event = new CustomEvent('playback-speed', { detail: { speed: newSpeed } });
    window.dispatchEvent(event);
  },
  setDuration: (duration: number) => set({ duration }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
})); 