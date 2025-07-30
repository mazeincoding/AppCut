import { create } from "zustand";
import type { PlaybackState, PlaybackControls } from "@/types/playback";

// Type definitions for timeline store integration
interface TimelineStoreState {
  getTotalDuration: () => number;
}

interface TimelineStore {
  getState: () => TimelineStoreState | null;
}

// Global timeline store type for avoiding circular dependencies
declare global {
  var __timelineStore: TimelineStore | undefined;
}

interface PlaybackStore extends PlaybackState, PlaybackControls {
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
  getEffectivePlaybackDuration: () => number;
}

let playbackTimer: number | null = null;

const startTimer = (store: () => PlaybackStore) => {
  if (playbackTimer) cancelAnimationFrame(playbackTimer);

  // Use requestAnimationFrame for smoother updates
  const updateTime = () => {
    const state = store();
    if (state.isPlaying && state.currentTime < state.duration) {
      const now = performance.now();
      const delta = (now - lastUpdate) / 1000; // Convert to seconds
      lastUpdate = now;

      const newTime = state.currentTime + delta * state.speed;

      // AUDIO CURSOR FIX: Use effective playback duration (actual content duration) for stopping logic
      // This fixes GitHub issue #490 where audio files shorter than 10 seconds would continue
      // playing until the 10-second timeline minimum instead of stopping at the actual audio end.
      // The getEffectivePlaybackDuration() method safely accesses the timeline store to get
      // the actual content duration while falling back to timeline duration if unavailable.
      const effectiveDuration = state.getEffectivePlaybackDuration();

      if (newTime >= effectiveDuration) {
        // When content completes, pause and reset playhead to start
        state.pause();
        state.setCurrentTime(0);
        // Notify video elements to sync with reset
        window.dispatchEvent(
          new CustomEvent("playback-seek", { detail: { time: 0 } })
        );
      } else {
        state.setCurrentTime(newTime);
        // Notify video elements to sync
        window.dispatchEvent(
          new CustomEvent("playback-update", { detail: { time: newTime } })
        );
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
  muted: false,
  previousVolume: 1,
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

    const event = new CustomEvent("playback-seek", {
      detail: { time: clampedTime },
    });
    window.dispatchEvent(event);
  },

  setVolume: (volume: number) =>
    set((state) => ({
      volume: Math.max(0, Math.min(1, volume)),
      muted: volume === 0,
      previousVolume: volume > 0 ? volume : state.previousVolume,
    })),

  setSpeed: (speed: number) => {
    const newSpeed = Math.max(0.1, Math.min(2.0, speed));
    set({ speed: newSpeed });

    const event = new CustomEvent("playback-speed", {
      detail: { speed: newSpeed },
    });
    window.dispatchEvent(event);
  },

  setDuration: (duration: number) => set({ duration }),
  setCurrentTime: (time: number) => set({ currentTime: time }),

  mute: () => {
    const { volume, previousVolume } = get();
    set({
      muted: true,
      previousVolume: volume > 0 ? volume : previousVolume,
      volume: 0,
    });
  },

  unmute: () => {
    const { previousVolume } = get();
    set({ muted: false, volume: previousVolume ?? 1 });
  },

  toggleMute: () => {
    const { muted } = get();
    if (muted) {
      get().unmute();
    } else {
      get().mute();
    }
  },

  /**
   * Gets the effective playback duration for stopping logic.
   *
   * This method resolves the audio cursor bug (GitHub issue #490) by using the actual
   * content duration instead of the timeline duration (which has a 10-second minimum).
   *
   * @returns {number} The duration at which playback should stop:
   *   - Actual content duration if content exists and is valid
   *   - Timeline duration (with 10s minimum) as fallback
   *
   * @example
   * // For a 5-second audio file:
   * // - Timeline duration: 10 seconds (UI minimum)
   * // - Content duration: 5 seconds (actual audio length)
   * // - Returns: 5 seconds (playback stops at audio end)
   */
  getEffectivePlaybackDuration: () => {
    try {
      // Safely access timeline store to avoid circular dependencies
      // Uses global reference instead of direct import to prevent circular imports
      const timelineStore = globalThis.__timelineStore;

      if (!timelineStore) {
        // Timeline store not available, use fallback
        return get().duration;
      }

      if (typeof timelineStore.getState !== 'function') {
        console.warn("Timeline store getState is not a function, using fallback duration");
        return get().duration;
      }

      const state = timelineStore.getState();
      if (!state) {
        // Timeline store state is null/undefined
        return get().duration;
      }

      if (typeof state.getTotalDuration !== 'function') {
        console.warn("Timeline store getTotalDuration is not a function, using fallback duration");
        return get().duration;
      }

      const actualContentDuration = state.getTotalDuration();

      // Comprehensive validation of the duration value
      if (typeof actualContentDuration !== 'number') {
        console.warn("Timeline store returned non-number duration:", typeof actualContentDuration, "using fallback");
        return get().duration;
      }

      if (isNaN(actualContentDuration)) {
        console.warn("Timeline store returned NaN duration, using fallback");
        return get().duration;
      }

      if (!isFinite(actualContentDuration)) {
        console.warn("Timeline store returned non-finite duration:", actualContentDuration, "using fallback");
        return get().duration;
      }

      if (actualContentDuration <= 0) {
        // Zero or negative duration means no content, use timeline minimum
        return get().duration;
      }

      // Valid content duration found
      return actualContentDuration;

    } catch (error) {
      console.warn("Error accessing timeline store for content duration:", error);
      return get().duration;
    }
  },
}));
