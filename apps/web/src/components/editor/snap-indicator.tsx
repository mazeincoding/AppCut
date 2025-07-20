"use client";

import { SnapPoint } from "@/hooks/use-timeline-snapping";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import type { TimelineTrack } from "@/types/timeline";

interface SnapIndicatorProps {
  snapPoint: SnapPoint | null;
  zoomLevel: number;
  isVisible: boolean;
  tracks: TimelineTrack[];
  timelineRef: React.RefObject<HTMLDivElement>;
  trackLabelsRef?: React.RefObject<HTMLDivElement>;
}

export function SnapIndicator({
  snapPoint,
  zoomLevel,
  isVisible,
  tracks,
  timelineRef,
  trackLabelsRef,
}: SnapIndicatorProps) {
  if (!isVisible || !snapPoint) {
    return null;
  }

  const timelineContainerHeight = timelineRef.current?.offsetHeight || 400;
  const totalHeight = timelineContainerHeight - 8; // 8px padding from edges

  // Get dynamic track labels width, fallback to 0 if no tracks or no ref
  const trackLabelsWidth =
    tracks.length > 0 && trackLabelsRef?.current
      ? trackLabelsRef.current.offsetWidth
      : 0;

  const leftPosition =
    trackLabelsWidth +
    snapPoint.time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

  return (
    <div
      className="absolute pointer-events-none z-[90]"
      style={{
        left: `${leftPosition}px`,
        top: 0,
        height: `${totalHeight}px`,
        width: "2px",
      }}
    >
      <div className={`w-0.5 h-full bg-primary/40 opacity-80`} />
    </div>
  );
}
