import { videoThumbnailPerformanceMonitor } from "./video-thumbnail-settings";
import { IndexedDBAdapter } from "./storage/indexeddb-adapter";

export interface VideoThumbnailData {
  timePosition: number;
  url: string;
  width: number;
  height: number;
  createdAt: number; // Timestamp for cache management
  lastAccessed: number; // For LRU cache management
}

export interface CachedMediaVideoThumbnails {
  [timePosition: string]: VideoThumbnailData;
}

export interface VideoThumbnailCache {
  [mediaId: string]: CachedMediaVideoThumbnails;
}

export interface VideoThumbnailOptions {
  intervalSeconds?: number;
  maxThumbnails?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

export interface CacheConfig {
  maxCacheSize: number; // Maximum number of thumbnails to keep in memory
  maxAge: number; // Maximum age in milliseconds before thumbnail expires
  cleanupInterval: number; // How often to run cleanup in milliseconds
}

// Global video thumbnail cache with enhanced management
const videoThumbnailCache: VideoThumbnailCache = {};
let cacheSize = 0; // Track total number of cached thumbnails

// Persistent cache using IndexedDB
let persistentCacheAdapter: IndexedDBAdapter<VideoThumbnailData> | null = null;

// Initialize persistent cache
const initializePersistentCache = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    persistentCacheAdapter = new IndexedDBAdapter<VideoThumbnailData>(
      "opencut-video-thumbnails",
      "thumbnails",
      1
    );

    // Load existing thumbnails from persistent storage
    await loadCacheFromPersistentStorage();
    console.log("📦 Video thumbnail persistent cache initialized");
  } catch (error) {
    console.warn("Failed to initialize persistent thumbnail cache:", error);
  }
};

// Load cache from persistent storage
const loadCacheFromPersistentStorage = async (): Promise<void> => {
  if (!persistentCacheAdapter) {
    console.log("⚠️ No persistent cache adapter available");
    return;
  }

  try {
    const keys = await persistentCacheAdapter.list();
    console.log(`📥 Found ${keys.length} thumbnails in persistent storage`);

    if (keys.length === 0) {
      console.log(
        "📭 Persistent cache is empty - this is normal for first visit"
      );
      return;
    }

    let loadedCount = 0;
    for (const key of keys) {
      const thumbnailData = await persistentCacheAdapter.get(key);
      if (thumbnailData) {
        // Parse the key to get mediaId and timePosition
        const [mediaId, timePositionStr] = key.split("_");
        const timePosition = parseFloat(timePositionStr);

        console.log(
          `📦 Loading thumbnail: ${key} (${mediaId} at ${timePosition}s)`
        );

        // Initialize media cache if needed
        if (!videoThumbnailCache[mediaId]) {
          videoThumbnailCache[mediaId] = {};
        }

        // Add to in-memory cache
        const cacheKey = timePosition.toFixed(2);
        videoThumbnailCache[mediaId][cacheKey] = thumbnailData;
        cacheSize++;
        loadedCount++;
      }
    }

    console.log(
      `✅ Successfully loaded ${loadedCount} thumbnails from persistent cache`
    );
    console.log(`📊 Total cache size now: ${cacheSize}`);
  } catch (error) {
    console.warn("❌ Failed to load thumbnails from persistent cache:", error);
  }
};

// Convert blob URL to base64 data URL for persistence
const blobToDataURL = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to convert blob to data URL:", error);
    return blobUrl; // Fallback to original URL
  }
};

// Save thumbnail to persistent storage
const saveThumbnailToPersistentStorage = async (
  mediaId: string,
  timePosition: number,
  thumbnailData: VideoThumbnailData
): Promise<void> => {
  if (!persistentCacheAdapter) return;

  try {
    // Convert blob URL to data URL for persistence
    const dataUrl = await blobToDataURL(thumbnailData.url);
    const persistentThumbnailData = {
      ...thumbnailData,
      url: dataUrl,
    };

    const key = `${mediaId}_${timePosition.toFixed(2)}`;
    await persistentCacheAdapter.set(key, persistentThumbnailData);
    console.log(`💾 Saved thumbnail to persistent storage: ${key}`);
  } catch (error) {
    console.warn("Failed to save thumbnail to persistent cache:", error);
  }
};

