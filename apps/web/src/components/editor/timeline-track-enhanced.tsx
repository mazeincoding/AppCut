"use client";

import { TimelineTrackContent } from "./timeline-track";
import { useTimelineSnapping } from "@/hooks/use-timeline-snapping";
import type { TimelineTrackContentEnhancedProps } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

// SAFE: Wrapper that adds snapping without modifying existing component
export function TimelineTrackContentEnhanced({
  track,
  zoomLevel,
  onSnapPointChange,
  isSnappingEnabled = false,
  featureFlags = {},
}: TimelineTrackContentEnhancedProps) {
  // SAFE: Only use snapping if enabled
  const snapping = isSnappingEnabled ? useTimelineSnapping({
    tracks: [track], // Only this track for now
    zoomLevel,
    enabled: isSnappingEnabled,
    onSnapPointChange,
  }) : null;
  
  return (
    <div className="relative">
      {/* SAFE: Render original component unchanged */}
      <TimelineTrackContent track={track} zoomLevel={zoomLevel} />
      
      {/* SAFE: Snap indicators rendered as overlay */}
      {featureFlags.enableSnapVisualization && snapping && snapping.isEnabled && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {snapping.getSnapPositions().map((position, i) => (
            <div
              key={`snap-${track.id}-${i}-${position}`}
              className={`absolute top-0 bottom-0 w-px transition-all duration-150 ${
                snapping.isSnapping && Math.abs(position - (snapping.activeSnapPoint?.position || 0)) < 0.01
                  ? 'bg-accent shadow-lg opacity-100' 
                  : 'bg-primary/30 opacity-50'
              }`}
              style={{ 
                left: position * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
              }}
            />
          ))}
          
          {/* Active snap point indicator */}
          {snapping.activeSnapPoint && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-lg animate-pulse"
              style={{
                left: snapping.activeSnapPoint.position * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}