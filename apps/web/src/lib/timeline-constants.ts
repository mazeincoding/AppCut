import type { TrackType } from "@/types/timeline";

// Track color definitions
export const TRACK_COLORS: Record<
  TrackType,
  { solid: string; background: string; border: string }
> = {
  media: {
    solid: "bg-blue-500",
    background: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
  text: {
    solid: "bg-[#9C4937]",
    background: "bg-[#9C4937]",
    border: "border-[#9C4937]/40",
  },
  audio: {
    solid: "bg-green-500",
    background: "bg-green-500/20",
    border: "border-green-500/30",
  },
} as const;

// Utility functions
export function getTrackColors(type: TrackType) {
  return TRACK_COLORS[type];
}

export function getTrackElementClasses(type: TrackType) {
  const colors = getTrackColors(type);
  return `${colors.background} ${colors.border}`;
}

export function getTrackLabelColor(type: TrackType) {
  return getTrackColors(type).solid;
}

// Track height definitions
export const TRACK_HEIGHTS: Record<TrackType, number> = {
  media: 65,
  text: 25,
  audio: 50,
} as const;

// Utility function for track heights
export function getTrackHeight(type: TrackType): number {
  return TRACK_HEIGHTS[type];
}

// Calculate cumulative height up to (but not including) a track index
export function getCumulativeHeightBefore(
  tracks: Array<{ type: TrackType }>,
  trackIndex: number
): number {
  return tracks
    .slice(0, trackIndex)
    .reduce((sum, track) => sum + getTrackHeight(track.type), 0);
}

// Calculate total height of all tracks
export function getTotalTracksHeight(
  tracks: Array<{ type: TrackType }>
): number {
  return tracks.reduce((sum, track) => sum + getTrackHeight(track.type), 0);
}

// Other timeline constants
export const TIMELINE_CONSTANTS = {
  ELEMENT_MIN_WIDTH: 80,
  PIXELS_PER_SECOND: 50,
  TRACK_HEIGHT: 60, // Default fallback
  DEFAULT_TEXT_DURATION: 5,
  ZOOM_LEVELS: [0.25, 0.5, 1, 1.5, 2, 3, 4],
} as const;
