"use client";

import { TimelinePlayhead } from "./timeline-playhead";
import { formatTimelineTime } from "@/lib/timeline-helpers";

interface TimelinePlayheadEnhancedProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  tracks: any[];
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement | null>;
  rulerScrollRef: React.RefObject<HTMLDivElement | null>;
  tracksScrollRef: React.RefObject<HTMLDivElement | null>;
  trackLabelsRef?: React.RefObject<HTMLDivElement | null>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  playheadRef?: React.RefObject<HTMLDivElement | null>;
  isSnappingToPlayhead?: boolean;
  showTimeDisplay?: boolean;
}

// SAFE: Wrapper adds features without modifying existing
export function TimelinePlayheadEnhanced({
  isSnappingToPlayhead = false, 
  showTimeDisplay = false, 
  currentTime,
  ...baseProps
}: TimelinePlayheadEnhancedProps) {
  return (
    <div className="relative">
      {/* SAFE: Render original playhead component */}
      <TimelinePlayhead {...baseProps} currentTime={currentTime} />
      
      {/* SAFE: Additional features rendered separately */}
      {showTimeDisplay && (
        <div 
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-lg transition-all duration-150"
          style={{
            left: `${currentTime * 50 * baseProps.zoomLevel}px`, // Approximate positioning
          }}
        >
          {formatTimelineTime(currentTime, 30)}
        </div>
      )}
      
      {/* SAFE: Snapping visual indicator */}
      {isSnappingToPlayhead && (
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-0 bottom-0 w-1 bg-accent shadow-lg shadow-accent/50 animate-pulse"
            style={{
              left: `${currentTime * 50 * baseProps.zoomLevel}px`, // Approximate positioning
              transform: 'translateX(-2px)',
            }}
          />
        </div>
      )}
    </div>
  );
}