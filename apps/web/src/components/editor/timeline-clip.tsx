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
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "./audio-waveform";
import { toast } from "sonner";
import { TimelineClipProps, ResizeState } from "@/types/timeline";
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
import { isDragging } from "motion/react";

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
  const {
    updateClipTrim,
    addClipToTrack,
    removeClipFromTrack,
    dragState,
    splitClip,
    splitAndKeepLeft,
    splitAndKeepRight,
    separateAudio,
    toggleClipMute,
    updateClipSpeed,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [clipMenuOpen, setClipMenuOpen] = useState(false);
  const clipRef = useRef<HTMLDivElement>(null);

  const effectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;
  const clipWidth = Math.max(80, effectiveDuration * 50 * zoomLevel);

  // Use real-time position during drag, otherwise use stored position
  const isBeingDragged = dragState.clipId === clip.id;
  const clipStartTime =
    isBeingDragged && dragState.isDragging
      ? dragState.currentTime
      : clip.startTime;
  const clipLeft = clipStartTime * 50 * zoomLevel;

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

  // Resize handles for trimming clips
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
    toast.success("Clip deleted");
  };

  const handleSplitClip = () => {
    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within clip to split");
      return;
    }

    const secondClipId = splitClip(track.id, clip.id, currentTime);
    if (secondClipId) {
      toast.success("Clip split successfully");
    } else {
      toast.error("Failed to split clip");
    }
    setClipMenuOpen(false);
  };

  const handleSplitAndKeepLeft = () => {
    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within clip");
      return;
    }

    splitAndKeepLeft(track.id, clip.id, currentTime);
    toast.success("Split and kept left portion");
    setClipMenuOpen(false);
  };

  const handleSplitAndKeepRight = () => {
    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within clip");
      return;
    }

    splitAndKeepRight(track.id, clip.id, currentTime);
    toast.success("Split and kept right portion");
    setClipMenuOpen(false);
  };

  const handleSeparateAudio = () => {
    const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);

    if (!mediaItem || mediaItem.type !== "video") {
      toast.error("Audio separation only available for video clips");
      return;
    }

    const audioClipId = separateAudio(track.id, clip.id);
    if (audioClipId) {
      toast.success("Audio separated to audio track");
    } else {
      toast.error("Failed to separate audio");
    }
    setClipMenuOpen(false);
  };

  const handleToggleMute = () => {
    toggleClipMute(track.id, clip.id);
    setClipMenuOpen(false);
  };

  const canSplitAtPlayhead = () => {
    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
    return currentTime > effectiveStart && currentTime < effectiveEnd;
  };

  const canSeparateAudio = () => {
    const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
    return mediaItem?.type === "video" && track.type === "video";
  };

  const renderClipContent = () => {
    const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);

    if (!mediaItem) {
      return (
        <span className="text-xs text-foreground/80 truncate">{clip.name}</span>
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

    return (
      <span className="text-xs text-foreground/80 truncate">{clip.name}</span>
    );
  };

  const handleClipMouseDown = (e: React.MouseEvent) => {
    if (onClipMouseDown) {
      onClipMouseDown(e, clip);
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateClipSpeed(track.id, clip.id, parseFloat(e.target.value));
    setClipMenuOpen(false);
  };

  return (
    <div
      ref={clipRef}
      className={`absolute top-0 h-full select-none transition-all duration-75 ${
        isBeingDragged ? "z-50" : "z-10"
      } ${isSelected ? "ring-2 ring-primary" : ""}`}
      style={{
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
      }}
      onMouseMove={resizing ? handleResizeMove : undefined}
      onMouseUp={resizing ? handleResizeEnd : undefined}
      onMouseLeave={resizing ? handleResizeEnd : undefined}
      onContextMenu={(e) => {
        if (onContextMenu) onContextMenu(e, clip.id);
      }}
    >
      <div
        className={`relative h-full rounded border cursor-pointer overflow-hidden ${getTrackColor(
          track.type
        )} ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
        onClick={(e) => onClipClick && onClipClick(e, clip)}
        onMouseDown={handleClipMouseDown}
      >
        <div className="absolute inset-1 flex items-center p-1">
          {renderClipContent()}
        </div>
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-w-resize hover:bg-primary/50 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, clip.id, "left")}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-e-resize hover:bg-primary/50 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, clip.id, "right")}
        />
        <div className="absolute top-1 right-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
