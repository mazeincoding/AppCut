import { TimelineTrack, TimelineClip } from "@/stores/timeline-store";

export type TrackType = "video" | "audio" | "effects";

export interface TimelineClipProps {
  clip: TimelineClip;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onClipMouseDown: (e: React.MouseEvent, clip: TimelineClip) => void;
  onClipClick: (e: React.MouseEvent, clip: TimelineClip) => void;
}

export interface ResizeState {
  clipId: string;
  side: "left" | "right";
  startX: number;
  initialTrimStart: number;
  initialTrimEnd: number;
}
