import { TimelineTrack, TimelineClip } from "@/stores/timeline-store";

export interface TimelineClipProps {
  clip: TimelineClip;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent, clipId: string) => void;
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

export interface ContextMenuState {
  type: "track" | "clip";
  trackId: string;
  clipId?: string;
  x: number;
  y: number;
}
