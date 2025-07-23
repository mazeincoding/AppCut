/**
 * 8GB Memory Limit Monitor
 * 
 * SAFETY: Prevents memory exhaustion and system crashes
 * Based on mermaid diagram: Memory Management Architecture
 */

export interface MemoryStatus {
  currentUsageBytes: number;
  currentUsageGB: number;
  percentageUsed: number;
  availableGB: number;
  status: 'low' | 'medium' | 'high' | 'warning' | 'critical';
  shouldTriggerGC: boolean;
  shouldEmergencyCleanup: boolean;
}

export interface ExportSettings {
  bitrate: number;
  keyFrameInterval: number;
  bufferSize: number;
  parallelEncoders: number;
  qualityLevel: 'low' | 'medium' | 'high';
}

export class MemoryMonitor8GB {
  private readonly MEMORY_LIMIT = 8 * 1024 * 1024 * 1024; // 8GB in bytes
  private readonly WARNING_THRESHOLD = 0.85; // 85% of 8GB (6.8GB)
  private readonly CRITICAL_THRESHOLD = 0.95; // 95% of 8GB (7.6GB)
  
  private frameCount = 0;
  private lastGCTime = 0;
  private imageBitmapCache: Map<string, ImageBitmap> = new Map();
  private videoFrameCache: Map<string, Map<number, ImageBitmap>> = new Map();

