"use client";

import { useRef } from "react";
import { TimelineTrack } from "@/types/timeline";
import {
  TIMELINE_CONSTANTS,
  getTotalTracksHeight,
} from "@/constants/timeline-constants";
import { useTimelinePlayhead } from "@/hooks/use-timeline-playhead";

// Fake cursor component to replace system cursor with 200px offset
const FakeCursor = () => (
  <div className="fake-cursor pointer-events-none" style={{
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      width: '2px',
      height: '16px',
      background: '#000',
      position: 'relative'
    }}>
      {/* Top arrow */}
      <div style={{
        position: 'absolute',
        top: '-2px',
        left: '-2px',
        width: '0',
        height: '0',
        borderLeft: '3px solid transparent',
        borderRight: '3px solid transparent',
        borderBottom: '4px solid #000',
      }} />
      {/* Bottom arrow */}
      <div style={{
        position: 'absolute',
        bottom: '-2px',
        left: '-2px',
        width: '0',
        height: '0',
        borderLeft: '3px solid transparent',
        borderRight: '3px solid transparent',
        borderTop: '4px solid #000',
      }} />
    </div>
  </div>
);

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
  const { playheadPosition, handlePlayheadMouseDown, fakeCursorPosition } = useTimelinePlayhead({
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
    325 +
    playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

  // Debug playhead positioning (disabled by default)
  // console.log('🔴 PLAYHEAD HORIZONTAL POSITION:', {
  //   leftPosition,
  //   trackLabelsWidth,
  //   playheadPosition,
  //   currentTime
  // });

  return (
    <>
    <div
      ref={playheadRef}
      className="absolute pointer-events-auto z-[999] select-none"
      style={{
        left: `${leftPosition}px`,
        top: 0,
        height: `${totalHeight}px`,
        width: "8px", // Much wider for better visibility and click target
        cursor: 'none', // Hide system cursor so we can show fake one at red line position
      }}
      onMouseDown={handlePlayheadMouseDown}
    >
      {/* The red line spanning full height */}
      <div 
        className="absolute cursor-col-resize h-full select-none"
        style={{
          left: '3px', // Center the cursor on the line (8px width / 2 - 1px line width / 2)
          width: '2px',
          backgroundColor: '#dc2626',
          borderLeft: '1px solid #ef4444',
          boxShadow: '0 0 15px rgba(220, 38, 38, 0.8), inset 0 0 5px rgba(220, 38, 38, 0.5)',
          userSelect: 'none',
          pointerEvents: 'none' // The parent div handles mouse events
        }}
      />

    </div>
    
    {/* Fake cursor element positioned 200px right of actual mouse position */}
    {fakeCursorPosition.visible && (
      <div 
        className="fake-cursor fixed z-[9999] pointer-events-none"
        style={{
          left: `${fakeCursorPosition.x + TIMELINE_CONSTANTS.CURSOR_OFFSET_PX}px`,
          top: `${fakeCursorPosition.y - 10}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <FakeCursor />
      </div>
    )}
    </>
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
  const { handleRulerMouseDown, isDraggingRuler, fakeCursorPosition } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  return { handleRulerMouseDown, isDraggingRuler, fakeCursorPosition };
}

export { TimelinePlayhead as default };
