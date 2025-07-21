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
  Copy,
  RefreshCw,
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
  getTrackHeight,
} from "@/constants/timeline-constants";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";

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
    removeElementFromTrackWithRipple,
    dragState,
    splitElement,
    splitAndKeepLeft,
    splitAndKeepRight,
    separateAudio,
    addElementToTrack,
    replaceElementMedia,
    rippleEditingEnabled,
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

  // Element should always be positioned at startTime - trimStart only affects content, not position
  const elementLeft = elementStartTime * 50 * zoomLevel;

  const handleElementSplitContext = () => {
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);

    if (currentTime > effectiveStart && currentTime < effectiveEnd) {
      const secondElementId = splitElement(track.id, element.id, currentTime);
      if (!secondElementId) {
        toast.error("Failed to split element");
      }
    } else {
      toast.error("Playhead must be within element to split");
    }
  };

  const handleElementDuplicateContext = () => {
    const { id, ...elementWithoutId } = element;
    addElementToTrack(track.id, {
      ...elementWithoutId,
      name: element.name + " (copy)",
      startTime:
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd) +
        0.1,
    });
  };

  const handleElementDeleteContext = () => {
    if (rippleEditingEnabled) {
      removeElementFromTrackWithRipple(track.id, element.id);
    } else {
      removeElementFromTrack(track.id, element.id);
    }
  };

  const handleReplaceClip = () => {
    if (element.type !== "media") {
      toast.error("Replace is only available for media clips");
      return;
    }

    // Create a file input to select replacement media
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,audio/*,image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const success = await replaceElementMedia(track.id, element.id, file);
        if (success) {
          toast.success("Clip replaced successfully");
        } else {
          toast.error("Failed to replace clip");
        }
      } catch (error) {
        toast.error("Failed to replace clip");
        console.log(
          JSON.stringify({ error: "Failed to replace clip", details: error })
        );
      }
    };
    input.click();
  };

  const renderElementContent = () => {
    if (element.type === "text") {
      return (
        <div className="w-full h-full flex items-center justify-start pl-2">
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

    const TILE_ASPECT_RATIO = 16 / 9;

    if (mediaItem.type === "image") {
      // Calculate tile size based on 16:9 aspect ratio
      const trackHeight = getTrackHeight(track.type);
      const tileHeight = trackHeight - 8; // Account for padding
      const tileWidth = tileHeight * TILE_ASPECT_RATIO;

      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-[#004D52] py-3 w-full h-full relative">
            {/* Background with tiled images */}
            <div
              className="absolute top-3 bottom-3 left-0 right-0"
              style={{
                backgroundImage: mediaItem.url
                  ? `url(${mediaItem.url})`
                  : "none",
                backgroundRepeat: "repeat-x",
                backgroundSize: `${tileWidth}px ${tileHeight}px`,
                backgroundPosition: "left center",
                pointerEvents: "none",
              }}
              aria-label={`Tiled background of ${mediaItem.name}`}
            />
            {/* Overlay with vertical borders */}
            <div
              className="absolute top-3 bottom-3 left-0 right-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  to right,
                  transparent 0px,
                  transparent ${tileWidth - 1}px,
                  rgba(255, 255, 255, 0.6) ${tileWidth - 1}px,
                  rgba(255, 255, 255, 0.6) ${tileWidth}px
                )`,
                backgroundPosition: "left center",
              }}
            />
          </div>
        </div>
      );
    }

    const VIDEO_TILE_PADDING = 16;
    const OVERLAY_SPACE_MULTIPLIER = 1.5;

    if (mediaItem.type === "video" && mediaItem.thumbnailUrl) {
      const trackHeight = getTrackHeight(track.type);
      const tileHeight = trackHeight - VIDEO_TILE_PADDING;
      const tileWidth = tileHeight * TILE_ASPECT_RATIO;

      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="flex-1 h-full relative overflow-hidden">
            {/* Background with tiled thumbnails */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: mediaItem.thumbnailUrl
                  ? `url(${mediaItem.thumbnailUrl})`
                  : "none",
                backgroundRepeat: "repeat-x",
                backgroundSize: `${tileWidth}px ${tileHeight}px`,
                backgroundPosition: "left center",
                pointerEvents: "none",
              }}
              aria-label={`Tiled thumbnail of ${mediaItem.name}`}
            />
            {/* Overlay with vertical borders */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  to right,
                  transparent 0px,
                  transparent ${tileWidth - 1}px,
                  rgba(255, 255, 255, 0.6) ${tileWidth - 1}px,
                  rgba(255, 255, 255, 0.6) ${tileWidth}px
                )`,
                backgroundPosition: "left center",
              }}
            />
          </div>
          {elementWidth > tileWidth * OVERLAY_SPACE_MULTIPLIER ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none max-w-[40%] truncate">
              {element.name}
            </div>
          ) : (
            <span className="text-xs text-foreground/80 truncate flex-shrink-0 max-w-[120px]">
              {element.name}
            </span>
          )}
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`absolute top-0 h-full select-none timeline-element ${
            isBeingDragged ? "z-50" : "z-10"
          }`}
          style={{
            left: `${elementLeft}px`,
            width: `${elementWidth}px`,
          }}
          data-element-id={element.id}
          data-track-id={track.id}
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleElementSplitContext}>
          <Scissors className="h-4 w-4 mr-2" />
          Split at playhead
        </ContextMenuItem>
        <ContextMenuItem onClick={handleElementDuplicateContext}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate {element.type === "text" ? "text" : "clip"}
        </ContextMenuItem>
        {element.type === "media" && (
          <ContextMenuItem onClick={handleReplaceClip}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Replace clip
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleElementDeleteContext}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete {element.type === "text" ? "text" : "clip"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
