/**
 * Memory Monitor and Graceful Degradation System
 * Implements memory usage monitoring and provides graceful degradation for large files
 */

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercent: number;
  availableMemory: number;
}

export interface MemoryWarning {
  level: 'info' | 'warning' | 'critical' | 'error';
  message: string;
  recommendation: string;
  canContinue: boolean;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private warnings: MemoryWarning[] = [];
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  // Memory thresholds (in percentage of available memory)
  private readonly THRESHOLDS = {
    INFO: 50,      // 50% - start monitoring
    WARNING: 70,   // 70% - show warning
    CRITICAL: 85,  // 85% - recommend reducing quality
    ERROR: 95,     // 95% - prevent operation
  };

  private constructor() {}

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Get current memory information
   */
  getMemoryInfo(): MemoryInfo | null {
    if (!this.isMemoryAPISupported()) {
      return null;
    }

    const memory = (performance as any).memory;
    const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercent,
      availableMemory,
    };
  }

  /**
   * Check if memory API is supported
   */
  private isMemoryAPISupported(): boolean {
    return typeof performance !== 'undefined' && 
           (performance as any).memory !== undefined;
  }

  /**
   * Start monitoring memory usage
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    console.log('🔍 Memory monitoring started');
  }

  /**
   * Stop monitoring memory usage
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('🔍 Memory monitoring stopped');
  }

  /**
   * Check current memory usage and generate warnings
   */
  private checkMemoryUsage(): void {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) return;

    const warning = this.evaluateMemoryUsage(memInfo);
    if (warning) {
      this.warnings.push(warning);
      console.warn(`💾 Memory Warning [${warning.level}]:`, warning.message);
    }
  }

  /**
   * Evaluate memory usage and return warning if needed
   */
  private evaluateMemoryUsage(memInfo: MemoryInfo): MemoryWarning | null {
    const { usedPercent } = memInfo;

    if (usedPercent >= this.THRESHOLDS.ERROR) {
      return {
        level: 'error',
        message: `Critical memory usage: ${usedPercent.toFixed(1)}%`,
        recommendation: 'Operation blocked. Please close other tabs or reduce file size.',
        canContinue: false,
      };
    }

    if (usedPercent >= this.THRESHOLDS.CRITICAL) {
      return {
        level: 'critical',
        message: `High memory usage: ${usedPercent.toFixed(1)}%`,
        recommendation: 'Consider reducing video quality or duration to prevent crashes.',
        canContinue: true,
      };
    }

    if (usedPercent >= this.THRESHOLDS.WARNING) {
      return {
        level: 'warning',
        message: `Elevated memory usage: ${usedPercent.toFixed(1)}%`,
        recommendation: 'Monitor memory usage. Consider reducing quality for large files.',
        canContinue: true,
      };
    }

    if (usedPercent >= this.THRESHOLDS.INFO) {
      return {
        level: 'info',
        message: `Memory usage: ${usedPercent.toFixed(1)}%`,
        recommendation: 'Memory usage is being monitored.',
        canContinue: true,
      };
    }

    return null;
  }

  /**
   * Check if file size is safe for processing
   */
  checkFileSafety(fileSizeBytes: number): MemoryWarning | null {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) {
      return {
        level: 'warning',
        message: 'Cannot determine memory usage',
        recommendation: 'Proceed with caution - memory monitoring unavailable',
        canContinue: true,
      };
    }

    const fileSizeMB = fileSizeBytes / 1024 / 1024;
    const availableMemoryMB = memInfo.availableMemory / 1024 / 1024;

    // Estimate memory needed (rough calculation)
    const estimatedMemoryNeeded = fileSizeMB * 3; // 3x file size for processing

    if (estimatedMemoryNeeded > availableMemoryMB) {
      return {
        level: 'error',
        message: `File too large: ${fileSizeMB.toFixed(1)}MB (estimated ${estimatedMemoryNeeded.toFixed(1)}MB needed)`,
        recommendation: 'Reduce file size or close other applications',
        canContinue: false,
      };
    }

    if (estimatedMemoryNeeded > availableMemoryMB * 0.7) {
      return {
        level: 'critical',
        message: `Large file: ${fileSizeMB.toFixed(1)}MB may cause performance issues`,
        recommendation: 'Consider reducing quality or using smaller segments',
        canContinue: true,
      };
    }

    if (fileSizeMB > 100) {
      return {
        level: 'warning',
        message: `Large file: ${fileSizeMB.toFixed(1)}MB detected`,
        recommendation: 'Monitor memory usage during processing',
        canContinue: true,
      };
    }

    return null;
  }

  /**
   * Get recent warnings
   */
  getRecentWarnings(limit: number = 5): MemoryWarning[] {
    return this.warnings.slice(-limit);
  }

  /**
   * Clear all warnings
   */
  clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * Get memory usage summary
   */
  getMemorySummary(): string {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) return 'Memory monitoring unavailable';

    const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
    const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
    const percent = memInfo.usedPercent;

    return `Memory: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${percent.toFixed(1)}%)`;
  }

  /**
   * Check if operation should be allowed based on memory
   */
  canPerformOperation(estimatedMemoryMB: number): boolean {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) return true; // Allow if we can't check

    const availableMemoryMB = memInfo.availableMemory / 1024 / 1024;
    const wouldExceedLimit = estimatedMemoryMB > availableMemoryMB * 0.8;

    return !wouldExceedLimit;
  }
}

// Export singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();

// Utility functions
export function formatMemorySize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

export function estimateVideoMemoryUsage(
  width: number,
  height: number,
  duration: number,
  fps: number = 30
): number {
  // Estimate memory needed for video processing
  const frameSize = width * height * 4; // RGBA
  const totalFrames = duration * fps;
  const bufferMultiplier = 3; // Account for processing buffers
  
  return frameSize * totalFrames * bufferMultiplier;
}

export function getMemoryRecommendation(fileSizeBytes: number): string {
  const fileSizeMB = fileSizeBytes / 1024 / 1024;
  
  if (fileSizeMB > 200) {
    return 'Consider using FFmpeg offline export for large files';
  } else if (fileSizeMB > 100) {
    return 'Monitor memory usage during export';
  } else if (fileSizeMB > 50) {
    return 'File size is acceptable for browser processing';
  } else {
    return 'File size is optimal for browser processing';
  }
}