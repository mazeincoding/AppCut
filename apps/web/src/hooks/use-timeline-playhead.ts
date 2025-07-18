import { snapTimeToFrame } from "@/constants/timeline-constants";
import { useProjectStore } from "@/stores/project-store";
import { useRef, useState, useCallback } from "react";

interface UseTimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
}

/**
 * useTimelinePlayhead
 *
 * Custom hook to manage playhead (scrubbing) logic for a timeline editor.
 * Handles mouse interaction for timeline ruler, calculates time from mouse,
 * and enables smooth scrubbing without unnecessary re-renders.
 */
export function useTimelinePlayhead({
  currentTime,
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
}: UseTimelinePlayheadProps) {
  // Get current project info (especially FPS) from global store
  const { activeProject } = useProjectStore();

  // Ref to track if currently scrubbing
  const isScrubbingRef = useRef(false);

  // Ref to hold the playhead time while scrubbing (does not trigger re-render)
  const scrubTimeRef = useRef<number | null>(null);

  // State to force re-render when scrubbing ends
  const [_, forceRerender] = useState(0);

  /**
   * Determines the actual playhead position:
   * - If scrubbing, use the value in scrubTimeRef
   * - Otherwise, use the currentTime (controlled by external state)
   */
  const playheadPosition =
    isScrubbingRef.current && scrubTimeRef.current !== null
      ? scrubTimeRef.current
      : currentTime;

  /**
   * Calculate timeline time (in seconds) based on mouse X position.
   * - Gets bounding rect of the ruler
   * - Adjusts for scroll position if ruler is scrollable
   * - Converts X pixel offset to seconds using current zoom level
   * - Snaps to nearest frame using FPS
   */
  const getTimeFromMouse = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const ruler = rulerRef.current;
      const scrollArea = rulerScrollRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement;

      if (!ruler || !scrollArea) return 0;

      const rect = ruler.getBoundingClientRect();
      const scrollLeft = scrollArea.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;

      // Calculate how many pixels represent one second, depending on zoom
      const pixelsPerSecond = 50 * zoomLevel;
      const rawTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
      const time = snapTimeToFrame(rawTime, activeProject?.fps || 30);
      return time;
    },
    [rulerRef, rulerScrollRef, duration, zoomLevel, activeProject?.fps]
  );

  /**
   * Handle mouse down event on the ruler:
   * - Starts scrubbing and updates playhead immediately
   * - Registers mousemove/mouseup events to allow scrubbing
   * - Updates time as mouse moves and seeks to new time
   * - Cleans up listeners and triggers re-render when scrubbing ends
   */
  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const time = getTimeFromMouse(e);

      isScrubbingRef.current = true;
      scrubTimeRef.current = time;
      seek(time);

      // Mouse move handler: update playhead and seek to new time
      const onMouseMove = (e: MouseEvent) => {
        const t = getTimeFromMouse(e);
        if (t !== scrubTimeRef.current) {
          scrubTimeRef.current = t;
          seek(t);
        }
      };

      // Mouse up handler: stop scrubbing, cleanup, and force re-render
      const onMouseUp = () => {
        isScrubbingRef.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        forceRerender((v) => v + 1);
      };

      // Attach listeners to window for drag outside the ruler area
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [getTimeFromMouse, seek]
  );

  return {
    playheadPosition, // Current playhead position (real-time while scrubbing)
    handleRulerMouseDown, // Attach to the ruler's onMouseDown
  };
}
