import { MediaType } from "@/stores/media-store";
import { generateUUID } from "@/lib/utils";

export type TrackType = "media" | "text" | "audio";

// Base element properties
interface BaseTimelineElement {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

// Media element that references MediaStore
export interface MediaElement extends BaseTimelineElement {
  type: "media";
  mediaId: string;
}

// Text element with embedded text data
export interface TextElement extends BaseTimelineElement {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline" | "line-through";
  x: number; // Position relative to canvas center
  y: number; // Position relative to canvas center
  rotation: number; // in degrees
  opacity: number; // 0-1
}

// Typed timeline elements
export type TimelineElement = MediaElement | TextElement;

// Creation types (without id, for addElementToTrack)
export type CreateMediaElement = Omit<MediaElement, "id">;
export type CreateTextElement = Omit<TextElement, "id">;
export type CreateTimelineElement = CreateMediaElement | CreateTextElement;

export interface TimelineElementProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onElementMouseDown: (e: React.MouseEvent, element: TimelineElement) => void;
  onElementClick: (e: React.MouseEvent, element: TimelineElement) => void;
}

export interface ResizeState {
  elementId: string;
  side: "left" | "right";
  startX: number;
  initialTrimStart: number;
  initialTrimEnd: number;
}

// Drag data types for type-safe drag and drop
export interface MediaItemDragData {
  id: string;
  type: MediaType;
  name: string;
}

export interface TextItemDragData {
  id: string;
  type: "text";
  name: string;
  content: string;
}

export type DragData = MediaItemDragData | TextItemDragData;

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  elements: TimelineElement[];
  muted?: boolean;
  isMain?: boolean;
}

export function sortTracksByOrder(tracks: TimelineTrack[]): TimelineTrack[] {
  return [...tracks].sort((a, b) => {
    // Audio tracks always go to bottom
    if (a.type === "audio" && b.type !== "audio") return 1;
    if (b.type === "audio" && a.type !== "audio") return -1;

    // Main track goes above audio but below other tracks
    if (a.isMain && !b.isMain && b.type !== "audio") return 1;
    if (b.isMain && !a.isMain && a.type !== "audio") return -1;

    // Within same category, maintain creation order
    return 0;
  });
}

export function getMainTrack(tracks: TimelineTrack[]): TimelineTrack | null {
  return tracks.find((track) => track.isMain) || null;
}

export function ensureMainTrack(tracks: TimelineTrack[]): TimelineTrack[] {
  const hasMainTrack = tracks.some((track) => track.isMain);

  if (!hasMainTrack) {
    // Create main track if it doesn't exist
    const mainTrack: TimelineTrack = {
      id: generateUUID(),
      name: "Main Track",
      type: "media",
      elements: [],
      muted: false,
      isMain: true,
    };
    return [mainTrack, ...tracks];
  }

  return tracks;
}

// Timeline validation utilities
export function canElementGoOnTrack(
  elementType: "text" | "media",
  trackType: TrackType
): boolean {
  if (elementType === "text") {
    return trackType === "text";
  } else if (elementType === "media") {
    return trackType === "media" || trackType === "audio";
  }
  return false;
}

export function validateElementTrackCompatibility(
  element: { type: "text" | "media" },
  track: { type: TrackType }
): { isValid: boolean; errorMessage?: string } {
  const isValid = canElementGoOnTrack(element.type, track.type);

  if (!isValid) {
    const errorMessage =
      element.type === "text"
        ? "Text elements can only be placed on text tracks"
        : "Media elements can only be placed on media or audio tracks";

    return { isValid: false, errorMessage };
  }

  return { isValid: true };
}

// SAFE: New types added at end of file, no existing types modified
export interface SnapPoint {
  position: number;
  type: 'element-start' | 'element-end' | 'playhead' | 'grid';
  strength: number;
  elementId?: string;
  trackId?: string;
}

export interface SnapResult {
  snappedTime: number;
  snapPoint?: SnapPoint;
  didSnap: boolean;
}

// Feature flag interface
export interface TimelineFeatureFlags {
  enableSnapping?: boolean;
  enableSnapVisualization?: boolean;
  enableToolSelection?: boolean;
  enableTimeDisplay?: boolean;
}

// SAFE: Create extended interface, don't modify existing
export interface TimelineElementPropsWithSnapping extends TimelineElementProps {
  isSnapping?: boolean;
  onSnapChange?: (snapping: boolean) => void;
}

// For backward compatibility, components can use either interface

// SAFE: New interface for enhanced toolbar, existing toolbar remains unchanged
export interface EnhancedTimelineToolbarProps {
  // Existing props
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  
  // New optional props with defaults
  selectedTool?: 'select' | 'cut' | 'text';
  setSelectedTool?: (tool: 'select' | 'cut' | 'text') => void;
  isSnappingEnabled?: boolean;
  setIsSnappingEnabled?: (enabled: boolean) => void;
  featureFlags?: TimelineFeatureFlags;
}

// SAFE: Optional props interface that extends functionality
export interface TimelineTrackContentEnhancedProps {
  track: TimelineTrack;
  zoomLevel: number;
  // All new props are optional with defaults
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
  isSnappingEnabled?: boolean;
  featureFlags?: TimelineFeatureFlags;
}
