import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { MemoryMonitor } from '../../lib/memory-monitor';

describe('Load Testing', () => {
  let exportEngine: ExportEngine;
  let memoryMonitor: MemoryMonitor;
  let originalPerformance: any;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    memoryMonitor = new MemoryMonitor();
    
    // Mock performance API
    originalPerformance = global.performance;
    global.performance = {
      now: jest.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 50000000, // 50MB
        totalJSHeapSize: 100000000, // 100MB
        jsHeapSizeLimit: 2000000000 // 2GB
      }
    } as any;
  });

  afterEach(() => {
    global.performance = originalPerformance;
    jest.clearAllMocks();
  });

  describe('Server resource usage', () => {
    it('should monitor CPU usage during exports', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 60000,
            src: 'test-video.mp4'
          }
        ],
        duration: 60000
      };

      const cpuMonitor = jest.fn();
      memoryMonitor.onCpuUsage = cpuMonitor;

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        monitorResources: true
      });

      expect(cpuMonitor).toHaveBeenCalled();
      const cpuUsage = cpuMonitor.mock.calls[0][0];
      expect(cpuUsage.percentage).toBeGreaterThan(0);
      expect(cpuUsage.percentage).toBeLessThanOrEqual(100);
    });

    it('should monitor memory usage during exports', async () => {
      const timeline = {
        elements: Array.from({ length: 10 }, (_, i) => ({
          id: `${i + 1}`,
          type: 'video',
          startTime: i * 6000,
          duration: 6000,
          src: `video-${i + 1}.mp4`
        })),
        duration: 60000
      };

      const memoryUsageBefore = performance.memory.usedJSHeapSize;
      
      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        monitorResources: true
      });

      expect(result.resourceUsage.peakMemoryUsage).toBeGreaterThan(memoryUsageBefore);
      expect(result.resourceUsage.memoryLeaks).toBe(false);
    });

    it('should track disk I/O during exports', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 120000, // 2 minutes
            src: 'large-video.mp4'
          }
        ],
        duration: 120000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        monitorResources: true
      });

      expect(result.resourceUsage.diskReads).toBeGreaterThan(0);
      expect(result.resourceUsage.diskWrites).toBeGreaterThan(0);
      expect(result.resourceUsage.totalIOTime).toBeGreaterThan(0);
    });

    it('should handle resource constraints gracefully', async () => {
      // Simulate low memory condition
      global.performance.memory.usedJSHeapSize = 1800000000; // 1.8GB
      global.performance.memory.totalJSHeapSize = 2000000000; // 2GB

      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 300000, // 5 minutes
            src: 'large-video.mp4'
          }
        ],
        duration: 300000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium', // Reduced quality due to constraints
        adaptToResources: true
      });

      expect(result.metadata.qualityReduced).toBe(true);
      expect(result.metadata.adaptedToResources).toBe(true);
    });
  });

  describe('Scalability limits', () => {
    it('should handle maximum concurrent exports', async () => {
      const maxConcurrentExports = 5;
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'test-video.mp4'
          }
        ],
        duration: 30000
      };

      // Start multiple exports concurrently
      const exportPromises = Array.from({ length: maxConcurrentExports + 2 }, (_, i) =>
        exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'low',
          exportId: `export-${i + 1}`
        }).catch(error => ({ error, exportId: `export-${i + 1}` }))
      );

      const results = await Promise.all(exportPromises);
      
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);

      expect(successful.length).toBeLessThanOrEqual(maxConcurrentExports);
      expect(failed.length).toBeGreaterThan(0);
      
      failed.forEach(failure => {
        expect(failure.error.message).toContain('concurrent limit');
      });
    });

    it('should queue exports when at capacity', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 15000,
            src: 'test-video.mp4'
          }
        ],
        duration: 15000
      };

      const queuedExports = 8;
      const startTime = Date.now();

      const exportPromises = Array.from({ length: queuedExports }, (_, i) =>
        exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'low',
          exportId: `queued-${i + 1}`,
          enableQueue: true
        })
      );

      const results = await Promise.all(exportPromises);
      const endTime = Date.now();

      // All exports should complete successfully
      results.forEach(result => {
        expect(result.blob).toBeInstanceOf(Blob);
      });

      // Should take longer than a single export due to queuing
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThan(15000); // More than one export duration
    });

    it('should handle large timeline complexity', async () => {
      // Create a complex timeline with many elements
      const complexTimeline = {
        elements: [
          // 20 video tracks
          ...Array.from({ length: 20 }, (_, i) => ({
            id: `video-${i + 1}`,
            type: 'video',
            startTime: i * 3000,
            duration: 6000,
            src: `video-${i + 1}.mp4`,
            effects: ['fade', 'scale', 'rotate']
          })),
          // 10 audio tracks
          ...Array.from({ length: 10 }, (_, i) => ({
            id: `audio-${i + 1}`,
            type: 'audio',
            startTime: i * 6000,
            duration: 12000,
            src: `audio-${i + 1}.mp3`,
            effects: ['volume', 'fade']
          })),
          // 30 image overlays
          ...Array.from({ length: 30 }, (_, i) => ({
            id: `image-${i + 1}`,
            type: 'image',
            startTime: i * 2000,
            duration: 4000,
            src: `overlay-${i + 1}.png`,
            effects: ['opacity', 'position']
          }))
        ],
        duration: 60000
      };

      const result = await exportEngine.exportVideo({
        timeline: complexTimeline,
        format: 'mp4',
        quality: 'medium',
        optimizeComplexity: true
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.elementsProcessed).toBe(60);
      expect(result.metadata.complexityOptimized).toBe(true);
    });

    it('should handle memory pressure during large exports', async () => {
      const largeTimeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 600000, // 10 minutes
            src: '4k-video.mp4',
            metadata: {
              resolution: '3840x2160',
              bitrate: 50000000 // 50 Mbps
            }
          }
        ],
        duration: 600000
      };

      // Simulate memory pressure
      const memoryPressureCallback = jest.fn();
      memoryMonitor.onMemoryPressure = memoryPressureCallback;

      const result = await exportEngine.exportVideo({
        timeline: largeTimeline,
        format: 'mp4',
        quality: 'high',
        handleMemoryPressure: true,
        chunkSize: 30000 // Process in 30-second chunks
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.processedInChunks).toBe(true);
      expect(result.metadata.chunkCount).toBeGreaterThan(1);
    });
  });

  describe('Performance benchmarks', () => {
    it('should meet export speed benchmarks', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 60000, // 1 minute
            src: 'benchmark-video.mp4'
          }
        ],
        duration: 60000
      };

      const startTime = performance.now();
      
      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      const exportTime = performance.now() - startTime;
      const realTimeRatio = exportTime / 60000; // Export time vs video duration

      expect(result.blob).toBeInstanceOf(Blob);
      expect(realTimeRatio).toBeLessThan(2.0); // Should export faster than 2x real-time
      expect(result.metadata.exportSpeed).toBeDefined();
    });

    it('should maintain consistent performance across multiple exports', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'consistency-test.mp4'
          }
        ],
        duration: 30000
      };

      const exportTimes: number[] = [];
      const numTests = 5;

      for (let i = 0; i < numTests; i++) {
        const startTime = performance.now();
        
        await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium',
          testRun: i + 1
        });

        exportTimes.push(performance.now() - startTime);
      }

      // Calculate coefficient of variation (std dev / mean)
      const mean = exportTimes.reduce((a, b) => a + b) / exportTimes.length;
      const variance = exportTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / exportTimes.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      // Performance should be consistent (CV < 0.3)
      expect(coefficientOfVariation).toBeLessThan(0.3);
    });

    it('should scale performance with hardware capabilities', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 60000,
            src: 'scaling-test.mp4'
          }
        ],
        duration: 60000
      };

      // Test with different thread counts
      const threadCounts = [1, 2, 4, 8];
      const performanceResults: { threads: number; time: number }[] = [];

      for (const threads of threadCounts) {
        const startTime = performance.now();
        
        await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium',
          threadCount: threads
        });

        const exportTime = performance.now() - startTime;
        performanceResults.push({ threads, time: exportTime });
      }

      // Performance should improve with more threads (up to a point)
      const singleThreadTime = performanceResults.find(r => r.threads === 1)?.time || 0;
      const multiThreadTime = performanceResults.find(r => r.threads === 4)?.time || 0;
      
      expect(multiThreadTime).toBeLessThan(singleThreadTime);
    });
  });
});