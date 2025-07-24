"use client";

import { useActionHandler } from "@/constants/actions";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from "../constants/timeline-constants";

interface UseTimelineZoomActionsProps {
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
  onFitToWindow?: () => void;
}

export function useTimelineZoomActions({
  zoomLevel,
  setZoomLevel,
  onFitToWindow,
}: UseTimelineZoomActionsProps) {
  // Zoom in action
  useActionHandler("zoom-in", () => {
    setZoomLevel((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  });

  // Zoom out action
  useActionHandler("zoom-out", () => {
    setZoomLevel((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  });

  // Reset zoom action
  useActionHandler("zoom-reset", () => {
    setZoomLevel(1);
  });

  // Fit to window action
  useActionHandler("zoom-fit", () => {
    if (onFitToWindow) {
      onFitToWindow();
    }
  });
}