// Remove thumbnail from persistent storage
const removeThumbnailFromPersistentStorage = async (
  mediaId: string,
  timePosition: number
): Promise<void> => {
  if (!persistentCacheAdapter) return;

  try {
    const key = `${mediaId}_${timePosition.toFixed(2)}`;
    await persistentCacheAdapter.remove(key);
  } catch (error) {
    console.warn("Failed to remove thumbnail from persistent cache:", error);
  }
};

// Default options for video thumbnail generation (optimized for performance)
const DEFAULT_VIDEO_THUMBNAIL_OPTIONS: Required<VideoThumbnailOptions> = {
  intervalSeconds: 2, // Generate thumbnail every 2 seconds (reduced from 1)
  maxThumbnails: 20, // Maximum thumbnails per video (reduced from 50)
  thumbnailWidth: 160, // Reduced from 320 for faster generation
  thumbnailHeight: 120, // Reduced from 240 for faster generation
};

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxCacheSize: 500, // Maximum 500 thumbnails in memory
  maxAge: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
};

let cacheConfig = { ...DEFAULT_CACHE_CONFIG };
let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * Detect if video is portrait/vertical (smartphone style)
 */
const isPortraitVideo = (videoWidth: number, videoHeight: number): boolean => {
  const aspectRatio = videoWidth / videoHeight;
  // Consider portrait if aspect ratio is less than 1 (height > width)
  // Common portrait ratios: 9:16 (0.5625), 3:4 (0.75), etc.
  return aspectRatio < 1;
};

/**
 * Get optimized thumbnail dimensions for video aspect ratio
 */
const getOptimizedThumbnailDimensions = (
  videoWidth: number,
  videoHeight: number,
  defaultWidth = 160,
  defaultHeight = 120
): { width: number; height: number } => {
  const videoAspect = videoWidth / videoHeight;

  if (isPortraitVideo(videoWidth, videoHeight)) {
    // For portrait videos (like smartphone recordings)
    // Use taller thumbnails to better showcase the content
    const portraitWidth = Math.round(defaultHeight * 0.6); // 72px for 120px height
    const portraitHeight = defaultHeight; // Keep full height

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📱 Portrait video detected (${videoWidth}x${videoHeight}, ratio: ${videoAspect.toFixed(3)})`
      );
      console.log(
        `🎯 Optimized thumbnail size: ${portraitWidth}x${portraitHeight} (was ${defaultWidth}x${defaultHeight})`
      );
    }

    return { width: portraitWidth, height: portraitHeight };
  }
  if (videoAspect > 2) {
    // For ultra-wide videos (like cinematic 21:9)
    const ultraWideWidth = Math.round(defaultHeight * 2.1); // 252px for 120px height
    const ultraWideHeight = defaultHeight;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🎬 Ultra-wide video detected (${videoWidth}x${videoHeight}, ratio: ${videoAspect.toFixed(3)})`
      );
      console.log(
        `🎯 Optimized thumbnail size: ${ultraWideWidth}x${ultraWideHeight} (was ${defaultWidth}x${defaultHeight})`
      );
    }

    return { width: ultraWideWidth, height: ultraWideHeight };
  }

  // Standard landscape videos (16:9, 4:3, etc.)
  return { width: defaultWidth, height: defaultHeight };
};

/**
 * Native video thumbnail generation using HTML5 Canvas
 * Uses browser's hardware-accelerated video decoding and canvas rendering
 * Enhanced with smart aspect ratio detection for portrait/smartphone videos
 */
