import { snapTimeToFrame } from "@/constants/timeline-constants";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useState, useEffect, useCallback, useRef } from "react";

interface UseTimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
  playheadRef?: React.RefObject<HTMLDivElement>;
}

export function useTimelinePlayhead({
  currentTime,
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  playheadRef,
}: UseTimelinePlayheadProps) {
  // Playhead scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Ruler drag detection state
  const [isDraggingRuler, setIsDraggingRuler] = useState(false);
  const [hasDraggedRuler, setHasDraggedRuler] = useState(false);

  // Auto-scroll state during dragging
  const autoScrollRef = useRef<number | null>(null);
  const lastMouseXRef = useRef<number>(0);

  const playheadPosition =
    isScrubbing && scrubTime !== null ? scrubTime : currentTime;

  // --- Playhead Scrubbing Handlers ---
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent ruler drag from triggering
      setIsScrubbing(true);
      handleScrub(e);
    },
    [duration, zoomLevel]
  );

  // Ruler mouse down handler
  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      // Don't interfere if clicking on the playhead itself
      if (playheadRef?.current?.contains(e.target as Node)) return;

      e.preventDefault();
      setIsDraggingRuler(true);
      setHasDraggedRuler(false);

      // Start scrubbing immediately
      setIsScrubbing(true);
      handleScrub(e);
    },
    [duration, zoomLevel]
  );

  const handleScrub = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const ruler = rulerRef.current;
      if (!ruler) return;
      const rect = ruler.getBoundingClientRect();
      const rawX = e.clientX - rect.left;

      // Get the timeline content width based on duration and zoom
      const timelineContentWidth = duration * 50 * zoomLevel; // TIMELINE_CONSTANTS.PIXELS_PER_SECOND = 50

      // Constrain x to be within the timeline content bounds
      const x = Math.max(0, Math.min(timelineContentWidth, rawX));

      const rawTime = Math.max(0, Math.min(duration, x / (50 * zoomLevel)));
      // Use frame snapping for playhead scrubbing
      const projectStore = useProjectStore.getState();
      const projectFps = projectStore.activeProject?.fps || 30;
      const time = snapTimeToFrame(rawTime, projectFps);

      // Debug logging
      if (rawX < 0 || x !== rawX) {
        console.log(
          "PLAYHEAD DEBUG:",
          JSON.stringify({
            mouseX: e.clientX,
            rulerLeft: rect.left,
            rawX,
            constrainedX: x,
            timelineContentWidth,
            rawTime,
            finalTime: time,
            duration,
            zoomLevel,
            playheadPx: time * 50 * zoomLevel,
          })
        );
      }

      setScrubTime(time);
      seek(time); // update video preview in real time

      // Store mouse position for auto-scrolling
      lastMouseXRef.current = e.clientX;
    },
    [duration, zoomLevel, seek, rulerRef]
  );

  // Auto-scroll function during dragging
  const performAutoScroll = useCallback(() => {
    const rulerViewport = rulerScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    const tracksViewport = tracksScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;

    if (!rulerViewport || !tracksViewport || !isScrubbing) return;

    const viewportRect = rulerViewport.getBoundingClientRect();
    const mouseX = lastMouseXRef.current;
    const mouseXRelative = mouseX - viewportRect.left;

    const edgeThreshold = 100; // pixels from edge to start scrolling
    const maxScrollSpeed = 15; // max pixels per frame
    const viewportWidth = rulerViewport.clientWidth;

    // Calculate timeline content boundaries
    const timelineContentWidth = duration * 50 * zoomLevel; // TIMELINE_CONSTANTS.PIXELS_PER_SECOND = 50
    const scrollMax = Math.max(0, timelineContentWidth - viewportWidth);

    let scrollSpeed = 0;

    // Check if near left edge (and can scroll left)
    if (mouseXRelative < edgeThreshold && rulerViewport.scrollLeft > 0) {
      const edgeDistance = Math.max(0, mouseXRelative);
      const intensity = 1 - edgeDistance / edgeThreshold;
      scrollSpeed = -maxScrollSpeed * intensity;
    }
    // Check if near right edge (and can scroll right, and haven't reached timeline end)
    else if (
      mouseXRelative > viewportWidth - edgeThreshold &&
      rulerViewport.scrollLeft < scrollMax
    ) {
      const edgeDistance = Math.max(
        0,
        viewportWidth - edgeThreshold - mouseXRelative
      );
      const intensity = 1 - edgeDistance / edgeThreshold;
      scrollSpeed = maxScrollSpeed * intensity;
    }

    if (scrollSpeed !== 0) {
      const newScrollLeft = Math.max(
        0,
        Math.min(scrollMax, rulerViewport.scrollLeft + scrollSpeed)
      );
      rulerViewport.scrollLeft = newScrollLeft;
      tracksViewport.scrollLeft = newScrollLeft;
    }

    if (isScrubbing) {
      autoScrollRef.current = requestAnimationFrame(performAutoScroll);
    }
  }, [isScrubbing, rulerScrollRef, tracksScrollRef, duration, zoomLevel]);

  // Mouse move/up event handlers
  useEffect(() => {
    if (!isScrubbing) return;

    const onMouseMove = (e: MouseEvent) => {
      handleScrub(e);
      // Mark that we've dragged if ruler drag is active
      if (isDraggingRuler) {
        setHasDraggedRuler(true);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      setIsScrubbing(false);
      if (scrubTime !== null) seek(scrubTime); // finalize seek
      setScrubTime(null);

      // Stop auto-scrolling
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }

      // Handle ruler click vs drag
      if (isDraggingRuler) {
        setIsDraggingRuler(false);
        // If we didn't drag, treat it as a click-to-seek
        if (!hasDraggedRuler) {
          handleScrub(e);
        }
        setHasDraggedRuler(false);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Start auto-scrolling
    autoScrollRef.current = requestAnimationFrame(performAutoScroll);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [
    isScrubbing,
    scrubTime,
    seek,
    handleScrub,
    isDraggingRuler,
    hasDraggedRuler,
    performAutoScroll,
  ]);

  // --- Playhead auto-scroll effect (only during playback) ---
  useEffect(() => {
    const { isPlaying } = usePlaybackStore.getState();

    // Only auto-scroll during playback, not during manual interactions
    if (!isPlaying || isScrubbing) return;

    const rulerViewport = rulerScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    const tracksViewport = tracksScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!rulerViewport || !tracksViewport) return;

    const playheadPx = playheadPosition * 50 * zoomLevel; // TIMELINE_CONSTANTS.PIXELS_PER_SECOND = 50
    const viewportWidth = rulerViewport.clientWidth;
    const scrollMin = 0;
    const scrollMax = rulerViewport.scrollWidth - viewportWidth;

    // Only auto-scroll if playhead is completely out of view (no buffer)
    const needsScroll =
      playheadPx < rulerViewport.scrollLeft ||
      playheadPx > rulerViewport.scrollLeft + viewportWidth;

    if (needsScroll) {
      // Center the playhead in the viewport
      const desiredScroll = Math.max(
        scrollMin,
        Math.min(scrollMax, playheadPx - viewportWidth / 2)
      );
      rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
    }
  }, [
    playheadPosition,
    duration,
    zoomLevel,
    rulerScrollRef,
    tracksScrollRef,
    isScrubbing,
  ]);

  return {
    playheadPosition,
    handlePlayheadMouseDown,
    handleRulerMouseDown,
    isDraggingRuler,
  };
}
