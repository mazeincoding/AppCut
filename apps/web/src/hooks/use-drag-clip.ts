import { useState, useEffect, useCallback, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";

interface DragState {
  isDragging: boolean;
  clipId: string | null;
  trackId: string | null;
  startMouseX: number;
  startClipTime: number;
  clickOffsetTime: number;
  currentTime: number;
}

export function useDragClip(zoomLevel: number) {
  const { tracks, updateClipStartTime, moveClipToTrack } = useTimelineStore();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    clipId: null,
    trackId: null,
    startMouseX: 0,
    startClipTime: 0,
    clickOffsetTime: 0,
    currentTime: 0,
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef(dragState);

  // Keep ref in sync with state
  dragStateRef.current = dragState;

  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      clipId: string,
      trackId: string,
      clipStartTime: number,
      clickOffsetTime: number
    ) => {
      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        clipId,
        trackId,
        startMouseX: e.clientX,
        startClipTime: clipStartTime,
        clickOffsetTime,
        currentTime: clipStartTime,
      });
    },
    []
  );

  const updateDrag = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || !timelineRef.current) {
        return;
      }

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - timelineRect.left;
      const mouseTime = Math.max(0, mouseX / (50 * zoomLevel));
      const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);
      const snappedTime = Math.round(adjustedTime * 10) / 10;

      setDragState((prev) => ({
        ...prev,
        currentTime: snappedTime,
      }));
    },
    [dragState.isDragging, dragState.clickOffsetTime, zoomLevel]
  );

  const endDrag = useCallback(
    (targetTrackId?: string) => {
      if (!dragState.isDragging || !dragState.clipId || !dragState.trackId)
        return;

      const finalTrackId = targetTrackId || dragState.trackId;
      const finalTime = dragState.currentTime;

      // Check for overlaps
      const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
      const targetTrack = tracks.find((t) => t.id === finalTrackId);
      const movingClip = sourceTrack?.clips.find(
        (c) => c.id === dragState.clipId
      );

      if (!movingClip || !targetTrack) {
        setDragState((prev) => ({ ...prev, isDragging: false }));
        return;
      }

      const movingClipDuration =
        movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
      const movingClipEnd = finalTime + movingClipDuration;

      const hasOverlap = targetTrack.clips.some((existingClip) => {
        // Skip the clip being moved if it's on the same track
        if (
          dragState.trackId === finalTrackId &&
          existingClip.id === dragState.clipId
        ) {
          return false;
        }

        const existingStart = existingClip.startTime;
        const existingEnd =
          existingClip.startTime +
          (existingClip.duration -
            existingClip.trimStart -
            existingClip.trimEnd);

        return finalTime < existingEnd && movingClipEnd > existingStart;
      });

      if (!hasOverlap) {
        if (dragState.trackId === finalTrackId) {
          // Moving within same track
          updateClipStartTime(finalTrackId, dragState.clipId!, finalTime);
        } else {
          // Moving to different track
          moveClipToTrack(dragState.trackId!, finalTrackId, dragState.clipId!);
          requestAnimationFrame(() => {
            updateClipStartTime(finalTrackId, dragState.clipId!, finalTime);
          });
        }
      }

      setDragState({
        isDragging: false,
        clipId: null,
        trackId: null,
        startMouseX: 0,
        startClipTime: 0,
        clickOffsetTime: 0,
        currentTime: 0,
      });
    },
    [dragState, tracks, updateClipStartTime, moveClipToTrack]
  );

  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      clipId: null,
      trackId: null,
      startMouseX: 0,
      startClipTime: 0,
      clickOffsetTime: 0,
      currentTime: 0,
    });
  }, []);

  // Global mouse events
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => updateDrag(e);
    const handleMouseUp = () => endDrag();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelDrag();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dragState.isDragging, updateDrag, endDrag, cancelDrag]);

  const getDraggedClipPosition = useCallback(
    (clipId: string) => {
      // Use ref to get current state, not stale closure
      const currentDragState = dragStateRef.current;
      const isMatch =
        currentDragState.isDragging && currentDragState.clipId === clipId;

      if (isMatch) {
        return currentDragState.currentTime;
      }
      return null;
    },
    [] // No dependencies needed since we use ref
  );

  const isValidDropTarget = useCallback(
    (trackId: string) => {
      if (!dragState.isDragging) return false;

      const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
      const targetTrack = tracks.find((t) => t.id === trackId);

      if (!sourceTrack || !targetTrack) return false;

      // For now, allow drops on same track type
      return sourceTrack.type === targetTrack.type;
    },
    [dragState.isDragging, dragState.trackId, tracks]
  );

  return {
    // State
    isDragging: dragState.isDragging,
    draggedClipId: dragState.clipId,
    currentDragTime: dragState.currentTime,
    clickOffsetTime: dragState.clickOffsetTime,

    // Methods
    startDrag,
    endDrag,
    cancelDrag,
    getDraggedClipPosition,
    isValidDropTarget,

    // Refs
    timelineRef,
  };
}
