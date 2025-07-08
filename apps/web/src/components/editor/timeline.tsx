"use client";

import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import {
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Snowflake,
  Copy,
  SplitSquareHorizontal,
  Volume2,
  VolumeX,
  Pause,
  Play,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TimelineTrackContent } from "./timeline-track";
import type { DragData } from "@/types/timeline";
import {
  getTrackLabelColor,
  getTrackHeight,
  getCumulativeHeightBefore,
  getTotalTracksHeight,
  TIMELINE_CONSTANTS,
} from "@/lib/timeline-constants";

export function Timeline() {
  // Timeline shows all tracks (video, audio, effects) and their elements.
  // You can drag media here to add it to your project.
  // elements can be trimmed, deleted, and moved.
  const {
    tracks,
    addTrack,
    addElementToTrack,
    removeElementFromTrack,
    getTotalDuration,
    selectedElements,
    clearSelectedElements,
    setSelectedElements,
    splitElement,
    splitAndKeepLeft,
    splitAndKeepRight,
    separateAudio,
    undo,
    redo,
  } = useTimelineStore();
  const { mediaItems, addMediaItem } = useMediaStore();
  const { activeProject } = useProjectStore();
  const {
    currentTime,
    duration,
    seek,
    setDuration,
    isPlaying,
    toggle,
    setSpeed,
    speed,
  } = usePlaybackStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const dragCounterRef = useRef(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isInTimeline, setIsInTimeline] = useState(false);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    active: boolean;
    additive: boolean;
  } | null>(null);

  // Playhead scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Add new state for ruler drag detection
  const [isDraggingRuler, setIsDraggingRuler] = useState(false);
  const [hasDraggedRuler, setHasDraggedRuler] = useState(false);

  // Dynamic timeline width calculation based on playhead position and duration
  const dynamicTimelineWidth = Math.max(
    (duration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Base width from duration
    (currentTime + 30) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Width to show current time + 30 seconds buffer
    timelineRef.current?.clientWidth || 1000 // Minimum width
  );

  // Scroll synchronization and auto-scroll to playhead
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const lastRulerSync = useRef(0);
  const lastTracksSync = useRef(0);

  // Update timeline duration when tracks change
  useEffect(() => {
    const totalDuration = getTotalDuration();
    setDuration(Math.max(totalDuration, 10)); // Minimum 10 seconds for empty timeline
  }, [tracks, setDuration, getTotalDuration]);

  // Keyboard event for deleting selected elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedElements.length > 0
      ) {
        selectedElements.forEach(({ trackId, elementId }) => {
          removeElementFromTrack(trackId, elementId);
        });
        clearSelectedElements();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElements, removeElementFromTrack, clearSelectedElements]);

  // Keyboard event for undo (Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo]);

  // Keyboard event for redo (Cmd+Shift+Z or Cmd+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo]);

  // Mouse down on timeline background to start marquee
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && e.button === 0) {
      setMarquee({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
        active: true,
        additive: e.metaKey || e.ctrlKey || e.shiftKey,
      });
    }
  };

  // Add new click handler for deselection
  const handleTimelineClick = (e: React.MouseEvent) => {
    // If clicking empty area (not on an element) and not starting marquee, deselect all elements
    if (!(e.target as HTMLElement).closest(".timeline-element")) {
      clearSelectedElements();
    }
  };

  // Mouse move to update marquee
  useEffect(() => {
    if (!marquee || !marquee.active) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMarquee(
        (prev) => prev && { ...prev, endX: e.clientX, endY: e.clientY }
      );
    };
    const handleMouseUp = (e: MouseEvent) => {
      setMarquee(
        (prev) =>
          prev && { ...prev, endX: e.clientX, endY: e.clientY, active: false }
      );
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [marquee]);

  // On marquee end, select elements in box
  useEffect(() => {
    if (!marquee || marquee.active) return;
    const timeline = timelineRef.current;
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const x1 = Math.min(marquee.startX, marquee.endX) - rect.left;
    const x2 = Math.max(marquee.startX, marquee.endX) - rect.left;
    const y1 = Math.min(marquee.startY, marquee.endY) - rect.top;
    const y2 = Math.max(marquee.startY, marquee.endY) - rect.top;
    // Validation: skip if too small
    if (Math.abs(x2 - x1) < 5 || Math.abs(y2 - y1) < 5) {
      setMarquee(null);
      return;
    }
    // Clamp to timeline bounds
    const clamp = (val: number, min: number, max: number) =>
      Math.max(min, Math.min(max, val));
    const bx1 = clamp(x1, 0, rect.width);
    const bx2 = clamp(x2, 0, rect.width);
    const by1 = clamp(y1, 0, rect.height);
    const by2 = clamp(y2, 0, rect.height);
    let newSelection: { trackId: string; elementId: string }[] = [];
    tracks.forEach((track, trackIdx) => {
      track.elements.forEach((element) => {
        const clipLeft =
          element.startTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        const clipTop = getCumulativeHeightBefore(tracks, trackIdx);
        const clipBottom = clipTop + getTrackHeight(track.type);
        const clipRight = clipLeft + getTrackHeight(track.type);
        if (
          bx1 < clipRight &&
          bx2 > clipLeft &&
          by1 < clipBottom &&
          by2 > clipTop
        ) {
          newSelection.push({ trackId: track.id, elementId: element.id });
        }
      });
    });
    if (newSelection.length > 0) {
      if (marquee.additive) {
        const selectedSet = new Set(
          selectedElements.map((c) => c.trackId + ":" + c.elementId)
        );
        newSelection = [
          ...selectedElements,
          ...newSelection.filter(
            (c) => !selectedSet.has(c.trackId + ":" + c.elementId)
          ),
        ];
      }
      setSelectedElements(newSelection);
    } else if (!marquee.additive) {
      clearSelectedElements();
    }
    setMarquee(null);
  }, [
    marquee,
    tracks,
    zoomLevel,
    selectedElements,
    setSelectedElements,
    clearSelectedElements,
  ]);

  const handleDragEnter = (e: React.DragEvent) => {
    // When something is dragged over the timeline, show overlay
    e.preventDefault();
    // Don't show overlay for timeline elements - they're handled by tracks
    if (e.dataTransfer.types.includes("application/x-timeline-element")) {
      return;
    }
    dragCounterRef.current += 1;
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    // Don't update state for timeline elements - they're handled by tracks
    if (e.dataTransfer.types.includes("application/x-timeline-element")) {
      return;
    }

    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    // When media is dropped, add it as a new track/element
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    // Ignore timeline element drags - they're handled by track-specific handlers
    const hasTimelineElement = e.dataTransfer.types.includes(
      "application/x-timeline-element"
    );
    if (hasTimelineElement) {
      return;
    }

    const itemData = e.dataTransfer.getData("application/x-media-item");
    if (itemData) {
      try {
        const dragData: DragData = JSON.parse(itemData);

        if (dragData.type === "text") {
          // Always create new text track to avoid overlaps
          const newTrackId = addTrack("text");

          addElementToTrack(newTrackId, {
            type: "text",
            name: dragData.name || "Text",
            content: dragData.content || "Default Text",
            duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
            startTime: 0,
            trimStart: 0,
            trimEnd: 0,
            fontSize: 48,
            fontFamily: "Arial",
            color: "#ffffff",
            backgroundColor: "transparent",
            textAlign: "center",
            fontWeight: "normal",
            fontStyle: "normal",
            textDecoration: "none",
            x: 0,
            y: 0,
            rotation: 0,
            opacity: 1,
          });
        } else {
          // Handle media items
          const mediaItem = mediaItems.find((item) => item.id === dragData.id);
          if (!mediaItem) {
            toast.error("Media item not found");
            return;
          }

          const trackType = dragData.type === "audio" ? "audio" : "media";
          let targetTrack = tracks.find((t) => t.type === trackType);
          const newTrackId = targetTrack ? targetTrack.id : addTrack(trackType);

          addElementToTrack(newTrackId, {
            type: "media",
            mediaId: mediaItem.id,
            name: mediaItem.name,
            duration: mediaItem.duration || 5,
            startTime: 0,
            trimStart: 0,
            trimEnd: 0,
          });
        }
      } catch (error) {
        console.error("Error parsing dropped item data:", error);
        toast.error("Failed to add item to timeline");
      }
    } else if (e.dataTransfer.files?.length > 0) {
      // Handle file drops by creating new tracks
      if (!activeProject) {
        toast.error("No active project");
        return;
      }

      setIsProcessing(true);
      setProgress(0);
      try {
        const processedItems = await processMediaFiles(
          e.dataTransfer.files,
          (p) => setProgress(p)
        );
        for (const processedItem of processedItems) {
          await addMediaItem(activeProject.id, processedItem);
          const currentMediaItems = useMediaStore.getState().mediaItems;
          const addedItem = currentMediaItems.find(
            (item) =>
              item.name === processedItem.name && item.url === processedItem.url
          );
          if (addedItem) {
            const trackType =
              processedItem.type === "audio" ? "audio" : "media";
            const newTrackId = addTrack(trackType);
            addElementToTrack(newTrackId, {
              type: "media",
              mediaId: addedItem.id,
              name: addedItem.name,
              duration: addedItem.duration || 5,
              startTime: 0,
              trimStart: 0,
              trimEnd: 0,
            });
          }
        }
      } catch (error) {
        // Show error if file processing fails
        console.error("Error processing external files:", error);
        toast.error("Failed to process dropped files");
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom if user is using pinch gesture (ctrlKey or metaKey is true)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoomLevel((prev) => Math.max(0.1, Math.min(10, prev + delta)));
    }
    // Otherwise, allow normal scrolling
  };

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

  // Add new ruler mouse down handler
  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      // Don't interfere if clicking on the playhead itself
      if ((e.target as HTMLElement).closest(".playhead")) return;

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
      const timeline = timelineRef.current;
      if (!timeline) return;
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(duration, x / (50 * zoomLevel)));
      setScrubTime(time);
      seek(time); // update video preview in real time
    },
    [duration, zoomLevel, seek]
  );

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
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    isScrubbing,
    scrubTime,
    seek,
    handleScrub,
    isDraggingRuler,
    hasDraggedRuler,
  ]);

  const playheadPosition =
    isScrubbing && scrubTime !== null ? scrubTime : currentTime;

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  // Action handlers for toolbar
  const handleSplitSelected = () => {
    if (selectedElements.length === 0) {
      toast.error("No elements selected");
      return;
    }
    let splitCount = 0;
    selectedElements.forEach(({ trackId, elementId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);
      if (element && track) {
        const effectiveStart = element.startTime;
        const effectiveEnd =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd);

        if (currentTime > effectiveStart && currentTime < effectiveEnd) {
          const newElementId = splitElement(trackId, elementId, currentTime);
          if (newElementId) splitCount++;
        }
      }
    });
    if (splitCount === 0) {
      toast.error("Playhead must be within selected elements to split");
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedElements.length === 0) {
      toast.error("No elements selected");
      return;
    }
    const canDuplicate = selectedElements.length === 1;
    if (!canDuplicate) return;

    const newSelections: { trackId: string; elementId: string }[] = [];

    selectedElements.forEach(({ trackId, elementId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((el) => el.id === elementId);

      if (element) {
        const newStartTime =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd) +
          0.1;

        // Create element without id (will be generated by store)
        const { id, ...elementWithoutId } = element;

        addElementToTrack(trackId, {
          ...elementWithoutId,
          startTime: newStartTime,
        });

        // We can't predict the new id, so just clear selection for now
        // TODO: addElementToTrack could return the new element id
      }
    });

    clearSelectedElements();
  };

  const handleFreezeSelected = () => {
    toast.info("Freeze frame functionality coming soon!");
  };

  const handleSplitAndKeepLeft = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((c) => c.id === elementId);
    if (!element) return;
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);
    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within selected element");
      return;
    }
    splitAndKeepLeft(trackId, elementId, currentTime);
  };

  const handleSplitAndKeepRight = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((c) => c.id === elementId);
    if (!element) return;
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);
    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within selected element");
      return;
    }
    splitAndKeepRight(trackId, elementId, currentTime);
  };

  const handleSeparateAudio = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one media element to separate audio");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    if (!track || track.type !== "media") {
      toast.error("Select a media element to separate audio");
      return;
    }
    separateAudio(trackId, elementId);
  };

  const handleDeleteSelected = () => {
    if (selectedElements.length === 0) {
      toast.error("No elements selected");
      return;
    }
    selectedElements.forEach(({ trackId, elementId }) => {
      removeElementFromTrack(trackId, elementId);
    });
    clearSelectedElements();
  };

  // Prevent explorer zooming in/out when in timeline
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      // if (isInTimeline && (e.ctrlKey || e.metaKey)) {
      if (
        isInTimeline &&
        (e.ctrlKey || e.metaKey) &&
        timelineRef.current?.contains(e.target as Node)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", preventZoom, { passive: false });

    return () => {
      document.removeEventListener("wheel", preventZoom);
    };
  }, [isInTimeline]);

  // --- Scroll synchronization effect ---
  useEffect(() => {
    const rulerViewport = rulerScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    const tracksViewport = tracksScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!rulerViewport || !tracksViewport) return;
    const handleRulerScroll = () => {
      const now = Date.now();
      if (isUpdatingRef.current || now - lastRulerSync.current < 16) return;
      lastRulerSync.current = now;
      isUpdatingRef.current = true;
      tracksViewport.scrollLeft = rulerViewport.scrollLeft;
      isUpdatingRef.current = false;
    };
    const handleTracksScroll = () => {
      const now = Date.now();
      if (isUpdatingRef.current || now - lastTracksSync.current < 16) return;
      lastTracksSync.current = now;
      isUpdatingRef.current = true;
      rulerViewport.scrollLeft = tracksViewport.scrollLeft;
      isUpdatingRef.current = false;
    };
    rulerViewport.addEventListener("scroll", handleRulerScroll);
    tracksViewport.addEventListener("scroll", handleTracksScroll);
    return () => {
      rulerViewport.removeEventListener("scroll", handleRulerScroll);
      tracksViewport.removeEventListener("scroll", handleTracksScroll);
    };
  }, []);

  // --- Playhead auto-scroll effect ---
  useEffect(() => {
    const rulerViewport = rulerScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    const tracksViewport = tracksScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!rulerViewport || !tracksViewport) return;
    const playheadPx =
      playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
    const viewportWidth = rulerViewport.clientWidth;
    const scrollMin = 0;
    const scrollMax = rulerViewport.scrollWidth - viewportWidth;
    // Center the playhead if it's not visible (100px buffer)
    const desiredScroll = Math.max(
      scrollMin,
      Math.min(scrollMax, playheadPx - viewportWidth / 2)
    );
    if (
      playheadPx < rulerViewport.scrollLeft + 100 ||
      playheadPx > rulerViewport.scrollLeft + viewportWidth - 100
    ) {
      rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
    }
  }, [playheadPosition, duration, zoomLevel]);

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 relative`}
      {...dragProps}
      onMouseEnter={() => setIsInTimeline(true)}
      onMouseLeave={() => setIsInTimeline(false)}
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="border-b flex items-center px-2 py-1 gap-1">
        <TooltipProvider delayDuration={500}>
          {/* Play/Pause Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={toggle}
                className="mr-2"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPlaying ? "Pause (Space)" : "Play (Space)"}
            </TooltipContent>
          </Tooltip>
          <div className="w-px h-6 bg-border mx-1" />
          {/* Time Display */}
          <div
            className="text-xs text-muted-foreground font-mono px-2"
            style={{ minWidth: "18ch", textAlign: "center" }}
          >
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </div>
          {/* Test Clip Button - for debugging */}
          {tracks.length === 0 && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const trackId = addTrack("media");
                      addElementToTrack(trackId, {
                        type: "media",
                        mediaId: "test",
                        name: "Test Clip",
                        duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
                        startTime: 0,
                        trimStart: 0,
                        trimEnd: 0,
                      });
                    }}
                    className="text-xs"
                  >
                    Add Test Clip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add a test clip to try playback</TooltipContent>
              </Tooltip>
            </>
          )}
          <div className="w-px h-6 bg-border mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleSplitSelected}>
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split element (Ctrl+S)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleSplitAndKeepLeft}
              >
                <ArrowLeftToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep left (Ctrl+Q)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleSplitAndKeepRight}
              >
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep right (Ctrl+W)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleSeparateAudio}>
                <SplitSquareHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Separate audio (Ctrl+D)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleDuplicateSelected}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleFreezeSelected}>
                <Snowflake className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Freeze frame (F)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleDeleteSelected}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete element (Delete)</TooltipContent>
          </Tooltip>
          <div className="w-px h-6 bg-border mx-1" />c{/* Speed Control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Select
                value={speed.toFixed(1)}
                onValueChange={(value) => setSpeed(parseFloat(value))}
              >
                <SelectTrigger className="w-[90px] h-8">
                  <SelectValue placeholder="1.0x" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1.0">1.0x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2.0">2.0x</SelectItem>
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>Playback Speed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Timeline Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header with Ruler */}
        <div className="flex border-b bg-background sticky top-0 z-10">
          {/* Track Labels Header */}
          <div className="w-48 flex-shrink-0 bg-muted/30 border-r flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Tracks
            </span>
          </div>

          {/* Timeline Ruler */}
          <div className="flex-1 relative overflow-hidden">
            <ScrollArea className="w-full" ref={rulerScrollRef}>
              <div
                ref={timelineRef}
                className={`relative h-12 bg-muted/30 select-none ${
                  isDraggingRuler ? "cursor-grabbing" : "cursor-grab"
                }`}
                style={{
                  width: `${dynamicTimelineWidth}px`,
                }}
                onMouseDown={handleRulerMouseDown}
              >
                {/* Time markers */}
                {(() => {
                  // Calculate appropriate time interval based on zoom level
                  const getTimeInterval = (zoom: number) => {
                    const pixelsPerSecond =
                      TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoom;
                    if (pixelsPerSecond >= 200) return 0.1; // Every 0.1s when very zoomed in
                    if (pixelsPerSecond >= 100) return 0.5; // Every 0.5s when zoomed in
                    if (pixelsPerSecond >= 50) return 1; // Every 1s at normal zoom
                    if (pixelsPerSecond >= 25) return 2; // Every 2s when zoomed out
                    if (pixelsPerSecond >= 12) return 5; // Every 5s when more zoomed out
                    if (pixelsPerSecond >= 6) return 10; // Every 10s when very zoomed out
                    return 30; // Every 30s when extremely zoomed out
                  };

                  const interval = getTimeInterval(zoomLevel);
                  const markerCount = Math.ceil(duration / interval) + 1;

                  return Array.from({ length: markerCount }, (_, i) => {
                    const time = i * interval;
                    if (time > duration) return null;

                    const isMainMarker =
                      time % (interval >= 1 ? Math.max(1, interval) : 1) === 0;

                    return (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 ${
                          isMainMarker
                            ? "border-l border-muted-foreground/40"
                            : "border-l border-muted-foreground/20"
                        }`}
                        style={{
                          left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
                        }}
                      >
                        <span
                          className={`absolute top-1 left-1 text-xs ${
                            isMainMarker
                              ? "text-muted-foreground font-medium"
                              : "text-muted-foreground/70"
                          }`}
                        >
                          {(() => {
                            const formatTime = (seconds: number) => {
                              const hours = Math.floor(seconds / 3600);
                              const minutes = Math.floor((seconds % 3600) / 60);
                              const secs = seconds % 60;

                              if (hours > 0) {
                                return `${hours}:${minutes.toString().padStart(2, "0")}:${Math.floor(secs).toString().padStart(2, "0")}`;
                              } else if (minutes > 0) {
                                return `${minutes}:${Math.floor(secs).toString().padStart(2, "0")}`;
                              } else if (interval >= 1) {
                                return `${Math.floor(secs)}s`;
                              } else {
                                return `${secs.toFixed(1)}s`;
                              }
                            };
                            return formatTime(time);
                          })()}
                        </span>
                      </div>
                    );
                  }).filter(Boolean);
                })()}

                {/* Playhead in ruler (scrubbable) */}
                <div
                  className="playhead absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-auto z-50 cursor-col-resize"
                  style={{
                    left: `${playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
                  }}
                  onMouseDown={handlePlayheadMouseDown}
                >
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Labels */}
          {tracks.length > 0 && (
            <div className="w-48 flex-shrink-0 border-r bg-background overflow-y-auto">
              <div className="flex flex-col">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center px-3 border-b border-muted/30 bg-background group"
                    style={{ height: `${getTrackHeight(track.type)}px` }}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${getTrackLabelColor(track.type)}`}
                      />
                      <span className="ml-2 text-sm font-medium truncate">
                        {track.name}
                      </span>
                    </div>
                    {track.muted && (
                      <span className="ml-2 text-xs text-red-500 font-semibold flex-shrink-0">
                        Muted
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Tracks Content */}
          <div className="flex-1 relative overflow-hidden">
            <ScrollArea className="w-full h-full" ref={tracksScrollRef}>
              <div
                className="relative flex-1"
                style={{
                  height: `${Math.max(200, Math.min(800, getTotalTracksHeight(tracks)))}px`,
                  width: `${dynamicTimelineWidth}px`,
                }}
                onClick={handleTimelineClick}
                onMouseDown={handleTimelineMouseDown}
              >
                {tracks.length === 0 ? (
                  <div></div>
                ) : (
                  <>
                    {tracks.map((track, index) => (
                      <ContextMenu key={track.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            className="absolute left-0 right-0 border-b border-muted/30"
                            style={{
                              top: `${getCumulativeHeightBefore(tracks, index)}px`,
                              height: `${getTrackHeight(track.type)}px`,
                            }}
                            onClick={(e) => {
                              // If clicking empty area (not on a element), deselect all elements
                              if (
                                !(e.target as HTMLElement).closest(
                                  ".timeline-element"
                                )
                              ) {
                                clearSelectedElements();
                              }
                            }}
                          >
                            <TimelineTrackContent
                              track={track}
                              zoomLevel={zoomLevel}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem>
                            Track settings (soon)
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}

                    {/* Playhead for tracks area (scrubbable) */}
                    {tracks.length > 0 && (
                      <div
                        className="absolute top-0 w-0.5 bg-red-500 pointer-events-auto z-50 cursor-col"
                        style={{
                          left: `${playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
                          height: `${getTotalTracksHeight(tracks)}px`,
                        }}
                        onMouseDown={handlePlayheadMouseDown}
                      />
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
