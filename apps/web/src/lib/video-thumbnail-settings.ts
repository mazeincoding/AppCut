/**
 * Settings and preferences for timeline video thumbnail system
 * Following professional video editing terminology (Premiere Pro: "Continuous Video Thumbnails")
 */

export interface VideoThumbnailSettings {
  enabled: boolean;
  quality: "low" | "medium" | "high";
  maxCacheSize: number;
  maxAge: number; // in milliseconds
  preloadOnMount: boolean;
  updateThreshold: number; // minimum time change to trigger update (in seconds)
  maxThumbnailsPerVideo: number;
  thumbnailInterval: number; // seconds between thumbnails
  updateDuringPlayback: boolean; // whether to update thumbnails during playback (performance impact)
}

export interface VideoThumbnailQualityPreset {
  thumbnailWidth: number;
  thumbnailHeight: number;
  intervalSeconds: number;
  maxThumbnails: number;
}

// Quality presets optimized for performance
export const VIDEO_THUMBNAIL_QUALITY_PRESETS: Record<
  VideoThumbnailSettings["quality"],
  VideoThumbnailQualityPreset
> = {
  low: {
    thumbnailWidth: 120, // Reduced from 160 for faster generation
    thumbnailHeight: 90, // Reduced from 120 for faster generation
    intervalSeconds: 1.5, // Reduced from 3 for better zoom responsiveness
    maxThumbnails: 20, // Increased from 10 for better zoom support
  },
  medium: {
    thumbnailWidth: 160, // Reduced from 320 for faster generation
    thumbnailHeight: 120, // Reduced from 240 for faster generation
    intervalSeconds: 2, // Increased from 1 for fewer thumbnails
    maxThumbnails: 15, // Reduced from 50 for faster generation
  },
  high: {
    thumbnailWidth: 240, // Reduced from 480 for faster generation
    thumbnailHeight: 180, // Reduced from 360 for faster generation
    intervalSeconds: 1, // Increased from 0.5 for fewer thumbnails
    maxThumbnails: 25, // Reduced from 100 for faster generation
  },
};

// Default settings
export const DEFAULT_VIDEO_THUMBNAIL_SETTINGS: VideoThumbnailSettings = {
  enabled: true,
  quality: "low", // Start with low quality for better performance
  maxCacheSize: 500,
  maxAge: 30 * 60 * 1000, // 30 minutes
  preloadOnMount: true, // Generate initial set of thumbnails to show different frames
  updateThreshold: 0.1, // 100ms
  maxThumbnailsPerVideo: 20, // Reduced from 50
  thumbnailInterval: 2, // Increased from 1 second to 2 seconds between thumbnails
  updateDuringPlayback: false, // Professional editor behavior: only update during scrubbing
};

// Local storage key
const SETTINGS_KEY = "opencut-video-thumbnail-settings";

/**
 * Load video thumbnail settings from localStorage
 */
export function loadVideoThumbnailSettings(): VideoThumbnailSettings {
  if (typeof window === "undefined") {
    return DEFAULT_VIDEO_THUMBNAIL_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_VIDEO_THUMBNAIL_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn("Failed to load video thumbnail settings:", error);
  }

  return DEFAULT_VIDEO_THUMBNAIL_SETTINGS;
}

/**
 * Save video thumbnail settings to localStorage
 */
export function saveVideoThumbnailSettings(
  settings: Partial<VideoThumbnailSettings>
): void {
  if (typeof window === "undefined") return;

  try {
    const current = loadVideoThumbnailSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Failed to save video thumbnail settings:", error);
  }
}

/**
 * Get quality preset for current settings
 */
export function getVideoThumbnailQualityPreset(
  quality: VideoThumbnailSettings["quality"]
): VideoThumbnailQualityPreset {
  return VIDEO_THUMBNAIL_QUALITY_PRESETS[quality];
}

/**
 * Calculate optimal video thumbnail settings based on zoom level and element duration
 */
export function calculateOptimalVideoThumbnailSettings(
  zoomLevel: number,
  elementDuration: number,
  baseSettings: VideoThumbnailSettings
): VideoThumbnailQualityPreset {
  const preset = getVideoThumbnailQualityPreset(baseSettings.quality);

  // Adjust interval based on zoom level with reasonable limits
  const zoomFactor = Math.min(zoomLevel, 4); // Cap zoom effect at 4x
  const adjustedInterval = Math.max(
    0.5,
    preset.intervalSeconds / Math.sqrt(zoomFactor)
  ); // Back to sqrt for gentler scaling

  // Limit total thumbnails based on duration and performance
  const maxThumbnailsForDuration = Math.ceil(
    elementDuration / adjustedInterval
  );

  // Apply reasonable limits for short videos
  let reasonableMax;
  if (elementDuration <= 10) {
    reasonableMax = Math.min(12, maxThumbnailsForDuration); // Max 12 for short videos
  } else if (elementDuration <= 30) {
    reasonableMax = Math.min(20, maxThumbnailsForDuration); // Max 20 for medium videos
  } else {
    reasonableMax = Math.min(preset.maxThumbnails, maxThumbnailsForDuration);
  }

  const adjustedMaxThumbnails = Math.min(
    reasonableMax,
    baseSettings.maxThumbnailsPerVideo
  );

  console.log("🔍 Zoom-based video thumbnail calculation:", {
    zoomLevel,
    zoomFactor,
    originalInterval: preset.intervalSeconds,
    adjustedInterval,
    elementDuration,
    maxThumbnailsForDuration,
    reasonableMax,
    adjustedMaxThumbnails,
    presetMaxThumbnails: preset.maxThumbnails,
  });

  return {
    ...preset,
    intervalSeconds: adjustedInterval,
    maxThumbnails: adjustedMaxThumbnails,
  };
}

