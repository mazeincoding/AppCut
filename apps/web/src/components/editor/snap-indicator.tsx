"use client";

import { SnapPoint } from "@/hooks/use-timeline-snapping";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface SnapIndicatorProps {
  snapPoint: SnapPoint | null;
  zoomLevel: number;
  timelineHeight: number;
  isVisible: boolean;
}

export function SnapIndicator({
  snapPoint,
  zoomLevel,
  timelineHeight,
  isVisible,
}: SnapIndicatorProps) {
  if (!isVisible || !snapPoint) {
    return null;
  }

  const leftPosition =
    snapPoint.time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

  const getIndicatorColor = () => {
    switch (snapPoint.type) {
      case "grid":
        return "bg-blue-400";
      case "element-start":
      case "element-end":
        return "bg-green-400";
      case "playhead":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  const getIndicatorLabel = () => {
    switch (snapPoint.type) {
      case "grid":
        return "Grid";
      case "element-start":
        return "Start";
      case "element-end":
        return "End";
      case "playhead":
        return "Playhead";
      default:
        return "";
    }
  };

  return (
    <div
      className="absolute top-0 pointer-events-none z-50"
      style={{
        left: `${leftPosition}px`,
        height: `${timelineHeight}px`,
      }}
    >
      {/* Snap line */}
      <div className={`w-0.5 h-full ${getIndicatorColor()} opacity-80`} />

      {/* Snap label */}
      <div
        className={`absolute top-0 left-1 px-1 py-0.5 text-xs text-white rounded ${getIndicatorColor()} opacity-90 whitespace-nowrap`}
        style={{ transform: "translateY(-100%)" }}
      >
        {getIndicatorLabel()} ({snapPoint.time.toFixed(1)}s)
      </div>
    </div>
  );
}
