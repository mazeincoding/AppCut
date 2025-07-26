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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TimelineTrackContent } from "./timeline-track";
import { TimelineTrackContentEnhanced } from "./timeline-track-enhanced";
import {
  TimelinePlayhead,
  useTimelinePlayheadRuler,
} from "./timeline-playhead";
import { TimelinePlayheadEnhanced } from "./timeline-playhead-enhanced";
import { TimelineToolbarEnhanced } from "./timeline-toolbar-enhanced";
import { SelectionBox } from "./selection-box";
import { useSelectionBox } from "@/hooks/use-selection-box";
import type { DragData, TimelineTrack, TimelineFeatureFlags, SnapPoint } from "@/types/timeline";
import {
  getTrackHeight,
  getCumulativeHeightBefore,
  getTotalTracksHeight,
  TIMELINE_CONSTANTS,
} from "@/constants/timeline-constants";

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

  // SAFE: Feature flags for testing snapping system
  const [featureFlags] = useState<TimelineFeatureFlags>({
    enableSnapping: true, // TESTING: Enabled for snapping system testing
    enableSnapVisualization: true, // TESTING: Show snap indicators
    enableToolSelection: true, // TESTING: Show toolbar enhancements
    enableTimeDisplay: true, // TESTING: Show time display on playhead
  });

  // SAFE: New states only used if features enabled
  const [selectedTool, setSelectedTool] = useState<'select' | 'cut' | 'text'>('select');
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(false);
  const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);
  const [elementSnapping, setElementSnapping] = useState<Map<string, boolean>>(new Map());

  // Timeline zoom functionality
  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
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
  const { handleRulerMouseDown, isDraggingRuler } = useTimelinePlayheadRuler({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
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
      if (isSelecting) {
        return;
      }

      // Don't seek if clicking on timeline elements, but still deselect
      if ((e.target as HTMLElement).closest(".timeline-element")) {
        return;
      }

      // Don't seek if we just finished selecting (but allow element interactions)
      if (justFinishedSelecting) {
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
      const isRulerClick = (e.target as HTMLElement).closest(
        "[data-ruler-area]"
      );

      let mouseX: number;
      let scrollLeft = 0;

      if (isRulerClick) {
        // Calculate based on ruler position
        const rulerContent = rulerScrollRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement;
        if (!rulerContent) return;
        const rect = rulerContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        scrollLeft = rulerContent.scrollLeft;
      } else {
        // Calculate based on tracks content position
        const tracksContent = tracksScrollRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement;
        if (!tracksContent) return;
        const rect = tracksContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        scrollLeft = tracksContent.scrollLeft;
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
      const { snapTimeToFrame } = require("@/constants/timeline-constants");
      const time = snapTimeToFrame(rawTime, projectFps);

      seek(time);
    },
    [
      duration,
      zoomLevel,
      seek,
      rulerScrollRef,
      tracksScrollRef,
      clearSelectedElements,
      isSelecting,
      justFinishedSelecting,
    ]
  );

  // Update timeline duration when tracks change
  useEffect(() => {
    const totalDuration = getTotalDuration();
    setDuration(Math.max(totalDuration, 20)); // Minimum 20 seconds for empty timeline
  }, [tracks, setDuration, getTotalDuration]);

  // Keyboard event for deleting selected elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input fields or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Only trigger when timeline is focused or mouse is over timeline
      if (
        !isInTimeline &&
        !timelineRef.current?.contains(document.activeElement)
      ) {
        return;
      }

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
  }, [
    selectedElements,
    removeElementFromTrack,
    clearSelectedElements,
    isInTimeline,
  ]);

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

  // Old marquee system removed - using new SelectionBox component instead

  const handleDragEnter = (e: React.DragEvent) => {
    console.log('🎯 TIMELINE: handleDragEnter triggered!', {
      types: Array.from(e.dataTransfer.types),
      hasMediaItem: e.dataTransfer.types.includes("application/x-media-item")
    });
    
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
    console.log('🎯 TIMELINE: handleDragOver triggered!');
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
    console.log('🎯 TIMELINE: handleDrop triggered!', {
      dataTransferTypes: Array.from(e.dataTransfer.types),
      hasMediaItem: e.dataTransfer.types.includes("application/x-media-item")
    });
    
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
          console.group('🎬 TIMELINE DROP DEBUG');
          console.log('Drop event type:', e.type);
          console.log('Drag data:', dragData);

          // Log all media items for comparison
          console.log('Available media items:', mediaItems.map(item => ({
            id: item.id,
            name: item.name,
            duration: item.duration,
            thumbnailCount: (item.thumbnails?.length || 0),
            fileValid: item.file ? (item.file as any) instanceof File : false,
            fileSize: item.file?.size,
            processingStage: item.processingStage,
            processingComplete: item.processingComplete
          })));

          const mediaItem = mediaItems.find((item) => item.id === dragData.id);
          console.log('Found media item:', mediaItem);

          if (mediaItem) {
            console.log('Media item detailed state:', {
              hasThumbnails: (mediaItem.thumbnails?.length || 0) > 0,
              duration: mediaItem.duration,
              fileType: mediaItem.file?.type,
              processingComplete: mediaItem.processingComplete,
              processingStage: mediaItem.processingStage,
              isFileValid: mediaItem.file ? (mediaItem.file as any) instanceof File : false
            });
          } else {
            console.error('❌ Media item not found - ID mismatch or item not in store');
            console.log('Attempted ID:', dragData.id);
            console.log('Available IDs:', mediaItems.map(item => item.id));
          }
          console.groupEnd();

          if (!mediaItem) {
            console.error('❌ Timeline Drop Failed - Media item not found:', {
              dragDataId: dragData.id,
              availableIds: mediaItems.map(item => item.id),
              totalItems: mediaItems.length
            });
            toast.error("Media item not found - try refreshing the media panel");
            return;
          }

          // AI-specific validation
          if (mediaItem.source === 'ai') {
            if (!mediaItem.processingComplete || mediaItem.processingStage !== 'complete') {
              console.log('⏳ AI video still processing:', {
                id: mediaItem.id,
                stage: mediaItem.processingStage,
                complete: mediaItem.processingComplete
              });
              toast.error("AI video is still processing - please wait");
              return;
            }
            
            if (!mediaItem.thumbnails || mediaItem.thumbnails.length === 0) {
              console.error('❌ AI video missing thumbnails:', mediaItem.id);
              toast.error("Video processing incomplete - thumbnails missing");
              return;
            }
          }

          // File validation
          if (!mediaItem.file || !(mediaItem.file instanceof File)) {
            console.error('❌ Invalid file reference:', {
              id: mediaItem.id,
              hasFile: !!mediaItem.file,
              isFileInstance: mediaItem.file ? (mediaItem.file as any) instanceof File : false,
              fileType: typeof mediaItem.file
            });
            toast.error("Media file is corrupted - try regenerating the video");
            return;
          }

          // Duration validation
          if (!mediaItem.duration || mediaItem.duration <= 0) {
            console.warn('⚠️ Missing or invalid duration, using fallback:', {
              id: mediaItem.id,
              duration: mediaItem.duration
            });
          }

          const trackType = dragData.type === "audio" ? "audio" : "media";
          let targetTrack = tracks.find((t) => t.type === trackType);
          const newTrackId = targetTrack ? targetTrack.id : addTrack(trackType);

          console.log("🎬 Adding media element to timeline:", {
            mediaItemId: mediaItem.id,
            mediaItemName: mediaItem.name,
            mediaItemDuration: mediaItem.duration,
            fallbackDuration: 5,
            finalDuration: mediaItem.duration || 5
          });
          
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
            console.log("📁 Adding uploaded file to timeline:", {
              addedItemId: addedItem.id,
              addedItemName: addedItem.name,
              addedItemDuration: addedItem.duration,
              processedItemDuration: processedItem.duration,
              fallbackDuration: 5,
              finalDuration: addedItem.duration || 5
            });
            
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
        trackLabelsViewport.removeEventListener(
          "scroll",
          handleTrackLabelsScroll
        );
        tracksViewport.removeEventListener(
          "scroll",
          handleTracksVerticalScroll
        );
      };
    }

    return () => {
      rulerViewport.removeEventListener("scroll", handleRulerScroll);
      tracksViewport.removeEventListener("scroll", handleTracksScroll);
    };
  }, []);

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 relative bg-panel rounded-xl overflow-hidden`}
      {...dragProps}
      onMouseEnter={() => setIsInTimeline(true)}
      onMouseLeave={() => setIsInTimeline(false)}
    >
      {/* Toolbar - render enhanced version if any enhanced features are enabled */}
      {!(featureFlags.enableSnapping || featureFlags.enableToolSelection) && (
        <div className="border-b flex items-center px-2 py-1 pb-3 gap-1">
        <TooltipProvider delayDuration={500}>
          {/* Play/Pause Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={toggle}
                className="mr-2 transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
              <Button 
                variant="text" 
                size="icon" 
                onClick={handleSplitSelected}
                className="transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
                className="transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
                className="transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
                className="transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
                className="transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
                className="transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
                className="transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(220, 38, 38, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete element (Delete)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        </div>
      )}

      {/* SAFE: Enhanced toolbar only if any feature is enabled */}
      {(featureFlags.enableSnapping || featureFlags.enableToolSelection) && (
        <TimelineToolbarEnhanced
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          isSnappingEnabled={isSnappingEnabled}
          setIsSnappingEnabled={setIsSnappingEnabled}
          featureFlags={featureFlags}
          // Pass through required toolbar props
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          speed={1}
          tracks={tracks}
          toggle={toggle}
          setSpeed={() => {}}
          addTrack={addTrack}
          addClipToTrack={() => {}}
          handleSplitSelected={() => {}}
          handleDuplicateSelected={() => {}}
          handleFreezeSelected={() => {}}
          handleDeleteSelected={() => {}}
        />
      )}

      {/* Timeline Container */}
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        ref={timelineRef}
      >
        {(featureFlags.enableTimeDisplay || (featureFlags.enableSnapping && activeSnapPoint?.type === 'playhead')) ? (
          <TimelinePlayheadEnhanced
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
            isSnappingToPlayhead={activeSnapPoint?.type === 'playhead'}
            showTimeDisplay={featureFlags.enableTimeDisplay}
          />
        ) : (
          // SAFE: Existing playhead unchanged
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
          />
        )}
        {/* Current Timeline Content Row */}
        <div className="flex bg-panel border-b border-border/50 sticky top-0 z-10">
          {/* Content Label */}
          <div className="w-80 flex-shrink-0 bg-muted/20 border-r flex items-center justify-between px-4 py-2">
            {/* Empty space */}
          </div>

          {/* Content Information Area */}
          <div className="flex-1 relative overflow-hidden bg-background/50" style={{ height: '32px' }}>
            <div className="flex items-center px-3 py-2 h-full">
              {/* Empty space */}
            </div>
          </div>
        </div>

        {/* Timeline Header with Ruler */}
        <div className="flex bg-panel sticky top-0 z-10">
          {/* Track Labels Header */}
          <div className="w-80 flex-shrink-0 bg-muted/30 border-r flex items-center justify-between px-4 py-2">
            {/* Empty space */}
            <span className="text-sm font-medium text-muted-foreground opacity-0">
              .
            </span>
          </div>

          {/* Timeline Ruler */}
          <div
            className="flex-1 relative overflow-hidden timeline-ruler"
            style={{ height: '28px' }}
            onWheel={handleWheel}
            onMouseDown={handleSelectionMouseDown}
            onClick={handleTimelineContentClick}
            data-ruler-area
            ref={(el) => {
              // Ruler container ref (debug logging removed)
            }}
          >
            <ScrollArea className="w-full" ref={rulerScrollRef}>
              <div
                ref={rulerRef}
                className="relative select-none cursor-default"
                style={{
                  width: `${dynamicTimelineWidth}px`,
                  height: '28px',
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
                    if (pixelsPerSecond >= 100) return 0.2; // Every 0.2s when zoomed in (1.0, 1.2, 1.4, 1.6, 1.8)
                    if (pixelsPerSecond >= 50) return 0.5; // Every 0.5s at normal zoom
                    if (pixelsPerSecond >= 25) return 1; // Every 1s when zoomed out
                    if (pixelsPerSecond >= 12) return 2; // Every 2s when more zoomed out
                    if (pixelsPerSecond >= 6) return 5; // Every 5s when very zoomed out
                    return 10; // Every 10s when extremely zoomed out
                  };

                  const interval = getTimeInterval(zoomLevel);
                  const markerCount = Math.ceil(duration / interval) + 1;

                  // Timeline ruler calculations (debug logging removed)

                  return Array.from({ length: markerCount }, (_, i) => {
                    const time = i * interval;
                    if (time > duration) return null;

                    const isMainMarker =
                      time % (interval >= 1 ? Math.max(1, interval) : 1) === 0;

                    // Marker rendering (debug logging removed to prevent console spam)

                    return (
                      <div
                        key={i}
                        className={`absolute ${
                          isMainMarker
                            ? "border-l-2 border-muted-foreground/60"
                            : "border-l border-muted-foreground/40"
                        }`}
                        style={{
                          left: `${(() => {
                            const rulerPosition = time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel + 320;
                            if (time === 0) {
                              console.log('📏 RULER 0.0s POSITION:', {
                                time,
                                pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
                                zoomLevel,
                                offset: 320,
                                finalPosition: rulerPosition
                              });
                              
                              // Get actual page position after render
                              setTimeout(() => {
                                const rulerElement = document.querySelector('[style*="left: 320px"]');
                                if (rulerElement) {
                                  const rect = rulerElement.getBoundingClientRect();
                                  console.log('📏 RULER 0.0s PAGE POSITION:', {
                                    leftFromPageEdge: rect.left,
                                    leftFromViewport: rect.x,
                                    elementOffsetLeft: rulerElement.offsetLeft,
                                    computedLeft: getComputedStyle(rulerElement).left
                                  });
                                }
                              }, 100);
                            }
                            return rulerPosition;
                          })()}px`,
                          top: '0px',
                          height: '32px',
                          zIndex: 1
                        }}
                      >
                        <span
                          className={`absolute left-1.5 text-[0.65rem] ${
                            isMainMarker
                              ? "text-muted-foreground font-medium"
                              : "text-muted-foreground/70"
                          }`}
                          style={{ top: '6px' }}
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
            </ScrollArea>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Labels */}
          {tracks.length > 0 && (
            <div
              ref={trackLabelsRef}
              className="w-80 flex-shrink-0 border-r bg-panel-accent overflow-y-auto"
              data-track-labels
            >
              <ScrollArea className="w-full h-full" ref={trackLabelsScrollRef}>
                <div className="flex flex-col gap-1">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-start px-4 pr-24 border-b border-muted/30 group bg-foreground/5"
                      style={{ height: `${getTrackHeight(track.type)}px` }}
                    >
                      <div className="flex items-center flex-1 min-w-0 pl-4">
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
              </ScrollArea>
            </div>
          )}

          {/* Timeline Tracks Content */}
          <div
            className="flex-1 relative overflow-hidden timeline-tracks"
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
            <ScrollArea className="w-full h-full" ref={tracksScrollRef}>
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
                            {featureFlags.enableSnapping ? (
                              <TimelineTrackContentEnhanced
                                track={track}
                                zoomLevel={zoomLevel}
                                onSnapPointChange={setActiveSnapPoint}
                                isSnappingEnabled={isSnappingEnabled}
                                featureFlags={featureFlags}
                              />
                            ) : (
                              // SAFE: Existing track component unchanged
                              <TimelineTrackContent
                                track={track}
                                zoomLevel={zoomLevel}
                              />
                            )}
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
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackIcon({ track }: { track: TimelineTrack }) {
  return (
    <div className="flex items-center justify-start pl-2 pr-6 py-2 border-2 border-transparent rounded-md">
      {track.type === "media" && (
        <Video className="flex-shrink-0 text-muted-foreground" style={{ width: '200px', height: '24px', minWidth: '12px', minHeight: '24px', transform: 'translateX(-50px)' }} />
      )}
      {track.type === "text" && (
        <TypeIcon className="w-12 h-12 flex-shrink-0 text-muted-foreground" />
      )}
      {track.type === "audio" && (
        <Music className="w-12 h-12 flex-shrink-0 text-muted-foreground" />
      )}
    </div>
  );
}