const generateNativeVideoThumbnail = async (
  videoFile: File,
  timePosition: number,
  width = 160,
  height = 120
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    // Configure video element
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    // Handle video loading and seeking
    const handleLoadedMetadata = () => {
      // Get optimized dimensions based on video aspect ratio
      const optimizedDimensions = getOptimizedThumbnailDimensions(
        video.videoWidth,
        video.videoHeight,
        width,
        height
      );

      // Update canvas dimensions for optimal display
      canvas.width = optimizedDimensions.width;
      canvas.height = optimizedDimensions.height;

      // Ensure time position is within video duration
      const seekTime = Math.min(timePosition, video.duration - 0.1);
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      try {
        // Use current canvas dimensions (optimized for video aspect ratio)
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate aspect ratio and positioning
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvasWidth / canvasHeight;

        let drawWidth = canvasWidth;
        let drawHeight = canvasHeight;
        let offsetX = 0;
        let offsetY = 0;

        // Maintain aspect ratio with smart letterboxing
        if (videoAspect > canvasAspect) {
          // Video is wider - fit to width
          drawHeight = canvasWidth / videoAspect;
          offsetY = (canvasHeight - drawHeight) / 2;
        } else {
          // Video is taller - fit to height
          drawWidth = canvasHeight * videoAspect;
          offsetX = (canvasWidth - drawWidth) / 2;
        }

        // Clear canvas with appropriate background
        if (isPortraitVideo(video.videoWidth, video.videoHeight)) {
          // Use darker background for portrait videos to emphasize content
          ctx.fillStyle = "#1a1a1a";
        } else {
          // Standard black background for landscape videos
          ctx.fillStyle = "#000000";
        }
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw video frame with optimized positioning
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        // Convert to blob URL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              cleanup();
              resolve(url);
            } else {
              cleanup();
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          "image/jpeg",
          0.8
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    const handleError = (error: Event) => {
      cleanup();
      reject(new Error(`Video loading failed: ${error}`));
    };

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      video.src = "";
      video.load();
    };

    // Set up event listeners
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    // Start loading video
    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Get actual dimensions of a generated thumbnail
 */
const getActualThumbnailDimensions = async (
  thumbnailUrl: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      // Fallback to default dimensions if image fails to load
      resolve({ width: 160, height: 120 });
    };
    img.src = thumbnailUrl;
  });
};

/**
 * Find a nearby cached thumbnail within the specified tolerance
 */
const findNearbyVideoThumbnail = (
  mediaId: string,
  targetTime: number,
  tolerance: number
): VideoThumbnailData | null => {
  if (!videoThumbnailCache[mediaId]) return null;

  let closestThumbnail: VideoThumbnailData | null = null;
  let closestDistance = Infinity;

  // Search through all cached thumbnails for this media
  for (const cacheKey in videoThumbnailCache[mediaId]) {
    if (Object.hasOwn(videoThumbnailCache[mediaId], cacheKey)) {
      const thumbnail = videoThumbnailCache[mediaId][cacheKey];
      const distance = Math.abs(thumbnail.timePosition - targetTime);

      if (distance <= tolerance && distance < closestDistance) {
        closestDistance = distance;
        closestThumbnail = thumbnail;
      }
    }
  }

  return closestThumbnail;
};

/**
 * Generate multiple video thumbnails for a video at different time positions
 */
