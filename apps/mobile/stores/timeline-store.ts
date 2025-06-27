import { create } from 'zustand';

export interface TimelineClip {
  id: string;
  mediaId: string;
  name: string;
  startTime: number; // When this clip starts on timeline (seconds)
  duration: number; // Total duration of source media (seconds)
  trimStart: number; // How much to trim from start (seconds)
  trimEnd: number; // How much to trim from end (seconds)
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio';
  clips: TimelineClip[];
  muted: boolean;
}

interface TimelineStoreState {
  tracks: TimelineTrack[];
  selectedClips: { trackId: string; clipId: string }[];
  
  // Track management
  addTrack: (type: 'video' | 'audio') => string;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  
  // Clip management
  addClipToTrack: (trackId: string, clipData: Omit<TimelineClip, 'id'>) => void;
  removeClipFromTrack: (trackId: string, clipId: string) => void;
  updateClipStartTime: (trackId: string, clipId: string, startTime: number) => void;
  updateClipTrim: (trackId: string, clipId: string, trimStart: number, trimEnd: number) => void;
  
  // Selection management
  selectClip: (trackId: string, clipId: string, addToSelection: boolean) => void;
  deselectClip: (trackId: string, clipId: string) => void;
  clearSelectedClips: () => void;
  
  // Utility functions
  getTotalDuration: () => number;
  getClipsAtTime: (time: number) => Array<{ clip: TimelineClip; track: TimelineTrack }>;
}

export const useTimelineStore = create<TimelineStoreState>((set, get) => ({
  tracks: [],
  selectedClips: [],
  
  addTrack: (type: 'video' | 'audio') => {
    const newTrackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trackCount = get().tracks.filter(t => t.type === type).length;
    
    const newTrack: TimelineTrack = {
      id: newTrackId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${trackCount + 1}`,
      type,
      clips: [],
      muted: false,
    };
    
    set((state) => ({
      tracks: [...state.tracks, newTrack],
    }));
    
    return newTrackId;
  },
  
  removeTrack: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.filter(track => track.id !== trackId),
      selectedClips: state.selectedClips.filter(selection => selection.trackId !== trackId),
    }));
  },
  
  toggleTrackMute: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      ),
    }));
  },
  
  addClipToTrack: (trackId: string, clipData: Omit<TimelineClip, 'id'>) => {
    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newClip: TimelineClip = {
      ...clipData,
      id: newClipId,
    };
    
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      ),
    }));
  },
  
  removeClipFromTrack: (trackId: string, clipId: string) => {
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? { ...track, clips: track.clips.filter(clip => clip.id !== clipId) }
          : track
      ),
      selectedClips: state.selectedClips.filter(
        selection => !(selection.trackId === trackId && selection.clipId === clipId)
      ),
    }));
  },
  
  updateClipStartTime: (trackId: string, clipId: string, startTime: number) => {
    set((state) => {
      const updatedTracks = state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map(clip => {
                if (clip.id === clipId) {
                  const effectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;
                  const clipEnd = startTime + effectiveDuration;
                  
                  // Auto-expand timeline if needed
                  const maxTime = Math.max(...state.tracks.flatMap(t => 
                    t.clips.map(c => c.startTime + (c.duration - c.trimStart - c.trimEnd))
                  ), clipEnd);
                  
                  return { ...clip, startTime };
                }
                return clip;
              }),
            }
          : track
      );
      
      return { tracks: updatedTracks };
    });
  },
  
  updateClipTrim: (trackId: string, clipId: string, trimStart: number, trimEnd: number) => {
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map(clip =>
                clip.id === clipId ? { ...clip, trimStart, trimEnd } : clip
              ),
            }
          : track
      ),
    }));
  },
  
  selectClip: (trackId: string, clipId: string, addToSelection: boolean) => {
    set((state) => {
      const existingSelection = state.selectedClips.find(
        s => s.trackId === trackId && s.clipId === clipId
      );
      
      if (existingSelection) return state; // Already selected
      
      const newSelection = { trackId, clipId };
      
      return {
        selectedClips: addToSelection
          ? [...state.selectedClips, newSelection]
          : [newSelection],
      };
    });
  },

  deselectClip: (trackId: string, clipId: string) => {
    set((state) => ({
      selectedClips: state.selectedClips.filter(
        selection => !(selection.trackId === trackId && selection.clipId === clipId)
      ),
    }));
  },
  
  clearSelectedClips: () => {
    set({ selectedClips: [] });
  },
  
  getTotalDuration: () => {
    const { tracks } = get();
    let maxDuration = 0;
    
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEndTime = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
        maxDuration = Math.max(maxDuration, clipEndTime);
      });
    });
    
    return maxDuration;
  },
  
  getClipsAtTime: (time: number) => {
    const { tracks } = get();
    const activeClips: Array<{ clip: TimelineClip; track: TimelineTrack }> = [];
    
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
        
        if (time >= clipStart && time < clipEnd) {
          activeClips.push({ clip, track });
        }
      });
    });
    
    return activeClips;
  },
}));
