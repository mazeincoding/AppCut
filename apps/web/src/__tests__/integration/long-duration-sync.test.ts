/**
 * Long Duration Sync Integration Tests
 * Tests 5+ minute exports, sync drift over time, and correction mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Long Duration Sync Tests', () => {
  let mockAudioContext: any;
  let mockMediaElement: any;
  let mockPerformance: any;

  beforeEach(() => {
    // Mock AudioContext for long-duration testing
    mockAudioContext = {
      sampleRate: 48000,
      currentTime: 0,
      baseLatency: 0.005,
      outputLatency: 0.010,
      destination: {},
      createBuffer: jest.fn(),
      createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      }),
      createGain: jest.fn().mockReturnValue({
        gain: { value: 1.0 },
        connect: jest.fn(),
      }),
      createAnalyser: jest.fn().mockReturnValue({
        fftSize: 2048,
        connect: jest.fn(),
      }),
    };

    // Mock media element for long videos
    mockMediaElement = {
      duration: 300, // 5 minutes
      currentTime: 0,
      videoWidth: 1920,
      videoHeight: 1080,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getVideoPlaybackQuality: jest.fn().mockReturnValue({
        totalVideoFrames: 9000, // 5 min * 30fps
        droppedVideoFrames: 0,
        corruptedVideoFrames: 0,
      }),
    };

    // Mock high-resolution timer
    mockPerformance = {
      now: jest.fn().mockReturnValue(0),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn().mockReturnValue([]),
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    global.performance = mockPerformance;

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('5+ Minute Exports', () => {
    it('should handle long duration export scenarios', () => {
      const longDurationManager = {
        createLongExportScenario: (durationMinutes: number) => {
          const durationSeconds = durationMinutes * 60;
          const frameRate = 30;
          const sampleRate = 48000;
          
          return {
            duration: durationSeconds,
            video: {
              frameRate,
              totalFrames: durationSeconds * frameRate,
              keyFrameInterval: 30, // Every 1 second
              expectedFileSize: durationSeconds * 2.5 * 1024 * 1024, // ~2.5MB per second estimate
            },
            audio: {
              sampleRate,
              totalSamples: durationSeconds * sampleRate,
              channels: 2,
              expectedFileSize: durationSeconds * 176.4 * 1024, // CD quality estimate
            },
            challenges: [
              'memory_accumulation',
              'drift_accumulation', 
              'performance_degradation',
              'browser_resource_limits',
            ],
          };
        },

        estimateResourceRequirements: (scenario: any) => {
          const baseMemoryMB = 100; // Base memory requirement
          const memoryPerMinute = 50; // Additional memory per minute
          const durationMinutes = scenario.duration / 60;
          
          return {
            peakMemoryMB: baseMemoryMB + (memoryPerMinute * durationMinutes),
            avgMemoryMB: baseMemoryMB + (memoryPerMinute * durationMinutes * 0.7),
            processingTime: durationMinutes * 1.2, // 20% overhead
            recommendedMinRAM: Math.max(4096, (baseMemoryMB + memoryPerMinute * durationMinutes) * 2),
            browserLimits: {
              chrome: { maxMemoryMB: 4096, stable: durationMinutes <= 15 },
              firefox: { maxMemoryMB: 3072, stable: durationMinutes <= 12 },
              safari: { maxMemoryMB: 2048, stable: durationMinutes <= 8 },
            },
          };
        },

        implementProgressiveProcessing: (scenario: any) => {
          const chunkSizeMinutes = 2; // Process in 2-minute chunks
          const chunkSizeSeconds = chunkSizeMinutes * 60;
          const totalChunks = Math.ceil(scenario.duration / chunkSizeSeconds);
          
          const chunks = [];
          for (let i = 0; i < totalChunks; i++) {
            const startTime = i * chunkSizeSeconds;
            const endTime = Math.min((i + 1) * chunkSizeSeconds, scenario.duration);
            const actualDuration = endTime - startTime;
            
            chunks.push({
              index: i,
              startTime,
              endTime,
              duration: actualDuration,
              videoFrames: actualDuration * scenario.video.frameRate,
              audioSamples: actualDuration * scenario.audio.sampleRate,
              estimatedMemoryMB: 50 + (actualDuration / 60) * 25,
              processingOrder: i,
            });
          }
          
          return {
            strategy: 'progressive_chunks',
            totalChunks,
            chunkDuration: chunkSizeMinutes,
            chunks,
            memoryOptimization: 'release_after_processing',
            mergeStrategy: 'streaming_concat',
          };
        },

        validateLongExportFeasibility: (durationMinutes: number, systemSpecs: any) => {
          const scenario = longDurationManager.createLongExportScenario(durationMinutes);
          const requirements = longDurationManager.estimateResourceRequirements(scenario);
          
          const validation = {
            feasible: true,
            warnings: [] as string[],
            recommendations: [] as string[],
            limitations: [] as string[],
          };

          if (requirements.peakMemoryMB > systemSpecs.availableMemoryMB) {
            validation.feasible = false;
            validation.limitations.push(`Requires ${requirements.peakMemoryMB}MB, only ${systemSpecs.availableMemoryMB}MB available`);
          }

          if (durationMinutes > 10) {
            validation.warnings.push('Exports over 10 minutes may experience browser stability issues');
            validation.recommendations.push('Consider splitting into multiple shorter exports');
          }

          if (durationMinutes > 20) {
            validation.feasible = false;
            validation.limitations.push('Exports over 20 minutes not recommended for browser-based processing');
          }

          return validation;
        },
      };

      // Test 5-minute export scenario
      const fiveMinScenario = longDurationManager.createLongExportScenario(5);
      expect(fiveMinScenario.duration).toBe(300);
      expect(fiveMinScenario.video.totalFrames).toBe(9000);
      expect(fiveMinScenario.audio.totalSamples).toBe(14400000); // 300s * 48000

      // Test resource estimation
      const requirements = longDurationManager.estimateResourceRequirements(fiveMinScenario);
      expect(requirements.peakMemoryMB).toBe(350); // 100 + 50*5
      expect(requirements.processingTime).toBe(6); // 5 * 1.2
      expect(requirements.browserLimits.chrome.stable).toBe(true); // 5 min <= 15 min

      // Test progressive processing
      const processing = longDurationManager.implementProgressiveProcessing(fiveMinScenario);
      expect(processing.totalChunks).toBe(3); // Ceil(5/2) = 3 chunks
      expect(processing.chunks[0].duration).toBe(120); // 2 minutes
      expect(processing.chunks[2].duration).toBe(60); // Last chunk 1 minute

      // Test feasibility validation
      const systemSpecs = { availableMemoryMB: 2048 };
      const validation = longDurationManager.validateLongExportFeasibility(5, systemSpecs);
      expect(validation.feasible).toBe(true);
      expect(validation.warnings).toHaveLength(0);

      // Test infeasible scenario
      const bigValidation = longDurationManager.validateLongExportFeasibility(25, systemSpecs);
      expect(bigValidation.feasible).toBe(false);
      expect(bigValidation.limitations).toContain('Exports over 20 minutes not recommended for browser-based processing');
    });

    it('should implement memory management for long exports', () => {
      const memoryManager = {
        trackMemoryUsage: () => {
          // Simulate memory usage tracking over time
          const measurements = [];
          const baseLine = 150; // 150MB baseline
          
          for (let minute = 0; minute <= 10; minute++) {
            const timeBasedGrowth = minute * 15; // 15MB per minute growth
            const randomVariation = (Math.random() - 0.5) * 20; // ±10MB variation
            const memorySpikes = minute % 3 === 0 ? 30 : 0; // Spikes every 3 minutes
            
            measurements.push({
              timeMinutes: minute,
              memoryMB: baseLine + timeBasedGrowth + randomVariation + memorySpikes,
              timestamp: Date.now() + minute * 60000,
            });
          }
          
          return measurements;
        },

        analyzeMemoryPattern: (measurements: any[]) => {
          if (measurements.length < 3) {
            return { insufficient_data: true };
          }

          const memories = measurements.map(m => m.memoryMB);
          const times = measurements.map(m => m.timeMinutes);
          
          // Calculate memory growth rate
          const firstMemory = memories[0];
          const lastMemory = memories[memories.length - 1];
          const totalTime = times[times.length - 1] - times[0];
          const growthRate = (lastMemory - firstMemory) / totalTime; // MB per minute
          
          // Find peak memory
          const peakMemory = Math.max(...memories);
          const avgMemory = memories.reduce((sum, mem) => sum + mem, 0) / memories.length;
          
          // Detect memory leaks
          const isLeaking = growthRate > 10; // More than 10MB/min growth
          const hasSpikes = memories.some(mem => mem > avgMemory * 1.5);
          
          return {
            growthRateMBPerMin: growthRate,
            peakMemoryMB: peakMemory,
            avgMemoryMB: avgMemory,
            isLeaking,
            hasSpikes,
            trend: growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable',
            projectedMemoryAt20Min: firstMemory + (growthRate * 20),
          };
        },

        implementMemoryOptimization: (currentMemoryMB: number, targetMemoryMB: number) => {
          const optimizations = [];
          
          if (currentMemoryMB > targetMemoryMB) {
            const excess = currentMemoryMB - targetMemoryMB;
            
            if (excess > 100) {
              optimizations.push({
                action: 'force_garbage_collection',
                expectedSavingMB: excess * 0.3,
                priority: 'high',
              });
            }
            
            if (excess > 50) {
              optimizations.push({
                action: 'clear_processed_chunks',
                expectedSavingMB: excess * 0.4,
                priority: 'medium',
              });
            }
            
            optimizations.push({
              action: 'reduce_buffer_sizes',
              expectedSavingMB: 25,
              priority: 'low',
            });
          }
          
          return {
            optimizations,
            immediateActions: optimizations.filter(opt => opt.priority === 'high'),
            totalPotentialSavingMB: optimizations.reduce((sum, opt) => sum + opt.expectedSavingMB, 0),
          };
        },

        createMemoryMonitor: (thresholdMB: number = 1024) => {
          let measurements: any[] = [];
          let alertCount = 0;
          
          return {
            addMeasurement: (memoryMB: number) => {
              measurements.push({
                memoryMB,
                timestamp: Date.now(),
                exceeded: memoryMB > thresholdMB,
              });
              
              // Keep last 100 measurements
              if (measurements.length > 100) {
                measurements.shift();
              }
              
              if (memoryMB > thresholdMB) {
                alertCount++;
                return { alert: true, message: `Memory usage ${memoryMB}MB exceeds threshold ${thresholdMB}MB` };
              }
              
              return { alert: false };
            },
            
            getStats: () => {
              const recentMeasurements = measurements.slice(-10);
              const avgRecent = recentMeasurements.reduce((sum, m) => sum + m.memoryMB, 0) / recentMeasurements.length;
              
              return {
                totalMeasurements: measurements.length,
                alertCount,
                avgRecentMemoryMB: avgRecent || 0,
                currentTrend: measurements.length > 1 ? 
                  (measurements[measurements.length - 1].memoryMB > measurements[measurements.length - 2].memoryMB ? 'increasing' : 'decreasing') 
                  : 'unknown',
              };
            },
          };
        },
      };

      // Test memory tracking
      const measurements = memoryManager.trackMemoryUsage();
      expect(measurements).toHaveLength(11); // 0-10 minutes
      expect(measurements[0].timeMinutes).toBe(0);
      expect(measurements[10].timeMinutes).toBe(10);

      // Test memory pattern analysis
      const analysis = memoryManager.analyzeMemoryPattern(measurements);
      expect(analysis.growthRateMBPerMin).toBeGreaterThan(0); // Should show growth
      expect(analysis.peakMemoryMB).toBeGreaterThan(analysis.avgMemoryMB);
      expect(analysis.trend).toBe('increasing');

      // Test memory optimization
      const optimization = memoryManager.implementMemoryOptimization(1200, 800);
      expect(optimization.optimizations.length).toBeGreaterThan(0);
      expect(optimization.immediateActions.length).toBeGreaterThan(0); // Should have high priority actions

      // Test memory monitor
      const monitor = memoryManager.createMemoryMonitor(500);
      const lowMemResult = monitor.addMeasurement(300);
      expect(lowMemResult.alert).toBe(false);
      
      const highMemResult = monitor.addMeasurement(600);
      expect(highMemResult.alert).toBe(true);
      expect(highMemResult.message).toContain('exceeds threshold');
      
      const stats = monitor.getStats();
      expect(stats.alertCount).toBe(1);
      expect(stats.totalMeasurements).toBe(2);
    });
  });

  describe('Sync Drift Over Time', () => {
    it('should detect and measure sync drift in long exports', () => {
      const driftDetector = {
        simulateLongDurationDrift: (durationMinutes: number) => {
          const measurements = [];
          const sampleRate = 48000;
          const frameRate = 30;
          
          // Simulate measurements every 30 seconds
          const measurementInterval = 30; // seconds
          const totalMeasurements = (durationMinutes * 60) / measurementInterval;
          
          let cumulativeDrift = 0;
          
          for (let i = 0; i <= totalMeasurements; i++) {
            const timeSeconds = i * measurementInterval;
            
            // Simulate various drift sources
            const clockDrift = timeSeconds * 0.00001; // 10ppm clock drift
            const systemJitter = (Math.random() - 0.5) * 0.002; // ±1ms jitter
            const thermalDrift = Math.sin(timeSeconds / 120) * 0.001; // 1ms thermal cycling
            const loadDrift = Math.random() * 0.0005; // Load-dependent drift
            
            cumulativeDrift = clockDrift + systemJitter + thermalDrift + loadDrift;
            
            const audioFrame = Math.floor(timeSeconds * sampleRate);
            const videoFrame = Math.floor(timeSeconds * frameRate);
            const expectedSync = timeSeconds;
            const actualSync = timeSeconds + cumulativeDrift;
            
            measurements.push({
              timeSeconds,
              timeMinutes: timeSeconds / 60,
              audioFrame,
              videoFrame,
              expectedSync,
              actualSync,
              drift: cumulativeDrift,
              driftMs: cumulativeDrift * 1000,
              sources: {
                clockDrift,
                systemJitter,
                thermalDrift,
                loadDrift,
              },
            });
          }
          
          return measurements;
        },

        analyzeDriftPattern: (measurements: any[]) => {
          if (measurements.length < 5) {
            return { insufficient_data: true };
          }

          const drifts = measurements.map(m => m.drift);
          const times = measurements.map(m => m.timeSeconds);
          
          // Calculate drift statistics
          const maxDrift = Math.max(...drifts.map(Math.abs));
          const finalDrift = Math.abs(drifts[drifts.length - 1]);
          const avgDriftRate = finalDrift / times[times.length - 1]; // drift per second
          
          // Analyze drift stability
          const driftChanges = [];
          for (let i = 1; i < drifts.length; i++) {
            driftChanges.push(Math.abs(drifts[i] - drifts[i - 1]));
          }
          const avgChange = driftChanges.reduce((sum, change) => sum + change, 0) / driftChanges.length;
          
          // Categorize drift severity
          let severity: string;
          if (maxDrift < 0.001) severity = 'negligible'; // <1ms
          else if (maxDrift < 0.017) severity = 'acceptable'; // <17ms (one frame at 60fps)
          else if (maxDrift < 0.040) severity = 'noticeable'; // <40ms
          else severity = 'problematic'; // >40ms
          
          return {
            maxDriftMs: maxDrift * 1000,
            finalDriftMs: finalDrift * 1000,
            avgDriftRateMs: avgDriftRate * 1000,
            stability: avgChange < 0.0005 ? 'stable' : 'variable',
            severity,
            acceptable: maxDrift < 0.040, // 40ms threshold
            projectedDriftAt60Min: avgDriftRate * 3600 * 1000, // Project to 1 hour in ms
          };
        },

        implementDriftCorrection: (currentDrift: number, targetDrift: number = 0) => {
          const correctionNeeded = targetDrift - currentDrift;
          const maxCorrectionPerStep = 0.001; // 1ms max correction per step
          
          if (Math.abs(correctionNeeded) <= maxCorrectionPerStep) {
            return {
              type: 'immediate',
              correction: correctionNeeded,
              steps: 1,
              duration: 0.1, // 100ms
            };
          }
          
          const steps = Math.ceil(Math.abs(correctionNeeded) / maxCorrectionPerStep);
          const stepSize = correctionNeeded / steps;
          
          return {
            type: 'gradual',
            correction: correctionNeeded,
            steps,
            stepSize,
            duration: steps * 0.1, // 100ms per step
            rationale: 'large_correction_requires_gradual_adjustment',
          };
        },

        createDriftMonitor: (samplingIntervalMs: number = 1000) => {
          let measurements: any[] = [];
          let lastCorrectionTime = 0;
          
          return {
            addMeasurement: (audioTime: number, videoTime: number) => {
              const timestamp = Date.now();
              const drift = audioTime - videoTime;
              
              measurements.push({
                timestamp,
                audioTime,
                videoTime,
                drift,
                driftMs: drift * 1000,
              });
              
              // Keep last 1000 measurements
              if (measurements.length > 1000) {
                measurements.shift();
              }
              
              return {
                currentDrift: drift,
                needsCorrection: Math.abs(drift) > 0.020, // 20ms threshold
                timeSinceLastCorrection: timestamp - lastCorrectionTime,
              };
            },
            
            shouldCorrect: (threshold: number = 0.020) => {
              if (measurements.length < 3) return false;
              
              const recentDrifts = measurements.slice(-3).map(m => Math.abs(m.drift));
              const avgRecentDrift = recentDrifts.reduce((sum, d) => sum + d, 0) / recentDrifts.length;
              
              return avgRecentDrift > threshold;
            },
            
            applyCorrectionLogic: () => {
              if (!driftMonitor.shouldCorrect()) {
                return { correctionNeeded: false };
              }
              
              const latestDrift = measurements[measurements.length - 1]?.drift || 0;
              const correction = driftDetector.implementDriftCorrection(latestDrift);
              lastCorrectionTime = Date.now();
              
              return {
                correctionNeeded: true,
                correction,
                appliedAt: lastCorrectionTime,
              };
            },
          };
        },
      };

      // Test long duration drift simulation
      const driftMeasurements = driftDetector.simulateLongDurationDrift(10); // 10 minutes
      expect(driftMeasurements.length).toBeGreaterThan(10); // Every 30s for 10 min
      expect(driftMeasurements[0].timeSeconds).toBe(0);
      expect(driftMeasurements[driftMeasurements.length - 1].timeMinutes).toBe(10);

      // Test drift pattern analysis
      const driftAnalysis = driftDetector.analyzeDriftPattern(driftMeasurements);
      expect(driftAnalysis.maxDriftMs).toBeDefined();
      expect(['negligible', 'acceptable', 'noticeable', 'problematic']).toContain(driftAnalysis.severity);
      expect(driftAnalysis.projectedDriftAt60Min).toBeGreaterThan(0);

      // Test drift correction
      const largeDriftCorrection = driftDetector.implementDriftCorrection(0.05); // 50ms drift
      expect(largeDriftCorrection.type).toBe('gradual');
      expect(largeDriftCorrection.steps).toBeGreaterThan(1);

      const smallDriftCorrection = driftDetector.implementDriftCorrection(0.0005); // 0.5ms drift
      expect(smallDriftCorrection.type).toBe('immediate');
      expect(smallDriftCorrection.steps).toBe(1);

      // Test drift monitor
      const driftMonitor = driftDetector.createDriftMonitor(1000);
      
      // Add measurements that don't need correction
      const goodMeasurement = driftMonitor.addMeasurement(1.000, 1.005); // 5ms drift
      expect(goodMeasurement.needsCorrection).toBe(false);
      
      // Add measurements that need correction
      const badMeasurement = driftMonitor.addMeasurement(2.000, 2.025); // 25ms drift
      expect(badMeasurement.needsCorrection).toBe(true);
    });

    it('should handle cumulative drift effects', () => {
      const cumulativeDriftManager = {
        modelDriftAccumulation: (durationHours: number) => {
          const baselineDriftPPM = 10; // 10 parts per million
          const temperatureDriftPPM = 5; // Additional thermal drift
          const agingDriftPPM = 2; // Clock aging effect
          
          const totalDriftPPM = baselineDriftPPM + temperatureDriftPPM + agingDriftPPM;
          const driftPerSecond = totalDriftPPM / 1000000; // Convert PPM to ratio
          
          const measurements = [];
          const samplesPerHour = 60; // One measurement per minute
          
          for (let hour = 0; hour <= durationHours; hour += 1/samplesPerHour) {
            const timeSeconds = hour * 3600;
            const cumulativeDrift = timeSeconds * driftPerSecond;
            
            // Add random variations
            const randomComponent = (Math.random() - 0.5) * 0.001; // ±0.5ms random
            const periodicComponent = Math.sin(timeSeconds / 1800) * 0.0005; // 30-min cycle
            
            const totalDrift = cumulativeDrift + randomComponent + periodicComponent;
            
            measurements.push({
              timeHours: hour,
              timeSeconds,
              baseDrift: cumulativeDrift,
              randomDrift: randomComponent,
              periodicDrift: periodicComponent,
              totalDrift,
              totalDriftMs: totalDrift * 1000,
              driftRate: totalDrift / timeSeconds, // Current rate
            });
          }
          
          return {
            measurements,
            parameters: {
              baselineDriftPPM,
              temperatureDriftPPM,
              agingDriftPPM,
              totalDriftPPM,
            },
          };
        },

        predictFutureDrift: (currentMeasurements: any[], projectionHours: number) => {
          if (currentMeasurements.length < 10) {
            return { insufficient_data: true };
          }

          const recentMeasurements = currentMeasurements.slice(-10);
          const times = recentMeasurements.map(m => m.timeSeconds);
          const drifts = recentMeasurements.map(m => m.totalDrift);
          
          // Simple linear regression for drift rate
          const n = times.length;
          const sumT = times.reduce((sum, t) => sum + t, 0);
          const sumD = drifts.reduce((sum, d) => sum + d, 0);
          const sumTD = times.reduce((sum, t, i) => sum + t * drifts[i], 0);
          const sumTT = times.reduce((sum, t) => sum + t * t, 0);
          
          const driftRate = (n * sumTD - sumT * sumD) / (n * sumTT - sumT * sumT);
          const intercept = (sumD - driftRate * sumT) / n;
          
          const currentTime = times[times.length - 1];
          const futureTime = currentTime + (projectionHours * 3600);
          const predictedDrift = driftRate * futureTime + intercept;
          
          return {
            currentDriftMs: drifts[drifts.length - 1] * 1000,
            predictedDriftMs: predictedDrift * 1000,
            driftRateMs: driftRate * 1000,
            projectionHours,
            confidence: cumulativeDriftManager.calculatePredictionConfidence(recentMeasurements),
          };
        },

        calculatePredictionConfidence: (measurements: any[]) => {
          if (measurements.length < 5) return 'low';
          
          const drifts = measurements.map(m => m.totalDrift);
          const mean = drifts.reduce((sum, d) => sum + d, 0) / drifts.length;
          const variance = drifts.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / drifts.length;
          const stdDev = Math.sqrt(variance);
          const coefficientOfVariation = stdDev / Math.abs(mean);
          
          if (coefficientOfVariation < 0.1) return 'high';
          if (coefficientOfVariation < 0.3) return 'medium';
          return 'low';
        },

        implementPreventiveMeasures: (predictedDrift: number, threshold: number = 0.040) => {
          const measures = [];
          
          if (Math.abs(predictedDrift) > threshold * 0.5) {
            measures.push({
              action: 'increase_monitoring_frequency',
              description: 'Monitor sync every 10 seconds instead of 30 seconds',
              implementation: 'reduce_sampling_interval',
            });
          }
          
          if (Math.abs(predictedDrift) > threshold * 0.7) {
            measures.push({
              action: 'enable_predictive_correction',
              description: 'Apply small corrections before drift becomes noticeable',
              implementation: 'proactive_adjustment',
            });
          }
          
          if (Math.abs(predictedDrift) > threshold) {
            measures.push({
              action: 'segment_processing',
              description: 'Process in shorter segments to limit cumulative drift',
              implementation: 'chunk_based_export',
            });
          }
          
          return {
            measures,
            severity: Math.abs(predictedDrift) > threshold ? 'critical' : 'preventive',
            urgency: Math.abs(predictedDrift) > threshold * 1.5 ? 'immediate' : 'planned',
          };
        },
      };

      // Test drift accumulation modeling
      const driftModel = cumulativeDriftManager.modelDriftAccumulation(2); // 2 hours
      expect(driftModel.measurements.length).toBeGreaterThan(100); // 60 per hour * 2
      expect(driftModel.parameters.totalDriftPPM).toBe(17); // 10+5+2

      // Test future drift prediction
      const prediction = cumulativeDriftManager.predictFutureDrift(driftModel.measurements, 1); // 1 hour ahead
      expect(prediction.currentDriftMs).toBeDefined();
      expect(prediction.predictedDriftMs).toBeGreaterThan(prediction.currentDriftMs);
      expect(['high', 'medium', 'low']).toContain(prediction.confidence);

      // Test preventive measures
      const largeDriftMeasures = cumulativeDriftManager.implementPreventiveMeasures(0.050); // 50ms
      expect(largeDriftMeasures.severity).toBe('critical');
      expect(largeDriftMeasures.measures.length).toBeGreaterThan(0);

      const smallDriftMeasures = cumulativeDriftManager.implementPreventiveMeasures(0.020); // 20ms
      expect(smallDriftMeasures.severity).toBe('preventive');
    });
  });

  describe('Correction Mechanisms', () => {
    it('should implement real-time drift correction', () => {
      const realTimeCorrectionSystem = {
        createAdaptiveCorrector: () => {
          let correctionHistory: any[] = [];
          let targetOffset = 0;
          let currentOffset = 0;
          
          return {
            setTargetOffset: (offset: number) => {
              targetOffset = offset;
            },
            
            measureCurrentOffset: (audioTime: number, videoTime: number) => {
              currentOffset = audioTime - videoTime;
              return currentOffset;
            },
            
            calculateCorrection: () => {
              const error = targetOffset - currentOffset;
              const timeNow = Date.now();
              
              // PID-like controller with adaptive gains
              const kP = 0.7; // Proportional gain
              const kI = 0.1; // Integral gain
              const kD = 0.05; // Derivative gain
              
              // Calculate integral term from recent history
              const recentHistory = correctionHistory.slice(-10);
              const integral = recentHistory.reduce((sum, h) => sum + h.error, 0) / recentHistory.length || 0;
              
              // Calculate derivative term
              const lastError = correctionHistory.length > 0 ? correctionHistory[correctionHistory.length - 1].error : 0;
              const derivative = error - lastError;
              
              const correction = (kP * error) + (kI * integral) + (kD * derivative);
              
              // Apply safety limits
              const maxCorrection = 0.005; // 5ms max per correction
              const safeCorrection = Math.max(-maxCorrection, Math.min(maxCorrection, correction));
              
              // Record this correction attempt
              correctionHistory.push({
                timestamp: timeNow,
                error,
                correction: safeCorrection,
                proportional: kP * error,
                integral: kI * integral,
                derivative: kD * derivative,
              });
              
              // Keep history manageable
              if (correctionHistory.length > 100) {
                correctionHistory.shift();
              }
              
              return {
                correction: safeCorrection,
                correctionMs: safeCorrection * 1000,
                error,
                errorMs: error * 1000,
                components: {
                  proportional: kP * error,
                  integral: kI * integral,
                  derivative: kD * derivative,
                },
                stability: Math.abs(error) < 0.001 ? 'stable' : 'correcting',
              };
            },
            
            getCorrectionStats: () => {
              if (correctionHistory.length === 0) {
                return { no_data: true };
              }
              
              const corrections = correctionHistory.map(h => h.correction);
              const errors = correctionHistory.map(h => h.error);
              
              return {
                totalCorrections: correctionHistory.length,
                avgCorrection: corrections.reduce((sum, c) => sum + c, 0) / corrections.length,
                avgError: errors.reduce((sum, e) => sum + e, 0) / errors.length,
                maxError: Math.max(...errors.map(Math.abs)),
                stabilityPeriods: corrector.identifyStabilityPeriods(correctionHistory),
                effectivenessRating: Math.abs(errors[errors.length - 1]) < Math.abs(errors[0]) ? 'improving' : 'stable',
              };
            },
            
            identifyStabilityPeriods: (history: any[]) => {
              const periods = [];
              let currentPeriod = null;
              
              for (let i = 0; i < history.length; i++) {
                const isStable = Math.abs(history[i].error) < 0.002; // 2ms threshold
                
                if (isStable && !currentPeriod) {
                  currentPeriod = { start: i, startTime: history[i].timestamp };
                } else if (!isStable && currentPeriod) {
                  currentPeriod.end = i - 1;
                  currentPeriod.endTime = history[i - 1].timestamp;
                  currentPeriod.duration = currentPeriod.endTime - currentPeriod.startTime;
                  periods.push(currentPeriod);
                  currentPeriod = null;
                }
              }
              
              // Close final period if still stable
              if (currentPeriod) {
                currentPeriod.end = history.length - 1;
                currentPeriod.endTime = history[history.length - 1].timestamp;
                currentPeriod.duration = currentPeriod.endTime - currentPeriod.startTime;
                periods.push(currentPeriod);
              }
              
              return periods;
            },
          };
        },

        implementBatchCorrection: (driftMeasurements: any[], correctionStrategy: string = 'adaptive') => {
          const strategies = {
            'adaptive': {
              description: 'Adapt correction strength based on drift severity',
              implement: (measurements: any[]) => {
                return measurements.map((measurement, index) => {
                  const driftMs = Math.abs(measurement.driftMs);
                  let correctionFactor: number;
                  
                  if (driftMs < 5) correctionFactor = 0.1; // Gentle correction
                  else if (driftMs < 20) correctionFactor = 0.3; // Moderate correction
                  else correctionFactor = 0.5; // Aggressive correction
                  
                  const correction = -measurement.drift * correctionFactor;
                  
                  return {
                    ...measurement,
                    correction,
                    correctionMs: correction * 1000,
                    correctionFactor,
                    strategy: 'adaptive',
                  };
                });
              },
            },
            
            'progressive': {
              description: 'Gradually increase correction strength over time',
              implement: (measurements: any[]) => {
                return measurements.map((measurement, index) => {
                  const progressFactor = index / measurements.length; // 0 to 1
                  const baseCorrectionFactor = 0.1 + (progressFactor * 0.4); // 0.1 to 0.5
                  const correction = -measurement.drift * baseCorrectionFactor;
                  
                  return {
                    ...measurement,
                    correction,
                    correctionMs: correction * 1000,
                    correctionFactor: baseCorrectionFactor,
                    strategy: 'progressive',
                  };
                });
              },
            },
            
            'threshold': {
              description: 'Only correct when drift exceeds threshold',
              implement: (measurements: any[]) => {
                const threshold = 0.010; // 10ms threshold
                
                return measurements.map(measurement => {
                  const needsCorrection = Math.abs(measurement.drift) > threshold;
                  const correction = needsCorrection ? -measurement.drift * 0.8 : 0;
                  
                  return {
                    ...measurement,
                    correction,
                    correctionMs: correction * 1000,
                    correctionFactor: needsCorrection ? 0.8 : 0,
                    strategy: 'threshold',
                    triggered: needsCorrection,
                  };
                });
              },
            },
          };
          
          const strategy = strategies[correctionStrategy] || strategies.adaptive;
          const correctedMeasurements = strategy.implement(driftMeasurements);
          
          // Calculate correction effectiveness
          const originalDrifts = driftMeasurements.map(m => Math.abs(m.driftMs));
          const correctedDrifts = correctedMeasurements.map(m => Math.abs(m.driftMs + m.correctionMs));
          
          const avgOriginalDrift = originalDrifts.reduce((sum, d) => sum + d, 0) / originalDrifts.length;
          const avgCorrectedDrift = correctedDrifts.reduce((sum, d) => sum + d, 0) / correctedDrifts.length;
          const effectiveness = (avgOriginalDrift - avgCorrectedDrift) / avgOriginalDrift;
          
          return {
            strategy: correctionStrategy,
            correctedMeasurements,
            effectiveness: effectiveness * 100, // Percentage improvement
            avgOriginalDriftMs: avgOriginalDrift,
            avgCorrectedDriftMs: avgCorrectedDrift,
            totalCorrections: correctedMeasurements.filter(m => Math.abs(m.correction) > 0.0001).length,
          };
        },

        validateCorrectionAccuracy: (beforeCorrection: any[], afterCorrection: any[]) => {
          if (beforeCorrection.length !== afterCorrection.length) {
            throw new Error('Measurement arrays must have same length');
          }

          const improvements = [];
          const degradations = [];
          
          for (let i = 0; i < beforeCorrection.length; i++) {
            const beforeDrift = Math.abs(beforeCorrection[i].driftMs);
            const afterDrift = Math.abs(afterCorrection[i].driftMs);
            const change = beforeDrift - afterDrift;
            
            if (change > 0) {
              improvements.push(change);
            } else {
              degradations.push(Math.abs(change));
            }
          }
          
          const totalImprovement = improvements.reduce((sum, imp) => sum + imp, 0);
          const totalDegradation = degradations.reduce((sum, deg) => sum + deg, 0);
          const netImprovement = totalImprovement - totalDegradation;
          
          return {
            improvementCount: improvements.length,
            degradationCount: degradations.length,
            totalImprovementMs: totalImprovement,
            totalDegradationMs: totalDegradation,
            netImprovementMs: netImprovement,
            successRate: improvements.length / beforeCorrection.length,
            avgImprovementMs: improvements.length > 0 ? totalImprovement / improvements.length : 0,
            correctionQuality: netImprovement > 0 ? 'effective' : 'ineffective',
          };
        },
      };

      // Test adaptive corrector
      const corrector = realTimeCorrectionSystem.createAdaptiveCorrector();
      
      corrector.setTargetOffset(0);
      corrector.measureCurrentOffset(1.025, 1.000); // 25ms drift
      
      const correction1 = corrector.calculateCorrection();
      expect(correction1.errorMs).toBeCloseTo(-25, 1); // 25ms error
      expect(Math.abs(correction1.correctionMs)).toBeLessThanOrEqual(5); // Max 5ms correction
      expect(correction1.stability).toBe('correcting');
      
      // Apply a few more corrections to test stability
      corrector.measureCurrentOffset(1.020, 1.000);
      const correction2 = corrector.calculateCorrection();
      corrector.measureCurrentOffset(1.001, 1.000);
      const correction3 = corrector.calculateCorrection();
      
      const stats = corrector.getCorrectionStats();
      expect(stats.totalCorrections).toBe(3);
      expect(stats.effectivenessRating).toBe('improving');

      // Test batch correction with different strategies
      const mockDriftMeasurements = [
        { drift: 0.020, driftMs: 20 },
        { drift: 0.025, driftMs: 25 },
        { drift: 0.030, driftMs: 30 },
        { drift: 0.015, driftMs: 15 },
      ];

      const adaptiveResult = realTimeCorrectionSystem.implementBatchCorrection(mockDriftMeasurements, 'adaptive');
      expect(adaptiveResult.strategy).toBe('adaptive');
      expect(adaptiveResult.effectiveness).toBeGreaterThan(0);
      expect(adaptiveResult.totalCorrections).toBe(4); // All measurements should have corrections

      const thresholdResult = realTimeCorrectionSystem.implementBatchCorrection(mockDriftMeasurements, 'threshold');
      expect(thresholdResult.strategy).toBe('threshold');
      expect(thresholdResult.totalCorrections).toBe(4); // All exceed 10ms threshold

      // Test correction validation
      const beforeCorrection = mockDriftMeasurements;
      const afterCorrection = adaptiveResult.correctedMeasurements.map(m => ({
        driftMs: m.driftMs + m.correctionMs,
      }));
      
      const validation = realTimeCorrectionSystem.validateCorrectionAccuracy(beforeCorrection, afterCorrection);
      expect(validation.successRate).toBeGreaterThan(0.5); // At least 50% should improve
      expect(validation.correctionQuality).toBe('effective');
    });
  });
});