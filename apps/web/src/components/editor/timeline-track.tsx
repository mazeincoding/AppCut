"use client";

import { useRef, useState, useEffect } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { toast } from "sonner";
import { CopyIcon, ScissorsIcon, Trash2Icon } from "lucide-react";
import { TimelineClip } from "./timeline-clip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import type {
  TimelineTrack,
  TimelineClip as TypeTimelineClip,
} from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";

export function TimelineTrackContent({
  track,
  zoomLevel,
}: {
  track: TimelineTrack;
  zoomLevel: number;
}) {
  const { mediaItems } = useMediaStore();
  const {
    tracks,
    moveClipToTrack,
    updateClipStartTime,
    addClipToTrack,
    selectedClips,
    selectClip,
    deselectClip,
    dragState,
    startDrag: startDragAction,
    updateDragTime,
    endDrag: endDragAction,
  } = useTimelineStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  const [wouldOverlap, setWouldOverlap] = useState(false);
  const dragCounterRef = useRef(0);
  const [mouseDownLocation, setMouseDownLocation] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Set up mouse event listeners for drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      // On first mouse move during drag, ensure the clip is selected
      if (dragState.clipId && dragState.trackId) {
        const isSelected = selectedClips.some(
          (c) =>
            c.trackId === dragState.trackId && c.clipId === dragState.clipId
        );

        if (!isSelected) {
          // Select this clip (replacing other selections) since we're dragging it
          selectClip(dragState.trackId, dragState.clipId, false);
        }
      }

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - timelineRect.left;
      const mouseTime = Math.max(0, mouseX / (50 * zoomLevel));
      const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);
      const snappedTime = Math.round(adjustedTime * 10) / 10;

      updateDragTime(snappedTime);
    };

    const handleMouseUp = () => {
      if (!dragState.clipId || !dragState.trackId) return;

      const finalTime = dragState.currentTime;

      // Check for overlaps and update position
      const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
      const movingClip = sourceTrack?.clips.find(
        (c) => c.id === dragState.clipId
      );

      if (movingClip) {
        const movingClipDuration =
          movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
        const movingClipEnd = finalTime + movingClipDuration;

        const targetTrack = tracks.find((t) => t.id === track.id);
        const hasOverlap = targetTrack?.clips.some((existingClip) => {
          if (
            dragState.trackId === track.id &&
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
          if (dragState.trackId === track.id) {
            updateClipStartTime(track.id, dragState.clipId, finalTime);
          } else {
            moveClipToTrack(dragState.trackId, track.id, dragState.clipId);
            requestAnimationFrame(() => {
              updateClipStartTime(track.id, dragState.clipId!, finalTime);
            });
          }
        }
      }

      endDragAction();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState.isDragging,
    dragState.clickOffsetTime,
    dragState.clipId,
    dragState.trackId,
    dragState.currentTime,
    zoomLevel,
    tracks,
    track.id,
    updateDragTime,
    updateClipStartTime,
    moveClipToTrack,
    endDragAction,
  ]);

  const handleClipMouseDown = (e: React.MouseEvent, clip: TypeTimelineClip) => {
    setMouseDownLocation({ x: e.clientX, y: e.clientY });

    // Detect right-click (button 2) and handle selection without starting drag
    const isRightClick = e.button === 2;
    const isMultiSelect = e.metaKey || e.ctrlKey || e.shiftKey;

    if (isRightClick) {
      // Handle right-click selection
      const isSelected = selectedClips.some(
        (c) => c.trackId === track.id && c.clipId === clip.id
      );

      // If clip is not selected, select it (keep other selections if multi-select)
      if (!isSelected) {
        selectClip(track.id, clip.id, isMultiSelect);
      }
      // If clip is already selected, keep it selected

      // Don't start drag action for right-clicks
      return;
    }

    // Handle multi-selection for left-click with modifiers
    if (isMultiSelect) {
      selectClip(track.id, clip.id, true);
    }

    // Calculate the offset from the left edge of the clip to where the user clicked
    const clipElement = e.currentTarget as HTMLElement;
    const clipRect = clipElement.getBoundingClientRect();
    const clickOffsetX = e.clientX - clipRect.left;
    const clickOffsetTime = clickOffsetX / (50 * zoomLevel);

    startDragAction(
      clip.id,
      track.id,
      e.clientX,
      clip.startTime,
      clickOffsetTime
    );
  };

  const handleClipClick = (e: React.MouseEvent, clip: TypeTimelineClip) => {
    e.stopPropagation();

    // Check if mouse moved significantly
    if (mouseDownLocation) {
      const deltaX = Math.abs(e.clientX - mouseDownLocation.x);
      const deltaY = Math.abs(e.clientY - mouseDownLocation.y);
      // If it moved more than a few pixels, consider it a drag and not a click.
      if (deltaX > 5 || deltaY > 5) {
        setMouseDownLocation(null); // Reset for next interaction
        return;
      }
    }

    // Skip selection logic for multi-selection (handled in mousedown)
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }

    // Handle single selection
    const isSelected = selectedClips.some(
      (c) => c.trackId === track.id && c.clipId === clip.id
    );

    if (!isSelected) {
      // If clip is not selected, select it (replacing other selections)
      selectClip(track.id, clip.id, false);
    }
    // If clip is already selected, keep it selected (do nothing)
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Handle both timeline clips and media items
    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    if (hasMediaItem) {
      try {
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (mediaItemData) {
          const { type } = JSON.parse(mediaItemData);
          const isCompatible =
            (track.type === "video" &&
              (type === "video" || type === "image")) ||
            (track.type === "audio" && type === "audio");

          if (!isCompatible) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
        }
      } catch (error) {
        console.error("Error parsing dropped media item:", error);
      }
    }

    // Calculate drop position for overlap checking
    const trackContainer = e.currentTarget.querySelector(
      ".track-clips-container"
    ) as HTMLElement;
    let dropTime = 0;
    if (trackContainer) {
      const rect = trackContainer.getBoundingClientRect();
      const mouseX = Math.max(0, e.clientX - rect.left);
      dropTime = mouseX / (50 * zoomLevel);
    }

    // Check for potential overlaps and show appropriate feedback
    let wouldOverlap = false;

    if (hasMediaItem) {
      try {
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (mediaItemData) {
          const { id } = JSON.parse(mediaItemData);
          const mediaItem = mediaItems.find((item) => item.id === id);
          if (mediaItem) {
            const newClipDuration = mediaItem.duration || 5;
            const snappedTime = Math.round(dropTime * 10) / 10;
            const newClipEnd = snappedTime + newClipDuration;

            wouldOverlap = track.clips.some((existingClip) => {
              const existingStart = existingClip.startTime;
              const existingEnd =
                existingClip.startTime +
                (existingClip.duration -
                  existingClip.trimStart -
                  existingClip.trimEnd);
              return snappedTime < existingEnd && newClipEnd > existingStart;
            });
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    } else if (hasTimelineClip) {
      try {
        const timelineClipData = e.dataTransfer.getData(
          "application/x-timeline-clip"
        );
        if (timelineClipData) {
          const { clipId, trackId: fromTrackId } = JSON.parse(timelineClipData);
          const sourceTrack = tracks.find(
            (t: TimelineTrack) => t.id === fromTrackId
          );
          const movingClip = sourceTrack?.clips.find(
            (c: any) => c.id === clipId
          );

          if (movingClip) {
            const movingClipDuration =
              movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
            const snappedTime = Math.round(dropTime * 10) / 10;
            const movingClipEnd = snappedTime + movingClipDuration;

            wouldOverlap = track.clips.some((existingClip) => {
              if (fromTrackId === track.id && existingClip.id === clipId)
                return false;

              const existingStart = existingClip.startTime;
              const existingEnd =
                existingClip.startTime +
                (existingClip.duration -
                  existingClip.trimStart -
                  existingClip.trimEnd);
              return snappedTime < existingEnd && movingClipEnd > existingStart;
            });
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    }

    if (wouldOverlap) {
      e.dataTransfer.dropEffect = "none";
      setWouldOverlap(true);
      setDropPosition(Math.round(dropTime * 10) / 10);
      return;
    }

    e.dataTransfer.dropEffect = hasTimelineClip ? "move" : "copy";
    setWouldOverlap(false);
    setDropPosition(Math.round(dropTime * 10) / 10);
  };

  const handleTrackDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    dragCounterRef.current++;
    setIsDropping(true);
  };

  const handleTrackDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDropping(false);
      setWouldOverlap(false);
      setDropPosition(null);
    }
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset all drag states
    dragCounterRef.current = 0;
    setIsDropping(false);
    setWouldOverlap(false);
    const currentDropPosition = dropPosition;
    setDropPosition(null);

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    const trackContainer = e.currentTarget.querySelector(
      ".track-clips-container"
    ) as HTMLElement;
    if (!trackContainer) return;

    const rect = trackContainer.getBoundingClientRect();
    const mouseX = Math.max(0, e.clientX - rect.left);
    const newStartTime = mouseX / (50 * zoomLevel);
    const snappedTime = Math.round(newStartTime * 10) / 10;

    try {
      if (hasTimelineClip) {
        // Handle timeline clip movement
        const timelineClipData = e.dataTransfer.getData(
          "application/x-timeline-clip"
        );
        if (!timelineClipData) return;

        const {
          clipId,
          trackId: fromTrackId,
          clickOffsetTime = 0,
        } = JSON.parse(timelineClipData);

        // Find the clip being moved
        const sourceTrack = tracks.find(
          (t: TimelineTrack) => t.id === fromTrackId
        );
        const movingClip = sourceTrack?.clips.find(
          (c: TypeTimelineClip) => c.id === clipId
        );

        if (!movingClip) {
          toast.error("Clip not found");
          return;
        }

        // Adjust position based on where user clicked on the clip
        const adjustedStartTime = snappedTime - clickOffsetTime;
        const finalStartTime = Math.max(
          0,
          Math.round(adjustedStartTime * 10) / 10
        );

        // Check for overlaps with existing clips (excluding the moving clip itself)
        const movingClipDuration =
          movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
        const movingClipEnd = finalStartTime + movingClipDuration;

        const hasOverlap = track.clips.some((existingClip) => {
          // Skip the clip being moved if it's on the same track
          if (fromTrackId === track.id && existingClip.id === clipId)
            return false;

          const existingStart = existingClip.startTime;
          const existingEnd =
            existingClip.startTime +
            (existingClip.duration -
              existingClip.trimStart -
              existingClip.trimEnd);

          // Check if clips overlap
          return finalStartTime < existingEnd && movingClipEnd > existingStart;
        });

        if (hasOverlap) {
          toast.error(
            "Cannot move clip here - it would overlap with existing clips"
          );
          return;
        }

        if (fromTrackId === track.id) {
          // Moving within same track
          updateClipStartTime(track.id, clipId, finalStartTime);
        } else {
          // Moving to different track
          moveClipToTrack(fromTrackId, track.id, clipId);
          requestAnimationFrame(() => {
            updateClipStartTime(track.id, clipId, finalStartTime);
          });
        }
      } else if (hasMediaItem) {
        // Handle media item drop
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (!mediaItemData) return;

        const { id, type } = JSON.parse(mediaItemData);
        const mediaItem = mediaItems.find((item) => item.id === id);

        if (!mediaItem) {
          toast.error("Media item not found");
          return;
        }

        // Check if track type is compatible
        const isCompatible =
          (track.type === "video" && (type === "video" || type === "image")) ||
          (track.type === "audio" && type === "audio");

        if (!isCompatible) {
          toast.error(`Cannot add ${type} to ${track.type} track`);
          return;
        }

        // Check for overlaps with existing clips
        const newClipDuration = mediaItem.duration || 5;
        const newClipEnd = snappedTime + newClipDuration;

        const hasOverlap = track.clips.some((existingClip) => {
          const existingStart = existingClip.startTime;
          const existingEnd =
            existingClip.startTime +
            (existingClip.duration -
              existingClip.trimStart -
              existingClip.trimEnd);

          // Check if clips overlap
          return snappedTime < existingEnd && newClipEnd > existingStart;
        });

        if (hasOverlap) {
          toast.error(
            "Cannot place clip here - it would overlap with existing clips"
          );
          return;
        }

        addClipToTrack(track.id, {
          mediaId: mediaItem.id,
          name: mediaItem.name,
          duration: mediaItem.duration || 5,
          startTime: snappedTime,
          trimStart: 0,
          trimEnd: 0,
        });
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      toast.error("Failed to add media to track");
    }
  };

  return (
    <div
      className="w-full h-full hover:bg-muted/20"
      onClick={(e) => {
        // If clicking empty area (not on a clip), deselect all clips
        if (!(e.target as HTMLElement).closest(".timeline-clip")) {
          const { clearSelectedClips } = useTimelineStore.getState();
          clearSelectedClips();
        }
      }}
      onDragOver={handleTrackDragOver}
      onDragEnter={handleTrackDragEnter}
      onDragLeave={handleTrackDragLeave}
      onDrop={handleTrackDrop}
    >
      <div
        ref={timelineRef}
        className="h-full relative track-clips-container min-w-full"
      >
        {track.clips.length === 0 ? (
          <div
            className={`h-full w-full rounded-sm border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground transition-colors ${
              isDropping
                ? wouldOverlap
                  ? "border-red-500 bg-red-500/10 text-red-600"
                  : "border-blue-500 bg-blue-500/10 text-blue-600"
                : "border-muted/30"
            }`}
          >
            {isDropping
              ? wouldOverlap
                ? "Cannot drop - would overlap"
                : "Drop clip here"
              : "Drop media here"}
          </div>
        ) : (
          <>
            {track.clips.map((clip) => {
              const isSelected = selectedClips.some(
                (c) => c.trackId === track.id && c.clipId === clip.id
              );

              const handleClipSplit = () => {
                const { currentTime } = usePlaybackStore();
                const { updateClipTrim, addClipToTrack } = useTimelineStore();
                const splitTime = currentTime;
                const effectiveStart = clip.startTime;
                const effectiveEnd =
                  clip.startTime +
                  (clip.duration - clip.trimStart - clip.trimEnd);

                if (splitTime > effectiveStart && splitTime < effectiveEnd) {
                  updateClipTrim(
                    track.id,
                    clip.id,
                    clip.trimStart,
                    clip.trimEnd + (effectiveEnd - splitTime)
                  );
                  addClipToTrack(track.id, {
                    mediaId: clip.mediaId,
                    name: clip.name + " (split)",
                    duration: clip.duration,
                    startTime: splitTime,
                    trimStart: clip.trimStart + (splitTime - effectiveStart),
                    trimEnd: clip.trimEnd,
                  });
                  toast.success("Clip split successfully");
                } else {
                  toast.error("Playhead must be within clip to split");
                }
              };

              const handleClipDuplicate = () => {
                const { addClipToTrack } = useTimelineStore.getState();
                addClipToTrack(track.id, {
                  mediaId: clip.mediaId,
                  name: clip.name + " (copy)",
                  duration: clip.duration,
                  startTime:
                    clip.startTime +
                    (clip.duration - clip.trimStart - clip.trimEnd) +
                    0.1,
                  trimStart: clip.trimStart,
                  trimEnd: clip.trimEnd,
                });
                toast.success("Clip duplicated");
              };

              const handleClipDelete = () => {
                const { removeClipFromTrack } = useTimelineStore.getState();
                removeClipFromTrack(track.id, clip.id);
                toast.success("Clip deleted");
              };

              return (
                <ContextMenu key={clip.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <TimelineClip
                        clip={clip}
                        track={track}
                        zoomLevel={zoomLevel}
                        isSelected={isSelected}
                        onClipMouseDown={handleClipMouseDown}
                        onClipClick={handleClipClick}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={handleClipSplit}>
                      <ScissorsIcon className="h-4 w-4 mr-2" />
                      Split at Playhead
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleClipDuplicate}>
                      <CopyIcon className="h-4 w-4 mr-2" />
                      Duplicate Clip
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={handleClipDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2Icon className="h-4 w-4 mr-2" />
                      Delete Clip
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
