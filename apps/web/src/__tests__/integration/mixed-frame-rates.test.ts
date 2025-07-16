/**
 * Mixed Frame Rates Integration Tests
 * Tests 30fps + 60fps content, frame rate conversion, and sync preservation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Mixed Frame Rates Tests', () => {
  let mockMediaElement: any;
  let mockCanvas: any;
  let mockAudioContext: any;

  beforeEach(() => {
    // Mock video element with frame rate support
    mockMediaElement = {
      videoWidth: 1920,
      videoHeight: 1080,
      duration: 10,
      currentTime: 0,
      playbackRate: 1.0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      requestVideoFrameCallback: jest.fn(),
      cancelVideoFrameCallback: jest.fn(),
      getVideoPlaybackQuality: jest.fn().mockReturnValue({
        totalVideoFrames: 600, // 60fps * 10s
        droppedVideoFrames: 0,
        creationTime: 0,
      }),
    };

    // Mock canvas context
    mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(),
        putImageData: jest.fn(),
        canvas: { width: 1920, height: 1080 },
      }),
      captureStream: jest.fn().mockReturnValue({
        getVideoTracks: jest.fn().mockReturnValue([{
          getSettings: jest.fn().mockReturnValue({ frameRate: 30 }),
        }]),
      }),
    };

    // Mock AudioContext
    mockAudioContext = {
      sampleRate: 48000,
      currentTime: 0,
      createBuffer: jest.fn(),
      createBufferSource: jest.fn(),
      createGain: jest.fn(),
      destination: {},
    };

    global.HTMLVideoElement = jest.fn().mockImplementation(() => mockMediaElement);
    global.HTMLCanvasElement = jest.fn().mockImplementation(() => mockCanvas);
    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('30fps + 60fps Content', () => {
    it('should handle mixed frame rate timeline elements', () => {
      const frameRateManager = {
        timelineElements: [
          { id: 'video1', frameRate: 30, duration: 5, startTime: 0 },
          { id: 'video2', frameRate: 60, duration: 5, startTime: 5 },
        ],

        detectFrameRates: () => {
          const frameRates = frameRateManager.timelineElements.map(el => el.frameRate);
          const uniqueRates = [...new Set(frameRates)];
          
          return {
            detected: uniqueRates,
            mixed: uniqueRates.length > 1,
            dominant: frameRates.reduce((a, b, _, arr) => 
              arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
            ),
            conflicts: uniqueRates.length > 1 ? uniqueRates : [],
          };
        },

        analyzeFrameRateCompatibility: () => {
          const analysis = frameRateManager.detectFrameRates();
          
          if (!analysis.mixed) {
            return { compatible: true, strategy: 'direct' };
          }

          // Check if rates are multiples
          const rates = analysis.detected.sort((a, b) => a - b);
          const isMultiple = rates.every((rate, i) => 
            i === 0 || rate % rates[0] === 0
          );

          return {
            compatible: true,
            strategy: isMultiple ? 'frame_duplication' : 'interpolation',
            targetFrameRate: Math.max(...rates),
            conversionRequired: true,
            complexity: isMultiple ? 'simple' : 'complex',
          };
        },

        createUnifiedTimeline: (targetFrameRate: number) => {
          const frameDuration = 1 / targetFrameRate;
          const totalDuration = frameRateManager.timelineElements.reduce(
            (max, el) => Math.max(max, el.startTime + el.duration), 0
          );
          
          const frames = [];
          
          for (let time = 0; time < totalDuration; time += frameDuration) {
            const frameNumber = Math.floor(time / frameDuration);
            const activeElements = frameRateManager.timelineElements.filter(
              el => time >= el.startTime && time < el.startTime + el.duration
            );
            
            frames.push({
              frameNumber,
              time,
              elements: activeElements.map(el => ({
                ...el,
                localTime: time - el.startTime,
                sourceFrame: Math.floor((time - el.startTime) * el.frameRate),
                needsInterpolation: el.frameRate !== targetFrameRate,
              })),
            });
          }
          
          return {
            frames,
            totalFrames: frames.length,
            targetFrameRate,
            duration: totalDuration,
          };
        },
      };

      const detection = frameRateManager.detectFrameRates();
      expect(detection.mixed).toBe(true);
      expect(detection.detected).toEqual([30, 60]);
      expect(detection.dominant).toBe(30); // First occurrence

      const compatibility = frameRateManager.analyzeFrameRateCompatibility();
      expect(compatibility.compatible).toBe(true);
      expect(compatibility.strategy).toBe('frame_duplication'); // 60 is multiple of 30
      expect(compatibility.targetFrameRate).toBe(60);

      const unifiedTimeline = frameRateManager.createUnifiedTimeline(60);
      expect(unifiedTimeline.targetFrameRate).toBe(60);
      expect(unifiedTimeline.totalFrames).toBe(600); // 10s * 60fps
      expect(unifiedTimeline.frames[0].elements).toHaveLength(1); // Only video1 at start
    });

    it('should handle frame rate conversion strategies', () => {
      const conversionEngine = {
        strategies: {
          frame_duplication: {
            name: 'Frame Duplication',
            description: 'Duplicate frames for lower frame rates',
            suitable: (source: number, target: number) => target % source === 0,
            quality: 'good',
            performance: 'excellent',
          },
          frame_dropping: {
            name: 'Frame Dropping',
            description: 'Drop frames for higher frame rates',
            suitable: (source: number, target: number) => source % target === 0,
            quality: 'good',
            performance: 'excellent',
          },
          interpolation: {
            name: 'Frame Interpolation',
            description: 'Generate intermediate frames',
            suitable: () => true,
            quality: 'excellent',
            performance: 'poor',
          },
          blending: {
            name: 'Frame Blending',
            description: 'Blend adjacent frames',
            suitable: () => true,
            quality: 'fair',
            performance: 'good',
          },
        },

        selectStrategy: (sourceRate: number, targetRate: number) => {
          for (const [key, strategy] of Object.entries(conversionEngine.strategies)) {
            if (strategy.suitable(sourceRate, targetRate)) {
              return { strategy: key, ...strategy };
            }
          }
          return { strategy: 'interpolation', ...conversionEngine.strategies.interpolation };
        },

        calculateConversionRatio: (sourceRate: number, targetRate: number) => {
          const ratio = targetRate / sourceRate;
          return {
            ratio,
            sourceRate,
            targetRate,
            type: ratio > 1 ? 'upconversion' : ratio < 1 ? 'downconversion' : 'passthrough',
            complexity: Math.abs(ratio - Math.round(ratio)) < 0.001 ? 'simple' : 'complex',
          };
        },

        processFrameConversion: (sourceFrames: any[], conversionParams: any) => {
          const { ratio, type } = conversionParams;
          const convertedFrames = [];

          if (type === 'passthrough') {
            return sourceFrames;
          }

          if (type === 'upconversion' && Math.round(ratio) === ratio) {
            // Simple frame duplication
            for (const frame of sourceFrames) {
              for (let i = 0; i < ratio; i++) {
                convertedFrames.push({
                  ...frame,
                  originalIndex: frame.index,
                  duplicateIndex: i,
                  interpolated: i > 0,
                });
              }
            }
          } else if (type === 'downconversion' && Math.round(1/ratio) === 1/ratio) {
            // Simple frame dropping
            const dropRatio = Math.round(1/ratio);
            for (let i = 0; i < sourceFrames.length; i += dropRatio) {
              convertedFrames.push({
                ...sourceFrames[i],
                originalIndex: i,
                dropped: false,
              });
            }
          } else {
            // Complex interpolation needed
            const targetFrameCount = Math.round(sourceFrames.length * ratio);
            for (let i = 0; i < targetFrameCount; i++) {
              const sourceIndex = i / ratio;
              const baseIndex = Math.floor(sourceIndex);
              const nextIndex = Math.min(baseIndex + 1, sourceFrames.length - 1);
              const blend = sourceIndex - baseIndex;

              convertedFrames.push({
                index: i,
                baseFrame: sourceFrames[baseIndex],
                nextFrame: sourceFrames[nextIndex],
                blendFactor: blend,
                interpolated: blend > 0,
              });
            }
          }

          return convertedFrames;
        },
      };

      // Test 30fps to 60fps conversion
      const strategy30to60 = conversionEngine.selectStrategy(30, 60);
      expect(strategy30to60.strategy).toBe('frame_duplication');

      const conversion30to60 = conversionEngine.calculateConversionRatio(30, 60);
      expect(conversion30to60.ratio).toBe(2);
      expect(conversion30to60.type).toBe('upconversion');
      expect(conversion30to60.complexity).toBe('simple');

      // Test 60fps to 30fps conversion
      const strategy60to30 = conversionEngine.selectStrategy(60, 30);
      expect(strategy60to30.strategy).toBe('frame_dropping');

      const conversion60to30 = conversionEngine.calculateConversionRatio(60, 30);
      expect(conversion60to30.ratio).toBe(0.5);
      expect(conversion60to30.type).toBe('downconversion');

      // Test frame processing
      const sourceFrames = Array.from({ length: 10 }, (_, i) => ({ index: i, data: `frame${i}` }));
      const converted = conversionEngine.processFrameConversion(sourceFrames, conversion30to60);
      expect(converted).toHaveLength(20); // 10 * 2
      expect(converted[1].interpolated).toBe(true);
      expect(converted[1].duplicateIndex).toBe(1);
    });

    it('should maintain temporal accuracy across frame rate boundaries', () => {
      const temporalManager = {
        calculateFrameTime: (frameNumber: number, frameRate: number) => {
          return frameNumber / frameRate;
        },

        findNearestFrame: (targetTime: number, frameRate: number) => {
          const frameNumber = Math.round(targetTime * frameRate);
          const actualTime = frameNumber / frameRate;
          const error = Math.abs(targetTime - actualTime);
          
          return {
            frameNumber,
            actualTime,
            targetTime,
            error,
            errorMs: error * 1000,
            accurate: error < (0.5 / frameRate), // Within half frame
          };
        },

        synchronizeFrameRates: (elements: any[]) => {
          const transitions = [];
          
          for (let i = 0; i < elements.length - 1; i++) {
            const current = elements[i];
            const next = elements[i + 1];
            
            if (current.frameRate !== next.frameRate) {
              const transitionTime = current.startTime + current.duration;
              
              transitions.push({
                time: transitionTime,
                fromRate: current.frameRate,
                toRate: next.frameRate,
                fromFrame: Math.floor(current.duration * current.frameRate) - 1,
                toFrame: 0,
                syncError: temporalManager.calculateSyncError(transitionTime, current.frameRate, next.frameRate),
              });
            }
          }
          
          return transitions;
        },

        calculateSyncError: (time: number, rate1: number, rate2: number) => {
          const frame1 = temporalManager.findNearestFrame(time, rate1);
          const frame2 = temporalManager.findNearestFrame(time, rate2);
          
          return {
            timeDifference: Math.abs(frame1.actualTime - frame2.actualTime),
            rate1Frame: frame1,
            rate2Frame: frame2,
            maxAcceptableError: Math.min(0.5 / rate1, 0.5 / rate2),
            withinTolerance: Math.abs(frame1.actualTime - frame2.actualTime) < Math.min(0.5 / rate1, 0.5 / rate2),
          };
        },
      };

      // Test frame time calculation
      const frame30 = temporalManager.findNearestFrame(1.0, 30);
      expect(frame30.frameNumber).toBe(30); // 1 second at 30fps
      expect(frame30.actualTime).toBeCloseTo(1.0, 3);

      const frame60 = temporalManager.findNearestFrame(1.0, 60);
      expect(frame60.frameNumber).toBe(60); // 1 second at 60fps
      expect(frame60.actualTime).toBeCloseTo(1.0, 3);

      // Test synchronization
      const mixedElements = [
        { frameRate: 30, startTime: 0, duration: 5 },
        { frameRate: 60, startTime: 5, duration: 5 },
      ];

      const transitions = temporalManager.synchronizeFrameRates(mixedElements);
      expect(transitions).toHaveLength(1);
      expect(transitions[0].time).toBe(5);
      expect(transitions[0].fromRate).toBe(30);
      expect(transitions[0].toRate).toBe(60);
      expect(transitions[0].syncError.withinTolerance).toBe(true);
    });
  });

  describe('Sync Preservation', () => {
    it('should preserve audio-video sync during frame rate conversion', () => {
      const syncPreserver = {
        analyzeOriginalSync: (videoTrack: any, audioTrack: any) => {
          const videoFrames = Math.floor(videoTrack.duration * videoTrack.frameRate);
          const audioSamples = Math.floor(audioTrack.duration * audioTrack.sampleRate);
          
          return {
            videoFrames,
            audioSamples,
            videoDuration: videoFrames / videoTrack.frameRate,
            audioDuration: audioSamples / audioTrack.sampleRate,
            syncError: Math.abs((videoFrames / videoTrack.frameRate) - (audioSamples / audioTrack.sampleRate)),
            inSync: Math.abs((videoFrames / videoTrack.frameRate) - (audioSamples / audioTrack.sampleRate)) < 0.001,
          };
        },

        adjustAudioForFrameRateChange: (audioTrack: any, originalFrameRate: number, newFrameRate: number) => {
          const rateRatio = newFrameRate / originalFrameRate;
          
          if (Math.abs(rateRatio - 1) < 0.001) {
            return { adjusted: false, reason: 'no_change_needed' };
          }

          // Audio duration should remain the same, but timing markers need adjustment
          const adjustedMarkers = audioTrack.markers?.map((marker: any) => ({
            ...marker,
            time: marker.time, // Keep original time
            videoFrame: Math.round(marker.time * newFrameRate), // Adjust frame reference
            originalVideoFrame: Math.round(marker.time * originalFrameRate),
          }));

          return {
            adjusted: true,
            originalFrameRate,
            newFrameRate,
            rateRatio,
            duration: audioTrack.duration, // Unchanged
            markers: adjustedMarkers,
            syncStrategy: 'preserve_audio_timing',
          };
        },

        validateSyncAfterConversion: (originalVideo: any, convertedVideo: any, audio: any) => {
          const originalSync = syncPreserver.analyzeOriginalSync(originalVideo, audio);
          const convertedSync = syncPreserver.analyzeOriginalSync(convertedVideo, audio);
          
          const syncDrift = Math.abs(convertedSync.syncError - originalSync.syncError);
          
          return {
            originalSync: originalSync.syncError,
            convertedSync: convertedSync.syncError,
            syncDrift,
            acceptable: syncDrift < 0.040, // 40ms tolerance
            quality: syncDrift < 0.001 ? 'perfect' : syncDrift < 0.017 ? 'excellent' : syncDrift < 0.040 ? 'good' : 'poor',
            recommendation: syncDrift > 0.040 ? 'manual_adjustment_needed' : 'sync_preserved',
          };
        },

        implementSyncCompensation: (videoTrack: any, audioTrack: any, targetSync: number = 0) => {
          const currentSync = syncPreserver.analyzeOriginalSync(videoTrack, audioTrack);
          const compensation = targetSync - currentSync.syncError;
          
          if (Math.abs(compensation) < 0.001) {
            return { compensationNeeded: false };
          }

          return {
            compensationNeeded: true,
            compensationMs: compensation * 1000,
            method: compensation > 0 ? 'delay_audio' : 'advance_audio',
            adjustedAudioStartTime: audioTrack.startTime + compensation,
            preservedDuration: audioTrack.duration,
            syncTarget: targetSync,
          };
        },
      };

      // Test original sync analysis
      const videoTrack = { duration: 10, frameRate: 30 };
      const audioTrack = { duration: 10, sampleRate: 48000, startTime: 0 };
      
      const originalSync = syncPreserver.analyzeOriginalSync(videoTrack, audioTrack);
      expect(originalSync.inSync).toBe(true);
      expect(originalSync.syncError).toBeLessThan(0.001);

      // Test audio adjustment for frame rate change
      const audioAdjustment = syncPreserver.adjustAudioForFrameRateChange(audioTrack, 30, 60);
      expect(audioAdjustment.adjusted).toBe(true);
      expect(audioAdjustment.rateRatio).toBe(2);
      expect(audioAdjustment.syncStrategy).toBe('preserve_audio_timing');

      // Test sync validation after conversion
      const convertedVideo = { duration: 10, frameRate: 60 };
      const validation = syncPreserver.validateSyncAfterConversion(videoTrack, convertedVideo, audioTrack);
      expect(validation.acceptable).toBe(true);
      expect(validation.quality).toBe('perfect');

      // Test sync compensation
      const compensation = syncPreserver.implementSyncCompensation(videoTrack, audioTrack, 0);
      expect(compensation.compensationNeeded).toBe(false);
    });

    it('should handle complex mixed frame rate scenarios', () => {
      const complexScenarioManager = {
        createComplexTimeline: () => {
          return {
            tracks: [
              {
                type: 'video',
                elements: [
                  { id: 'v1', frameRate: 24, startTime: 0, duration: 3 },
                  { id: 'v2', frameRate: 30, startTime: 3, duration: 4 },
                  { id: 'v3', frameRate: 60, startTime: 7, duration: 3 },
                ],
              },
              {
                type: 'audio',
                elements: [
                  { id: 'a1', sampleRate: 48000, startTime: 0, duration: 10 },
                ],
              },
            ],
            totalDuration: 10,
          };
        },

        analyzeComplexity: (timeline: any) => {
          const videoTrack = timeline.tracks.find((t: any) => t.type === 'video');
          const frameRates = videoTrack.elements.map((e: any) => e.frameRate);
          const uniqueRates = [...new Set(frameRates)];
          
          const transitions = [];
          for (let i = 0; i < videoTrack.elements.length - 1; i++) {
            const current = videoTrack.elements[i];
            const next = videoTrack.elements[i + 1];
            transitions.push({
              time: current.startTime + current.duration,
              from: current.frameRate,
              to: next.frameRate,
              ratio: next.frameRate / current.frameRate,
            });
          }

          return {
            complexity: uniqueRates.length > 2 ? 'high' : uniqueRates.length > 1 ? 'medium' : 'low',
            uniqueFrameRates: uniqueRates,
            transitions,
            recommendedTargetRate: Math.max(...frameRates),
            conversionStrategies: transitions.map(t => ({
              time: t.time,
              strategy: t.ratio === 1 ? 'none' : t.ratio > 1 ? 'upconvert' : 'downconvert',
            })),
          };
        },

        optimizeForPerformance: (analysis: any) => {
          const { uniqueFrameRates, recommendedTargetRate } = analysis;
          
          // Find the lowest common multiple for efficient conversion
          const lcm = uniqueFrameRates.reduce((acc, rate) => {
            const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
            return (acc * rate) / gcd(acc, rate);
          });

          const optimized = {
            targetFrameRate: Math.min(lcm, 60), // Cap at 60fps for performance
            conversionComplexity: lcm > 60 ? 'high' : 'medium',
            memoryUsage: `${Math.round(lcm / 30 * 100)}% of baseline`,
            processingTime: `${Math.round(lcm / 30 * 100)}% of baseline`,
            recommendation: lcm > 60 ? 'consider_preprocessing' : 'realtime_capable',
          };

          return optimized;
        },
      };

      const complexTimeline = complexScenarioManager.createComplexTimeline();
      expect(complexTimeline.tracks).toHaveLength(2);
      expect(complexTimeline.tracks[0].elements).toHaveLength(3);

      const analysis = complexScenarioManager.analyzeComplexity(complexTimeline);
      expect(analysis.complexity).toBe('high'); // 3 different frame rates
      expect(analysis.uniqueFrameRates).toEqual([24, 30, 60]);
      expect(analysis.transitions).toHaveLength(2);
      expect(analysis.recommendedTargetRate).toBe(60);

      const optimization = complexScenarioManager.optimizeForPerformance(analysis);
      expect(optimization.targetFrameRate).toBeLessThanOrEqual(60);
      expect(optimization.recommendation).toBeDefined();
    });
  });
});