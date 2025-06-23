import { create } from "zustand";

export interface TimelineClip {
  id: string;
  mediaId: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
  muted?: boolean;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  clips: TimelineClip[];
  muted?: boolean;
}

interface TimelineStore {
  tracks: TimelineTrack[];

  // Selection
  selectedClip: { trackId: string; clipId: string } | null;
  selectClip: (trackId: string, clipId: string) => void;
  clearSelectedClip: () => void;

  // Actions
  addTrack: (type: "video" | "audio" | "effects") => string;
  removeTrack: (trackId: string) => void;
  addClipToTrack: (trackId: string, clip: Omit<TimelineClip, "id">) => void;
  removeClipFromTrack: (trackId: string, clipId: string) => void;
  moveClipToTrack: (
    fromTrackId: string,
    toTrackId: string,
    clipId: string
  ) => void;
  updateClipTrim: (
    trackId: string,
    clipId: string,
    trimStart: number,
    trimEnd: number
  ) => void;
  updateClipStartTime: (
    trackId: string,
    clipId: string,
    startTime: number
  ) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleClipMute: (trackId: string, clipId: string) => void;

  // Computed values
  getTotalDuration: () => number;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  tracks: [],
  selectedClip: null,

  selectClip: (trackId, clipId) => {
    set({ selectedClip: { trackId, clipId } });
  },
  clearSelectedClip: () => {
    set({ selectedClip: null });
  },

  addTrack: (type) => {
    const newTrack: TimelineTrack = {
      id: crypto.randomUUID(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      clips: [],
      muted: false,
    };
    set((state) => ({
      tracks: [...state.tracks, newTrack],
    }));
    return newTrack.id;
  },

  removeTrack: (trackId) => {
    set((state) => ({
      tracks: state.tracks.filter((track) => track.id !== trackId),
    }));
  },

  addClipToTrack: (trackId, clipData) => {
    const newClip: TimelineClip = {
      ...clipData,
      id: crypto.randomUUID(),
      startTime: clipData.startTime || 0,
      trimStart: 0,
      trimEnd: 0,
      muted: false,
    };

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      ),
    }));
  },

  removeClipFromTrack: (trackId, clipId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.filter((clip) => clip.id !== clipId),
            }
          : track
      ),
    }));
  },

  moveClipToTrack: (fromTrackId, toTrackId, clipId) => {
    set((state) => {
      const fromTrack = state.tracks.find((track) => track.id === fromTrackId);
      const clipToMove = fromTrack?.clips.find((clip) => clip.id === clipId);

      if (!clipToMove) return state;

      return {
        tracks: state.tracks.map((track) => {
          if (track.id === fromTrackId) {
            return {
              ...track,
              clips: track.clips.filter((clip) => clip.id !== clipId),
            };
          } else if (track.id === toTrackId) {
            return {
              ...track,
              clips: [...track.clips, clipToMove],
            };
          }
          return track;
        }),
      };
    });
  },

  updateClipTrim: (trackId, clipId, trimStart, trimEnd) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId ? { ...clip, trimStart, trimEnd } : clip
              ),
            }
          : track
      ),
    }));
  },

  updateClipStartTime: (trackId, clipId, startTime) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId ? { ...clip, startTime } : clip
              ),
            }
          : track
      ),
    }));
  },

  toggleTrackMute: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      ),
    }));
  },

  toggleClipMute: (trackId, clipId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId ? { ...clip, muted: !clip.muted } : clip
              ),
            }
          : track
      ),
    }));
  },

  getTotalDuration: () => {
    const { tracks } = get();
    if (tracks.length === 0) return 0;

    const trackEndTimes = tracks.map((track) =>
      track.clips.reduce((maxEnd, clip) => {
        const clipEnd =
          clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;
        return Math.max(maxEnd, clipEnd);
      }, 0)
    );

    return Math.max(...trackEndTimes, 0);
  },
}));
