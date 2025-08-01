"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useVideoThumbnails } from "@/hooks/use-video-thumbnails";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import type { MediaItem } from "@/stores/media-store";
import type { TimelineTrack } from "@/types/timeline";

export interface TimelineVideoThumbnailDisplayProps {
  mediaItem: MediaItem;
  track: TimelineTrack;
  elementStartTime: number;
  elementDuration: number;
  elementWidth: number;
  elementHeight: number;
  zoomLevel: number;
  className?: string;
}

interface ThumbnailTile {
  url: string;
  offsetX: number;
  width: number;
  timePosition: number;
}

/**
 * Component that displays timeline video thumbnails based on playhead position
 */
export function TimelineVideoThumbnailDisplay({
  mediaItem,
  track,
  elementStartTime,
  elementDuration,
  elementWidth,
  elementHeight,
  zoomLevel,
  className = "",
}: TimelineVideoThumbnailDisplayProps) {
  const { currentTime } = usePlaybackStore();
  const [thumbnailTiles, setThumbnailTiles] = useState<ThumbnailTile[]>([]);

  console.log("🎭 TimelineVideoThumbnailDisplay mounted for:", {
    mediaId: mediaItem.id,
    mediaName: mediaItem.name,
    hasFile: !!mediaItem.file,
    elementDuration,
    elementWidth,
    elementHeight,
  });

  const {
    currentThumbnail,
    allThumbnails,
    isLoading,
    generateThumbnails,
    clearThumbnails,
    preload,
  } = useVideoThumbnails({
    mediaId: mediaItem.id,
    elementStartTime,
    elementDuration,
    enabled: mediaItem.type === "video",
    zoomLevel,
    // Let the hook calculate optimal settings based on zoom and duration
  });

  // Track zoom level changes for smart regeneration
  const lastZoomLevel = useRef(zoomLevel);
  const hasTriggeredGeneration = useRef(false);

  // Calculate thumbnail tiles for display with aspect ratio awareness
  const calculatedTiles = useMemo(() => {
    console.log("🧮 Calculating thumbnail tiles:", {
      allThumbnails: allThumbnails.length,
      elementWidth,
      elementDuration,
      zoomLevel,
      thumbnails: allThumbnails.map((t: any) => ({
        time: t.timePosition,
        url: t.url.substring(0, 30) + "...",
        dimensions: `${t.width}x${t.height}`,
        aspectRatio: (t.width / t.height).toFixed(3),
      })),
    });

    const tiles: ThumbnailTile[] = [];
    const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

    // Sort thumbnails by time position to ensure proper ordering
    const sortedThumbnails = [...allThumbnails].sort(
      (a, b) => a.timePosition - b.timePosition
    );

    if (sortedThumbnails.length === 0) {
      console.log("⚠️ No thumbnails available for tiling");
      return tiles;
    }

    // Detect if we have portrait videos (smartphone recordings)
    const hasPortraitThumbnails = sortedThumbnails.some(
      (t) => t.width < t.height
    );

    // Calculate seamless tile coverage to eliminate gaps
    const availableWidth = elementWidth;
    const thumbnailCount = sortedThumbnails.length;

    // Calculate exact tile width to perfectly fill available space
    const exactTileWidth = availableWidth / thumbnailCount;

    console.log(
      `🎯 Seamless thumbnail layout: ${exactTileWidth.toFixed(1)}px per tile (total: ${availableWidth}px)`
    );

    sortedThumbnails.forEach((thumbnail, index) => {
      // Use exact positioning to eliminate gaps
      const offsetX = index * exactTileWidth;

      // For the last tile, extend to the exact end to prevent any gap
      const isLastTile = index === thumbnailCount - 1;
      const tileWidth = isLastTile
        ? availableWidth - offsetX // Extend to exact end
        : exactTileWidth; // Standard exact width

      tiles.push({
        url: thumbnail.url,
        offsetX,
        width: tileWidth,
        timePosition: thumbnail.timePosition,
      });
    });

    console.log("🎨 Generated aspect-aware thumbnail tiles:", {
      tilesCount: tiles.length,
      hasPortraitThumbnails,
      isLoading,
      elementWidth,
      thumbnailDetails: allThumbnails.map((t: any) => ({
        time: t.timePosition,
        hasUrl: !!t.url,
        aspect: (t.width / t.height).toFixed(3),
        isPortrait: t.width < t.height,
      })),
    });

    return tiles;
  }, [allThumbnails, elementWidth, elementDuration, zoomLevel, isLoading]);

  // Update thumbnail tiles when calculated tiles change
  useEffect(() => {
    setThumbnailTiles(calculatedTiles);
  }, [calculatedTiles]);

  // Enhanced thumbnail generation with better UX
  useEffect(() => {
    console.log("🚀 Enhanced thumbnail generation check:", {
      mediaType: mediaItem.type,
      thumbnailCount: allThumbnails.length,
      isLoading,
      hasStaticThumbnail: !!mediaItem.thumbnailUrl,
      preloadOnMount: !!preload,
      zoomLevel,
      lastZoomLevel: lastZoomLevel.current,
      elementWidth,
      hasTriggeredGeneration: hasTriggeredGeneration.current,
    });

    if (mediaItem.type === "video" && !isLoading) {
      // Initial load: Start generation in background while showing large poster frame
      if (allThumbnails.length === 0 && !hasTriggeredGeneration.current) {
        console.log(
          "🎬 Starting background video thumbnail generation for",
          mediaItem.id,
          "at zoom",
          zoomLevel
        );
        hasTriggeredGeneration.current = true;
        lastZoomLevel.current = zoomLevel;

        // Small delay to let the large image render first, then start generation
        setTimeout(() => {
          console.log(
            "🎬 Beginning video thumbnail generation in background..."
          );
          preload();
        }, 100);
      }
      // Smart zoom handling: generate more when zooming in, reuse when zooming out
      else if (Math.abs(zoomLevel - lastZoomLevel.current) > 0.2) {
        const isZoomingIn = zoomLevel > lastZoomLevel.current;

        if (isZoomingIn && zoomLevel > 1.2) {
          // Zooming in: generate more thumbnails
          console.log(
            "🔍 Zoom increased, generating more detailed video thumbnails:",
            {
              oldZoom: lastZoomLevel.current,
              newZoom: zoomLevel,
              currentThumbnails: allThumbnails.length,
            }
          );
          lastZoomLevel.current = zoomLevel;
          // Clear existing thumbnails and generate new ones optimized for current zoom
          console.log(
            "🧹 Clearing existing thumbnails before regenerating for new zoom level"
          );
          clearThumbnails();
          setTimeout(() => {
            console.log(
              "🎬 Generating new detailed video thumbnails for zoom level",
              zoomLevel
            );
            generateThumbnails();
          }, 200);
        } else if (!isZoomingIn) {
          // Zooming out: smart reuse of cached thumbnails
          console.log("🔄 Zoom decreased, reusing cached video thumbnails:", {
            oldZoom: lastZoomLevel.current,
            newZoom: zoomLevel,
            currentThumbnails: allThumbnails.length,
            action: "smart_reuse",
          });
          lastZoomLevel.current = zoomLevel;
          // Trigger regeneration with current cache - this will reuse existing thumbnails
          generateThumbnails();
        }
      }
    }
  }, [
    mediaItem.type,
    mediaItem.id,
    allThumbnails.length,
    isLoading,
    zoomLevel,
    preload,
    generateThumbnails,
    clearThumbnails,
  ]);

  // Calculate playhead position relative to this element
  const getPlayheadPosition = useMemo(() => {
    if (
      currentTime < elementStartTime ||
      currentTime > elementStartTime + elementDuration
    ) {
      return null; // Playhead is outside this element
    }

    const relativeTime = currentTime - elementStartTime;
    const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
    return relativeTime * pixelsPerSecond;
  }, [currentTime, elementStartTime, elementDuration, zoomLevel]);

  console.log("🎬 TimelineVideoThumbnailDisplay render state:", {
    mediaType: mediaItem.type,
    elementWidth,
    hasTriggeredGeneration: hasTriggeredGeneration.current,
    thumbnailUrls: allThumbnails.map(
      (t: any) => t.url.substring(0, 30) + "..."
    ),
  });

  // Enhanced loading state: Show large poster frame while generating thumbnails
  if (isLoading && allThumbnails.length === 0) {
    return (
      <div
        className={`relative w-full h-full bg-black overflow-hidden ${className}`}
      >
        {/* Large poster frame background */}
        {mediaItem.thumbnailUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
            style={{
              backgroundImage: `url(${mediaItem.thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 opacity-60" />
        )}

        {/* Subtle loading overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <div className="text-xs text-white/90 font-medium">
              Generating video thumbnails...
            </div>
          </div>
        </div>

        {/* Playhead highlight overlay if applicable */}
        {getPlayheadPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/50 pointer-events-none z-10"
            style={{ left: getPlayheadPosition }}
          />
        )}
      </div>
    );
  }

  // Render thumbnails if available
  if (allThumbnails.length > 0 && thumbnailTiles.length > 0) {
    return (
      <div
        className={`relative w-full h-full bg-black overflow-hidden ${className}`}
      >
        {/* Thumbnail tiles with seamless coverage */}
        {thumbnailTiles.map((tile, index) => (
          <div
            key={`${mediaItem.id}-tile-${index}`}
            className="absolute top-0 bottom-0"
            style={{
              left: `${tile.offsetX}px`,
              width: `${tile.width + 1}px`, // Add 1px to prevent sub-pixel gaps
              backgroundImage: `url(${tile.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        ))}

        {/* Playhead highlight overlay */}
        {getPlayheadPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none z-10"
            style={{ left: getPlayheadPosition }}
          />
        )}

        {/* Subtle loading indicator for additional thumbnails */}
        {isLoading && (
          <div className="absolute top-1 right-1 z-20">
            <div className="bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5">
              <div className="w-2 h-2 border border-white/40 border-t-white rounded-full animate-spin" />
              <div className="text-xs text-white/90 font-medium">Updating</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Enhanced fallback: Large poster frame with better visual treatment
  return (
    <div
      className={`relative w-full h-full bg-black overflow-hidden ${className}`}
    >
      {mediaItem.thumbnailUrl ? (
        <>
          {/* Large poster frame */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${mediaItem.thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {/* Subtle overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Media name overlay */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="text-xs text-white/90 font-medium truncate bg-black/30 backdrop-blur-sm rounded px-2 py-1">
              {mediaItem.name}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Gradient background when no thumbnail */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600" />

          {/* Media name centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-white/90 font-medium mb-1">
                {mediaItem.name}
              </div>
              <div className="text-xs text-white/60">Video File</div>
            </div>
          </div>
        </>
      )}

      {/* Playhead highlight overlay */}
      {getPlayheadPosition !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none z-10"
          style={{ left: getPlayheadPosition }}
        />
      )}
    </div>
  );
}

/**
 * Enhanced static display for when video thumbnails are disabled
 */
export function StaticThumbnailDisplay({
  mediaItem,
  track,
  elementWidth,
  elementHeight,
  className = "",
}: {
  mediaItem: MediaItem;
  track: TimelineTrack;
  elementWidth: number;
  elementHeight: number;
  className?: string;
}) {
  if (mediaItem.type === "video" && mediaItem.thumbnailUrl) {
    // For video files with thumbnails, show large poster frame
    return (
      <div
        className={`relative w-full h-full bg-black overflow-hidden ${className}`}
      >
        {/* Large poster frame */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${mediaItem.thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Subtle overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Media name overlay */}
        <div className="absolute bottom-1 left-1 right-1">
          <div className="text-xs text-white/80 font-medium truncate bg-black/20 backdrop-blur-sm rounded px-1.5 py-0.5">
            {mediaItem.name}
          </div>
        </div>
      </div>
    );
  }

  // For video files without thumbnails
  return (
    <div
      className={`relative w-full h-full bg-black overflow-hidden ${className}`}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600" />

      {/* Media name centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-2">
          <div className="text-xs text-white/90 font-medium truncate">
            {mediaItem.name}
          </div>
          <div className="text-xs text-white/50 mt-0.5">Video File</div>
        </div>
      </div>
    </div>
  );
}

// Backward compatibility exports
/** @deprecated Use TimelineVideoThumbnailDisplayProps instead */
export type DynamicThumbnailDisplayProps = TimelineVideoThumbnailDisplayProps;

/** @deprecated Use TimelineVideoThumbnailDisplay instead */
export const DynamicThumbnailDisplay = TimelineVideoThumbnailDisplay;
