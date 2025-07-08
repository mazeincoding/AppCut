import { useState, useEffect } from "react";
import { ResizeState, TimelineElement, TimelineTrack } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";

interface UseTimelineElementResizeProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
  onUpdateTrim: (
    trackId: string,
    elementId: string,
    trimStart: number,
    trimEnd: number
  ) => void;
  onUpdateDuration: (
    trackId: string,
    elementId: string,
    duration: number
  ) => void;
}

export function useTimelineElementResize({
  element,
  track,
  zoomLevel,
  onUpdateTrim,
  onUpdateDuration,
}: UseTimelineElementResizeProps) {
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const { mediaItems } = useMediaStore();

  // Set up document-level mouse listeners during resize (like proper drag behavior)
  useEffect(() => {
    if (!resizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      updateTrimFromMouseMove({ clientX: e.clientX });
    };

    const handleDocumentMouseUp = () => {
      handleResizeEnd();
    };

    // Add document-level listeners for proper drag behavior
    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [resizing]); // Re-run when resizing state changes

  const handleResizeStart = (
    e: React.MouseEvent,
    elementId: string,
    side: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setResizing({
      elementId,
      side,
      startX: e.clientX,
      initialTrimStart: element.trimStart,
      initialTrimEnd: element.trimEnd,
    });
  };

  const canExtendElementDuration = () => {
    // Text elements can always be extended
    if (element.type === "text") {
      return true;
    }

    // Media elements - check the media type
    if (element.type === "media") {
      const mediaItem = mediaItems.find((item) => item.id === element.mediaId);
      if (!mediaItem) return false;

      // Images can be extended (static content)
      if (mediaItem.type === "image") {
        return true;
      }

      // Videos and audio cannot be extended beyond their natural duration
      // (no additional content exists)
      return false;
    }

    return false;
  };

  const updateTrimFromMouseMove = (e: { clientX: number }) => {
    if (!resizing) return;

    const deltaX = e.clientX - resizing.startX;
    // Reasonable sensitivity for resize operations - similar to timeline scale
    const deltaTime = deltaX / (50 * zoomLevel);

    if (resizing.side === "left") {
      // Left resize - only trim within original duration
      const maxAllowed = element.duration - resizing.initialTrimEnd - 0.1;
      const calculated = resizing.initialTrimStart + deltaTime;
      const newTrimStart = Math.max(0, Math.min(maxAllowed, calculated));

      onUpdateTrim(track.id, element.id, newTrimStart, resizing.initialTrimEnd);
    } else {
      // Right resize - can extend duration for supported element types
      const calculated = resizing.initialTrimEnd - deltaTime;

      if (calculated < 0) {
        // We're trying to extend beyond original duration
        if (canExtendElementDuration()) {
          // Extend the duration instead of reducing trimEnd further
          const extensionNeeded = Math.abs(calculated);
          const newDuration = element.duration + extensionNeeded;
          const newTrimEnd = 0; // Reset trimEnd to 0 since we're extending

          // Update duration first, then trim
          onUpdateDuration(track.id, element.id, newDuration);
          onUpdateTrim(
            track.id,
            element.id,
            resizing.initialTrimStart,
            newTrimEnd
          );
        } else {
          // Can't extend - just set trimEnd to 0 (maximum possible extension)
          onUpdateTrim(track.id, element.id, resizing.initialTrimStart, 0);
        }
      } else {
        // Normal trimming within original duration
        const maxTrimEnd = element.duration - resizing.initialTrimStart - 0.1; // Leave at least 0.1s visible
        const newTrimEnd = Math.max(0, Math.min(maxTrimEnd, calculated));

        onUpdateTrim(
          track.id,
          element.id,
          resizing.initialTrimStart,
          newTrimEnd
        );
      }
    }
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    updateTrimFromMouseMove(e);
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  return {
    resizing,
    isResizing: resizing !== null,
    handleResizeStart,
    // Return empty handlers since we use document listeners now
    handleResizeMove: () => {}, // Not used anymore
    handleResizeEnd: () => {}, // Not used anymore
  };
}