  /**
   * Get current memory usage
   * Implements "Current Memory Usage" check from mermaid diagram
   */
  getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    // Fallback estimation based on frame count and caches
    return this.frameCount * 1024 * 1024 + this.estimateCacheSize();
  }

  /**
   * Get memory status with detailed information
   * Used throughout the memory management flow
   */
  getMemoryStatus(): MemoryStatus {
    const currentUsageBytes = this.getCurrentMemoryUsage();
    const currentUsageGB = currentUsageBytes / (1024 * 1024 * 1024);
    const percentageUsed = currentUsageBytes / this.MEMORY_LIMIT;
    const availableGB = 8 - currentUsageGB;

    let status: MemoryStatus['status'];
    if (percentageUsed > this.CRITICAL_THRESHOLD) {
      status = 'critical';
    } else if (percentageUsed > this.WARNING_THRESHOLD) {
      status = 'warning';
    } else if (availableGB > 4) {
      status = 'high';
    } else if (availableGB > 2) {
      status = 'medium';
    } else {
      status = 'low';
    }

    return {
      currentUsageBytes,
      currentUsageGB: Number(currentUsageGB.toFixed(1)),
      percentageUsed: Number((percentageUsed * 100).toFixed(1)),
      availableGB: Number(availableGB.toFixed(1)),
      status,
      shouldTriggerGC: percentageUsed > this.WARNING_THRESHOLD,
      shouldEmergencyCleanup: percentageUsed > this.CRITICAL_THRESHOLD
    };
  }

  /**
   * Check if memory usage requires action
   * Implements decision points from mermaid diagram
   */
  shouldTriggerGC(): boolean {
    return this.getCurrentMemoryUsage() / this.MEMORY_LIMIT > this.WARNING_THRESHOLD;
  }

  isMemoryCritical(): boolean {
    return this.getCurrentMemoryUsage() / this.MEMORY_LIMIT > this.CRITICAL_THRESHOLD;
  }

  /**
   * Get memory usage as user-friendly string
   */
  getMemoryStatusString(): string {
    const status = this.getMemoryStatus();
    return `${status.currentUsageGB}GB / 8GB (${status.percentageUsed}%)`;
  }

  /**
   * Get optimal export settings based on available memory
   * Implements the three memory modes from mermaid diagram
   */
  getOptimalExportSettings(resolution: string, duration: number): ExportSettings {
    const status = this.getMemoryStatus();
    const availableGB = status.availableGB;

    // Low Memory Mode (< 2GB available)
    if (availableGB < 2) {
      return {
        bitrate: resolution === '4K' ? 15_000_000 : 8_000_000,
        keyFrameInterval: 60, // Keyframe every 2 seconds for better compression
        bufferSize: 64 * 1024 * 1024, // 64MB buffer
        parallelEncoders: 1,
        qualityLevel: 'low'
      };
    }
    
    // Medium Memory Mode (2-4GB available) 
    if (availableGB < 4) {
      return {
        bitrate: resolution === '4K' ? 25_000_000 : 12_000_000,
        keyFrameInterval: 30, // Keyframe every second
        bufferSize: 256 * 1024 * 1024, // 256MB buffer
        parallelEncoders: 2,
        qualityLevel: 'medium'
      };
    }
    
    // High Memory Mode (> 4GB available)
    return {
      bitrate: resolution === '4K' ? 40_000_000 : 20_000_000,
      keyFrameInterval: 30,
      bufferSize: 512 * 1024 * 1024, // 512MB buffer
      parallelEncoders: Math.min(4, navigator.hardwareConcurrency || 2),
      qualityLevel: 'high'
    };
  }

  /**
   * Force garbage collection
   * Implements "Force Garbage Collection" from mermaid diagram
   */
  async optimizeMemoryUsage(): Promise<void> {
    const now = performance.now();
    
    // Don't trigger GC too frequently (minimum 5 seconds apart)
    if (now - this.lastGCTime < 5000) {
      return;
    }

    console.log('🧹 Triggering garbage collection to free memory');
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    } else {
      // Create memory pressure to encourage GC
      const dummy = new Array(1000000).fill(0);
      dummy.length = 0;
    }
    
    this.lastGCTime = now;
    
    // Small delay to allow GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Emergency cleanup - clear all caches
   * Implements "Emergency Cleanup" from mermaid diagram
   */
  async emergencyCleanup(): Promise<void> {
    console.warn('🚨 Emergency memory cleanup triggered');
    
    // Clear all caches
    this.clearImageBitmapCache();
    this.clearVideoFrameCache();
    
    // Force aggressive garbage collection
    await this.optimizeMemoryUsage();
    
    // Additional cleanup
    if ('gc' in window) {
      (window as any).gc();
      // Wait longer for emergency GC
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Check memory every N frames during export
   * Implements "Memory Check Every 50 Frames" from mermaid diagram
   */
  async checkMemoryDuringExport(frameNumber: number): Promise<void> {
    this.frameCount = frameNumber;
    
    // Check memory every 50 frames as per mermaid diagram
    if (frameNumber % 50 !== 0) {
      return;
    }

    const status = this.getMemoryStatus();
    
    if (status.shouldEmergencyCleanup) {
      // > 95% of 8GB - Emergency cleanup
      await this.emergencyCleanup();
    } else if (status.shouldTriggerGC) {
      // > 85% of 8GB - Regular GC
      await this.optimizeMemoryUsage();
    }
  }

  /**
   * Clear ImageBitmap cache to free memory
   */
  clearImageBitmapCache(): void {
    for (const bitmap of this.imageBitmapCache.values()) {
      bitmap.close();
    }
    this.imageBitmapCache.clear();
    console.log('🧹 Cleared ImageBitmap cache');
  }

  /**
   * Clear video frame cache to free memory
   */
  clearVideoFrameCache(): void {
    for (const frameCache of this.videoFrameCache.values()) {
      for (const bitmap of frameCache.values()) {
        bitmap.close();
      }
    }
    this.videoFrameCache.clear();
    console.log('🧹 Cleared video frame cache');
  }

  /**
   * Register bitmap in cache (for cleanup tracking)
   */
  registerImageBitmap(id: string, bitmap: ImageBitmap): void {
    this.imageBitmapCache.set(id, bitmap);
  }

  /**
   * Register video frame in cache (for cleanup tracking)
   */
  registerVideoFrame(videoId: string, frameTime: number, bitmap: ImageBitmap): void {
    if (!this.videoFrameCache.has(videoId)) {
      this.videoFrameCache.set(videoId, new Map());
    }
    this.videoFrameCache.get(videoId)!.set(frameTime, bitmap);
  }

  /**
   * Estimate cache memory usage
   */
  private estimateCacheSize(): number {
    const imageBitmapSize = this.imageBitmapCache.size * 1024 * 1024; // Estimate 1MB per image
    let videoFrameSize = 0;
    
    for (const frameCache of this.videoFrameCache.values()) {
      videoFrameSize += frameCache.size * 512 * 1024; // Estimate 512KB per frame
    }
    
    return imageBitmapSize + videoFrameSize;
  }

  /**
   * Get memory usage breakdown for debugging
   */
  getMemoryBreakdown(): {
    total: string;
    estimated: {
      frames: string;
      imageBitmaps: string;
      videoFrames: string;
    };
  } {
    const status = this.getMemoryStatus();
    const frameMemory = this.frameCount * 1024 * 1024;
    const imageBitmapMemory = this.imageBitmapCache.size * 1024 * 1024;
    let videoFrameMemory = 0;
    
    for (const frameCache of this.videoFrameCache.values()) {
      videoFrameMemory += frameCache.size * 512 * 1024;
    }

    return {
      total: `${status.currentUsageGB}GB`,
      estimated: {
        frames: `${(frameMemory / (1024 * 1024)).toFixed(1)}MB`,
        imageBitmaps: `${(imageBitmapMemory / (1024 * 1024)).toFixed(1)}MB (${this.imageBitmapCache.size} items)`,
        videoFrames: `${(videoFrameMemory / (1024 * 1024)).toFixed(1)}MB (${Array.from(this.videoFrameCache.values()).reduce((sum, cache) => sum + cache.size, 0)} frames)`
      }
    };
  }
}