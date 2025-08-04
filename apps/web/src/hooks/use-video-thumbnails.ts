import { useState, useEffect, useCallback, useRef } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
import {
  generateVideoThumbnails,
  getVideoThumbnailForTime,
  getVideoThumbnailsForMedia,
  clearVideoThumbnailsForMedia,
  preloadVideoThumbnails,
  type VideoThumbnailData,
  type VideoThumbnailOptions,
} from "@/lib/video-thumbnail-utils";
import {
  loadVideoThumbnailSettings,
  calculateOptimalVideoThumbnailSettings,
  shouldUpdateVideoThumbnail,
  type VideoThumbnailSettings,
} from "@/lib/video-thumbnail-settings";

export interface UseVideoThumbnailsProps {
  mediaId: string;
  elementStartTime: number;
  elementDuration: number;
  enabled?: boolean;
  options?: VideoThumbnailOptions;
  zoomLevel?: number;
  settings?: Partial<VideoThumbnailSettings>;
}

export interface UseVideoThumbnailsReturn {
  currentThumbnail: VideoThumbnailData | null;
  allThumbnails: VideoThumbnailData[];
  isLoading: boolean;
  error: string | null;
  generateThumbnails: () => Promise<void>;
  clearThumbnails: () => void;
  preload: () => Promise<void>;
}

/**
 * Hook for managing video thumbnails based on playhead position
 */
export function useVideoThumbnails({
  mediaId,
  elementStartTime,
  elementDuration,
  enabled = true,
  options = {},
  zoomLevel = 1,
  settings: customSettings = {},
}: UseVideoThumbnailsProps): UseVideoThumbnailsReturn {
  const [currentThumbnail, setCurrentThumbnail] =
    useState<VideoThumbnailData | null>(null);
  const [allThumbnails, setAllThumbnails] = useState<VideoThumbnailData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentTime, isPlaying } = usePlaybackStore();



  const { mediaItems } = useMediaStore();

  // Load settings and calculate optimal options
  const settings = { ...loadVideoThumbnailSettings(), ...customSettings };
  const optimalSettings = calculateOptimalVideoThumbnailSettings(
    zoomLevel,
    elementDuration,
    settings
  );
  const finalOptions = {
    ...options,
    intervalSeconds: optimalSettings.intervalSeconds,
    maxThumbnails: optimalSettings.maxThumbnails,
    thumbnailWidth: optimalSettings.thumbnailWidth,
    thumbnailHeight: optimalSettings.thumbnailHeight,
  };

  // Refs for debouncing and performance
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateTimeRef = useRef<number>(0);
  const lastCurrentTimeRef = useRef<number>(currentTime);

  // Get the media item
  const mediaItem = mediaItems.find((item) => item.id === mediaId);

  // Update current thumbnail based on playhead position
  const updateCurrentThumbnail = useCallback(
    (globalTime: number) => {
      if (!enabled) return;

      // Convert global time to element-relative time
      const elementRelativeTime = globalTime - elementStartTime;

      // Check if playhead is within this element's time range
      if (elementRelativeTime < 0 || elementRelativeTime > elementDuration) {
        setCurrentThumbnail(null);
        return;
      }

      // Find the best thumbnail for this time position
      const thumbnail = getVideoThumbnailForTime(mediaId, elementRelativeTime);
      setCurrentThumbnail(thumbnail);
    },
    [enabled, mediaId, elementStartTime, elementDuration]
  );

  // Optimized thumbnail update with settings-based threshold
  const debouncedUpdateThumbnail = useCallback(
    (globalTime: number) => {
      // Check if update is needed based on settings threshold
      if (
        !shouldUpdateVideoThumbnail(
          globalTime,
          lastCurrentTimeRef.current,
          settings.updateThreshold
        )
      ) {
        return;
      }

      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Debounce the update
      updateTimeoutRef.current = setTimeout(() => {
        updateCurrentThumbnail(globalTime);
        lastUpdateTimeRef.current = globalTime;
        lastCurrentTimeRef.current = globalTime;
      }, 50); // 50ms debounce
    },
    [updateCurrentThumbnail, settings.updateThreshold]
  );

  // Generate thumbnails for this media item
  const generateThumbnails = useCallback(async () => {
    if (!enabled || !mediaItem?.file) {

      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const videoDuration = mediaItem.duration || elementDuration;
      const thumbnails = await generateVideoThumbnails(
        mediaId,
        mediaItem.file,
        videoDuration,
        finalOptions
      );

      setAllThumbnails(thumbnails);

      // Set initial thumbnail based on current time
      updateCurrentThumbnail(currentTime);


    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate thumbnails";
      setError(errorMessage);
      // Video thumbnail generation failed - handle error appropriately
    } finally {
      setIsLoading(false);
    }
  }, [
    mediaItem,
    mediaId,
    elementDuration,
    finalOptions,
    updateCurrentThumbnail,
    currentTime,
    enabled,
  ]);

  // Clear thumbnails for this media item
  const clearThumbnails = useCallback(() => {
    clearVideoThumbnailsForMedia(mediaId);
    setAllThumbnails([]);
    setCurrentThumbnail(null);

  }, [mediaId]);

  // Preload thumbnails
  const preload = useCallback(async () => {
    if (!enabled || !mediaItem?.file) return;

    try {
      const videoDuration = mediaItem.duration || elementDuration;
      await preloadVideoThumbnails(
        mediaId,
        mediaItem.file,
        videoDuration,
        finalOptions
      );

      // Load the generated thumbnails
      const existingThumbnails = getVideoThumbnailsForMedia(mediaId);
      setAllThumbnails(existingThumbnails);
      updateCurrentThumbnail(currentTime);
    } catch (err) {
      // Failed to preload video thumbnails - handle error appropriately
    }
  }, [
    enabled,
    mediaItem,
    mediaId,
    elementDuration,
    finalOptions,
    updateCurrentThumbnail,
    currentTime,
  ]);

  // Effect to update thumbnail when playhead position changes
  useEffect(() => {
    if (!enabled) return;

    // Check if we should update during playback based on settings
    const shouldUpdate = !isPlaying || settings.updateDuringPlayback;

    if (shouldUpdate) {
      debouncedUpdateThumbnail(currentTime);
    }

    // Cleanup timeout on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    currentTime,
    enabled,
    isPlaying,
    settings.updateDuringPlayback,
    debouncedUpdateThumbnail,
  ]);

  // Effect to load existing thumbnails on mount
  useEffect(() => {
    if (!enabled || !mediaId) return;

    const existingThumbnails = getVideoThumbnailsForMedia(mediaId);
    if (existingThumbnails.length > 0) {
      setAllThumbnails(existingThumbnails);
      updateCurrentThumbnail(currentTime);
    }
  }, [enabled, mediaId, updateCurrentThumbnail, currentTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentThumbnail,
    allThumbnails,
    isLoading,
    error,
    generateThumbnails,
    clearThumbnails,
    preload,
  };
}

// Backward compatibility exports
/** @deprecated Use UseVideoThumbnailsProps instead */
export type UseDynamicThumbnailsProps = UseVideoThumbnailsProps;

/** @deprecated Use UseVideoThumbnailsReturn instead */
export type UseDynamicThumbnailsReturn = UseVideoThumbnailsReturn;

/** @deprecated Use useVideoThumbnails instead */
export const useDynamicThumbnails = useVideoThumbnails;
