"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import { VideoPlayer } from "@/components/ui/video-player";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, Expand } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatTimeCode } from "@/lib/time";
import { FONT_CLASS_MAP } from "@/lib/font-config";
import { BackgroundSettings } from "../background-settings";
import { useProjectStore } from "@/stores/project-store";

interface ActiveElement {
  element: TimelineElement;
  track: TimelineTrack;
  mediaItem: MediaItem | null;
}

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { currentTime } = usePlaybackStore();
  const { canvasSize } = useEditorStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 0,
    height: 0,
  });
  const { activeProject } = useProjectStore();

  // Calculate optimal preview size that fits in container while maintaining aspect ratio
  useEffect(() => {
    const updatePreviewSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const computedStyle = getComputedStyle(containerRef.current);

      // Get padding values
      const paddingTop = parseFloat(computedStyle.paddingTop);
      const paddingBottom = parseFloat(computedStyle.paddingBottom);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const paddingRight = parseFloat(computedStyle.paddingRight);

      // Get gap value (gap-4 = 1rem = 16px)
      const gap = parseFloat(computedStyle.gap) || 16;

      // Get toolbar height if it exists
      const toolbar = containerRef.current.querySelector("[data-toolbar]");
      const toolbarHeight = toolbar
        ? toolbar.getBoundingClientRect().height
        : 0;

      // Calculate available space after accounting for padding, gap, and toolbar
      const availableWidth = container.width - paddingLeft - paddingRight;
      const availableHeight =
        container.height -
        paddingTop -
        paddingBottom -
        toolbarHeight -
        (toolbarHeight > 0 ? gap : 0);

      const targetRatio = canvasSize.width / canvasSize.height;
      const containerRatio = availableWidth / availableHeight;

      let width, height;

      if (containerRatio > targetRatio) {
        // Container is wider - constrain by height
        height = availableHeight;
        width = height * targetRatio;
      } else {
        // Container is taller - constrain by width
        width = availableWidth;
        height = width / targetRatio;
      }

      setPreviewDimensions({ width, height });
    };

    updatePreviewSize();

    const resizeObserver = new ResizeObserver(updatePreviewSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [canvasSize.width, canvasSize.height]);

  // Get active elements at current time
  const getActiveElements = (): ActiveElement[] => {
    const activeElements: ActiveElement[] = [];

    tracks.forEach((track) => {
      track.elements.forEach((element) => {
        const elementStart = element.startTime;
        const elementEnd =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd);

        if (currentTime >= elementStart && currentTime < elementEnd) {
          let mediaItem = null;

          // Only get media item for media elements
          if (element.type === "media") {
            mediaItem =
              element.mediaId === "test"
                ? null // Test elements don't have a real media item
                : mediaItems.find((item) => item.id === element.mediaId) ||
                  null;
          }

          activeElements.push({ element, track, mediaItem });
        }
      });
    });

    return activeElements;
  };

  const activeElements = getActiveElements();

  // Check if there are any elements in the timeline at all
  const hasAnyElements = tracks.some((track) => track.elements.length > 0);

  // Get media elements for blur background (video/image only)
  const getBlurBackgroundElements = (): ActiveElement[] => {
    return activeElements.filter(
      ({ element, mediaItem }) =>
        element.type === "media" &&
        mediaItem &&
        (mediaItem.type === "video" || mediaItem.type === "image") &&
        element.mediaId !== "test" // Exclude test elements
    );
  };

  const blurBackgroundElements = getBlurBackgroundElements();

  // Render blur background layer
  const renderBlurBackground = () => {
    if (
      !activeProject?.backgroundType ||
      activeProject.backgroundType !== "blur" ||
      blurBackgroundElements.length === 0
    ) {
      return null;
    }

    // Use the first media element for background (could be enhanced to use primary/focused element)
    const backgroundElement = blurBackgroundElements[0];
    const { element, mediaItem } = backgroundElement;

    if (!mediaItem) return null;

    const blurIntensity = activeProject.blurIntensity || 8;

    if (mediaItem.type === "video") {
      return (
        <div
          key={`blur-${element.id}`}
          className="absolute inset-0 overflow-hidden"
          style={{
            filter: `blur(${blurIntensity}px)`,
            transform: "scale(1.1)", // Slightly zoom to avoid blur edge artifacts
            transformOrigin: "center",
          }}
        >
          <VideoPlayer
            src={mediaItem.url!}
            poster={mediaItem.thumbnailUrl}
            clipStartTime={element.startTime}
            trimStart={element.trimStart}
            trimEnd={element.trimEnd}
            clipDuration={element.duration}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (mediaItem.type === "image") {
      return (
        <div
          key={`blur-${element.id}`}
          className="absolute inset-0 overflow-hidden"
          style={{
            filter: `blur(${blurIntensity}px)`,
            transform: "scale(1.1)", // Slightly zoom to avoid blur edge artifacts
            transformOrigin: "center",
          }}
        >
          <img
            src={mediaItem.url!}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      );
    }

    return null;
  };

  // Render an element
  const renderElement = (elementData: ActiveElement, index: number) => {
    const { element, mediaItem } = elementData;

    // Text elements
    if (element.type === "text") {
      const fontClassName =
        FONT_CLASS_MAP[element.fontFamily as keyof typeof FONT_CLASS_MAP] || "";

      const scaleRatio = previewDimensions.width / canvasSize.width;

      return (
        <div
          key={element.id}
          className="absolute flex items-center justify-center"
          style={{
            left: `${50 + (element.x / canvasSize.width) * 100}%`,
            top: `${50 + (element.y / canvasSize.height) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${scaleRatio})`,
            opacity: element.opacity,
            zIndex: 100 + index, // Text elements on top
          }}
        >
          <div
            className={fontClassName}
            style={{
              fontSize: `${element.fontSize}px`,
              color: element.color,
              backgroundColor: element.backgroundColor,
              textAlign: element.textAlign,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textDecoration: element.textDecoration,
              padding: "4px 8px",
              borderRadius: "2px",
              whiteSpace: "nowrap",
              // Fallback for system fonts that don't have classes
              ...(fontClassName === "" && { fontFamily: element.fontFamily }),
            }}
          >
            {element.content}
          </div>
        </div>
      );
    }

    // Media elements
    if (element.type === "media") {
      // Test elements
      if (!mediaItem || element.mediaId === "test") {
        return (
          <div
            key={element.id}
            className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🎬</div>
              <p className="text-xs text-white">{element.name}</p>
            </div>
          </div>
        );
      }

      // Video elements
      if (mediaItem.type === "video") {
        return (
          <div
            key={element.id}
            className="absolute inset-0 flex items-center justify-center"
          >
            <VideoPlayer
              src={mediaItem.url!}
              poster={mediaItem.thumbnailUrl}
              clipStartTime={element.startTime}
              trimStart={element.trimStart}
              trimEnd={element.trimEnd}
              clipDuration={element.duration}
            />
          </div>
        );
      }

      // Image elements
      if (mediaItem.type === "image") {
        return (
          <div
            key={element.id}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src={mediaItem.url!}
              alt={mediaItem.name}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          </div>
        );
      }

      // Audio elements (no visual representation)
      if (mediaItem.type === "audio") {
        return (
          <div key={element.id} className="absolute inset-0">
            <AudioPlayer
              src={mediaItem.url!}
              clipStartTime={element.startTime}
              trimStart={element.trimStart}
              trimEnd={element.trimEnd}
              clipDuration={element.duration}
              trackMuted={elementData.track.muted}
            />
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-panel rounded-sm">
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center p-3 min-h-0 min-w-0"
      >
        <div className="flex-1"></div>
        {hasAnyElements ? (
          <div
            ref={previewRef}
            className="relative overflow-hidden rounded-sm border"
            style={{
              width: previewDimensions.width,
              height: previewDimensions.height,
              backgroundColor:
                activeProject?.backgroundType === "blur"
                  ? "transparent"
                  : activeProject?.backgroundColor || "#000000",
            }}
          >
            {renderBlurBackground()}
            {activeElements.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No elements at current time
              </div>
            ) : (
              activeElements.map((elementData, index) =>
                renderElement(elementData, index)
              )
            )}
            {/* Show message when blur is selected but no media available */}
            {activeProject?.backgroundType === "blur" &&
              blurBackgroundElements.length === 0 &&
              activeElements.length > 0 && (
                <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded">
                  Add a video or image to use blur background
                </div>
              )}
          </div>
        ) : null}

        <div className="flex-1"></div>

        <PreviewToolbar hasAnyElements={hasAnyElements} />
      </div>
    </div>
  );
}

function PreviewToolbar({ hasAnyElements }: { hasAnyElements: boolean }) {
  const { isPlaying, toggle, currentTime } = usePlaybackStore();
  const { setCanvasSize, setCanvasSizeToOriginal } = useEditorStore();
  const { getTotalDuration } = useTimelineStore();
  const { activeProject } = useProjectStore();
  const {
    currentPreset,
    isOriginal,
    getOriginalAspectRatio,
    getDisplayName,
    canvasPresets,
  } = useAspectRatio();

  const handlePresetSelect = (preset: { width: number; height: number }) => {
    setCanvasSize({ width: preset.width, height: preset.height });
  };

  const handleOriginalSelect = () => {
    const aspectRatio = getOriginalAspectRatio();
    setCanvasSizeToOriginal(aspectRatio);
  };

  return (
    <div
      data-toolbar
      className="flex items-end justify-between gap-2 p-1 pt-2 w-full"
    >
      <div>
        <p
          className={cn(
            "text-[0.75rem] text-muted-foreground flex items-center gap-1",
            !hasAnyElements && "opacity-50"
          )}
        >
          <span className="text-primary tabular-nums">
            {formatTimeCode(
              currentTime,
              "HH:MM:SS:FF",
              activeProject?.fps || 30
            )}
          </span>
          <span className="opacity-50">/</span>
          <span className="tabular-nums">
            {formatTimeCode(
              getTotalDuration(),
              "HH:MM:SS:FF",
              activeProject?.fps || 30
            )}
          </span>
        </p>
      </div>
      <Button
        variant="text"
        size="icon"
        onClick={toggle}
        disabled={!hasAnyElements}
        className="h-auto p-0"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
      <div className="flex items-center gap-3">
        <BackgroundSettings />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="!bg-panel-accent text-foreground/85 text-[0.70rem] h-4 rounded-none border border-muted-foreground px-0.5 py-0 font-light"
              disabled={!hasAnyElements}
            >
              {getDisplayName()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleOriginalSelect}
              className={cn("text-xs", isOriginal && "font-semibold")}
            >
              Original
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canvasPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "text-xs",
                  currentPreset?.name === preset.name && "font-semibold"
                )}
              >
                {preset.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="text"
          size="icon"
          className="!size-4 text-muted-foreground"
        >
          <Expand className="!size-4" />
        </Button>
      </div>
    </div>
  );
}
