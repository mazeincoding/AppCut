import { useState, useCallback, useEffect, RefObject } from "react";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, WHEEL_ZOOM_STEP } from "@/constants/timeline-constants";


interface UseTimelineZoomProps {
  containerRef: RefObject<HTMLDivElement>;
  isInTimeline?: boolean;
  onFitToWindow?: () => void;
}

interface UseTimelineZoomReturn {
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
  handleWheel: (e: React.WheelEvent) => void;
}

const ZOOM_STORAGE_KEY = 'opencut-timeline-zoom';

export function useTimelineZoom({
  containerRef,
  isInTimeline = false,
  onFitToWindow
}: UseTimelineZoomProps): UseTimelineZoomReturn {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom if user is using pinch gesture (ctrlKey or metaKey is true)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
      setZoomLevel((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
    }
    // Otherwise, allow normal scrolling
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle zoom shortcuts when in timeline or when timeline is focused
      if (!isInTimeline) return;
      
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            setZoomLevel((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
            break;
          case '-':
            e.preventDefault();
            setZoomLevel((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
            break;
          case '0':
            e.preventDefault();
            setZoomLevel(1);
            break;
          case '9':
            e.preventDefault();
            if (onFitToWindow) {
              onFitToWindow();
            }
            break;
        }
      }
    };

    if (isInTimeline) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isInTimeline, setZoomLevel, onFitToWindow]);

  // Prevent browser zooming in/out when in timeline
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (
        isInTimeline &&
        (e.ctrlKey || e.metaKey) &&
        containerRef.current?.contains(e.target as Node)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", preventZoom, { passive: false });

    return () => {
      document.removeEventListener("wheel", preventZoom);
    };
  }, [isInTimeline, containerRef]);

  return {
    zoomLevel,
    setZoomLevel,
    handleWheel,
  };
}
