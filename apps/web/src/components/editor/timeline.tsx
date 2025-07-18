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
  Pause,
  Play,
  Video,
  Music,
  TypeIcon,
  Lock,
  ZoomIn,
  ZoomOut,
  LockOpen,
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
  ContextMenuTrigger,
} from "../ui/context-menu";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineZoom } from "@/hooks/use-timeline-zoom";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";
import { useState, useRef, useEffect, useCallback } from "react";
import { TimelineTrackContent } from "./timeline-track";
import {
  TimelinePlayhead,
  useTimelinePlayheadRuler,
} from "./timeline-playhead";
import { SelectionBox } from "./selection-box";
import { useSelectionBox } from "@/hooks/use-selection-box";
import { SnapIndicator } from "./snap-indicator";
import { SnapPoint } from "@/hooks/use-timeline-snapping";
import type { DragData, TimelineTrack } from "@/types/timeline";
import {
  getTrackHeight,
  getCumulativeHeightBefore,
  getTotalTracksHeight,
  TIMELINE_CONSTANTS,
  snapTimeToFrame,
} from "@/constants/timeline-constants";
import { Slider } from "../ui/slider";
import TimelineCanvasRuler from "./timeline-canvas/timeline-canvas-ruler";
import TimelineCanvasRulerWrapper from "./timeline-canvas/timeline-canvas-ruler-wrapper";

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
    toggleTrackMute,
    separateAudio,
    undo,
    redo,
    snappingEnabled,
    toggleSnapping,
    dragState,
  } = useTimelineStore();
  const { mediaItems, addMediaItem } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { currentTime, duration, seek, setDuration, isPlaying, toggle } =
    usePlaybackStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const dragCounterRef = useRef(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isInTimeline, setIsInTimeline] = useState(false);

  // Timeline zoom functionality
  const {
    zoomLevel,
    zoomStep,
    handleChangeZoomLevel,
    handleChangeZoomStep,
    handleWheel,
  } = useTimelineZoom();

  // Old marquee selection removed - using new SelectionBox component instead

  // Dynamic timeline width calculation based on playhead position and duration
  const dynamicTimelineWidth = Math.max(
    (duration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Base width from duration
    (currentTime + 30) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Width to show current time + 30 seconds buffer
    timelineRef.current?.clientWidth || 1000 // Minimum width
  );

  // Scroll synchronization and auto-scroll to playhead
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const trackLabelsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const trackLabelsScrollRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const lastRulerSync = useRef(0);
  const lastTracksSync = useRef(0);
  const lastVerticalSync = useRef(0);

  // Timeline playhead ruler handlers
  const { handleRulerMouseDown } = useTimelinePlayheadRuler({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
  });

  // Selection box functionality
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const {
    selectionBox,
    handleMouseDown: handleSelectionMouseDown,
    isSelecting,
    justFinishedSelecting,
  } = useSelectionBox({
    containerRef: tracksContainerRef,
    playheadRef,
    onSelectionComplete: (elements) => {
      console.log(JSON.stringify({ onSelectionComplete: elements.length }));
      setSelectedElements(elements);
    },
  });

  // Calculate snap indicator state
  const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint | null>(
    null
  );
  const showSnapIndicator =
    dragState.isDragging && snappingEnabled && currentSnapPoint !== null;

  // Callback to handle snap point changes from TimelineTrackContent
  const handleSnapPointChange = useCallback((snapPoint: SnapPoint | null) => {
    setCurrentSnapPoint(snapPoint);
  }, []);

  // Timeline content click to seek handler
  const handleTimelineContentClick = useCallback(
    (e: React.MouseEvent) => {
      console.log(
        JSON.stringify({
          timelineClick: {
            isSelecting,
            justFinishedSelecting,
            willReturn: isSelecting || justFinishedSelecting,
          },
        })
      );

      // Don't seek if this was a selection box operation
      if (isSelecting || justFinishedSelecting) {
        return;
      }

      // Don't seek if clicking on timeline elements, but still deselect
      if ((e.target as HTMLElement).closest(".timeline-element")) {
        return;
      }

      // Don't seek if clicking on playhead
      if (playheadRef.current?.contains(e.target as Node)) {
        return;
      }

      // Don't seek if clicking on track labels
      if ((e.target as HTMLElement).closest("[data-track-labels]")) {
        clearSelectedElements();
        return;
      }

      // Clear selected elements when clicking empty timeline area
      console.log(JSON.stringify({ clearingSelectedElements: true }));
      clearSelectedElements();

      // Determine if we're clicking in ruler or tracks area
      const isTracksAreaClick = (e.target as HTMLElement).closest(
        "[data-tracks-area]"
      );

      let mouseX: number;
      let scrollLeft = 0;

      if (isTracksAreaClick) {
        // Calculate based on ruler position
        const rulerContent = rulerScrollRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement;
        if (!rulerContent) return;
        const rect = rulerContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        scrollLeft = rulerContent.scrollLeft;
      } else {
        return;
      }

      const rawTime = Math.max(
        0,
        Math.min(
          duration,
          (mouseX + scrollLeft) /
            (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel)
        )
      );

      // Use frame snapping for timeline clicking
      const projectFps = activeProject?.fps || 30;
      const time = snapTimeToFrame(rawTime, projectFps);

      seek(time);
    },
    [
      duration,
      zoomLevel,
      seek,
      rulerScrollRef,
      clearSelectedElements,
      isSelecting,
      justFinishedSelecting,
    ]
  );

  // Update timeline duration when tracks change
  useEffect(() => {
    const totalDuration = getTotalDuration();
    setDuration(Math.max(totalDuration, 10)); // Minimum 10 seconds for empty timeline
  }, [tracks, setDuration, getTotalDuration]);

  // Old marquee system removed - using new SelectionBox component instead

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
          useTimelineStore.getState().addTextToNewTrack(dragData);
        } else {
          // Handle media items
          const mediaItem = mediaItems.find(
            (item: any) => item.id === dragData.id
          );
          if (!mediaItem) {
            toast.error("Media item not found");
            return;
          }

          useTimelineStore.getState().addMediaToNewTrack(mediaItem);
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
            useTimelineStore.getState().addMediaToNewTrack(addedItem);
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

  // --- Scroll synchronization effect ---
  useEffect(() => {
    const rulerViewport = rulerScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    const trackLabelsViewport = trackLabelsScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;

    if (!rulerViewport) return;

    // Horizontal scroll synchronization between ruler and tracks
    const handleRulerScroll = () => {
      const now = Date.now();
      if (isUpdatingRef.current || now - lastRulerSync.current < 16) return;
      lastRulerSync.current = now;
      isUpdatingRef.current = true;
      isUpdatingRef.current = false;
    };
    const handleTracksScroll = () => {
      const now = Date.now();
      if (isUpdatingRef.current || now - lastTracksSync.current < 16) return;
      lastTracksSync.current = now;
      isUpdatingRef.current = true;
      isUpdatingRef.current = false;
    };

    rulerViewport.addEventListener("scroll", handleRulerScroll);

    // Vertical scroll synchronization between track labels and tracks content
    if (trackLabelsViewport) {
      const handleTrackLabelsScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastVerticalSync.current < 16)
          return;
        lastVerticalSync.current = now;
        isUpdatingRef.current = true;
        isUpdatingRef.current = false;
      };
      const handleTracksVerticalScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastVerticalSync.current < 16)
          return;
        lastVerticalSync.current = now;
        isUpdatingRef.current = true;
        isUpdatingRef.current = false;
      };

      trackLabelsViewport.addEventListener("scroll", handleTrackLabelsScroll);

      return () => {
        rulerViewport.removeEventListener("scroll", handleRulerScroll);
        trackLabelsViewport.removeEventListener(
          "scroll",
          handleTrackLabelsScroll
        );
      };
    }

    return () => {
      rulerViewport.removeEventListener("scroll", handleRulerScroll);
    };
  }, []);

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 relative bg-panel rounded-sm overflow-hidden`}
      {...dragProps}
      onMouseEnter={() => setIsInTimeline(true)}
      onMouseLeave={() => setIsInTimeline(false)}
    >
      {/* Toolbar */}
      <div className="border-b flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1 w-full">
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
                  <TooltipContent>
                    Add a test clip to try playback
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            <div className="w-px h-6 bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleSplitSelected}
                >
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
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleSeparateAudio}
                >
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
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleFreezeSelected}
                >
                  <Snowflake className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Freeze frame (F)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete element (Delete)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="ml-auto"
                  variant="text"
                  size="icon"
                  onClick={() => handleChangeZoomLevel(zoomLevel - 0.15)}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <Slider
              className="max-w-24"
              max={TIMELINE_CONSTANTS.MAX_ZOOM_STEP}
              min={0}
              step={1}
              value={[zoomStep]}
              onValueChange={(value) => handleChangeZoomStep(value[0])}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={() => handleChangeZoomLevel(zoomLevel + 0.15)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="text" size="icon" onClick={toggleSnapping}>
                  {snappingEnabled ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <LockOpen className="h-4 w-4 text-primary" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Auto snapping</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Timeline Container */}
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        ref={timelineRef}
      >
        <TimelinePlayhead
          currentTime={currentTime}
          duration={duration}
          zoomLevel={zoomLevel}
          tracks={tracks}
          seek={seek}
          rulerRef={rulerRef}
          rulerScrollRef={rulerScrollRef}
          trackLabelsRef={trackLabelsRef}
          timelineRef={timelineRef}
          playheadRef={playheadRef}
          isSnappingToPlayhead={
            showSnapIndicator && currentSnapPoint?.type === "playhead"
          }
        />
        <SnapIndicator
          snapPoint={currentSnapPoint}
          zoomLevel={zoomLevel}
          tracks={tracks}
          timelineRef={timelineRef}
          trackLabelsRef={trackLabelsRef}
          isVisible={showSnapIndicator}
        />
        {/* Timeline Header with Ruler */}
        <div className="flex bg-panel sticky top-0 z-10">
          <div className="w-48 flex-shrink-0 bg-muted/30 border-r h-5 px-3" />

          <div className="flex-1 overflow-hidden h-5">
            <ScrollArea className="w-full" ref={rulerScrollRef}>
              <TimelineCanvasRulerWrapper
                ref={rulerRef}
                onMouseDown={handleRulerMouseDown}
              >
                <TimelineCanvasRuler
                  zoomLevel={zoomLevel}
                  duration={duration}
                  width={dynamicTimelineWidth}
                />
              </TimelineCanvasRulerWrapper>
            </ScrollArea>
          </div>
        </div>

        {/* Tracks Area */}
        <ScrollArea className="w-full h-full">
          <div
            className="flex-1 flex overflow-hidden overflow-y-auto"
            data-tracks-area
          >
            {/* Track Labels */}
            {tracks.length > 0 && (
              <div
                ref={trackLabelsRef}
                className="w-48 flex-shrink-0 border-r bg-panel-accent "
                data-track-labels
              >
                <div className="flex flex-col gap-1" ref={trackLabelsScrollRef}>
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center px-3 border-b border-muted/30 group bg-foreground/5"
                      style={{ height: `${getTrackHeight(track.type)}px` }}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <TrackIcon track={track} />
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
            <div
              className="flex-1 relative overflow-hidden"
              onWheel={handleWheel}
              onMouseDown={handleSelectionMouseDown}
              onClick={handleTimelineContentClick}
              ref={tracksContainerRef}
            >
              <SelectionBox
                startPos={selectionBox?.startPos || null}
                currentPos={selectionBox?.currentPos || null}
                containerRef={tracksContainerRef}
                isActive={selectionBox?.isActive || false}
              />
              <div
                className="relative flex-1"
                style={{
                  height: `${Math.max(200, Math.min(800, getTotalTracksHeight(tracks)))}px`,
                  width: `${dynamicTimelineWidth}px`,
                }}
              >
                {tracks.length === 0 ? (
                  <div></div>
                ) : (
                  <>
                    {tracks.map((track, index) => (
                      <ContextMenu key={track.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            className="absolute left-0 right-0 border-b border-muted/30 py-[0.05rem]"
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
                              onSnapPointChange={handleSnapPointChange}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() => toggleTrackMute(track.id)}
                          >
                            {track.muted ? "Unmute Track" : "Mute Track"}
                          </ContextMenuItem>
                          <ContextMenuItem>
                            Track settings (soon)
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function TrackIcon({ track }: { track: TimelineTrack }) {
  return (
    <>
      {track.type === "media" && (
        <Video className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
      )}
      {track.type === "text" && (
        <TypeIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
      )}
      {track.type === "audio" && (
        <Music className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
      )}
    </>
  );
}
