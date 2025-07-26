"use client";

import { useRef } from "react";
import { TimelineTrack } from "@/types/timeline";
import {
  TIMELINE_CONSTANTS,
  getTotalTracksHeight,
} from "@/constants/timeline-constants";
import { useTimelinePlayhead } from "@/hooks/use-timeline-playhead";

interface TimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  tracks: TimelineTrack[];
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement | null>;
  rulerScrollRef: React.RefObject<HTMLDivElement | null>;
  tracksScrollRef: React.RefObject<HTMLDivElement | null>;
  trackLabelsRef?: React.RefObject<HTMLDivElement | null>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  playheadRef?: React.RefObject<HTMLDivElement | null>;
}

export function TimelinePlayhead({
  currentTime,
  duration,
  zoomLevel,
  tracks,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  trackLabelsRef,
  timelineRef,
  playheadRef: externalPlayheadRef,
}: TimelinePlayheadProps) {
  const internalPlayheadRef = useRef<HTMLDivElement>(null);
  const playheadRef = externalPlayheadRef || internalPlayheadRef;
  const { playheadPosition, handlePlayheadMouseDown } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  // Use timeline container height minus a few pixels for breathing room
  const timelineContainerHeight = timelineRef.current?.offsetHeight || 400;
  const totalHeight = timelineContainerHeight - 8; // 8px padding from edges

  // Get dynamic track labels width, fallback to 0 if no tracks or no ref
  const trackLabelsWidth =
    tracks.length > 0 && trackLabelsRef?.current
      ? trackLabelsRef.current.offsetWidth
      : 0;
  const leftPosition =
    trackLabelsWidth + 180 +
    playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

  return (
    <div
      ref={playheadRef}
      className="absolute pointer-events-auto z-[999]"
      style={{
        left: `${leftPosition}px`,
        top: 0,
        height: `${totalHeight}px`,
        width: "8px", // Much wider for better visibility and click target
      }}
      onMouseDown={handlePlayheadMouseDown}
    >
      {/* The red line spanning full height */}
      <div 
        className="absolute left-0 cursor-col-resize h-full"
        style={{
          width: '2px',
          backgroundColor: '#dc2626',
          borderLeft: '1px solid #ef4444',
          boxShadow: '0 0 15px rgba(220, 38, 38, 0.8), inset 0 0 5px rgba(220, 38, 38, 0.5)'
        }}
      />

    </div>
  );
}

// Also export a hook for getting ruler handlers
export function useTimelinePlayheadRuler({
  currentTime,
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  playheadRef,
}: Omit<TimelinePlayheadProps, "tracks" | "trackLabelsRef" | "timelineRef">) {
  const { handleRulerMouseDown, isDraggingRuler } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  return { handleRulerMouseDown, isDraggingRuler };
}

export { TimelinePlayhead as default };