export const generateVideoThumbnails = async (
  mediaId: string,
  videoFile: File,
  videoDuration: number,
  options: VideoThumbnailOptions = {}
): Promise<VideoThumbnailData[]> => {
  const opts = { ...DEFAULT_VIDEO_THUMBNAIL_OPTIONS, ...options };

  // Calculate time positions for video thumbnail generation
  const timePositions = calculateVideoThumbnailPositions(videoDuration, opts);

  // Initialize cache for this media if it doesn't exist
  if (!videoThumbnailCache[mediaId]) {
    videoThumbnailCache[mediaId] = {};
  }

  const thumbnails: VideoThumbnailData[] = [];

  console.log(
    `🚀 Starting optimized video thumbnail generation for ${mediaId} at ${timePositions.length} positions`
  );

  // Smart cache reuse: check for exact matches first, then find nearby thumbnails
  const cachedThumbnails: VideoThumbnailData[] = [];
  const uncachedPositions: { position: number; index: number }[] = [];

  // First pass: collect exact cached thumbnails
  for (let i = 0; i < timePositions.length; i++) {
    const timePosition = timePositions[i];
    const cacheKey = timePosition.toString();

    if (videoThumbnailCache[mediaId][cacheKey]) {
      videoThumbnailPerformanceMonitor.recordCacheHit();
      cachedThumbnails.push(videoThumbnailCache[mediaId][cacheKey]);
      console.log(
        `💾 Using exact cached video thumbnail ${i + 1}/${timePositions.length} for ${mediaId} at ${timePosition}s`
      );
    } else {
      // Look for nearby cached thumbnails (within 0.5 seconds)
      const nearbyThumbnail = findNearbyVideoThumbnail(
        mediaId,
        timePosition,
        0.5
      );
      if (nearbyThumbnail) {
        videoThumbnailPerformanceMonitor.recordCacheHit();
        // Create a new thumbnail data with the requested time position but reused image
        const reusedThumbnail: VideoThumbnailData = {
          ...nearbyThumbnail,
          timePosition, // Use the requested time position
          lastAccessed: Date.now(),
        };
        cachedThumbnails.push(reusedThumbnail);
        console.log(
          `🔄 Reusing nearby cached thumbnail for ${mediaId} at ${timePosition}s (from ${nearbyThumbnail.timePosition}s)`
        );
      } else {
        videoThumbnailPerformanceMonitor.recordCacheMiss();
        uncachedPositions.push({ position: timePosition, index: i });
      }
    }
  }

  // Add cached thumbnails to results
  thumbnails.push(...cachedThumbnails);

  // Generate uncached thumbnails sequentially for stability
  if (uncachedPositions.length > 0) {
    console.log(
      `🎬 Generating ${uncachedPositions.length} new thumbnails sequentially...`
    );

    for (const { position, index } of uncachedPositions) {
      const cacheKey = position.toString();

      try {
        // Record generation start time for performance monitoring
        const generationStart = performance.now();

        // Generate thumbnail using fast native HTML5 Canvas method
        console.log(
          `⚡ Generating native thumbnail ${index + 1}/${timePositions.length} for ${mediaId} at ${position}s...`
        );
        const url = await generateNativeVideoThumbnail(
          videoFile,
          position,
          opts.thumbnailWidth,
          opts.thumbnailHeight
        );

        // Record generation time
        const generationTime = performance.now() - generationStart;
        videoThumbnailPerformanceMonitor.recordGenerationTime(generationTime);

        const now = Date.now();
        // Get the actual dimensions used (may be optimized for aspect ratio)
        const actualDimensions = await getActualThumbnailDimensions(url);

        const thumbnailData: VideoThumbnailData = {
          timePosition: position,
          url,
          width: actualDimensions.width,
          height: actualDimensions.height,
          createdAt: now,
          lastAccessed: now,
        };

        // Cache the thumbnail with size management
        await addVideoThumbnailToCache(mediaId, cacheKey, thumbnailData);
        thumbnails.push(thumbnailData);

        console.log(
          `⚡ Generated native thumbnail ${index + 1}/${timePositions.length} for ${mediaId} at ${position}s (${generationTime.toFixed(1)}ms) - URL: ${url.substring(0, 50)}...`
        );

        // Small delay between generations to prevent overwhelming FFmpeg
        if (index < uncachedPositions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        // Failed to generate native thumbnail - handle error appropriately

        // Provide helpful information for native video thumbnail errors
        if (error instanceof Error) {
          // Handle specific error types appropriately
          // Canvas context or video loading errors should be handled by the calling code
        }
      }
    }
  }

  const cacheHitRate = (
    ((timePositions.length - uncachedPositions.length) / timePositions.length) *
    100
  ).toFixed(1);
  console.log(
    `🎉 Completed thumbnail generation for ${mediaId}: ${thumbnails.length}/${timePositions.length} successful (${cacheHitRate}% cache hit rate)`
  );
  return thumbnails;
};

/**
 * Calculate optimal time positions for video thumbnail generation
 */
const calculateVideoThumbnailPositions = (
  duration: number,
  options: Required<VideoThumbnailOptions>
): number[] => {
  const positions: number[] = [];
  const { intervalSeconds, maxThumbnails } = options;

  // Calculate thumbnail count based on interval and duration (respects zoom level)
  const calculatedFromInterval = Math.ceil(duration / intervalSeconds);
  const actualThumbnailCount = Math.min(calculatedFromInterval, maxThumbnails);

  // Ensure minimum thumbnails for very short videos
  const finalThumbnailCount = Math.max(2, actualThumbnailCount);

  console.log(
    `🎯 Zoom-responsive thumbnail calculation for ${duration}s video: ${finalThumbnailCount} thumbnails`,
    {
      duration,
      intervalSeconds,
      calculatedFromInterval,
      maxThumbnails,
      finalThumbnailCount,
      zoomAware: true,
    }
  );

  // Always spread thumbnails evenly across the duration for better coverage
  if (finalThumbnailCount <= 1) {
    positions.push(Math.min(duration * 0.1, duration - 0.1)); // 10% into the video
  } else {
    const step = duration / (finalThumbnailCount - 1);
    for (let i = 0; i < finalThumbnailCount; i++) {
      const timePosition = i * step;
      positions.push(Math.min(timePosition, duration - 0.1));
    }
  }

  console.log(
    `📊 Calculated ${positions.length} thumbnail positions for ${duration}s video:`,
    positions
  );
  return positions;
};

/**
 * Add thumbnail to cache with size management
 */
const addVideoThumbnailToCache = async (
  mediaId: string,
  cacheKey: string,
  thumbnailData: VideoThumbnailData
): Promise<void> => {
  // Ensure cache size doesn't exceed limit
  if (cacheSize >= cacheConfig.maxCacheSize) {
    evictOldestVideoThumbnails();
  }

  videoThumbnailCache[mediaId][cacheKey] = thumbnailData;
  cacheSize++;

  // Save to persistent storage
  await saveThumbnailToPersistentStorage(
    mediaId,
    thumbnailData.timePosition,
    thumbnailData
  );
};

/**
 * Evict oldest thumbnails when cache is full
 */
const evictOldestVideoThumbnails = (): void => {
  const allThumbnails: Array<{
    mediaId: string;
    cacheKey: string;
    thumbnail: VideoThumbnailData;
  }> = [];

  // Collect all thumbnails with their metadata
  for (const [mediaId, mediaThumbnails] of Object.entries(
    videoThumbnailCache
  )) {
    for (const [cacheKey, thumbnail] of Object.entries(mediaThumbnails)) {
      allThumbnails.push({ mediaId, cacheKey, thumbnail });
    }
  }

  // Sort by last accessed time (oldest first)
  allThumbnails.sort(
    (a, b) => a.thumbnail.lastAccessed - b.thumbnail.lastAccessed
  );

  // Remove oldest 25% of thumbnails
  const toRemove = Math.ceil(allThumbnails.length * 0.25);
  for (let i = 0; i < toRemove; i++) {
    const { mediaId, cacheKey, thumbnail } = allThumbnails[i];
    URL.revokeObjectURL(thumbnail.url);
    delete videoThumbnailCache[mediaId][cacheKey];
    cacheSize--;

    // Clean up empty media entries
    if (Object.keys(videoThumbnailCache[mediaId]).length === 0) {
      delete videoThumbnailCache[mediaId];
    }
  }

  console.log(`Evicted ${toRemove} old thumbnails from cache`);
};

/**
 * Get the most appropriate thumbnail for a given time position
 */
export const getVideoThumbnailForTime = (
  mediaId: string,
  timePosition: number
): VideoThumbnailData | null => {
  const mediaThumbnails = videoThumbnailCache[mediaId];
  if (!mediaThumbnails) return null;

  // Find the closest thumbnail to the requested time
  let closestThumbnail: VideoThumbnailData | null = null;
  let closestDistance = Infinity;

  for (const thumbnail of Object.values(mediaThumbnails)) {
    const distance = Math.abs(thumbnail.timePosition - timePosition);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestThumbnail = thumbnail;
    }
  }

  // Update last accessed time
  if (closestThumbnail) {
    closestThumbnail.lastAccessed = Date.now();
  }

  return closestThumbnail;
};

