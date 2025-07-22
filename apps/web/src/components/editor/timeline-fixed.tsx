"use client";

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
  LockOpen,
  Link,
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
import { useActionHandler } from "@/constants/actions";
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
import { TimelineZoomControl } from "./timeline-zoom-control";
import { useTimelineZoomActions } from "@/hooks/use-timeline-zoom-actions";

export function Timeline() {
  // Timeline shows all tracks (video, audio, effects) and their elements.
  // You can drag media here to add it to your project.
  // elements can be trimmed, deleted, and moved.

  const {
    tracks,
    addTrack,
    addElementToTrack,
    removeElementFromTrack,
    removeElementFromTrackWithRipple,
    getTotalDuration,
    calculateFitToWindowZoom,
    selectedElements,
    clearSelectedElements,
    setSelectedElements,
    splitElement,
    splitAndKeepLeft,
    splitAndKeepRight,
    toggleTrackMute,
    separateAudio,
    snappingEnabled,
    toggleSnapping,
    rippleEditingEnabled,
    toggleRippleEditing,
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

  // Track mouse down/up for distinguishing clicks from drag/resize ends
  const mouseTrackingRef = useRef({
    isMouseDown: false,
    downX: 0,
    downY: 0,
    downTime: 0,
  });

  // Fit to window function
  const handleFitToWindow = useCallback(() => {
    if (timelineRef.current) {
      const containerWidth = timelineRef.current.clientWidth;
      const optimalZoom = calculateFitToWindowZoom(containerWidth);
      setZoomLevel(optimalZoom);
    }
  }, [calculateFitToWindowZoom]);

  // Timeline zoom functionality
  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
    onFitToWindow: handleFitToWindow,
  });

  // Old marquee selection removed - using new SelectionBox component instead

  // Dynamic timeline width calculation based on playhead position and duration
  const dynamicTimelineWidth = Math.max(
    (duration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Base width from duration
    (currentTime + 30) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Width to show current time + 30 seconds buffer
    timelineRef.current?.clientWidth || 1000 // Minimum width
  );

  // Scroll synchronization and auto-scroll to playhead
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
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
    tracksScrollRef,
    playheadRef,
  });

  // Zoom actions
  useTimelineZoomActions({
    zoomLevel,
    setZoomLevel,
    onFitToWindow: handleFitToWindow,
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

  // Track mouse down to distinguish real clicks from drag/resize ends
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    // Only track mouse down on timeline background areas (not elements)
    const target = e.target as HTMLElement;
    const isTimelineBackground =
      !target.closest(".timeline-element") &&
      !playheadRef.current?.contains(target) &&
      !target.closest("[data-track-labels]");

    if (isTimelineBackground) {
      mouseTrackingRef.current = {
        isMouseDown: true,
        downX: e.clientX,
        downY: e.clientY,
        downTime: e.timeStamp,
      };
    }
  }, []);

  // Track mouse up globally to reset mouse tracking
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      mouseTrackingRef.current.isMouseDown = false;
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  // Handle clicks on timeline content (not playhead/ruler)
  const handleTimelineContentClick = useCallback((e: React.MouseEvent) => {
    // Only handle clicks if we didn't move much (distinguishing from drag end)
    const { isMouseDown, downX, downY, downTime } = mouseTrackingRef.current;
    const now = Date.now();
    const distance = Math.sqrt(
      Math.pow(e.clientX - downX, 2) + Math.pow(e.clientY - downY, 2)
    );

    // Not a real click if:
    // - Mouse wasn't pressed down in timeline background
    // - Too much movement (likely drag end)
    // - Too much time passed (likely hold or slow drag)
    if (!isMouseDown || distance > 5 || now - downTime > 300) {
      return;
    }

    // Only proceed if we're not currently selecting and didn't just finish selecting
    if (isSelecting || justFinishedSelecting) {
      return;
    }

    // Get timeline content element and click position
    const timelineContent = e.currentTarget as HTMLElement;
    const rect = timelineContent.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    // Convert click position to time
    const timeFromClick =
      clickX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);

    // Snap to frame boundary for accurate seeking
    const projectFps = activeProject?.fps || 30;
    const snappedTime = snapTimeToFrame(timeFromClick, projectFps);

    // Seek to the clicked time
    seek(Math.max(0, snappedTime));
  }, [zoomLevel, seek, isSelecting, justFinishedSelecting]);

  // Drag and drop handlers for adding media to timeline
  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();

    // Don't update state for timeline elements - they're handled by tracks
    if (e.dataTransfer.types.includes("application/x-timeline-element")) {
      return;
    }

    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }

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

          // Add to first available track or create new one
          const targetTrack = tracks.find(
            (track) => track.type === "media" && track.elements.length === 0
          );

          if (targetTrack) {
            await addElementToTrack(targetTrack.id, {
              id: crypto.randomUUID(),
              type: "media",
              mediaId: mediaItem.id,
              startTime: 0,
              duration: mediaItem.duration,
              trimStart: 0,
              trimEnd: 0,
            });
          } else {
            const trackId = crypto.randomUUID();
            addTrack({
              id: trackId,
              type: "media",
              name: `Track ${tracks.length + 1}`,
              elements: [],
              muted: false,
              volume: 1,
            });
            await addElementToTrack(trackId, {
              id: crypto.randomUUID(),
              type: "media",
              mediaId: mediaItem.id,
              startTime: 0,
              duration: mediaItem.duration,
              trimStart: 0,
              trimEnd: 0,
            });
          }
        }
      } catch (error) {
        console.error("Error parsing drag data:", error);
        toast.error("Failed to add media to timeline");
      }
      return;
    }

    // Handle file drops (e.g., from desktop)
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setIsProcessing(true);
      setProgress(0);
      try {
        const processedMedia = await processMediaFiles(files, (progress) => {
          setProgress(progress);
        });

        for (const media of processedMedia) {
          if (!activeProject) {
            toast.error("No active project");
            return;
          }
          await addMediaItem(activeProject.id, media);

          // Add to timeline automatically
          const trackId = crypto.randomUUID();
          addTrack({
            id: trackId,
            type: "media",
            name: `Track ${tracks.length + 1}`,
            elements: [],
            muted: false,
            volume: 1,
          });
          await addElementToTrack(trackId, {
            id: crypto.randomUUID(),
            type: "media",
            mediaId: media.id,
            startTime: 0,
            duration: media.duration,
            trimStart: 0,
            trimEnd: 0,
          });
        }

        toast.success(`Added ${processedMedia.length} media files to timeline`);
      } catch (error) {
        console.error("Error processing dropped files:", error);
        toast.error("Failed to process some files");
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    }
  };

  // Context menu handlers
  const handleSplitElement = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element to split");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    splitElement(trackId, elementId, currentTime);
  };

  const handleSplitAndKeepLeft = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element to split");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((e) => e.id === elementId);
    if (!track || !element) return;

    const effectiveStart = element.startTime + element.trimStart;
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
      toast.error("Select exactly one element to split");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((e) => e.id === elementId);
    if (!track || !element) return;

    const effectiveStart = element.startTime + element.trimStart;
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
      if (rippleEditingEnabled) {
        removeElementFromTrackWithRipple(trackId, elementId);
      } else {
        removeElementFromTrack(trackId, elementId);
      }
    });
    clearSelectedElements();
  };

  // Register delete action with centralized keybinding system
  useActionHandler("delete-selected", handleDeleteSelected);

  // --- Scroll synchronization effect ---
  useEffect(() => {
    const rulerViewport = rulerScrollRef.current;
    const tracksViewport = tracksScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    const trackLabelsViewport = trackLabelsScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!rulerViewport || !tracksViewport) return;

    // Horizontal scroll synchronization between ruler and tracks
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

    // Vertical scroll synchronization between track labels and tracks content
    if (trackLabelsViewport) {
      const handleTrackLabelsScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastVerticalSync.current < 16)
          return;
        lastVerticalSync.current = now;
        isUpdatingRef.current = true;
        tracksViewport.scrollTop = trackLabelsViewport.scrollTop;
        isUpdatingRef.current = false;
      };
      const handleTracksVerticalScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastVerticalSync.current < 16)
          return;
        lastVerticalSync.current = now;
        isUpdatingRef.current = true;
        trackLabelsViewport.scrollTop = tracksViewport.scrollTop;
        isUpdatingRef.current = false;
      };

      trackLabelsViewport.addEventListener("scroll", handleTrackLabelsScroll);
      tracksViewport.addEventListener("scroll", handleTracksVerticalScroll);

      return () => {
        rulerViewport.removeEventListener("scroll", handleRulerScroll);
        tracksViewport.removeEventListener("scroll", handleTracksScroll);
        trackLabelsViewport.removeEventListener("scroll", handleTrackLabelsScroll);
        tracksViewport.removeEventListener("scroll", handleTracksVerticalScroll);
      };
    }

    return () => {
      rulerViewport.removeEventListener("scroll", handleRulerScroll);
      tracksViewport.removeEventListener("scroll", handleTracksScroll);
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
            <div className="text-sm text-muted-foreground mr-2 font-mono">
              {(() => {
                const formatTime = (seconds: number) => {
                  const h = Math.floor(seconds / 3600);
                  const m = Math.floor((seconds % 3600) / 60);
                  const s = Math.floor(seconds % 60);
                  const ms = Math.floor((seconds % 1) * 100);
                  return h > 0
                    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
                    : `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
                };
                return `${formatTime(currentTime)} / ${formatTime(duration)}`;
              })()}
            </div>
            <div className="w-px h-6 bg-border mx-1" />
            {/* Element Actions */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleSplitElement}
                  disabled={selectedElements.length !== 1}
                >
                  <Scissors className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split element at playhead (S)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleSplitAndKeepLeft}
                  disabled={selectedElements.length !== 1}
                >
                  <ArrowLeftToLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split and keep left part</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleSplitAndKeepRight}
                  disabled={selectedElements.length !== 1}
                >
                  <ArrowRightToLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split and keep right part</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleDeleteSelected}
                  disabled={selectedElements.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected elements (Del)</TooltipContent>
            </Tooltip>
            <div className="w-px h-6 bg-border mx-1" />
            {/* Media Actions */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleSeparateAudio}
                  disabled={
                    selectedElements.length !== 1 ||
                    !tracks
                      .find((t) => t.id === selectedElements[0]?.trackId)
                      ?.elements.find((e) => e.id === selectedElements[0]?.elementId)
                  }
                >
                  <SplitSquareHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Separate audio from video</TooltipContent>
            </Tooltip>
            <div className="w-px h-6 bg-border mx-1" />
            {/* Timeline Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={snappingEnabled ? "accent" : "text"}
                  size="icon"
                  onClick={toggleSnapping}
                >
                  <Snowflake className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {snappingEnabled ? "Disable Snapping" : "Enable Snapping"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={rippleEditingEnabled ? "accent" : "text"}
                  size="icon"
                  onClick={toggleRippleEditing}
                >
                  <Link className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {rippleEditingEnabled
                  ? "Disable Ripple Editing"
                  : "Enable Ripple Editing"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Timeline Zoom Control */}
          <div className="w-px h-6 bg-border mx-2" />
          <TimelineZoomControl
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
            onFitToWindow={handleFitToWindow}
            className="mr-2"
          />
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
          tracksScrollRef={tracksScrollRef}
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
          {/* Track Labels Header */}
          <div className="w-48 flex-shrink-0 bg-muted/30 border-r flex items-center justify-between px-3 py-2">
            {/* Empty space */}
            <span className="text-sm font-medium text-muted-foreground opacity-0">
              .
            </span>
          </div>

          {/* Timeline Ruler */}
          <div
            className="flex-1 relative overflow-x-auto overflow-y-hidden h-4"
            onWheel={handleWheel}
            onMouseDown={handleSelectionMouseDown}
            onClick={handleTimelineContentClick}
            data-ruler-area
            ref={rulerScrollRef}
          >
            <div
              ref={rulerRef}
              className="relative h-4 select-none cursor-default"
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
                          className={`absolute top-1 left-1 text-[0.6rem] ${
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
              </div>
            </div>
          </div>

        {/* Tracks Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Labels */}
          {tracks.length > 0 && (
            <div
              ref={trackLabelsRef}
              className="w-48 flex-shrink-0 border-r border-black overflow-y-auto"
              data-track-labels
            >
              <div
                ref={trackLabelsScrollRef}
                className="w-full h-full"
              >
                <div className="flex flex-col gap-1">
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
            </div>
          )}

          {/* Timeline Tracks Content */}
          <div
            className="flex-1 relative overflow-auto"
            onWheel={handleWheel}
            onMouseDown={(e) => {
              handleTimelineMouseDown(e);
              handleSelectionMouseDown(e);
            }}
            onClick={handleTimelineContentClick}
            ref={tracksContainerRef}
          >
            <div
              ref={tracksScrollRef}
              className="w-full h-full"
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
        </div>
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
