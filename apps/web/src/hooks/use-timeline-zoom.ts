import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useState, useCallback, RefObject, useMemo } from "react";

interface UseTimelineZoomProps {
  containerRef: RefObject<HTMLDivElement>;
  isInTimeline?: boolean;
}

interface UseTimelineZoomReturn {
  zoomLevel: number;
  zoomStep: number;
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
  handleChangeZoomStep: (zoomStep: number) => void;
  handleChangeZoomLevel: (zoomStep: number) => void;
  handleWheel: (e: React.WheelEvent) => void;
}

/**
 * useTimelineZoom
 *
 * Custom hook to manage zoom logic for a timeline component.
 * Handles zoom state, step calculation, level changes, and mouse wheel zooming (with ctrl/meta).
 */
export function useTimelineZoom(): UseTimelineZoomReturn {
  // Current zoom level (1 = default)
  const [zoomLevel, setZoomLevel] = useState(1);

  /**
   * Calculate the current zoom step based on the zoom level and a base step constant.
   * Ensures minimum step is 1 (prevents zero or negative step).
   */
  const zoomStep = useMemo(
    () =>
      Math.max(1, Math.round(zoomLevel / TIMELINE_CONSTANTS.ZOOM_STEP_BASE)),
    [zoomLevel]
  );

  /**
   * Update the zoom level using a given step.
   * The zoom level is clamped to a minimum value defined in constants.
   */
  const handleChangeZoomStep = useCallback((newStep: number) => {
    setZoomLevel(
      Math.max(
        TIMELINE_CONSTANTS.ZOOM_LEVEL_MIN,
        newStep * TIMELINE_CONSTANTS.ZOOM_STEP_BASE
      )
    );
  }, []);

  /**
   * Update the zoom level directly.
   * The new value is clamped between the defined minimum and maximum levels.
   */
  const handleChangeZoomLevel = useCallback((newLevel: number) => {
    setZoomLevel(
      Math.max(
        TIMELINE_CONSTANTS.ZOOM_LEVEL_MIN,
        Math.min(TIMELINE_CONSTANTS.ZOOM_LEVEL_MAX, newLevel)
      )
    );
  }, []);

  /**
   * Handle zooming using mouse wheel + ctrl/meta key (like browser zoom).
   * Prevents default browser behavior and updates zoom level accordingly.
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault?.();
      const delta =
        e.deltaY > 0
          ? -TIMELINE_CONSTANTS.ZOOM_STEP_BASE
          : TIMELINE_CONSTANTS.ZOOM_STEP_BASE;
      setZoomLevel((prev) =>
        Math.max(
          TIMELINE_CONSTANTS.ZOOM_LEVEL_MIN,
          Math.min(TIMELINE_CONSTANTS.ZOOM_LEVEL_MAX, prev + delta)
        )
      );
    }
  }, []);

  // Return all handlers and state values for use in timeline components
  return {
    zoomLevel, // Current zoom level
    zoomStep, // Current zoom step (calculated from zoomLevel)
    setZoomLevel, // Directly set the zoom level (accepts value or updater function)
    handleChangeZoomStep, // Change zoom by step value
    handleChangeZoomLevel, // Change zoom by level value
    handleWheel, // Handler for mouse wheel zooming
  };
}