/**
 * Get all thumbnails for a media item
 */
export const getVideoThumbnailsForMedia = (
  mediaId: string
): VideoThumbnailData[] => {
  const mediaThumbnails = videoThumbnailCache[mediaId];
  if (!mediaThumbnails) return [];

  return Object.values(mediaThumbnails).sort(
    (a, b) => a.timePosition - b.timePosition
  );
};

/**
 * Clear thumbnails from cache for a specific media item
 */
export const clearVideoThumbnailsForMedia = (mediaId: string): void => {
  const mediaThumbnails = videoThumbnailCache[mediaId];
  if (!mediaThumbnails) return;

  // Revoke all object URLs to prevent memory leaks
  const thumbnailCount = Object.keys(mediaThumbnails).length;
  for (const thumbnail of Object.values(mediaThumbnails)) {
    URL.revokeObjectURL(thumbnail.url);
  }

  delete videoThumbnailCache[mediaId];
  cacheSize -= thumbnailCount;
  console.log(`Cleared ${thumbnailCount} thumbnails for media ${mediaId}`);
};

/**
 * Clear all thumbnails from cache
 */
export const clearAllVideoThumbnails = async (): Promise<void> => {
  for (const mediaId of Object.keys(videoThumbnailCache)) {
    clearVideoThumbnailsForMedia(mediaId);
  }
  cacheSize = 0;

  // Clear persistent storage
  if (persistentCacheAdapter) {
    try {
      await persistentCacheAdapter.clear();
      console.log("Cleared all thumbnails from persistent cache");
    } catch (error) {
      console.warn("Failed to clear persistent cache:", error);
    }
  }

  console.log("Cleared all thumbnails from cache");
};