/**
 * Check if video thumbnail update should be triggered based on time change
 */
export function shouldUpdateVideoThumbnail(
  currentTime: number,
  lastUpdateTime: number,
  threshold: number
): boolean {
  return Math.abs(currentTime - lastUpdateTime) >= threshold;
}

/**
 * Performance monitoring utilities for video thumbnails
 */
export class VideoThumbnailPerformanceMonitor {
  private metrics: {
    generationTimes: number[];
    cacheHits: number;
    cacheMisses: number;
    memoryUsage: number[];
  } = {
    generationTimes: [],
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: [],
  };

  recordGenerationTime(timeMs: number): void {
    this.metrics.generationTimes.push(timeMs);
    // Keep only last 100 measurements
    if (this.metrics.generationTimes.length > 100) {
      this.metrics.generationTimes.shift();
    }
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordMemoryUsage(bytes: number): void {
    this.metrics.memoryUsage.push(bytes);
    if (this.metrics.memoryUsage.length > 50) {
      this.metrics.memoryUsage.shift();
    }
  }

  getStats() {
    const generationTimes = this.metrics.generationTimes;
    const avgGenerationTime =
      generationTimes.length > 0
        ? generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length
        : 0;

    const cacheHitRate =
      this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (this.metrics.cacheHits /
            (this.metrics.cacheHits + this.metrics.cacheMisses)) *
          100
        : 0;

    const avgMemoryUsage =
      this.metrics.memoryUsage.length > 0
        ? this.metrics.memoryUsage.reduce((a, b) => a + b, 0) /
          this.metrics.memoryUsage.length
        : 0;

    return {
      averageGenerationTime: avgGenerationTime,
      cacheHitRate,
      averageMemoryUsage: avgMemoryUsage,
      totalGenerations: generationTimes.length,
      totalCacheHits: this.metrics.cacheHits,
      totalCacheMisses: this.metrics.cacheMisses,
    };
  }

  reset(): void {
    this.metrics = {
      generationTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: [],
    };
  }
}

// Global performance monitor instance
export const videoThumbnailPerformanceMonitor =
  new VideoThumbnailPerformanceMonitor();

/**
 * Adaptive quality adjustment based on performance
 */
export function getAdaptiveVideoThumbnailQuality(
  currentQuality: VideoThumbnailSettings["quality"],
  performanceStats: ReturnType<VideoThumbnailPerformanceMonitor["getStats"]>
): VideoThumbnailSettings["quality"] {
  const { averageGenerationTime, cacheHitRate } = performanceStats;

  // If generation is slow and cache hit rate is low, reduce quality
  if (averageGenerationTime > 2000 && cacheHitRate < 50) {
    return currentQuality === "high" ? "medium" : "low";
  }

  // If performance is good, we can increase quality
  if (averageGenerationTime < 500 && cacheHitRate > 80) {
    return currentQuality === "low" ? "medium" : "high";
  }

  return currentQuality;
}

// Backward compatibility exports (deprecated - use Video* versions)
/** @deprecated Use VideoThumbnailSettings instead */
export type ThumbnailSettings = VideoThumbnailSettings;

/** @deprecated Use VideoThumbnailQualityPreset instead */
export type QualityPreset = VideoThumbnailQualityPreset;

/** @deprecated Use VIDEO_THUMBNAIL_QUALITY_PRESETS instead */
export const QUALITY_PRESETS = VIDEO_THUMBNAIL_QUALITY_PRESETS;

/** @deprecated Use DEFAULT_VIDEO_THUMBNAIL_SETTINGS instead */
export const DEFAULT_THUMBNAIL_SETTINGS = DEFAULT_VIDEO_THUMBNAIL_SETTINGS;

/** @deprecated Use loadVideoThumbnailSettings instead */
export const loadThumbnailSettings = loadVideoThumbnailSettings;

/** @deprecated Use saveVideoThumbnailSettings instead */
export const saveThumbnailSettings = saveVideoThumbnailSettings;

/** @deprecated Use getVideoThumbnailQualityPreset instead */
export const getQualityPreset = getVideoThumbnailQualityPreset;

/** @deprecated Use calculateOptimalVideoThumbnailSettings instead */
export const calculateOptimalSettings = calculateOptimalVideoThumbnailSettings;

/** @deprecated Use shouldUpdateVideoThumbnail instead */
export const shouldUpdateThumbnail = shouldUpdateVideoThumbnail;

/** @deprecated Use VideoThumbnailPerformanceMonitor instead */
export const ThumbnailPerformanceMonitor = VideoThumbnailPerformanceMonitor;

/** @deprecated Use videoThumbnailPerformanceMonitor instead */
export const thumbnailPerformanceMonitor = videoThumbnailPerformanceMonitor;

/** @deprecated Use getAdaptiveVideoThumbnailQuality instead */
export const getAdaptiveQuality = getAdaptiveVideoThumbnailQuality;
