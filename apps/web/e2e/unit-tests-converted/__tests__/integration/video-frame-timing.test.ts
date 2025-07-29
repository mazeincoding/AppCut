/**
 * Video Frame Timing Integration Tests
 * Tests frame rate accuracy, frame dropping, and timing consistency
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Video Frame Timing Tests', () => {
  let mockVideoElement: any;
  let mockCanvasContext: any;
  let mockRequestAnimationFrame: jest.Mock;

  beforeEach(() => {
    // Mock video element with frame timing capabilities
    mockVideoElement = {
      currentTime: 0,
      duration: 10,
      videoWidth: 1920,
      videoHeight: 1080,
      playbackRate: 1.0,
      paused: true,
      ended: false,
      readyState: 4,
      
      // Frame timing properties
      getVideoPlaybackQuality: jest.fn().mockReturnValue({
        totalVideoFrames: 600, // 10 seconds at 60fps
        droppedVideoFrames: 0,
        corruptedVideoFrames: 0,
      }),
      
      requestVideoFrameCallback: jest.fn(),
      cancelVideoFrameCallback: jest.fn(),
      
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Mock canvas context for frame rendering
    mockCanvasContext = {
      drawImage: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      clearRect: jest.fn(),
      canvas: {
        width: 1920,
        height: 1080,
        toBlob: jest.fn(),
        toDataURL: jest.fn(),
      },
    };

    // Mock requestAnimationFrame with timing control
    let animationFrameId = 0;
    mockRequestAnimationFrame = jest.fn().mockImplementation(callback => {
      animationFrameId++;
      // Simulate 60fps timing
      setTimeout(() => callback(performance.now()), 16.67);
      return animationFrameId;
    });

    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = jest.fn();

    // Mock performance with high-resolution timing
    global.performance.now = jest.fn().mockReturnValue(0);

    // Mock DOM methods
    global.document.createElement = jest.fn().mockImplementation(tag => {
      if (tag === 'video') return { ...mockVideoElement };
      if (tag === 'canvas') return { 
        getContext: () => mockCanvasContext,
        ...mockCanvasContext.canvas 
      };
      return {};
    });

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Frame Rate Accuracy', () => {
    it('should maintain consistent frame rate during playback', () => {
      const frameRateMonitor = {
        targetFPS: 60,
        frameTimestamps: [] as number[],
        
        recordFrame: (timestamp: number) => {
          frameRateMonitor.frameTimestamps.push(timestamp);
          
          // Keep only recent frames (last 2 seconds worth)
          const maxFrames = frameRateMonitor.targetFPS * 2;
          if (frameRateMonitor.frameTimestamps.length > maxFrames) {
            frameRateMonitor.frameTimestamps.shift();
          }
        },
        
        calculateActualFPS: () => {
          if (frameRateMonitor.frameTimestamps.length < 2) {
            return { insufficient_data: true };
          }
          
          const timestamps = frameRateMonitor.frameTimestamps;
          const intervals = [];
          
          for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
          }
          
          const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
          const actualFPS = 1000 / avgInterval; // Convert ms to FPS
          
          return {
            actualFPS,
            targetFPS: frameRateMonitor.targetFPS,
            accuracy: (actualFPS / frameRateMonitor.targetFPS) * 100,
            avgInterval,
            frameCount: timestamps.length,
          };
        },
        
        analyzeFrameRateStability: () => {
          if (frameRateMonitor.frameTimestamps.length < 10) {
            return { insufficient_data: true };
          }
          
          const timestamps = frameRateMonitor.frameTimestamps;
          const intervals = [];
          
          for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
          }
          
          const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
          const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
          const stdDev = Math.sqrt(variance);
          
          const jitter = stdDev / avgInterval;
          const stability = jitter < 0.05 ? 'excellent' : jitter < 0.1 ? 'good' : jitter < 0.2 ? 'fair' : 'poor';
          
          return {
            avgInterval,
            stdDev,
            jitter,
            stability,
            coefficientOfVariation: jitter,
          };
        },
        
        detectFrameRateChanges: () => {
          if (frameRateMonitor.frameTimestamps.length < 20) {
            return { insufficient_data: true };
          }
          
          const timestamps = frameRateMonitor.frameTimestamps;
          const windowSize = 10;
          const changes = [];
          
          for (let i = windowSize; i < timestamps.length - windowSize; i++) {
            const before = timestamps.slice(i - windowSize, i);
            const after = timestamps.slice(i, i + windowSize);
            
            const beforeFPS = 1000 / (before.reduce((sum, t, idx) => 
              idx > 0 ? sum + (t - before[idx - 1]) : sum, 0) / (before.length - 1));
            const afterFPS = 1000 / (after.reduce((sum, t, idx) => 
              idx > 0 ? sum + (t - after[idx - 1]) : sum, 0) / (after.length - 1));
            
            const change = Math.abs(afterFPS - beforeFPS);
            if (change > 5) { // Significant change: >5 FPS difference
              changes.push({
                timestamp: timestamps[i],
                beforeFPS,
                afterFPS,
                change,
              });
            }
          }
          
          return {
            changes,
            hasSignificantChanges: changes.length > 0,
            stabilityScore: 1 - (changes.length / (timestamps.length / windowSize)),
          };
        },
      };

      // Simulate frame recordings
      let currentTime = 0;
      for (let i = 0; i < 120; i++) { // 2 seconds at 60fps
        currentTime += 16.67 + (Math.random() - 0.5) * 2; // ±1ms jitter
        frameRateMonitor.recordFrame(currentTime);
      }

      // Test FPS calculation
      const fpsResult = frameRateMonitor.calculateActualFPS();
      expect(fpsResult.actualFPS).toBeCloseTo(60, 0);
      expect(fpsResult.accuracy).toBeGreaterThan(95); // Within 5% of target

      // Test stability analysis
      const stability = frameRateMonitor.analyzeFrameRateStability();
      expect(stability.stability).toBeDefined();
      expect(stability.jitter).toBeLessThan(0.2); // Reasonable jitter

      // Test frame rate change detection
      const changes = frameRateMonitor.detectFrameRateChanges();
      expect(changes.stabilityScore).toBeGreaterThan(0.8); // Stable playback
    });

    it('should handle different frame rate configurations', () => {
      const frameRateConfigManager = {
        supportedFrameRates: [24, 25, 30, 48, 50, 60, 120],
        
        validateFrameRate: (fps: number) => {
          const isStandard = frameRateConfigManager.supportedFrameRates.includes(fps);
          const frameDuration = 1000 / fps; // ms per frame
          
          return {
            fps,
            frameDuration,
            isStandard,
            category: frameRateConfigManager.categorizeFrameRate(fps),
            browserCompatible: fps <= 120, // Most browsers support up to 120fps
          };
        },
        
        categorizeFrameRate: (fps: number) => {
          if (fps <= 25) return 'cinema';
          if (fps <= 30) return 'broadcast';
          if (fps <= 60) return 'standard';
          return 'high_refresh';
        },
        
        calculateFrameTimings: (fps: number, duration: number) => {
          const frameDuration = 1 / fps;
          const totalFrames = Math.floor(duration * fps);
          const timings = [];
          
          for (let frame = 0; frame < totalFrames; frame++) {
            timings.push({
              frameNumber: frame,
              timestamp: frame * frameDuration,
              timestampMs: frame * frameDuration * 1000,
            });
          }
          
          return {
            fps,
            duration,
            totalFrames,
            frameDuration,
            timings,
          };
        },
        
        assessPerformanceImpact: (fps: number, resolution: { width: number; height: number }) => {
          const pixelsPerSecond = resolution.width * resolution.height * fps;
          const performanceLevel = frameRateConfigManager.getPerformanceLevel(pixelsPerSecond);
          
          return {
            fps,
            resolution,
            pixelsPerSecond,
            performanceLevel,
            recommendations: frameRateConfigManager.getPerformanceRecommendations(performanceLevel),
          };
        },
        
        getPerformanceLevel: (pixelsPerSecond: number) => {
          if (pixelsPerSecond < 50_000_000) return 'light'; // <50M pixels/sec
          if (pixelsPerSecond < 120_000_000) return 'moderate'; // <120M pixels/sec
          if (pixelsPerSecond < 250_000_000) return 'heavy'; // <250M pixels/sec
          return 'extreme'; // >250M pixels/sec
        },
        
        getPerformanceRecommendations: (level: string) => {
          const recommendations = {
            light: ['Standard settings should work well'],
            moderate: ['Consider hardware acceleration', 'Monitor CPU usage'],
            heavy: ['Enable hardware acceleration', 'Reduce quality if needed', 'Consider frame skipping'],
            extreme: ['Requires high-end hardware', 'Consider reducing frame rate or resolution'],
          };
          
          return recommendations[level] || [];
        },
      };

      // Test different frame rate validations
      const cinema24 = frameRateConfigManager.validateFrameRate(24);
      expect(cinema24.category).toBe('cinema');
      expect(cinema24.isStandard).toBe(true);

      const highRefresh120 = frameRateConfigManager.validateFrameRate(120);
      expect(highRefresh120.category).toBe('high_refresh');
      expect(highRefresh120.browserCompatible).toBe(true);

      // Test frame timing calculations
      const timings60fps = frameRateConfigManager.calculateFrameTimings(60, 1.0); // 1 second
      expect(timings60fps.totalFrames).toBe(60);
      expect(timings60fps.timings[30].timestamp).toBeCloseTo(0.5, 3); // Frame 30 at 0.5 seconds

      // Test performance impact assessment
      const performance4K60 = frameRateConfigManager.assessPerformanceImpact(60, { width: 3840, height: 2160 });
      expect(performance4K60.pixelsPerSecond).toBe(497_664_000); // 4K * 60fps
      expect(performance4K60.performanceLevel).toBe('extreme');
      expect(performance4K60.recommendations).toContain('Requires high-end hardware');
    });

    it('should synchronize frame rate with display refresh rate', () => {
      const displaySyncManager = {
        getDisplayRefreshRate: () => {
          // Mock display refresh rate detection
          return new Promise((resolve) => {
            // Simulate measuring refresh rate
            setTimeout(() => {
              resolve({
                refreshRate: 60.001, // Slightly off from perfect 60Hz
                confidence: 'high',
                measurement_method: 'requestAnimationFrame',
              });
            }, 10);
          });
        },
        
        calculateOptimalFrameRate: (displayRefreshRate: number, contentFrameRate: number) => {
          // Find the best frame rate that divides evenly into display refresh rate
          const divisors = [1, 2, 3, 4, 5, 6];
          const candidates = divisors.map(div => displayRefreshRate / div);
          
          // Find closest to content frame rate
          const closest = candidates.reduce((best, candidate) => {
            const currentDiff = Math.abs(candidate - contentFrameRate);
            const bestDiff = Math.abs(best - contentFrameRate);
            return currentDiff < bestDiff ? candidate : best;
          });
          
          return {
            displayRefreshRate,
            contentFrameRate,
            optimalFrameRate: closest,
            divisor: displayRefreshRate / closest,
            syncAccuracy: Math.abs(closest - contentFrameRate) < 0.1,
          };
        },
        
        createAdaptiveFrameScheduler: (targetFPS: number) => {
          let lastFrameTime = 0;
          const targetInterval = 1000 / targetFPS;
          
          return {
            scheduleNextFrame: (callback: (timestamp: number) => void) => {
              return requestAnimationFrame((timestamp) => {
                const deltaTime = timestamp - lastFrameTime;
                
                // Adaptive timing: skip frame if we're running behind
                if (deltaTime >= targetInterval * 0.9) {
                  callback(timestamp);
                  lastFrameTime = timestamp;
                } else {
                  // Schedule for next frame
                  requestAnimationFrame(callback);
                }
              });
            },
            
            getActualInterval: () => targetInterval,
            reset: () => { lastFrameTime = 0; },
          };
        },
        
        measureSyncQuality: (requestedTimes: number[], actualTimes: number[]) => {
          if (requestedTimes.length !== actualTimes.length) {
            throw new Error('Array lengths must match');
          }
          
          const deviations = requestedTimes.map((requested, i) => 
            Math.abs(actualTimes[i] - requested)
          );
          
          const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
          const maxDeviation = Math.max(...deviations);
          
          return {
            measurements: deviations.length,
            averageDeviation: avgDeviation,
            maxDeviation,
            syncQuality: avgDeviation < 1 ? 'excellent' : avgDeviation < 5 ? 'good' : 'poor',
            onTimePercentage: (deviations.filter(d => d < 2).length / deviations.length) * 100,
          };
        },
      };

      // Test refresh rate detection
      const refreshRatePromise = displaySyncManager.getDisplayRefreshRate();
      expect(refreshRatePromise).toBeInstanceOf(Promise);

      // Test optimal frame rate calculation
      const optimal = displaySyncManager.calculateOptimalFrameRate(60.001, 59.94); // NTSC case
      expect(optimal.optimalFrameRate).toBeCloseTo(60, 1);
      expect(optimal.syncAccuracy).toBe(true);

      // Test adaptive scheduler
      const scheduler = displaySyncManager.createAdaptiveFrameScheduler(60);
      const mockCallback = jest.fn();
      
      scheduler.scheduleNextFrame(mockCallback);
      expect(requestAnimationFrame).toHaveBeenCalled();

      // Test sync quality measurement
      const requested = [0, 16.67, 33.33, 50];
      const actual = [0.5, 16.5, 34, 49.8];
      const quality = displaySyncManager.measureSyncQuality(requested, actual);
      
      expect(quality.syncQuality).toBeDefined();
      expect(quality.onTimePercentage).toBeGreaterThan(0);
    });
  });

  describe('Frame Dropping', () => {
    it('should detect and report dropped frames', () => {
      const frameDropDetector = {
        expectedFrames: 0,
        actualFrames: 0,
        droppedFrames: [] as Array<{expectedTime: number, frameNumber: number}>,
        
        startMonitoring: (fps: number) => {
          frameDropDetector.expectedFrames = 0;
          frameDropDetector.actualFrames = 0;
          frameDropDetector.droppedFrames = [];
          
          return {
            fps,
            startTime: performance.now(),
            expectedInterval: 1000 / fps,
          };
        },
        
        reportFrame: (timestamp: number, frameNumber: number) => {
          frameDropDetector.actualFrames++;
          
          // Check if this frame is on time
          const expectedTime = frameNumber * (1000 / 60); // Assuming 60fps
          const timeDiff = Math.abs(timestamp - expectedTime);
          
          if (timeDiff > 25) { // More than 1.5 frame intervals late
            frameDropDetector.droppedFrames.push({
              expectedTime,
              frameNumber,
            });
          }
        },
        
        calculateDropRate: (duration: number, fps: number) => {
          const expectedTotal = Math.floor(duration * fps);
          const actualTotal = frameDropDetector.actualFrames;
          const dropped = expectedTotal - actualTotal;
          
          return {
            expectedFrames: expectedTotal,
            actualFrames: actualTotal,
            droppedFrames: Math.max(0, dropped),
            dropRate: Math.max(0, dropped) / expectedTotal,
            dropPercentage: (Math.max(0, dropped) / expectedTotal) * 100,
          };
        },
        
        analyzeDropPattern: () => {
          if (frameDropDetector.droppedFrames.length < 2) {
            return { pattern: 'none' };
          }
          
          const gaps = [];
          for (let i = 1; i < frameDropDetector.droppedFrames.length; i++) {
            const gap = frameDropDetector.droppedFrames[i].frameNumber - 
                       frameDropDetector.droppedFrames[i - 1].frameNumber;
            gaps.push(gap);
          }
          
          const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
          const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
          
          let pattern = 'random';
          if (gapVariance < 1) {
            pattern = 'periodic';
          } else if (frameDropDetector.droppedFrames.length > frameDropDetector.actualFrames * 0.1) {
            pattern = 'severe';
          }
          
          return {
            pattern,
            averageGap: avgGap,
            variance: gapVariance,
            severity: frameDropDetector.droppedFrames.length / frameDropDetector.actualFrames,
          };
        },
        
        getPerformanceRecommendations: (dropRate: number) => {
          if (dropRate < 0.01) { // <1% drop rate
            return {
              level: 'excellent',
              recommendations: ['Performance is optimal'],
            };
          }
          
          if (dropRate < 0.05) { // <5% drop rate
            return {
              level: 'good',
              recommendations: [
                'Minor frame drops detected',
                'Monitor system performance',
              ],
            };
          }
          
          if (dropRate < 0.1) { // <10% drop rate
            return {
              level: 'fair',
              recommendations: [
                'Noticeable frame drops',
                'Close other applications',
                'Reduce video quality',
                'Enable hardware acceleration',
              ],
            };
          }
          
          return {
            level: 'poor',
            recommendations: [
              'Severe frame dropping',
              'Reduce frame rate',
              'Lower resolution',
              'Upgrade hardware',
              'Check system resources',
            ],
          };
        },
      };

      // Test monitoring setup
      const monitoring = frameDropDetector.startMonitoring(60);
      expect(monitoring.fps).toBe(60);
      expect(monitoring.expectedInterval).toBeCloseTo(16.67, 2);

      // Simulate frame reporting with some drops
      for (let i = 0; i < 100; i++) {
        if (i % 10 !== 7) { // Drop every 8th frame (frame 7, 17, 27, etc.)
          const timestamp = i * 16.67 + (Math.random() - 0.5) * 2; // ±1ms jitter
          frameDropDetector.reportFrame(timestamp, i);
        }
      }

      // Test drop rate calculation
      const dropRate = frameDropDetector.calculateDropRate(100 / 60, 60); // ~1.67 seconds
      expect(dropRate.dropPercentage).toBeCloseTo(10, 1); // Should be ~10% drops

      // Test pattern analysis
      const pattern = frameDropDetector.analyzeDropPattern();
      expect(pattern.pattern).toBe('periodic'); // Regular pattern of drops

      // Test recommendations
      const recommendations = frameDropDetector.getPerformanceRecommendations(0.1);
      expect(recommendations.level).toBe('fair');
      expect(recommendations.recommendations).toContain('Noticeable frame drops');
    });

    it('should implement frame skipping strategies', () => {
      const frameSkipper = {
        strategy: 'adaptive',
        performanceThreshold: 0.8, // 80% performance threshold
        
        shouldSkipFrame: (currentPerformance: number, frameImportance: number) => {
          const skip = currentPerformance < frameSkipper.performanceThreshold && frameImportance < 0.5;
          
          return {
            skip,
            reason: skip ? 'performance_optimization' : 'frame_important',
            performanceScore: currentPerformance,
            importanceScore: frameImportance,
          };
        },
        
        calculateFrameImportance: (frameNumber: number, keyframes: number[]) => {
          // Key frames are always important
          if (keyframes.includes(frameNumber)) {
            return 1.0;
          }
          
          // Frames near key frames are moderately important
          const nearKeyframe = keyframes.some(kf => Math.abs(frameNumber - kf) <= 2);
          if (nearKeyframe) {
            return 0.7;
          }
          
          // Regular frames have lower importance
          return 0.3;
        },
        
        implementAdaptiveSkipping: (frames: any[], performanceData: number[]) => {
          const results = [];
          let skippedCount = 0;
          
          frames.forEach((frame, index) => {
            const performance = performanceData[index] || 1.0;
            const importance = frameSkipper.calculateFrameImportance(frame.number, [0, 30, 60, 90]);
            
            const decision = frameSkipper.shouldSkipFrame(performance, importance);
            
            if (decision.skip) {
              skippedCount++;
            }
            
            results.push({
              frameNumber: frame.number,
              skipped: decision.skip,
              reason: decision.reason,
              performance,
              importance,
            });
          });
          
          return {
            results,
            totalFrames: frames.length,
            skippedFrames: skippedCount,
            skipRate: skippedCount / frames.length,
            strategy: frameSkipper.strategy,
          };
        },
        
        optimizeSkippingPattern: (skipResults: any) => {
          const consecutive = [];
          let currentConsecutive = 0;
          
          skipResults.results.forEach((result: any) => {
            if (result.skipped) {
              currentConsecutive++;
            } else {
              if (currentConsecutive > 0) {
                consecutive.push(currentConsecutive);
                currentConsecutive = 0;
              }
            }
          });
          
          const maxConsecutive = Math.max(...consecutive, 0);
          const avgConsecutive = consecutive.length > 0 ? 
            consecutive.reduce((sum, c) => sum + c, 0) / consecutive.length : 0;
          
          return {
            maxConsecutiveSkips: maxConsecutive,
            avgConsecutiveSkips: avgConsecutive,
            skipClusters: consecutive.length,
            optimization: maxConsecutive > 5 ? 'reduce_clustering' : 'pattern_acceptable',
          };
        },
      };

      // Test frame importance calculation
      const keyFrameImportance = frameSkipper.calculateFrameImportance(30, [0, 30, 60, 90]);
      expect(keyFrameImportance).toBe(1.0);

      const nearKeyFrameImportance = frameSkipper.calculateFrameImportance(32, [0, 30, 60, 90]);
      expect(nearKeyFrameImportance).toBe(0.7);

      const regularFrameImportance = frameSkipper.calculateFrameImportance(45, [0, 30, 60, 90]);
      expect(regularFrameImportance).toBe(0.3);

      // Test skip decision
      const shouldSkip = frameSkipper.shouldSkipFrame(0.6, 0.3); // Low performance, low importance
      expect(shouldSkip.skip).toBe(true);

      const shouldNotSkip = frameSkipper.shouldSkipFrame(0.9, 1.0); // Good performance, high importance
      expect(shouldNotSkip.skip).toBe(false);

      // Test adaptive skipping implementation
      const frames = Array.from({ length: 100 }, (_, i) => ({ number: i }));
      const performance = Array.from({ length: 100 }, () => Math.random()); // Random performance
      
      const skipResults = frameSkipper.implementAdaptiveSkipping(frames, performance);
      expect(skipResults.totalFrames).toBe(100);
      expect(skipResults.skippedFrames).toBeGreaterThanOrEqual(0);
      expect(skipResults.skipRate).toBeLessThanOrEqual(1);

      // Test pattern optimization
      const optimization = frameSkipper.optimizeSkippingPattern(skipResults);
      expect(optimization.optimization).toBeDefined();
    });
  });

  describe('Timing Consistency', () => {
    it('should maintain consistent frame intervals', () => {
      const consistencyAnalyzer = {
        frameIntervals: [] as number[],
        targetInterval: 16.67, // 60fps
        
        recordFrameInterval: (timestamp: number, previousTimestamp: number) => {
          const interval = timestamp - previousTimestamp;
          consistencyAnalyzer.frameIntervals.push(interval);
          
          // Keep only recent intervals
          if (consistencyAnalyzer.frameIntervals.length > 300) { // 5 seconds at 60fps
            consistencyAnalyzer.frameIntervals.shift();
          }
        },
        
        analyzeConsistency: () => {
          if (consistencyAnalyzer.frameIntervals.length < 10) {
            return { insufficient_data: true };
          }
          
          const intervals = consistencyAnalyzer.frameIntervals;
          const target = consistencyAnalyzer.targetInterval;
          
          const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
          const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
          const stdDev = Math.sqrt(variance);
          
          const deviations = intervals.map(interval => Math.abs(interval - target));
          const maxDeviation = Math.max(...deviations);
          const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
          
          const consistency = stdDev / mean; // Coefficient of variation
          const accuracy = 1 - (avgDeviation / target);
          
          return {
            mean,
            stdDev,
            variance,
            maxDeviation,
            avgDeviation,
            consistency,
            accuracy,
            grade: consistencyAnalyzer.gradeConsistency(consistency, accuracy),
          };
        },
        
        gradeConsistency: (consistency: number, accuracy: number) => {
          if (consistency < 0.05 && accuracy > 0.95) return 'excellent';
          if (consistency < 0.1 && accuracy > 0.9) return 'good';
          if (consistency < 0.2 && accuracy > 0.8) return 'fair';
          return 'poor';
        },
        
        detectAnomalies: (threshold: number = 2.0) => {
          if (consistencyAnalyzer.frameIntervals.length < 10) {
            return { insufficient_data: true };
          }
          
          const intervals = consistencyAnalyzer.frameIntervals;
          const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
          const stdDev = Math.sqrt(
            intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length
          );
          
          const anomalies = intervals.map((interval, index) => {
            const zScore = Math.abs(interval - mean) / stdDev;
            return {
              index,
              interval,
              zScore,
              isAnomaly: zScore > threshold,
              severity: zScore > 3 ? 'severe' : zScore > 2 ? 'moderate' : 'mild',
            };
          }).filter(item => item.isAnomaly);
          
          return {
            anomalies,
            anomalyRate: anomalies.length / intervals.length,
            totalAnomalies: anomalies.length,
            severeAnomalies: anomalies.filter(a => a.severity === 'severe').length,
          };
        },
        
        generateConsistencyReport: () => {
          const analysis = consistencyAnalyzer.analyzeConsistency();
          const anomalies = consistencyAnalyzer.detectAnomalies();
          
          if (analysis.insufficient_data || anomalies.insufficient_data) {
            return { error: 'Insufficient data for analysis' };
          }
          
          return {
            summary: {
              grade: analysis.grade,
              accuracy: (analysis.accuracy * 100).toFixed(1) + '%',
              consistency: (analysis.consistency * 100).toFixed(1) + '%',
            },
            metrics: {
              meanInterval: analysis.mean.toFixed(2) + 'ms',
              standardDeviation: analysis.stdDev.toFixed(2) + 'ms',
              maxDeviation: analysis.maxDeviation.toFixed(2) + 'ms',
            },
            anomalies: {
              total: anomalies.totalAnomalies,
              rate: (anomalies.anomalyRate * 100).toFixed(1) + '%',
              severe: anomalies.severeAnomalies,
            },
            recommendations: consistencyAnalyzer.getRecommendations(analysis.grade, anomalies.anomalyRate),
          };
        },
        
        getRecommendations: (grade: string, anomalyRate: number) => {
          const recommendations = [];
          
          if (grade === 'poor') {
            recommendations.push('Consider reducing frame rate');
            recommendations.push('Check system performance');
            recommendations.push('Enable hardware acceleration');
          }
          
          if (anomalyRate > 0.1) {
            recommendations.push('High variability detected');
            recommendations.push('Check for background processes');
            recommendations.push('Monitor system resources');
          }
          
          if (grade === 'excellent' && anomalyRate < 0.05) {
            recommendations.push('Performance is optimal');
          }
          
          return recommendations.length > 0 ? recommendations : ['No specific recommendations'];
        },
      };

      // Simulate frame intervals with some variation
      let previousTime = 0;
      for (let i = 0; i < 60; i++) { // 1 second of frames
        const baseInterval = 16.67;
        const jitter = (Math.random() - 0.5) * 4; // ±2ms jitter
        const currentTime = previousTime + baseInterval + jitter;
        
        if (i > 0) {
          consistencyAnalyzer.recordFrameInterval(currentTime, previousTime);
        }
        previousTime = currentTime;
      }

      // Test consistency analysis
      const analysis = consistencyAnalyzer.analyzeConsistency();
      expect(analysis.insufficient_data).toBeUndefined();
      expect(analysis.grade).toBeDefined();
      expect(analysis.accuracy).toBeGreaterThan(0);

      // Test anomaly detection
      const anomalies = consistencyAnalyzer.detectAnomalies();
      expect(anomalies.insufficient_data).toBeUndefined();
      expect(anomalies.anomalyRate).toBeGreaterThanOrEqual(0);

      // Test consistency report
      const report = consistencyAnalyzer.generateConsistencyReport();
      expect(report.error).toBeUndefined();
      expect(report.summary.grade).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should handle timing under different system loads', () => {
      const loadTester = {
        simulateSystemLoad: (loadLevel: 'low' | 'medium' | 'high' | 'extreme') => {
          const loadFactors = {
            low: { cpuUsage: 0.2, memoryPressure: 0.1, jitterMultiplier: 1 },
            medium: { cpuUsage: 0.5, memoryPressure: 0.3, jitterMultiplier: 2 },
            high: { cpuUsage: 0.8, memoryPressure: 0.6, jitterMultiplier: 4 },
            extreme: { cpuUsage: 0.95, memoryPressure: 0.9, jitterMultiplier: 8 },
          };
          
          return loadFactors[loadLevel];
        },
        
        measureTimingUnderLoad: (loadLevel: string, frameCount: number = 60) => {
          const load = loadTester.simulateSystemLoad(loadLevel as any);
          const measurements = [];
          
          let currentTime = 0;
          const targetInterval = 16.67; // 60fps
          
          for (let i = 0; i < frameCount; i++) {
            // Simulate load impact on timing
            const baseJitter = (Math.random() - 0.5) * 2; // Base ±1ms
            const loadJitter = (Math.random() - 0.5) * load.jitterMultiplier * 5; // Load-dependent jitter
            const cpuDelay = Math.random() < load.cpuUsage ? Math.random() * 10 : 0; // CPU spike delay
            
            const actualInterval = targetInterval + baseJitter + loadJitter + cpuDelay;
            currentTime += actualInterval;
            
            measurements.push({
              frameNumber: i,
              timestamp: currentTime,
              interval: actualInterval,
              targetInterval,
              deviation: Math.abs(actualInterval - targetInterval),
              loadLevel,
            });
          }
          
          return measurements;
        },
        
        analyzeLoadImpact: (measurements: any[]) => {
          const intervals = measurements.map(m => m.interval);
          const deviations = measurements.map(m => m.deviation);
          
          const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
          const maxDeviation = Math.max(...deviations);
          const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
          
          const targetFPS = 1000 / 16.67;
          const actualFPS = 1000 / avgInterval;
          const fpsLoss = targetFPS - actualFPS;
          
          const stability = measurements.filter(m => m.deviation < 5).length / measurements.length;
          
          return {
            loadLevel: measurements[0]?.loadLevel,
            avgInterval,
            maxDeviation,
            avgDeviation,
            targetFPS,
            actualFPS,
            fpsLoss,
            stability,
            performanceScore: Math.max(0, 1 - (avgDeviation / 16.67)),
          };
        },
        
        compareLoadLevels: () => {
          const loadLevels = ['low', 'medium', 'high', 'extreme'];
          const results = [];
          
          loadLevels.forEach(level => {
            const measurements = loadTester.measureTimingUnderLoad(level, 30);
            const analysis = loadTester.analyzeLoadImpact(measurements);
            results.push(analysis);
          });
          
          return {
            results,
            comparison: {
              bestPerformance: results.reduce((best, current) => 
                current.performanceScore > best.performanceScore ? current : best
              ),
              worstPerformance: results.reduce((worst, current) => 
                current.performanceScore < worst.performanceScore ? current : worst
              ),
              performanceDrop: results[results.length - 1].performanceScore - results[0].performanceScore,
            },
          };
        },
      };

      // Test load simulation
      const lowLoad = loadTester.simulateSystemLoad('low');
      expect(lowLoad.cpuUsage).toBe(0.2);
      expect(lowLoad.jitterMultiplier).toBe(1);

      const extremeLoad = loadTester.simulateSystemLoad('extreme');
      expect(extremeLoad.cpuUsage).toBe(0.95);
      expect(extremeLoad.jitterMultiplier).toBe(8);

      // Test timing measurement under load
      const lowLoadMeasurements = loadTester.measureTimingUnderLoad('low', 30);
      expect(lowLoadMeasurements).toHaveLength(30);
      expect(lowLoadMeasurements[0].loadLevel).toBe('low');

      // Test load impact analysis
      const lowLoadAnalysis = loadTester.analyzeLoadImpact(lowLoadMeasurements);
      expect(lowLoadAnalysis.performanceScore).toBeGreaterThan(0);
      expect(lowLoadAnalysis.actualFPS).toBeLessThanOrEqual(60);

      // Test load level comparison
      const comparison = loadTester.compareLoadLevels();
      expect(comparison.results).toHaveLength(4);
      expect(comparison.comparison.bestPerformance.performanceScore).toBeGreaterThanOrEqual(
        comparison.comparison.worstPerformance.performanceScore
      );
    });
  });
});