/**
 * Clean up expired thumbnails
 */
const cleanupExpiredVideoThumbnails = (): void => {
  const now = Date.now();
  let removedCount = 0;

  for (const [mediaId, mediaThumbnails] of Object.entries(
    videoThumbnailCache
  )) {
    const keysToRemove: string[] = [];

    for (const [cacheKey, thumbnail] of Object.entries(mediaThumbnails)) {
      if (now - thumbnail.createdAt > cacheConfig.maxAge) {
        URL.revokeObjectURL(thumbnail.url);
        keysToRemove.push(cacheKey);
        removedCount++;
      }
    }

    // Remove expired thumbnails
    for (const key of keysToRemove) {
      delete mediaThumbnails[key];
      cacheSize--;
    }

    // Clean up empty media entries
    if (Object.keys(mediaThumbnails).length === 0) {
      delete videoThumbnailCache[mediaId];
    }
  }

  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} expired thumbnails`);
  }
};

/**
 * Start automatic cache cleanup
 */
export const startVideoThumbnailCacheCleanup = (): void => {
  if (cleanupIntervalId) return; // Already running

  cleanupIntervalId = setInterval(() => {
    cleanupExpiredVideoThumbnails();
  }, cacheConfig.cleanupInterval);

  console.log("Started automatic video thumbnail cache cleanup");
};

/**
 * Stop automatic cache cleanup
 */
export const stopVideoThumbnailCacheCleanup = (): void => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.log("Stopped automatic video thumbnail cache cleanup");
  }
};

/**
 * Configure cache settings
 */
export const configureVideoThumbnailCache = (
  config: Partial<CacheConfig>
): void => {
  cacheConfig = { ...cacheConfig, ...config };

  // Restart cleanup with new interval if it's running
  if (cleanupIntervalId) {
    stopVideoThumbnailCacheCleanup();
    startVideoThumbnailCacheCleanup();
  }

  console.log("Updated video thumbnail cache configuration:", cacheConfig);
};

/**
 * Get cache statistics
 */
export const getVideoThumbnailCacheStats = () => {
  const mediaCount = Object.keys(videoThumbnailCache).length;

  return {
    mediaCount,
    totalThumbnails: cacheSize,
    averageThumbnailsPerMedia: mediaCount > 0 ? cacheSize / mediaCount : 0,
    maxCacheSize: cacheConfig.maxCacheSize,
    cacheUtilization: (cacheSize / cacheConfig.maxCacheSize) * 100,
    config: { ...cacheConfig },
  };
};

/**
 * Preload thumbnails for a media item (useful for performance)
 */
export const preloadVideoThumbnails = async (
  mediaId: string,
  videoFile: File,
  videoDuration: number,
  options: VideoThumbnailOptions = {}
): Promise<void> => {
  console.log(`Preloading video thumbnails for ${mediaId}...`);
  await generateVideoThumbnails(mediaId, videoFile, videoDuration, options);
  console.log(`Finished preloading video thumbnails for ${mediaId}`);
};

// Initialize cache cleanup and persistent storage on module load
if (typeof window !== "undefined") {
  startVideoThumbnailCacheCleanup();

  // Initialize persistent cache with detailed logging
  console.log("🚀 Initializing video thumbnail persistent cache...");
  initializePersistentCache()
    .then(() => {
      console.log("✅ Persistent cache initialization complete");
      console.log(
        "📊 Cache stats after loading:",
        getVideoThumbnailCacheStats()
      );
    })
    .catch((error) => {
      console.warn(
        "❌ Failed to initialize persistent thumbnail cache:",
        error
      );
    });

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    stopVideoThumbnailCacheCleanup();
    // Note: clearAllVideoThumbnails is now async but beforeunload doesn't wait
    // The persistent cache will remain for next session
  });
}

// Backward compatibility exports (deprecated - use Video* versions)
/** @deprecated Use VideoThumbnailData instead */
export type ThumbnailData = VideoThumbnailData;

/** @deprecated Use CachedMediaVideoThumbnails instead */
export type CachedMediaThumbnails = CachedMediaVideoThumbnails;

/** @deprecated Use VideoThumbnailCache instead */
export type ThumbnailCache = VideoThumbnailCache;

/** @deprecated Use VideoThumbnailOptions instead */
export type DynamicThumbnailOptions = VideoThumbnailOptions;

/** @deprecated Use generateVideoThumbnails instead */
export const generateDynamicThumbnails = generateVideoThumbnails;

/** @deprecated Use getVideoThumbnailForTime instead */
export const getThumbnailForTime = getVideoThumbnailForTime;

/** @deprecated Use getVideoThumbnailsForMedia instead */
export const getThumbnailsForMedia = getVideoThumbnailsForMedia;

/** @deprecated Use clearVideoThumbnailsForMedia instead */
export const clearThumbnailsForMedia = clearVideoThumbnailsForMedia;

/** @deprecated Use clearAllVideoThumbnails instead */
export const clearAllThumbnails = clearAllVideoThumbnails;

/** @deprecated Use startVideoThumbnailCacheCleanup instead */
export const startCacheCleanup = startVideoThumbnailCacheCleanup;

/** @deprecated Use stopVideoThumbnailCacheCleanup instead */
export const stopCacheCleanup = stopVideoThumbnailCacheCleanup;

/** @deprecated Use configureVideoThumbnailCache instead */
export const configureThumbnailCache = configureVideoThumbnailCache;

/** @deprecated Use getVideoThumbnailCacheStats instead */
export const getThumbnailCacheStats = getVideoThumbnailCacheStats;

/** @deprecated Use preloadVideoThumbnails instead */
export const preloadThumbnails = preloadVideoThumbnails;
