"use client";

import { useState, useRef } from "react";
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
  Magnet,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "./audio-waveform";
// import { VideoTimelinePreview } from "./video-timeline-preview"; // Temporarily disabled
import { useVideoTimelinePreview } from "@/hooks/use-video-timeline-preview";
import { toast } from "sonner";
import { TimelineElementProps, TrackType } from "@/types/timeline";
import { useTimelineElementResize } from "@/hooks/use-timeline-element-resize";
import {
  getTrackElementClasses,
  TIMELINE_CONSTANTS,
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
  // SAFE: New optional props with defaults
  isSnapping = false,
  onSnapChange = () => {},
  ...extraProps // SAFE: Capture any additional props
}: TimelineElementProps & { 
  isSnapping?: boolean; 
  onSnapChange?: (snapping: boolean) => void;
}) {
  // SAFE: Only use new features if explicitly provided
  const enhancedMode = 'isSnapping' in extraProps;
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
    addElementToTrack,
    replaceElementMedia,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const [elementMenuOpen, setElementMenuOpen] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

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

  // Get media item for video preview
  const mediaItem = element.type === 'media' 
    ? mediaItems.find(item => item.id === element.mediaId)
    : null;

  // Video preview hook for hover interactions - always call hook for consistent renders
  const videoPreview = useVideoTimelinePreview({
    element,
    mediaItem: mediaItem || { type: 'image' } as any, // Provide fallback to satisfy type
    elementRef
  });

  const effectiveDuration =
    element.duration - element.trimStart - element.trimEnd;
  
  // Check for duration mismatch
  const getDurationMismatch = () => {
    if (element.type === 'media' && element.mediaId) {
      const mediaItem = mediaItems.find(item => item.id === element.mediaId);
      if (mediaItem && mediaItem.duration) {
        const sourceDuration = mediaItem.duration;
        const elementDuration = element.duration;
        const hasTrimming = (element.trimStart + element.trimEnd) > 0.5;
        const hasSignificantMismatch = Math.abs(sourceDuration - elementDuration) > 0.5;
        
        return {
          hasAnyMismatch: hasTrimming || hasSignificantMismatch,
          hasTrimming,
          hasSignificantMismatch,
          sourceDuration,
          elementDuration,
          missingDuration: sourceDuration - elementDuration
        };
      }
    }
    return null;
  };
  
  const durationMismatch = getDurationMismatch();
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
  const elementLeft = 120 + (elementStartTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
  
  // Debug element positioning
  if (elementStartTime === 0) {
    console.log('🎬 VIDEO AT 0.0s POSITION:', {
      elementName: element.name,
      elementStartTime,
      pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
      zoomLevel,
      offset: 320,
      finalElementLeft: elementLeft,
      shouldMatchRuler: true
    });
  }

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
    removeElementFromTrack(track.id, element.id);
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

    if (mediaItem.type === "video") {
      console.log('🎬 VIDEO ELEMENT RENDERING:', {
        elementName: element.name,
        elementId: element.id,
        mediaItemId: mediaItem.id,
        isSelected
      });
      
      // Video element with colorful background and proper selection
      return (
        <div 
          className="w-full h-full relative rounded shadow-lg"
          style={{
            backgroundColor: isSelected ? '#facc15' : '',
            backgroundImage: isSelected ? 'none' : 'linear-gradient(to right, rgb(147 51 234), rgb(37 99 235), rgb(67 56 202))',
            border: isSelected ? '4px solid #eab308' : '2px solid rgb(168 85 247)'
          }}
        >
          <div 
            className="absolute inset-0 flex items-center px-2"
            style={{
              backgroundColor: isSelected ? 'rgba(250, 204, 21, 0.9)' : '',
              backgroundImage: isSelected ? 'none' : 'linear-gradient(to right, rgba(147, 51, 234, 0.8), rgba(37, 99, 235, 0.8), rgba(67, 56, 202, 0.8))'
            }}
          >
            <span 
              className="text-sm font-bold truncate drop-shadow-md"
              style={{ color: isSelected ? '#000000' : '#ffffff' }}
            >
              🎬 {element.name}
            </span>
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
    console.log('🎯 ELEMENT: handleElementMouseDown called for:', element.name, {
      hasOnElementMouseDown: !!onElementMouseDown,
      elementId: element.id,
      button: e.button
    });
    
    e.stopPropagation(); // Prevent selection box from interfering with drag
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
          } ${
            // SAFE: Only add snap classes if feature is enabled
            enhancedMode && isSnapping 
              ? 'ring-2 ring-accent shadow-lg shadow-accent/50 animate-pulse' 
              : ''
          }`}
          data-testid="timeline-element"
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
            ref={elementRef}
            className={`relative h-full rounded-[0.15rem] cursor-pointer overflow-hidden ${
              element.type === "media" && mediaItems.find((item) => item.id === element.mediaId)?.type === "video" 
                ? "bg-black border-white/80" 
                : getTrackElementClasses(track.type)
            } border border-white/20 ${isSelected ? "border-foreground" : ""} ${
              isBeingDragged ? "z-50" : "z-10"
            }`}
            onClick={(e) => onElementClick && onElementClick(e, element)}
            onMouseDown={handleElementMouseDown}
            onContextMenu={(e) =>
              onElementMouseDown && onElementMouseDown(e, element)
            }
            {...videoPreview.handlers}
          >
            {renderElementContent()}

            {/* Duration Mismatch Indicator */}
            {durationMismatch?.hasAnyMismatch && (
              <div 
                className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-b-[8px] border-b-yellow-500"
                title={
                  durationMismatch.hasTrimming 
                    ? `Trimmed: ${(element.trimStart + element.trimEnd).toFixed(1)}s removed`
                    : `Duration mismatch: ${durationMismatch.missingDuration.toFixed(1)}s shorter than source`
                }
              />
            )}

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
        <ContextMenuItem 
          onClick={() => {
            const { currentTime } = usePlaybackStore.getState();
            const { updateElementStartTime } = useTimelineStore.getState();
            updateElementStartTime(track.id, element.id, currentTime);
            toast.success('Snapped to playhead');
          }}
        >
          <Magnet className="h-4 w-4 mr-2" />
          Snap to Playhead
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
