/**
 * Audio Delay Compensation Integration Tests
 * Tests audio offset handling, manual sync adjustment, and automatic compensation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Audio Delay Compensation Tests', () => {
  let mockAudioContext: any;
  let mockMediaElement: any;
  let mockPerformance: any;

  beforeEach(() => {
    // Mock AudioContext with delay compensation features
    mockAudioContext = {
      sampleRate: 48000,
      currentTime: 0,
      baseLatency: 0.005, // 5ms base latency
      outputLatency: 0.010, // 10ms output latency
      destination: {
        channelCount: 2,
        maxChannelCount: 32,
      },
      createBuffer: jest.fn(),
      createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        addEventListener: jest.fn(),
      }),
      createDelay: jest.fn().mockReturnValue({
        delayTime: { 
          value: 0,
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn(),
        },
        connect: jest.fn(),
      }),
      createGain: jest.fn().mockReturnValue({
        gain: { 
          value: 1.0,
          setValueAtTime: jest.fn(),
        },
        connect: jest.fn(),
      }),
      createAnalyser: jest.fn().mockReturnValue({
        fftSize: 2048,
        getByteTimeDomainData: jest.fn(),
        connect: jest.fn(),
      }),
    };

    // Mock media element
    mockMediaElement = {
      currentTime: 0,
      duration: 10,
      volume: 1.0,
      muted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
    };

    // Mock high-resolution timer
    mockPerformance = {
      now: jest.fn().mockReturnValue(0),
      mark: jest.fn(),
      measure: jest.fn(),
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

  describe('Audio Offset Handling', () => {
    it('should detect and measure audio offset', () => {
      const offsetDetector = {
        measureSystemLatency: async () => {
          // Simulate latency measurement using loopback or correlation
          const testToneFreq = 440; // Hz
          const testDuration = 0.1; // 100ms
          
          // Mock measurement process
          const measurementStart = performance.now();
          await new Promise(resolve => setTimeout(resolve, 20)); // Simulate measurement time
          const measurementEnd = performance.now();
          
          const systemLatency = (measurementEnd - measurementStart) / 1000;
          
          return {
            systemLatency,
            audioLatency: mockAudioContext.baseLatency + mockAudioContext.outputLatency,
            totalLatency: systemLatency + mockAudioContext.baseLatency + mockAudioContext.outputLatency,
            confidence: systemLatency < 0.1 ? 'high' : 'medium',
            method: 'loopback_correlation',
          };
        },

        detectOffsetFromReference: (audioTrack: any, referenceTrack: any) => {
          // Simulate cross-correlation analysis
          const sampleRate = audioTrack.sampleRate || 48000;
          const windowSize = Math.floor(sampleRate * 0.1); // 100ms window
          
          // Mock correlation results
          const correlationPeaks = [
            { offset: -0.025, confidence: 0.95 }, // 25ms early
            { offset: 0.000, confidence: 0.87 },  // Perfect sync
            { offset: 0.042, confidence: 0.91 },  // 42ms late
          ];
          
          const bestMatch = correlationPeaks.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );
          
          return {
            detectedOffset: bestMatch.offset,
            offsetMs: bestMatch.offset * 1000,
            confidence: bestMatch.confidence,
            direction: bestMatch.offset > 0 ? 'audio_late' : bestMatch.offset < 0 ? 'audio_early' : 'synchronized',
            allPeaks: correlationPeaks,
            analysisWindow: windowSize,
            method: 'cross_correlation',
          };
        },

        analyzeOffsetPatterns: (measurements: any[]) => {
          if (measurements.length < 3) {
            return { insufficient_data: true };
          }

          const offsets = measurements.map(m => m.detectedOffset);
          const mean = offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length;
          const variance = offsets.reduce((sum, offset) => sum + Math.pow(offset - mean, 2), 0) / offsets.length;
          const stdDev = Math.sqrt(variance);
          
          const isConsistent = stdDev < 0.005; // 5ms standard deviation
          const drift = measurements.length > 1 ? 
            (offsets[offsets.length - 1] - offsets[0]) / (measurements.length - 1) : 0;

          return {
            meanOffset: mean,
            meanOffsetMs: mean * 1000,
            standardDeviation: stdDev,
            isConsistent,
            drift: drift,
            driftMs: drift * 1000,
            pattern: isConsistent ? 'stable' : Math.abs(drift) > 0.001 ? 'drifting' : 'variable',
            recommendation: this.getOffsetRecommendation(mean, stdDev, drift),
          };
        },

        getOffsetRecommendation: (mean: number, stdDev: number, drift: number) => {
          if (Math.abs(mean) < 0.001 && stdDev < 0.005) {
            return { action: 'no_adjustment', reason: 'already_synchronized' };
          }
          
          if (Math.abs(mean) > 0.040) {
            return { 
              action: 'immediate_correction', 
              reason: 'significant_offset',
              urgency: 'high'
            };
          }
          
          if (Math.abs(drift) > 0.001) {
            return { 
              action: 'continuous_monitoring', 
              reason: 'offset_drift_detected',
              urgency: 'medium'
            };
          }
          
          return { 
            action: 'apply_compensation', 
            reason: 'minor_offset_detected',
            urgency: 'low'
          };
        },
      };

      // Test system latency measurement
      const latencyMeasurement = offsetDetector.measureSystemLatency();
      expect(latencyMeasurement).toBeInstanceOf(Promise);
      
      latencyMeasurement.then(result => {
        expect(result.totalLatency).toBeGreaterThan(0);
        expect(result.confidence).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(result.confidence);
      });

      // Test offset detection
      const audioTrack = { sampleRate: 48000, duration: 5 };
      const referenceTrack = { sampleRate: 48000, duration: 5 };
      
      const offsetResult = offsetDetector.detectOffsetFromReference(audioTrack, referenceTrack);
      expect(offsetResult.detectedOffset).toBeDefined();
      expect(offsetResult.confidence).toBeGreaterThan(0.8);
      expect(['audio_late', 'audio_early', 'synchronized']).toContain(offsetResult.direction);

      // Test pattern analysis
      const measurements = [
        { detectedOffset: 0.025 },
        { detectedOffset: 0.027 },
        { detectedOffset: 0.024 },
        { detectedOffset: 0.026 },
      ];
      
      const patterns = offsetDetector.analyzeOffsetPatterns(measurements);
      expect(patterns.meanOffsetMs).toBeCloseTo(25.5, 1);
      expect(patterns.isConsistent).toBe(true);
      expect(patterns.pattern).toBe('stable');
    });

    it('should handle variable offset scenarios', () => {
      const variableOffsetHandler = {
        simulateVariableConditions: () => {
          // Simulate different system conditions affecting offset
          return [
            { 
              condition: 'normal_load',
              offset: 0.015,
              variability: 0.002,
              description: 'Standard system load'
            },
            { 
              condition: 'high_cpu_load',
              offset: 0.035,
              variability: 0.008,
              description: 'High CPU usage affecting timing'
            },
            { 
              condition: 'thermal_throttling',
              offset: 0.055,
              variability: 0.015,
              description: 'CPU throttling due to heat'
            },
            { 
              condition: 'background_tasks',
              offset: 0.028,
              variability: 0.012,
              description: 'Background processes interfering'
            },
          ];
        },

        adaptToConditions: (condition: any) => {
          const baseCompensation = -condition.offset; // Negative to compensate
          const adaptiveMargin = condition.variability * 2; // Safety margin
          
          return {
            baseCompensation,
            safetyMargin: adaptiveMargin,
            recommendedCompensation: baseCompensation,
            confidence: condition.variability < 0.005 ? 'high' : 
                       condition.variability < 0.010 ? 'medium' : 'low',
            needsMonitoring: condition.variability > 0.005,
            updateFrequency: condition.variability > 0.010 ? 'continuous' : 'periodic',
          };
        },

        implementAdaptiveCompensation: (currentOffset: number, targetOffset: number = 0) => {
          const requiredAdjustment = targetOffset - currentOffset;
          const maxSafeAdjustment = 0.1; // 100ms max adjustment per step
          
          if (Math.abs(requiredAdjustment) > maxSafeAdjustment) {
            // Gradual adjustment for large offsets
            const steps = Math.ceil(Math.abs(requiredAdjustment) / maxSafeAdjustment);
            const stepSize = requiredAdjustment / steps;
            
            return {
              immediate: false,
              gradual: true,
              steps,
              stepSize,
              stepDuration: 0.5, // 500ms per step
              totalTime: steps * 0.5,
              finalCompensation: requiredAdjustment,
            };
          }
          
          return {
            immediate: true,
            gradual: false,
            compensation: requiredAdjustment,
            safe: Math.abs(requiredAdjustment) < 0.050, // 50ms is safe for immediate
          };
        },
      };

      const conditions = variableOffsetHandler.simulateVariableConditions();
      expect(conditions).toHaveLength(4);
      expect(conditions[0].condition).toBe('normal_load');

      // Test adaptation to high CPU load
      const highLoadCondition = conditions.find(c => c.condition === 'high_cpu_load');
      const adaptation = variableOffsetHandler.adaptToConditions(highLoadCondition);
      expect(adaptation.baseCompensation).toBeCloseTo(-0.035, 3);
      expect(adaptation.needsMonitoring).toBe(true);

      // Test adaptive compensation
      const largeOffset = 0.150; // 150ms offset
      const compensation = variableOffsetHandler.implementAdaptiveCompensation(largeOffset);
      expect(compensation.gradual).toBe(true);
      expect(compensation.steps).toBeGreaterThan(1);
      expect(Math.abs(compensation.stepSize)).toBeLessThanOrEqual(0.1);
    });
  });

  describe('Manual Sync Adjustment', () => {
    it('should provide manual sync adjustment controls', () => {
      const manualSyncController = {
        createAdjustmentInterface: () => {
          return {
            controls: {
              coarseAdjustment: {
                range: [-1000, 1000], // ±1 second in ms
                step: 10, // 10ms steps
                precision: 'frame', // Frame-accurate
              },
              fineAdjustment: {
                range: [-100, 100], // ±100ms
                step: 1, // 1ms steps
                precision: 'sample', // Sample-accurate
              },
              presets: [
                { name: 'TV Broadcast', offset: -67 }, // Common TV delay
                { name: 'Bluetooth Audio', offset: -200 }, // BT latency
                { name: 'USB Audio', offset: -20 }, // USB interface delay
                { name: 'HDMI Audio', offset: -40 }, // HDMI processing delay
              ],
            },
            realTimePreview: true,
            undoHistory: [],
            autoSave: true,
          };
        },

        applyManualAdjustment: (audioTrack: any, adjustmentMs: number) => {
          const adjustmentSeconds = adjustmentMs / 1000;
          const sampleRate = audioTrack.sampleRate || 48000;
          const sampleOffset = Math.round(adjustmentSeconds * sampleRate);
          
          return {
            originalStartTime: audioTrack.startTime || 0,
            adjustedStartTime: (audioTrack.startTime || 0) + adjustmentSeconds,
            adjustmentMs,
            adjustmentSeconds,
            sampleOffset,
            frameOffset: Math.round(adjustmentSeconds * 30), // Assuming 30fps
            preservedDuration: audioTrack.duration,
            applied: true,
            timestamp: Date.now(),
          };
        },

        validateAdjustment: (adjustment: any, limits: any = {}) => {
          const maxAdjustment = limits.maxAdjustmentMs || 1000;
          const minAdjustment = limits.minAdjustmentMs || -1000;
          
          const validation = {
            valid: true,
            warnings: [] as string[],
            errors: [] as string[],
          };

          if (adjustment.adjustmentMs > maxAdjustment) {
            validation.valid = false;
            validation.errors.push(`Adjustment ${adjustment.adjustmentMs}ms exceeds maximum ${maxAdjustment}ms`);
          }

          if (adjustment.adjustmentMs < minAdjustment) {
            validation.valid = false;
            validation.errors.push(`Adjustment ${adjustment.adjustmentMs}ms below minimum ${minAdjustment}ms`);
          }

          if (Math.abs(adjustment.adjustmentMs) > 500) {
            validation.warnings.push('Large adjustment may indicate system timing issues');
          }

          if (adjustment.adjustedStartTime < 0) {
            validation.valid = false;
            validation.errors.push('Adjustment would result in negative start time');
          }

          return validation;
        },

        createUndoSystem: () => {
          const history: any[] = [];
          
          return {
            saveState: (state: any) => {
              history.push({
                ...state,
                timestamp: Date.now(),
              });
              
              // Keep last 20 states
              if (history.length > 20) {
                history.shift();
              }
            },

            undo: () => {
              if (history.length < 2) {
                return { success: false, reason: 'no_previous_state' };
              }

              const currentState = history.pop();
              const previousState = history[history.length - 1];
              
              return {
                success: true,
                previousState,
                undoneState: currentState,
                historyLength: history.length,
              };
            },

            canUndo: () => history.length > 1,
            getHistory: () => [...history],
            clearHistory: () => history.length = 0,
          };
        },
      };

      // Test adjustment interface creation
      const interface = manualSyncController.createAdjustmentInterface();
      expect(interface.controls.coarseAdjustment.range).toEqual([-1000, 1000]);
      expect(interface.controls.presets).toHaveLength(4);
      expect(interface.realTimePreview).toBe(true);

      // Test manual adjustment application
      const audioTrack = { startTime: 1.0, duration: 5.0, sampleRate: 48000 };
      const adjustment = manualSyncController.applyManualAdjustment(audioTrack, -50);
      expect(adjustment.adjustedStartTime).toBe(0.95); // 1.0 - 0.05
      expect(adjustment.sampleOffset).toBe(-2400); // -50ms at 48kHz

      // Test adjustment validation
      const validation = manualSyncController.validateAdjustment(adjustment);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Test large adjustment warning
      const largeAdjustment = { adjustmentMs: 800, adjustedStartTime: 1.8 };
      const largeValidation = manualSyncController.validateAdjustment(largeAdjustment);
      expect(largeValidation.warnings).toContain('Large adjustment may indicate system timing issues');

      // Test undo system
      const undoSystem = manualSyncController.createUndoSystem();
      undoSystem.saveState({ adjustment: 0 });
      undoSystem.saveState({ adjustment: -50 });
      
      expect(undoSystem.canUndo()).toBe(true);
      
      const undoResult = undoSystem.undo();
      expect(undoResult.success).toBe(true);
      expect(undoResult.previousState.adjustment).toBe(0);
    });

    it('should provide visual sync adjustment tools', () => {
      const visualSyncTools = {
        createWaveformDisplay: (audioTrack: any, videoTrack: any) => {
          return {
            audioWaveform: {
              duration: audioTrack.duration,
              sampleRate: audioTrack.sampleRate,
              channels: audioTrack.channels || 2,
              peaks: this.generateMockPeaks(audioTrack.duration, 1000), // 1000 peaks
            },
            videoMarkers: {
              frames: Math.floor(videoTrack.duration * videoTrack.frameRate),
              frameRate: videoTrack.frameRate,
              keyframes: this.generateKeyFrameMarkers(videoTrack),
            },
            syncMarkers: [],
            zoomLevel: 1.0,
            pixelsPerSecond: 100,
          };
        },

        generateMockPeaks: (duration: number, peakCount: number) => {
          return Array.from({ length: peakCount }, (_, i) => {
            const time = (i / peakCount) * duration;
            const amplitude = Math.random() * 0.8 + 0.1; // 0.1 to 0.9
            return { time, amplitude };
          });
        },

        generateKeyFrameMarkers: (videoTrack: any) => {
          const frameCount = Math.floor(videoTrack.duration * videoTrack.frameRate);
          const keyFrames = [];
          
          // Assume keyframes every 30 frames (typical for web video)
          for (let i = 0; i < frameCount; i += 30) {
            keyFrames.push({
              frameNumber: i,
              time: i / videoTrack.frameRate,
              type: 'keyframe',
            });
          }
          
          return keyFrames;
        },

        addSyncMarker: (display: any, time: number, type: string = 'manual') => {
          const marker = {
            id: `marker_${Date.now()}`,
            time,
            type,
            timestamp: Date.now(),
            confidence: type === 'manual' ? 1.0 : 0.8,
          };
          
          display.syncMarkers.push(marker);
          return marker;
        },

        calculateVisualOffset: (audioMarker: any, videoMarker: any) => {
          const offset = audioMarker.time - videoMarker.time;
          return {
            offset,
            offsetMs: offset * 1000,
            direction: offset > 0 ? 'audio_late' : offset < 0 ? 'audio_early' : 'synchronized',
            confidence: Math.min(audioMarker.confidence, videoMarker.confidence),
            visualAccuracy: Math.abs(offset) < 0.1 ? 'frame_accurate' : 'approximate',
          };
        },

        implementDragAdjustment: (display: any, dragDelta: number) => {
          const timePerPixel = 1 / display.pixelsPerSecond;
          const timeDelta = dragDelta * timePerPixel;
          
          return {
            originalTime: 0, // Would be current audio start time
            adjustedTime: timeDelta,
            deltaMs: timeDelta * 1000,
            pixelDelta: dragDelta,
            previewMode: true,
            snapToFrame: Math.abs(timeDelta % (1/30)) < 0.01, // Snap to 30fps frames
          };
        },
      };

      // Test waveform display creation
      const audioTrack = { duration: 10, sampleRate: 48000, channels: 2 };
      const videoTrack = { duration: 10, frameRate: 30 };
      
      const display = visualSyncTools.createWaveformDisplay(audioTrack, videoTrack);
      expect(display.audioWaveform.peaks).toHaveLength(1000);
      expect(display.videoMarkers.frames).toBe(300); // 10s * 30fps

      // Test sync marker addition
      const marker = visualSyncTools.addSyncMarker(display, 5.0, 'manual');
      expect(marker.time).toBe(5.0);
      expect(marker.confidence).toBe(1.0);
      expect(display.syncMarkers).toHaveLength(1);

      // Test visual offset calculation
      const audioMarker = { time: 5.05, confidence: 1.0 };
      const videoMarker = { time: 5.0, confidence: 1.0 };
      const visualOffset = visualSyncTools.calculateVisualOffset(audioMarker, videoMarker);
      expect(visualOffset.offsetMs).toBe(50);
      expect(visualOffset.direction).toBe('audio_late');

      // Test drag adjustment
      const dragResult = visualSyncTools.implementDragAdjustment(display, -50); // 50 pixels left
      expect(dragResult.deltaMs).toBe(-500); // -50px * 10ms/px = -500ms
      expect(dragResult.previewMode).toBe(true);
    });
  });

  describe('Automatic Compensation', () => {
    it('should implement automatic offset compensation', () => {
      const autoCompensator = {
        initializeAutoCompensation: (audioContext: AudioContext) => {
          const compensationChain = {
            delayNode: audioContext.createDelay(1.0), // Max 1 second delay
            gainNode: audioContext.createGain(),
            analyserNode: audioContext.createAnalyser(),
            connected: false,
          };

          return {
            chain: compensationChain,
            currentCompensation: 0,
            targetCompensation: 0,
            smoothingTime: 0.1, // 100ms smoothing
            maxCompensation: 1.0, // 1 second max
            enabled: false,
          };
        },

        connectCompensationChain: (compensator: any, source: any, destination: any) => {
          const { chain } = compensator;
          
          // Connect: source -> delay -> gain -> analyser -> destination
          source.connect(chain.delayNode);
          chain.delayNode.connect(chain.gainNode);
          chain.gainNode.connect(chain.analyserNode);
          chain.analyserNode.connect(destination);
          
          compensator.chain.connected = true;
          
          return {
            connected: true,
            chain: ['source', 'delay', 'gain', 'analyser', 'destination'],
            latency: compensator.currentCompensation,
          };
        },

        setCompensation: (compensator: any, compensationMs: number, audioContext: AudioContext) => {
          const compensationSeconds = Math.max(0, Math.min(compensationMs / 1000, compensator.maxCompensation));
          const currentTime = audioContext.currentTime;
          
          // Smooth transition to new compensation value
          compensator.chain.delayNode.delayTime.setValueAtTime(
            compensator.currentCompensation,
            currentTime
          );
          compensator.chain.delayNode.delayTime.linearRampToValueAtTime(
            compensationSeconds,
            currentTime + compensator.smoothingTime
          );
          
          compensator.targetCompensation = compensationSeconds;
          
          return {
            previousCompensation: compensator.currentCompensation * 1000,
            newCompensation: compensationMs,
            transitionTime: compensator.smoothingTime,
            applied: true,
            timestamp: currentTime,
          };
        },

        monitorCompensationAccuracy: (compensator: any) => {
          // Simulate monitoring of actual vs target compensation
          const accuracy = {
            targetCompensation: compensator.targetCompensation,
            actualCompensation: compensator.targetCompensation + (Math.random() - 0.5) * 0.001, // ±0.5ms variance
            error: 0,
            errorMs: 0,
            acceptable: true,
          };
          
          accuracy.error = accuracy.actualCompensation - accuracy.targetCompensation;
          accuracy.errorMs = accuracy.error * 1000;
          accuracy.acceptable = Math.abs(accuracy.errorMs) < 5; // 5ms tolerance
          
          return accuracy;
        },

        implementFeedbackControl: (targetOffset: number, measuredOffset: number, previousAdjustment: number = 0) => {
          // Simple PID-like controller
          const error = targetOffset - measuredOffset;
          const kP = 0.8; // Proportional gain
          const kI = 0.1; // Integral gain (simplified)
          const kD = 0.05; // Derivative gain
          
          const proportional = kP * error;
          const integral = kI * error; // Simplified - would need error history
          const derivative = kD * (error - previousAdjustment);
          
          const adjustment = proportional + integral + derivative;
          const maxAdjustment = 0.1; // 100ms max adjustment per iteration
          const clampedAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, adjustment));
          
          return {
            error,
            errorMs: error * 1000,
            adjustment: clampedAdjustment,
            adjustmentMs: clampedAdjustment * 1000,
            components: {
              proportional,
              integral,
              derivative,
            },
            stable: Math.abs(error) < 0.005, // 5ms stability threshold
            overshoot: Math.abs(adjustment) > Math.abs(error),
          };
        },
      };

      // Test auto compensation initialization
      const compensator = autoCompensator.initializeAutoCompensation(mockAudioContext);
      expect(compensator.chain.delayNode).toBeDefined();
      expect(compensator.maxCompensation).toBe(1.0);
      expect(compensator.enabled).toBe(false);

      // Test compensation chain connection
      const mockSource = { connect: jest.fn() };
      const mockDestination = { connect: jest.fn() };
      const connection = autoCompensator.connectCompensationChain(compensator, mockSource, mockDestination);
      expect(connection.connected).toBe(true);
      expect(connection.chain).toHaveLength(5);

      // Test compensation setting
      const compensationResult = autoCompensator.setCompensation(compensator, 50, mockAudioContext);
      expect(compensationResult.newCompensation).toBe(50);
      expect(compensationResult.applied).toBe(true);
      expect(mockAudioContext.createDelay().delayTime.linearRampToValueAtTime).toHaveBeenCalled();

      // Test accuracy monitoring
      compensator.targetCompensation = 0.05; // 50ms
      const accuracy = autoCompensator.monitorCompensationAccuracy(compensator);
      expect(accuracy.targetCompensation).toBe(0.05);
      expect(accuracy.acceptable).toBe(true);

      // Test feedback control
      const feedback = autoCompensator.implementFeedbackControl(0, 0.025, 0); // Target 0, measured 25ms
      expect(feedback.errorMs).toBe(-25);
      expect(feedback.adjustmentMs).toBeLessThan(0); // Should adjust to reduce positive offset
      expect(Math.abs(feedback.adjustmentMs)).toBeLessThanOrEqual(100); // Within max adjustment
    });

    it('should handle automatic compensation edge cases', () => {
      const edgeCaseHandler = {
        handleExtremeOffsets: (offsetMs: number) => {
          const maxSafeOffset = 500; // 500ms max safe compensation
          
          if (Math.abs(offsetMs) > maxSafeOffset) {
            return {
              safe: false,
              recommended: offsetMs > 0 ? maxSafeOffset : -maxSafeOffset,
              reason: 'offset_exceeds_safe_limits',
              originalOffset: offsetMs,
              clampedOffset: Math.max(-maxSafeOffset, Math.min(maxSafeOffset, offsetMs)),
              requiresManualReview: true,
            };
          }
          
          return {
            safe: true,
            recommended: offsetMs,
            reason: 'within_safe_limits',
          };
        },

        handleCompensationFailures: (error: any) => {
          const failures = {
            'insufficient_precision': {
              description: 'System cannot achieve required precision',
              fallback: 'reduce_precision_requirements',
              recovery: 'manual_adjustment',
            },
            'hardware_limitation': {
              description: 'Audio hardware limitation',
              fallback: 'software_buffering',
              recovery: 'increase_buffer_size',
            },
            'system_overload': {
              description: 'System too busy for precise timing',
              fallback: 'reduce_processing_load',
              recovery: 'restart_audio_engine',
            },
          };
          
          const failureType = error.type || 'unknown';
          const handling = failures[failureType] || {
            description: 'Unknown compensation failure',
            fallback: 'disable_auto_compensation',
            recovery: 'manual_sync_only',
          };
          
          return {
            ...handling,
            originalError: error,
            timestamp: Date.now(),
            actionRequired: true,
          };
        },

        implementGracefulDegradation: (currentAccuracy: number, targetAccuracy: number = 0.005) => {
          const accuracyRatio = currentAccuracy / targetAccuracy;
          
          if (accuracyRatio <= 1) {
            return { 
              mode: 'optimal',
              adjustments: 'none',
              quality: 'excellent',
            };
          }
          
          if (accuracyRatio <= 2) {
            return {
              mode: 'reduced_precision',
              adjustments: 'increase_smoothing',
              quality: 'good',
              compensationSmoothingMs: 200, // Increase from 100ms
            };
          }
          
          if (accuracyRatio <= 5) {
            return {
              mode: 'coarse_compensation',
              adjustments: 'reduce_update_frequency',
              quality: 'acceptable',
              updateFrequencyHz: 5, // Reduce from 10Hz
            };
          }
          
          return {
            mode: 'manual_only',
            adjustments: 'disable_auto_compensation',
            quality: 'poor',
            recommendation: 'switch_to_manual_sync',
          };
        },
      };

      // Test extreme offset handling
      const extremeOffset = edgeCaseHandler.handleExtremeOffsets(750); // 750ms
      expect(extremeOffset.safe).toBe(false);
      expect(extremeOffset.clampedOffset).toBe(500);
      expect(extremeOffset.requiresManualReview).toBe(true);

      const safeOffset = edgeCaseHandler.handleExtremeOffsets(100); // 100ms
      expect(safeOffset.safe).toBe(true);
      expect(safeOffset.recommended).toBe(100);

      // Test compensation failure handling
      const failure = { type: 'hardware_limitation', message: 'Audio device error' };
      const handling = edgeCaseHandler.handleCompensationFailures(failure);
      expect(handling.description).toContain('Audio hardware limitation');
      expect(handling.fallback).toBe('software_buffering');
      expect(handling.actionRequired).toBe(true);

      // Test graceful degradation
      const optimal = edgeCaseHandler.implementGracefulDegradation(0.003, 0.005);
      expect(optimal.mode).toBe('optimal');
      expect(optimal.quality).toBe('excellent');

      const degraded = edgeCaseHandler.implementGracefulDegradation(0.015, 0.005);
      expect(degraded.mode).toBe('reduced_precision');
      expect(degraded.compensationSmoothingMs).toBe(200);

      const manual = edgeCaseHandler.implementGracefulDegradation(0.030, 0.005);
      expect(manual.mode).toBe('manual_only');
      expect(manual.recommendation).toBe('switch_to_manual_sync');
    });
  });
});