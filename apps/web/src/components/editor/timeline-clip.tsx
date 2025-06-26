"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { MoreVertical, Scissors, Trash2 } from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useDragClip } from "@/hooks/use-drag-clip";
import AudioWaveform from "./audio-waveform";
import { toast } from "sonner";
import { TimelineClipProps, ResizeState } from "@/types/timeline";

export function TimelineClip({
  clip,
  track,
  zoomLevel,
  isSelected,
  onContextMenu,
  onClipMouseDown,
  onClipClick,
}: TimelineClipProps) {
  const { mediaItems } = useMediaStore();
  const { updateClipTrim, addClipToTrack, removeClipFromTrack } =
    useTimelineStore();
  const { currentTime } = usePlaybackStore();
  const { draggedClipId, getDraggedClipPosition } =
    useDragClip(zoomLevel);

  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [clipMenuOpen, setClipMenuOpen] = useState(false);

  const effectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;
  const clipWidth = Math.max(80, effectiveDuration * 50 * zoomLevel);

  // Use real-time position during drag, otherwise use stored position
  const dragPosition = getDraggedClipPosition(clip.id);
  const clipStartTime = dragPosition !== null ? dragPosition : clip.startTime;
  const clipLeft = clipStartTime * 50 * zoomLevel;

  const isBeingDragged = draggedClipId === clip.id;

  const getTrackColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-blue-500/20 border-blue-500/30";
      case "audio":
        return "bg-green-500/20 border-green-500/30";
      case "effects":
        return "bg-purple-500/20 border-purple-500/30";
      default:
        return "bg-gray-500/20 border-gray-500/30";
    }
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    clipId: string,
    side: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setResizing({
      clipId,
      side,
      startX: e.clientX,
      initialTrimStart: clip.trimStart,
      initialTrimEnd: clip.trimEnd,
    });
  };

  const updateTrimFromMouseMove = (e: { clientX: number }) => {
    if (!resizing) return;

    const deltaX = e.clientX - resizing.startX;
    const deltaTime = deltaX / (50 * zoomLevel);

    if (resizing.side === "left") {
      const newTrimStart = Math.max(
        0,
        Math.min(
          clip.duration - clip.trimEnd - 0.1,
          resizing.initialTrimStart + deltaTime
        )
      );
      updateClipTrim(track.id, clip.id, newTrimStart, clip.trimEnd);
    } else {
      const newTrimEnd = Math.max(
        0,
        Math.min(
          clip.duration - clip.trimStart - 0.1,
          resizing.initialTrimEnd - deltaTime
        )
      );
      updateClipTrim(track.id, clip.id, clip.trimStart, newTrimEnd);
    }
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    updateTrimFromMouseMove(e);
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  const handleDeleteClip = () => {
    removeClipFromTrack(track.id, clip.id);
    setClipMenuOpen(false);
  };

  const handleSplitClip = () => {
    // Use current playback time as split point
    const splitTime = currentTime;
    // Only split if splitTime is within the clip's effective range
    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

    if (splitTime <= effectiveStart || splitTime >= effectiveEnd) {
      toast.error("Playhead must be within clip to split");
      return;
    }

    const firstDuration = splitTime - effectiveStart;
    const secondDuration = effectiveEnd - splitTime;

    // First part: adjust original clip
    updateClipTrim(
      track.id,
      clip.id,
      clip.trimStart,
      clip.trimEnd + secondDuration
    );

    // Second part: add new clip after split
    addClipToTrack(track.id, {
      mediaId: clip.mediaId,
      name: clip.name + " (cut)",
      duration: clip.duration,
      startTime: splitTime,
      trimStart: clip.trimStart + firstDuration,
      trimEnd: clip.trimEnd,
    });

    setClipMenuOpen(false);
    toast.success("Clip split successfully");
  };

  const renderClipContent = () => {
    const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);

    if (!mediaItem) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-sm">
          <div className="text-center">
            <div className="text-xs text-red-600 font-medium mb-1">⚠️ Media Deleted</div>
            <div className="text-xs text-red-500/80 truncate">{clip.name}</div>
          </div>
        </div>
      );
    }

    if (mediaItem.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={mediaItem.url}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
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
            {clip.name}
          </span>
        </div>
      );
    }

    if (mediaItem.type === "audio") {
      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <AudioWaveform
              audioUrl={mediaItem.url}
              height={24}
              className="w-full"
            />
          </div>
        </div>
      );
    }

    // Fallback for videos without thumbnails
    return (
      <span className="text-xs text-foreground/80 truncate">{clip.name}</span>
    );
  };

  return (
    <div
      className={`timeline-clip absolute h-full border ${getTrackColor(track.type)} flex items-center py-3 min-w-[80px] overflow-hidden group hover:shadow-lg ${isSelected ? "ring-2 ring-blue-500 z-10" : ""} ${isBeingDragged ? "shadow-lg z-20" : ""} ${isBeingDragged ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ width: `${clipWidth}px`, left: `${clipLeft}px` }}
      onMouseDown={(e) => onClipMouseDown(e, clip)}
      onClick={(e) => onClipClick(e, clip)}
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
      onMouseLeave={handleResizeEnd}
      tabIndex={0}
      onContextMenu={(e) => onContextMenu(e, clip.id)}
    >
      {/* Left trim handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-w-resize transition-opacity bg-blue-500/50 hover:bg-blue-500 ${isSelected ? "opacity-100" : "opacity-0"}`}
        onMouseDown={(e) => handleResizeStart(e, clip.id, "left")}
      />

      {/* Clip content */}
      <div className="flex-1 relative">
        {renderClipContent()}

        {/* Clip options menu */}
        <div className="absolute top-1 right-1 z-10">
          <Button
            variant="text"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setClipMenuOpen(!clipMenuOpen);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {clipMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted/30"
                onClick={handleSplitClip}
              >
                <Scissors className="h-4 w-4 mr-2" /> Split
              </button>
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={handleDeleteClip}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right trim handle */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-e-resize transition-opacity bg-blue-500/50 hover:bg-blue-500 ${isSelected ? "opacity-100" : "opacity-0"}`}
        onMouseDown={(e) => handleResizeStart(e, clip.id, "right")}
      />
    </div>
  );
}
