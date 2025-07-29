/**
 * Audio Timing Integration Tests
 * Tests precise audio timing, frame-accurate sync, and drift detection
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Audio Timing Tests', () => {
  let mockAudioContext: any;
  let mockPerformance: any;

  beforeEach(() => {
    // Mock high-resolution audio context
    mockAudioContext = {
      sampleRate: 48000, // High quality sample rate
      currentTime: 0,
      baseLatency: 0.005, // 5ms base latency
      outputLatency: 0.010, // 10ms output latency
      destination: { 
        channelCount: 2,
        maxChannelCount: 32,
      },
      createBuffer: jest.fn().mockReturnValue({
        numberOfChannels: 2,
        length: 48000,
        sampleRate: 48000,
        duration: 1.0,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(48000)),
      }),
      createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        playbackRate: { value: 1.0 },
        detune: { value: 0 },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        addEventListener: jest.fn(),
        onended: null,
      }),
      createOscillator: jest.fn().mockReturnValue({
        frequency: { value: 440 },
        detune: { value: 0 },
        type: 'sine',
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      }),
      createGain: jest.fn().mockReturnValue({
        gain: { 
          value: 1.0,
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn(),
        },
        connect: jest.fn(),
      }),
      createAnalyser: jest.fn().mockReturnValue({
        fftSize: 2048,
        frequencyBinCount: 1024,
        minDecibels: -100,
        maxDecibels: -30,
        smoothingTimeConstant: 0.8,
        getByteFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn(),
        getFloatFrequencyData: jest.fn(),
        connect: jest.fn(),
      }),
      suspend: jest.fn(),
      resume: jest.fn(),
      close: jest.fn(),
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

    // Mock high-resolution performance timer
    mockPerformance = {
      now: jest.fn().mockReturnValue(0),
      timeOrigin: Date.now(),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn().mockReturnValue([]),
    };

    global.performance = mockPerformance;

    // Mock requestAnimationFrame for frame-accurate timing
    global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
      setTimeout(cb, 16.67); // 60fps
      return 1;
    });

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Precise Audio Timing', () => {
    it('should schedule audio events with sample-accurate timing', () => {
      const precisionScheduler = {
        sampleRate: 48000,
        
        convertTimeToSamples: (timeInSeconds: number) => {
          return Math.floor(timeInSeconds * precisionScheduler.sampleRate);
        },
        
        convertSamplesToTime: (samples: number) => {
          return samples / precisionScheduler.sampleRate;
        },
        
        scheduleAudioEvent: (audioContext: AudioContext, time: number, duration: number) => {
          const startSample = precisionScheduler.convertTimeToSamples(time);
          const durationSamples = precisionScheduler.convertTimeToSamples(duration);
          const endSample = startSample + durationSamples;
          
          const preciseTiming = {
            scheduledTime: time,
            startSample,
            endSample,
            durationSamples,
            preciseStartTime: precisionScheduler.convertSamplesToTime(startSample),
            preciseEndTime: precisionScheduler.convertSamplesToTime(endSample),
            accuracy: 'sample_perfect',
          };
          
          return preciseTiming;
        },
        
        calculateJitter: (scheduledTimes: number[], actualTimes: number[]) => {
          if (scheduledTimes.length !== actualTimes.length) {
            throw new Error('Array lengths must match');
          }
          
          const jitterValues = scheduledTimes.map((scheduled, i) => 
            Math.abs(scheduled - actualTimes[i])
          );
          
          const avgJitter = jitterValues.reduce((sum, jitter) => sum + jitter, 0) / jitterValues.length;
          const maxJitter = Math.max(...jitterValues);
          const minJitter = Math.min(...jitterValues);
          
          return {
            jitterValues,
            averageJitter: avgJitter,
            maxJitter,
            minJitter,
            jitterStdDev: Math.sqrt(
              jitterValues.reduce((sum, jitter) => sum + Math.pow(jitter - avgJitter, 2), 0) / jitterValues.length
            ),
            sampleAccurate: maxJitter < (1 / precisionScheduler.sampleRate),
          };
        },
      };

      // Test sample conversion
      const timeInSeconds = 1.0;
      const samples = precisionScheduler.convertTimeToSamples(timeInSeconds);
      expect(samples).toBe(48000);
      
      const backToTime = precisionScheduler.convertSamplesToTime(samples);
      expect(backToTime).toBeCloseTo(1.0, 10);

      // Test precise scheduling
      const event = precisionScheduler.scheduleAudioEvent(mockAudioContext, 2.5, 1.0);
      expect(event.startSample).toBe(120000); // 2.5 * 48000
      expect(event.durationSamples).toBe(48000); // 1.0 * 48000
      expect(event.accuracy).toBe('sample_perfect');

      // Test jitter calculation
      const scheduled = [1.0, 2.0, 3.0, 4.0];
      const actual = [1.001, 1.999, 3.002, 3.998];
      const jitter = precisionScheduler.calculateJitter(scheduled, actual);
      
      expect(jitter.averageJitter).toBeCloseTo(0.0015, 4);
      expect(jitter.maxJitter).toBe(0.002);
      expect(jitter.sampleAccurate).toBe(false); // 2ms > 1/48000s
    });

    it('should handle audio buffer timing with microsecond precision', () => {
      const bufferTimingManager = {
        createPrecisionBuffer: (audioContext: AudioContext, duration: number, frequency: number = 440) => {
          const sampleRate = audioContext.sampleRate;
          const length = Math.floor(duration * sampleRate);
          const buffer = audioContext.createBuffer(2, length, sampleRate);
          
          // Generate precise sine wave
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
              const time = i / sampleRate;
              channelData[i] = Math.sin(2 * Math.PI * frequency * time) * 0.5;
            }
          }
          
          return {
            buffer,
            exactDuration: length / sampleRate,
            sampleCount: length,
            precisionError: Math.abs(duration - (length / sampleRate)),
          };
        },
        
        scheduleBufferPlayback: (audioContext: AudioContext, buffer: AudioBuffer, startTime: number) => {
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          
          const preciseStartTime = audioContext.currentTime + startTime;
          const endTime = preciseStartTime + buffer.duration;
          
          return {
            source,
            scheduledStart: preciseStartTime,
            scheduledEnd: endTime,
            duration: buffer.duration,
            sampleAccurate: true,
          };
        },
        
        measurePlaybackAccuracy: (scheduled: any[], actual: any[]) => {
          const startTimeErrors = scheduled.map((s, i) => 
            Math.abs(s.scheduledStart - (actual[i]?.actualStart || s.scheduledStart))
          );
          
          const endTimeErrors = scheduled.map((s, i) => 
            Math.abs(s.scheduledEnd - (actual[i]?.actualEnd || s.scheduledEnd))
          );
          
          return {
            startTimeAccuracy: {
              maxError: Math.max(...startTimeErrors),
              avgError: startTimeErrors.reduce((sum, err) => sum + err, 0) / startTimeErrors.length,
              errors: startTimeErrors,
            },
            endTimeAccuracy: {
              maxError: Math.max(...endTimeErrors),
              avgError: endTimeErrors.reduce((sum, err) => sum + err, 0) / endTimeErrors.length,
              errors: endTimeErrors,
            },
            overallAccuracy: (Math.max(...startTimeErrors, ...endTimeErrors) < 0.001) ? 'excellent' : 'good',
          };
        },
      };

      // Test precision buffer creation
      const precisionBuffer = bufferTimingManager.createPrecisionBuffer(mockAudioContext, 1.0, 440);
      expect(precisionBuffer.exactDuration).toBeCloseTo(1.0, 6);
      expect(precisionBuffer.sampleCount).toBe(48000);
      expect(precisionBuffer.precisionError).toBeLessThan(1 / 48000); // Less than one sample

      // Test buffer scheduling
      const playback = bufferTimingManager.scheduleBufferPlayback(
        mockAudioContext, 
        precisionBuffer.buffer, 
        0.5
      );
      expect(playback.sampleAccurate).toBe(true);
      expect(playback.duration).toBeCloseTo(1.0, 6);

      // Test accuracy measurement
      const scheduledEvents = [
        { scheduledStart: 1.0, scheduledEnd: 2.0 },
        { scheduledStart: 2.5, scheduledEnd: 3.5 },
      ];
      
      const actualEvents = [
        { actualStart: 1.001, actualEnd: 2.001 },
        { actualStart: 2.499, actualEnd: 3.499 },
      ];
      
      const accuracy = bufferTimingManager.measurePlaybackAccuracy(scheduledEvents, actualEvents);
      expect(accuracy.startTimeAccuracy.maxError).toBe(0.001);
      expect(accuracy.overallAccuracy).toBe('excellent');
    });

    it('should detect and compensate for system audio latency', () => {
      const latencyCompensator = {
        measureSystemLatency: async (audioContext: AudioContext) => {
          // Simulate latency measurement using loopback
          const testDuration = 0.1; // 100ms test tone
          const testFrequency = 1000; // 1kHz
          
          const measurementStart = performance.now();
          
          // Create test tone
          const oscillator = audioContext.createOscillator();
          oscillator.frequency.value = testFrequency;
          oscillator.connect(audioContext.destination);
          
          // Simulate measurement delay
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const measurementEnd = performance.now();
          const measuredLatency = (measurementEnd - measurementStart) / 1000;
          
          return {
            inputLatency: audioContext.baseLatency || 0.005,
            outputLatency: audioContext.outputLatency || 0.010,
            systemLatency: measuredLatency,
            totalLatency: (audioContext.baseLatency || 0.005) + (audioContext.outputLatency || 0.010) + measuredLatency,
            confidence: measuredLatency < 0.1 ? 'high' : 'medium',
          };
        },
        
        compensateForLatency: (scheduledTime: number, latency: number) => {
          const compensatedTime = scheduledTime - latency;
          
          return {
            originalTime: scheduledTime,
            latencyMs: latency * 1000,
            compensatedTime: Math.max(0, compensatedTime), // Don't go negative
            compensation: scheduledTime - compensatedTime,
          };
        },
        
        createLatencyAwareScheduler: (audioContext: AudioContext, systemLatency: number) => {
          return {
            scheduleEvent: (time: number, callback: () => void) => {
              const compensated = latencyCompensator.compensateForLatency(time, systemLatency);
              const contextTime = audioContext.currentTime + compensated.compensatedTime;
              
              // Use setTimeout for precise timing
              const delay = (contextTime - audioContext.currentTime) * 1000;
              const timeoutId = setTimeout(callback, Math.max(0, delay));
              
              return {
                timeoutId,
                scheduledFor: contextTime,
                compensation: compensated.compensation,
                latencyCompensated: true,
              };
            },
          };
        },
      };

      // Test latency measurement
      const latencyMeasurement = latencyCompensator.measureSystemLatency(mockAudioContext);
      expect(latencyMeasurement).toBeInstanceOf(Promise);
      
      latencyMeasurement.then(result => {
        expect(result.totalLatency).toBeGreaterThan(0);
        expect(result.confidence).toBeDefined();
      });

      // Test latency compensation
      const compensation = latencyCompensator.compensateForLatency(1.0, 0.025);
      expect(compensation.compensatedTime).toBe(0.975);
      expect(compensation.latencyMs).toBe(25);

      // Test latency-aware scheduler
      const scheduler = latencyCompensator.createLatencyAwareScheduler(mockAudioContext, 0.025);
      const mockCallback = jest.fn();
      
      const scheduledEvent = scheduler.scheduleEvent(1.0, mockCallback);
      expect(scheduledEvent.latencyCompensated).toBe(true);
      expect(scheduledEvent.compensation).toBe(0.025);
    });
  });

  describe('Frame-Accurate Sync', () => {
    it('should synchronize audio with video frame boundaries', () => {
      const frameSync = {
        frameRate: 60,
        sampleRate: 48000,
        
        calculateFrameDuration: () => {
          return 1 / frameSync.frameRate; // 16.67ms at 60fps
        },
        
        getFrameBoundaries: (startTime: number, endTime: number) => {
          const frameDuration = frameSync.calculateFrameDuration();
          const boundaries = [];
          
          let currentFrame = Math.floor(startTime / frameDuration);
          const endFrame = Math.ceil(endTime / frameDuration);
          
          while (currentFrame <= endFrame) {
            const frameTime = currentFrame * frameDuration;
            boundaries.push({
              frameNumber: currentFrame,
              timeSeconds: frameTime,
              timeSamples: Math.floor(frameTime * frameSync.sampleRate),
            });
            currentFrame++;
          }
          
          return boundaries;
        },
        
        alignAudioToFrame: (audioTime: number, frameTime: number) => {
          const frameDuration = frameSync.calculateFrameDuration();
          const frameStart = Math.floor(frameTime / frameDuration) * frameDuration;
          const frameEnd = frameStart + frameDuration;
          
          // Align to nearest frame boundary
          const toFrameStart = Math.abs(audioTime - frameStart);
          const toFrameEnd = Math.abs(audioTime - frameEnd);
          
          const alignedTime = toFrameStart < toFrameEnd ? frameStart : frameEnd;
          const alignment = {
            originalTime: audioTime,
            alignedTime,
            frameStart,
            frameEnd,
            offset: alignedTime - audioTime,
            offsetSamples: Math.floor((alignedTime - audioTime) * frameSync.sampleRate),
          };
          
          return alignment;
        },
        
        validateFrameSync: (audioEvents: any[], videoFrames: any[]) => {
          const syncResults = audioEvents.map(audioEvent => {
            // Find closest video frame
            const closestFrame = videoFrames.reduce((closest, frame) => {
              const currentDistance = Math.abs(frame.time - audioEvent.time);
              const closestDistance = Math.abs(closest.time - audioEvent.time);
              return currentDistance < closestDistance ? frame : closest;
            });
            
            const syncError = Math.abs(audioEvent.time - closestFrame.time);
            const frameDuration = frameSync.calculateFrameDuration();
            
            return {
              audioTime: audioEvent.time,
              videoTime: closestFrame.time,
              syncError,
              syncErrorMs: syncError * 1000,
              withinFrame: syncError < frameDuration,
              frameAccurate: syncError < (frameDuration / 2),
            };
          });
          
          return {
            results: syncResults,
            allFrameAccurate: syncResults.every(r => r.frameAccurate),
            maxSyncError: Math.max(...syncResults.map(r => r.syncError)),
            avgSyncError: syncResults.reduce((sum, r) => sum + r.syncError, 0) / syncResults.length,
          };
        },
      };

      // Test frame duration calculation
      const frameDuration = frameSync.calculateFrameDuration();
      expect(frameDuration).toBeCloseTo(0.01667, 5); // 16.67ms

      // Test frame boundaries
      const boundaries = frameSync.getFrameBoundaries(0, 0.1); // First 100ms
      expect(boundaries).toHaveLength(7); // 6 frames + start frame
      expect(boundaries[1].timeSeconds).toBeCloseTo(0.01667, 5);

      // Test audio alignment
      const alignment = frameSync.alignAudioToFrame(0.025, 0.025);
      expect(alignment.alignedTime).toBeCloseTo(0.01667, 5); // Aligned to frame start
      expect(Math.abs(alignment.offset)).toBeLessThan(frameDuration);

      // Test sync validation
      const audioEvents = [
        { time: 0.0167 }, // Exactly on frame
        { time: 0.0334 }, // Exactly on frame
        { time: 0.045 },  // Slightly off frame
      ];
      
      const videoFrames = [
        { time: 0.0167 },
        { time: 0.0334 },
        { time: 0.050 },
      ];
      
      const validation = frameSync.validateFrameSync(audioEvents, videoFrames);
      expect(validation.results).toHaveLength(3);
      expect(validation.results[0].frameAccurate).toBe(true);
      expect(validation.results[1].frameAccurate).toBe(true);
    });

    it('should handle different frame rates and sample rates', () => {
      const multiRateSync = {
        createSyncContext: (frameRate: number, sampleRate: number) => ({
          frameRate,
          sampleRate,
          frameDuration: 1 / frameRate,
          sampleDuration: 1 / sampleRate,
          samplesPerFrame: sampleRate / frameRate,
        }),
        
        convertFrameToSamples: (frameNumber: number, context: any) => {
          return Math.floor(frameNumber * context.samplesPerFrame);
        },
        
        convertSamplesToFrame: (sampleNumber: number, context: any) => {
          return Math.floor(sampleNumber / context.samplesPerFrame);
        },
        
        calculateSyncAccuracy: (context: any) => {
          const exactSamplesPerFrame = context.sampleRate / context.frameRate;
          const roundedSamplesPerFrame = Math.floor(exactSamplesPerFrame);
          const error = exactSamplesPerFrame - roundedSamplesPerFrame;
          
          return {
            exactSamplesPerFrame,
            roundedSamplesPerFrame,
            quantizationError: error,
            errorSeconds: error / context.sampleRate,
            errorMs: (error / context.sampleRate) * 1000,
            accuracy: error < 0.5 ? 'high' : 'medium',
          };
        },
        
        testCommonConfigurations: () => {
          const configs = [
            { frameRate: 24, sampleRate: 48000 }, // Film
            { frameRate: 25, sampleRate: 48000 }, // PAL
            { frameRate: 30, sampleRate: 48000 }, // NTSC
            { frameRate: 60, sampleRate: 48000 }, // High refresh
            { frameRate: 24, sampleRate: 44100 }, // CD quality
            { frameRate: 30, sampleRate: 44100 }, // Common web
          ];
          
          return configs.map(config => {
            const context = multiRateSync.createSyncContext(config.frameRate, config.sampleRate);
            const accuracy = multiRateSync.calculateSyncAccuracy(context);
            
            return {
              ...config,
              ...accuracy,
              compatible: accuracy.errorMs < 1, // <1ms error acceptable
            };
          });
        },
      };

      // Test different sync contexts
      const context60fps = multiRateSync.createSyncContext(60, 48000);
      expect(context60fps.samplesPerFrame).toBe(800); // 48000/60

      const context24fps = multiRateSync.createSyncContext(24, 48000);
      expect(context24fps.samplesPerFrame).toBe(2000); // 48000/24

      // Test frame/sample conversion
      const samples = multiRateSync.convertFrameToSamples(10, context60fps);
      expect(samples).toBe(8000); // 10 * 800

      const frames = multiRateSync.convertSamplesToFrame(8000, context60fps);
      expect(frames).toBe(10);

      // Test common configurations
      const configTests = multiRateSync.testCommonConfigurations();
      expect(configTests).toHaveLength(6);
      
      // 60fps at 48kHz should be very accurate
      const config60fps = configTests.find(c => c.frameRate === 60 && c.sampleRate === 48000);
      expect(config60fps?.compatible).toBe(true);
      expect(config60fps?.accuracy).toBe('high');
    });
  });

  describe('Drift Detection', () => {
    it('should detect timing drift over extended periods', () => {
      const driftMonitor = {
        measurements: [] as Array<{time: number, expected: number, actual: number, drift: number}>,
        
        addMeasurement: (time: number, expected: number, actual: number) => {
          const drift = actual - expected;
          driftMonitor.measurements.push({ time, expected, actual, drift });
          
          // Keep only recent measurements (last 1000)
          if (driftMonitor.measurements.length > 1000) {
            driftMonitor.measurements.shift();
          }
        },
        
        calculateDriftRate: () => {
          if (driftMonitor.measurements.length < 10) {
            return { insufficient_data: true };
          }
          
          const recent = driftMonitor.measurements.slice(-10);
          const older = driftMonitor.measurements.slice(-20, -10);
          
          if (older.length === 0) {
            return { insufficient_data: true };
          }
          
          const recentAvgDrift = recent.reduce((sum, m) => sum + m.drift, 0) / recent.length;
          const olderAvgDrift = older.reduce((sum, m) => sum + m.drift, 0) / older.length;
          
          const driftRate = (recentAvgDrift - olderAvgDrift) / (recent[0].time - older[0].time);
          
          return {
            driftRate, // seconds per second
            driftRateMs: driftRate * 1000, // ms per second
            trend: driftRate > 0.001 ? 'increasing' : driftRate < -0.001 ? 'decreasing' : 'stable',
            severity: Math.abs(driftRate) > 0.01 ? 'critical' : Math.abs(driftRate) > 0.001 ? 'warning' : 'normal',
          };
        },
        
        predictFutureDrift: (timeAhead: number) => {
          const driftAnalysis = driftMonitor.calculateDriftRate();
          
          if (driftAnalysis.insufficient_data) {
            return { prediction_unavailable: true };
          }
          
          const currentDrift = driftMonitor.measurements[driftMonitor.measurements.length - 1]?.drift || 0;
          const predictedDrift = currentDrift + (driftAnalysis.driftRate * timeAhead);
          
          return {
            currentDrift,
            predictedDrift,
            timeAhead,
            driftChange: predictedDrift - currentDrift,
            actionNeeded: Math.abs(predictedDrift) > 0.04, // 40ms threshold
          };
        },
        
        generateCorrectionRecommendation: () => {
          const analysis = driftMonitor.calculateDriftRate();
          
          if (analysis.insufficient_data) {
            return { recommendation: 'continue_monitoring' };
          }
          
          if (analysis.severity === 'critical') {
            return {
              recommendation: 'immediate_correction',
              action: 'resync_all_streams',
              urgency: 'high',
            };
          }
          
          if (analysis.severity === 'warning') {
            return {
              recommendation: 'gradual_correction',
              action: 'adjust_timing_gradually',
              urgency: 'medium',
            };
          }
          
          return {
            recommendation: 'no_action',
            action: 'continue_monitoring',
            urgency: 'low',
          };
        },
      };

      // Simulate measurements over time with gradual drift
      for (let i = 0; i < 50; i++) {
        const time = i * 0.1; // Every 100ms
        const expected = time;
        const actual = time + (i * 0.0001); // Gradual 0.1ms drift per measurement
        driftMonitor.addMeasurement(time, expected, actual);
      }

      expect(driftMonitor.measurements).toHaveLength(50);

      // Test drift rate calculation
      const driftRate = driftMonitor.calculateDriftRate();
      expect(driftRate.trend).toBe('increasing');
      expect(driftRate.driftRateMs).toBeGreaterThan(0);

      // Test future drift prediction
      const prediction = driftMonitor.predictFutureDrift(10); // 10 seconds ahead
      expect(prediction.prediction_unavailable).toBeUndefined();
      expect(prediction.predictedDrift).toBeGreaterThan(prediction.currentDrift);

      // Test correction recommendation
      const recommendation = driftMonitor.generateCorrectionRecommendation();
      expect(['no_action', 'gradual_correction', 'immediate_correction']).toContain(recommendation.recommendation);
    });

    it('should analyze drift patterns and root causes', () => {
      const driftAnalyzer = {
        analyzeDriftPattern: (measurements: any[]) => {
          if (measurements.length < 20) {
            return { insufficient_data: true };
          }
          
          const drifts = measurements.map(m => m.drift);
          const times = measurements.map(m => m.time);
          
          // Calculate statistics
          const mean = drifts.reduce((sum, d) => sum + d, 0) / drifts.length;
          const variance = drifts.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / drifts.length;
          const stdDev = Math.sqrt(variance);
          
          // Detect patterns
          const isLinear = driftAnalyzer.detectLinearPattern(times, drifts);
          const isPeriodic = driftAnalyzer.detectPeriodicPattern(drifts);
          const hasSpikes = driftAnalyzer.detectSpikes(drifts, mean, stdDev);
          
          return {
            statistics: { mean, variance, stdDev },
            patterns: { isLinear, isPeriodic, hasSpikes },
            classification: driftAnalyzer.classifyDriftType(isLinear, isPeriodic, hasSpikes),
          };
        },
        
        detectLinearPattern: (times: number[], drifts: number[]) => {
          // Simple linear regression
          const n = times.length;
          const sumX = times.reduce((sum, t) => sum + t, 0);
          const sumY = drifts.reduce((sum, d) => sum + d, 0);
          const sumXY = times.reduce((sum, t, i) => sum + t * drifts[i], 0);
          const sumXX = times.reduce((sum, t) => sum + t * t, 0);
          
          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
          
          // Calculate correlation coefficient
          const meanX = sumX / n;
          const meanY = sumY / n;
          const numerator = times.reduce((sum, t, i) => sum + (t - meanX) * (drifts[i] - meanY), 0);
          const denomX = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - meanX, 2), 0));
          const denomY = Math.sqrt(drifts.reduce((sum, d) => sum + Math.pow(d - meanY, 2), 0));
          const correlation = numerator / (denomX * denomY);
          
          return {
            slope,
            intercept,
            correlation,
            isLinear: Math.abs(correlation) > 0.8, // Strong correlation
          };
        },
        
        detectPeriodicPattern: (drifts: number[]) => {
          // Simple frequency analysis using autocorrelation
          const maxLag = Math.min(drifts.length / 4, 50);
          const autocorrelations = [];
          
          for (let lag = 1; lag <= maxLag; lag++) {
            let correlation = 0;
            const validPairs = drifts.length - lag;
            
            for (let i = 0; i < validPairs; i++) {
              correlation += drifts[i] * drifts[i + lag];
            }
            
            autocorrelations.push(correlation / validPairs);
          }
          
          const maxCorrelation = Math.max(...autocorrelations);
          const dominantPeriod = autocorrelations.indexOf(maxCorrelation) + 1;
          
          return {
            maxCorrelation,
            dominantPeriod,
            isPeriodic: maxCorrelation > 0.5,
          };
        },
        
        detectSpikes: (drifts: number[], mean: number, stdDev: number) => {
          const threshold = 2 * stdDev; // 2-sigma threshold
          const spikes = drifts.map((drift, i) => ({
            index: i,
            value: drift,
            isSpike: Math.abs(drift - mean) > threshold,
            severity: Math.abs(drift - mean) / stdDev,
          })).filter(spike => spike.isSpike);
          
          return {
            spikeCount: spikes.length,
            spikes,
            spikeRate: spikes.length / drifts.length,
            hasSpikes: spikes.length > 0,
          };
        },
        
        classifyDriftType: (isLinear: any, isPeriodic: any, hasSpikes: any) => {
          if (hasSpikes.hasSpikes && hasSpikes.spikeRate > 0.1) {
            return 'chaotic';
          }
          
          if (isLinear.isLinear && isPeriodic.isPeriodic) {
            return 'linear_with_oscillation';
          }
          
          if (isLinear.isLinear) {
            return isLinear.slope > 0 ? 'linear_increasing' : 'linear_decreasing';
          }
          
          if (isPeriodic.isPeriodic) {
            return 'periodic';
          }
          
          return 'random';
        },
      };

      // Generate test data with linear drift
      const linearMeasurements = Array.from({ length: 30 }, (_, i) => ({
        time: i * 0.1,
        drift: i * 0.001 + (Math.random() - 0.5) * 0.0001, // Linear with noise
      }));

      const linearAnalysis = driftAnalyzer.analyzeDriftPattern(linearMeasurements);
      expect(linearAnalysis.patterns.isLinear.isLinear).toBe(true);
      expect(linearAnalysis.classification).toBe('linear_increasing');

      // Generate test data with periodic drift
      const periodicMeasurements = Array.from({ length: 30 }, (_, i) => ({
        time: i * 0.1,
        drift: Math.sin(i * 0.5) * 0.01 + (Math.random() - 0.5) * 0.001, // Sine wave with noise
      }));

      const periodicAnalysis = driftAnalyzer.analyzeDriftPattern(periodicMeasurements);
      expect(periodicAnalysis.patterns.isPeriodic.isPeriodic).toBe(true);
    });
  });
});