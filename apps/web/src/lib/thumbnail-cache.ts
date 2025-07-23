interface ThumbnailCacheEntry {
  url: string;
  timestamp: number;
  resolution: 'low' | 'medium' | 'high';
  size: number;
  lastAccessed: number;
}

interface VideoThumbnailCache {
  [mediaId: string]: {
    [timestamp: number]: ThumbnailCacheEntry;
  };
}

export class ThumbnailCacheManager {
  private cache: VideoThumbnailCache = {};
  private maxCacheSize = 50 * 1024 * 1024; // 50MB cache limit
  private currentCacheSize = 0;

  constructor() {}

  async cacheThumbnail(
    mediaId: string,
    timestamp: number,
    thumbnailUrl: string,
    resolution: 'low' | 'medium' | 'high'
  ): Promise<void> {
    if (!this.cache[mediaId]) {
      this.cache[mediaId] = {};
    }

    // Estimate size based on resolution
    const sizes = {
      low: 5 * 1024,    // ~5KB for 160x120
      medium: 15 * 1024, // ~15KB for 320x240
      high: 30 * 1024    // ~30KB for 480x360
    };

    const estimatedSize = sizes[resolution];

    // Check if we need to evict items before adding new one
    if (this.currentCacheSize + estimatedSize > this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    // Cache the thumbnail
    this.cache[mediaId][timestamp] = {
      url: thumbnailUrl,
      timestamp,
      resolution,
      size: estimatedSize,
      lastAccessed: Date.now()
    };

    this.currentCacheSize += estimatedSize;
  }

  getThumbnail(mediaId: string, timestamp: number): string | null {
    if (!this.cache[mediaId] || !this.cache[mediaId][timestamp]) {
      return null;
    }

    // Update last accessed time
    this.cache[mediaId][timestamp].lastAccessed = Date.now();
    return this.cache[mediaId][timestamp].url;
  }

  getClosestThumbnail(mediaId: string, timestamp: number): string | null {
    if (!this.cache[mediaId]) {
      return null;
    }

    const timestamps = Object.keys(this.cache[mediaId]).map(Number);
    if (timestamps.length === 0) {
      return null;
    }

    // Find closest timestamp
    let closest = timestamps[0];
    let minDiff = Math.abs(timestamps[0] - timestamp);

    for (const ts of timestamps) {
      const diff = Math.abs(ts - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = ts;
      }
    }

    return this.getThumbnail(mediaId, closest);
  }

  clearVideoCache(mediaId: string): void {
    if (!this.cache[mediaId]) return;

    // Calculate size to subtract
    let sizeToRemove = 0;
    for (const timestamp in this.cache[mediaId]) {
      const entry = this.cache[mediaId][timestamp];
      sizeToRemove += entry.size;
      // Revoke object URLs to free memory
      URL.revokeObjectURL(entry.url);
    }

    delete this.cache[mediaId];
    this.currentCacheSize -= sizeToRemove;
  }

  clearAllCache(): void {
    // Revoke all object URLs
    for (const mediaId in this.cache) {
      for (const timestamp in this.cache[mediaId]) {
        URL.revokeObjectURL(this.cache[mediaId][timestamp].url);
      }
    }

    this.cache = {};
    this.currentCacheSize = 0;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestTime = Date.now();
    let oldestMediaId = '';
    let oldestTimestamp = 0;

    // Find least recently used thumbnail
    for (const mediaId in this.cache) {
      for (const timestamp in this.cache[mediaId]) {
        const entry = this.cache[mediaId][timestamp];
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestMediaId = mediaId;
          oldestTimestamp = Number(timestamp);
        }
      }
    }

    // Evict the oldest entry
    if (oldestMediaId && this.cache[oldestMediaId]) {
      const entry = this.cache[oldestMediaId][oldestTimestamp];
      if (entry) {
        URL.revokeObjectURL(entry.url);
        this.currentCacheSize -= entry.size;
        delete this.cache[oldestMediaId][oldestTimestamp];

        // If no more thumbnails for this video, remove the video entry
        if (Object.keys(this.cache[oldestMediaId]).length === 0) {
          delete this.cache[oldestMediaId];
        }
      }
    }
  }

  getCacheStats(): {
    totalSize: number;
    videoCount: number;
    thumbnailCount: number;
    sizeInMB: number;
  } {
    let thumbnailCount = 0;
    for (const mediaId in this.cache) {
      thumbnailCount += Object.keys(this.cache[mediaId]).length;
    }

    return {
      totalSize: this.currentCacheSize,
      videoCount: Object.keys(this.cache).length,
      thumbnailCount,
      sizeInMB: this.currentCacheSize / (1024 * 1024)
    };
  }
}

// Export singleton instance
export const thumbnailCache = new ThumbnailCacheManager();