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
    
    // Override memory calculation to allow up to 8GB files
    // Use larger threshold instead of browser's restrictive jsHeapSizeLimit
    const maxAllowedMemoryMB = 8 * 1024; // 8GB threshold
    const availableMemoryMB = Math.max(
      memInfo.availableMemory / 1024 / 1024, // Browser's available memory
      maxAllowedMemoryMB * 0.6 // Assume 60% of 8GB is available (4.8GB)
    );

    // Estimate memory needed (rough calculation)
    const estimatedMemoryNeeded = fileSizeMB * 3; // 3x file size for processing

    console.log(`🔍 MEMORY-MONITOR: File size check for ${fileSizeMB.toFixed(1)}MB file:`, {
      estimatedMemoryNeeded: estimatedMemoryNeeded.toFixed(1) + 'MB',
      browserAvailableMemory: (memInfo.availableMemory / 1024 / 1024).toFixed(1) + 'MB',
      overrideAvailableMemory: availableMemoryMB.toFixed(1) + 'MB',
      maxAllowedMemory: maxAllowedMemoryMB + 'MB'
    });

    // Block only files requiring more than 8GB (processing > 2.67GB files)
    if (fileSizeMB > 2.67 * 1024) { // ~2.67GB * 3 = 8GB processing memory
      return {
        level: 'error',
        message: `File too large: ${fileSizeMB.toFixed(1)}MB exceeds 8GB processing limit`,
        recommendation: 'Use desktop app or compress video for files this large',
        canContinue: false,
      };
    }

    // High risk warning for large files (4GB+ processing memory needed)
    if (estimatedMemoryNeeded > 4 * 1024) { // 4GB
      return {
        level: 'critical',
        message: `Large file: ${fileSizeMB.toFixed(1)}MB requires ${estimatedMemoryNeeded.toFixed(1)}MB processing memory`,
        recommendation: 'Consider reducing quality or duration. May cause performance issues.',
        canContinue: true,
      };
    }

    // Warning for medium-large files (2GB+ processing memory needed)
    if (estimatedMemoryNeeded > 2 * 1024) { // 2GB
      return {
        level: 'warning',
        message: `Large file: ${fileSizeMB.toFixed(1)}MB requires ${estimatedMemoryNeeded.toFixed(1)}MB processing memory`,
        recommendation: 'Monitor memory usage during processing. Close other tabs if needed.',
        canContinue: true,
      };
    }

    // Info for moderately large files
    if (fileSizeMB > 500) { // 500MB
      return {
        level: 'info',
        message: `Processing ${fileSizeMB.toFixed(1)}MB file (estimated ${estimatedMemoryNeeded.toFixed(1)}MB memory needed)`,
        recommendation: 'File size is acceptable for browser processing',
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
  const bufferMultiplier = 0.5; // More realistic buffer for browser processing
  
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