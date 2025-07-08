"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import {
  MoreVertical,
  Scissors,
  Trash2,
  SplitSquareHorizontal,
  Music,
  ChevronRight,
  ChevronLeft,
  Type,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "./audio-waveform";
import { toast } from "sonner";
import { TimelineElementProps, TrackType } from "@/types/timeline";
import { useTimelineElementResize } from "@/hooks/use-timeline-element-resize";
import {
  getTrackElementClasses,
  TIMELINE_CONSTANTS,
} from "@/lib/timeline-constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../ui/dropdown-menu";

export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
}: TimelineElementProps) {
  const { mediaItems } = useMediaStore();
  const {
    updateElementTrim,
    updateElementDuration,
    removeElementFromTrack,
    dragState,
    splitElement,
    splitAndKeepLeft,
    splitAndKeepRight,
    separateAudio,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const [elementMenuOpen, setElementMenuOpen] = useState(false);

  const {
    resizing,
    isResizing,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
  } = useTimelineElementResize({
    element,
    track,
    zoomLevel,
    onUpdateTrim: updateElementTrim,
    onUpdateDuration: updateElementDuration,
  });

  const effectiveDuration =
    element.duration - element.trimStart - element.trimEnd;
  const elementWidth = Math.max(
    TIMELINE_CONSTANTS.ELEMENT_MIN_WIDTH,
    effectiveDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
  );

  // Use real-time position during drag, otherwise use stored position
  const isBeingDragged = dragState.elementId === element.id;
  const elementStartTime =
    isBeingDragged && dragState.isDragging
      ? dragState.currentTime
      : element.startTime;
  const elementLeft = elementStartTime * 50 * zoomLevel;

  const handleDeleteElement = () => {
    removeElementFromTrack(track.id, element.id);
    setElementMenuOpen(false);
  };

  const handleSplitElement = () => {
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within element to split");
      return;
    }

    const secondElementId = splitElement(track.id, element.id, currentTime);
    if (!secondElementId) {
      toast.error("Failed to split element");
    }
    setElementMenuOpen(false);
  };

  const handleSplitAndKeepLeft = () => {
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within element");
      return;
    }

    splitAndKeepLeft(track.id, element.id, currentTime);
    setElementMenuOpen(false);
  };

  const handleSplitAndKeepRight = () => {
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within element");
      return;
    }

    splitAndKeepRight(track.id, element.id, currentTime);
    setElementMenuOpen(false);
  };

  const handleSeparateAudio = () => {
    if (element.type !== "media") {
      toast.error("Audio separation only available for media elements");
      return;
    }

    const mediaItem = mediaItems.find((item) => item.id === element.mediaId);
    if (!mediaItem || mediaItem.type !== "video") {
      toast.error("Audio separation only available for video elements");
      return;
    }

    const audioElementId = separateAudio(track.id, element.id);
    if (!audioElementId) {
      toast.error("Failed to separate audio");
    }
    setElementMenuOpen(false);
  };

  const canSplitAtPlayhead = () => {
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);
    return currentTime > effectiveStart && currentTime < effectiveEnd;
  };

  const canSeparateAudio = () => {
    if (element.type !== "media") return false;
    const mediaItem = mediaItems.find((item) => item.id === element.mediaId);
    return mediaItem?.type === "video" && track.type === "media";
  };

  const renderElementContent = () => {
    if (element.type === "text") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-foreground/80 truncate">
            {element.content}
          </span>
        </div>
      );
    }

    // Render media element ->
    const mediaItem = mediaItems.find((item) => item.id === element.mediaId);
    if (!mediaItem) {
      return (
        <span className="text-xs text-foreground/80 truncate">
          {element.name}
        </span>
      );
    }

    if (mediaItem.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-[#004D52] py-3 w-full h-full">
            <img
              src={mediaItem.url}
              alt={mediaItem.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>
      );
    }

    if (mediaItem.type === "video" && mediaItem.thumbnailUrl) {
      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0">
            <img
              src={mediaItem.thumbnailUrl}
              alt={mediaItem.name}
              className="w-full h-full object-cover rounded-sm"
              draggable={false}
            />
          </div>
          <span className="text-xs text-foreground/80 truncate flex-1">
            {element.name}
          </span>
        </div>
      );
    }

    // Render audio element ->
    if (mediaItem.type === "audio") {
      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <AudioWaveform
              audioUrl={mediaItem.url || ""}
              height={24}
              className="w-full"
            />
          </div>
        </div>
      );
    }

    return (
      <span className="text-xs text-foreground/80 truncate">
        {element.name}
      </span>
    );
  };

  const handleElementMouseDown = (e: React.MouseEvent) => {
    if (onElementMouseDown) {
      onElementMouseDown(e, element);
    }
  };

  return (
    <div
      className={`absolute top-0 h-full select-none timeline-element ${
        isBeingDragged ? "z-50" : "z-10"
      }`}
      style={{
        left: `${elementLeft}px`,
        width: `${elementWidth}px`,
      }}
      onMouseMove={resizing ? handleResizeMove : undefined}
      onMouseUp={resizing ? handleResizeEnd : undefined}
      onMouseLeave={resizing ? handleResizeEnd : undefined}
    >
      <div
        className={`relative h-full rounded-[0.15rem] cursor-pointer overflow-hidden ${getTrackElementClasses(
          track.type
        )} ${isSelected ? "border-b-[0.5px] border-t-[0.5px] border-foreground" : ""} ${
          isBeingDragged ? "z-50" : "z-10"
        }`}
        onClick={(e) => onElementClick && onElementClick(e, element)}
        onMouseDown={handleElementMouseDown}
        onContextMenu={(e) =>
          onElementMouseDown && onElementMouseDown(e, element)
        }
      >
        <div className="absolute inset-0 flex items-center h-full">
          {renderElementContent()}
        </div>

        {isSelected && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-w-resize bg-foreground z-50"
              onMouseDown={(e) => handleResizeStart(e, element.id, "left")}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-e-resize bg-foreground z-50"
              onMouseDown={(e) => handleResizeStart(e, element.id, "right")}
            />
          </>
        )}
      </div>
    </div>
  );
}
