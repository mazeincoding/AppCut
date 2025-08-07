"use client";

import {
  Scissors,
  Trash2,
  Copy,
  RefreshCw,
  EyeOff,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "../audio-waveform";
import { toast } from "sonner";
import { TimelineElementProps } from "@/types/timeline";
import { useTimelineElementResize } from "@/hooks/use-timeline-element-resize";
import {
  getTrackElementClasses,
  TIMELINE_CONSTANTS,
  getTrackHeight,
} from "@/constants/timeline-constants";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../ui/context-menu";

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
    addElementToTrack,
    replaceElementMedia,
    rippleEditingEnabled,
    toggleElementHidden,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const mediaItem =
    element.type === "media"
      ? mediaItems.find((item) => item.id === element.mediaId)
      : null;
  const isAudio = mediaItem?.type === "audio";

  const { resizing, handleResizeStart, handleResizeMove, handleResizeEnd } =
    useTimelineElementResize({
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

  const handleElementSplitContext = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleElementDuplicateContext = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleElementDeleteContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rippleEditingEnabled) {
      removeElementFromTrackWithRipple(track.id, element.id);
    } else {
      removeElementFromTrack(track.id, element.id);
    }
  };

  const handleToggleElementHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleElementHidden(track.id, element.id);
  };

  const handleReplaceClip = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        const result = await replaceElementMedia(track.id, element.id, file);
        if (result.success) {
          toast.success("Clip replaced successfully");
        } else {
          toast.error(result.error || "Failed to replace clip");
        }
      } catch (error) {
        console.error("Unexpected error replacing clip:", error);
        toast.error(
          `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };
    input.click();
  };

  const renderElementContent = () => {
    if (element.type === "text") {
      return (
        <div className="w-full h-full flex items-center justify-start pl-2">
          <span className="text-xs text-white truncate">{element.content}</span>
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

    if (
      mediaItem.type === "image" ||
      (mediaItem.type === "video" && mediaItem.thumbnailUrl)
    ) {
      // Calculate tile size based on 16:9 aspect ratio
      const trackHeight = getTrackHeight(track.type);
      const tileHeight = trackHeight;
      const tileWidth = tileHeight * TILE_ASPECT_RATIO;

      const imageUrl =
        mediaItem.type === "image" ? mediaItem.url : mediaItem.thumbnailUrl;
      const isImage = mediaItem.type === "image";

      return (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className={`w-full h-full relative ${
              isSelected ? "bg-primary" : "bg-transparent"
            }`}
          >
            <div
              className={`absolute top-[0.15rem] bottom-[0.15rem] left-0 right-0`}
              style={{
                backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
                backgroundRepeat: "repeat-x",
                backgroundSize: `${tileWidth}px ${tileHeight}px`,
                backgroundPosition: "left center",
                pointerEvents: "none",
              }}
              aria-label={`Tiled ${isImage ? "background" : "thumbnail"} of ${mediaItem.name}`}
            />
          </div>
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
            )} ${isSelected ? "" : ""} ${
              isBeingDragged ? "z-50" : "z-10"
            } ${element.hidden ? "opacity-50" : ""}`}
            onClick={(e) => onElementClick && onElementClick(e, element)}
            onMouseDown={handleElementMouseDown}
            onContextMenu={(e) =>
              onElementMouseDown && onElementMouseDown(e, element)
            }
          >
            <div className="absolute inset-0 flex items-center h-full">
              {renderElementContent()}
            </div>

            {element.hidden && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
                {isAudio ? (
                  <VolumeX className="h-6 w-6 text-white" />
                ) : (
                  <EyeOff className="h-6 w-6 text-white" />
                )}
              </div>
            )}

            {isSelected && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 w-[0.2rem] cursor-w-resize bg-primary z-50"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "left")}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 w-[0.2rem] cursor-e-resize bg-primary z-50"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "right")}
                />
              </>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="z-200">
        <ContextMenuItem onClick={handleElementSplitContext}>
          <Scissors className="h-4 w-4 mr-2" />
          Split at playhead
        </ContextMenuItem>
        <ContextMenuItem onClick={handleToggleElementHidden}>
          {isAudio ? (
            element.hidden ? (
              <Volume2 className="h-4 w-4 mr-2" />
            ) : (
              <VolumeX className="h-4 w-4 mr-2" />
            )
          ) : element.hidden ? (
            <Eye className="h-4 w-4 mr-2" />
          ) : (
            <EyeOff className="h-4 w-4 mr-2" />
          )}
          <span>
            {isAudio
              ? element.hidden
                ? "Unmute"
                : "Mute"
              : element.hidden
                ? "Show"
                : "Hide"}{" "}
            {element.type === "text" ? "text" : "clip"}
          </span>
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
