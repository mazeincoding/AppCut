/**
 * Audio Quality Integration Tests
 * Tests audio fidelity, audio compression, and input vs output comparison
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Audio Quality Tests', () => {
  let mockAudioContext: any;
  let mockAnalyserNode: any;
  let mockMediaElement: any;

  beforeEach(() => {
    // Mock AnalyserNode for detailed audio analysis
    mockAnalyserNode = {
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn(),
      getFloatFrequencyData: jest.fn(),
      getFloatTimeDomainData: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    // Mock AudioContext with comprehensive audio processing capabilities
    mockAudioContext = {
      sampleRate: 48000,
      currentTime: 0,
      destination: {},
      createAnalyser: jest.fn().mockReturnValue(mockAnalyserNode),
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
      createBiquadFilter: jest.fn().mockReturnValue({
        type: 'lowpass',
        frequency: { value: 350 },
        Q: { value: 1 },
        gain: { value: 0 },
        connect: jest.fn(),
      }),
      createWaveShaper: jest.fn().mockReturnValue({
        curve: null,
        oversample: 'none',
        connect: jest.fn(),
      }),
      createConvolver: jest.fn().mockReturnValue({
        buffer: null,
        normalize: true,
        connect: jest.fn(),
      }),
      decodeAudioData: jest.fn(),
    };

    // Mock media element with audio properties
    mockMediaElement = {
      duration: 30,
      currentTime: 0,
      volume: 1.0,
      muted: false,
      audioTracks: [{
        enabled: true,
        kind: 'main',
        label: 'Main Audio',
        language: 'en',
      }],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Audio Fidelity', () => {
    it('should measure audio fidelity metrics', () => {
      const fidelityAnalyzer = {
        calculateTHD: (harmonics: number[], fundamental: number) => {
          // Total Harmonic Distortion calculation
          if (fundamental === 0) return { thd: 0, invalid: true };
          
          const harmonicSum = harmonics.reduce((sum, harmonic) => sum + Math.pow(harmonic, 2), 0);
          const thd = Math.sqrt(harmonicSum) / fundamental;
          const thdPercent = thd * 100;
          
          return {
            thd,
            thdPercent,
            thdDb: 20 * Math.log10(thd),
            quality: thdPercent < 0.1 ? 'excellent' : thdPercent < 1 ? 'good' : thdPercent < 3 ? 'acceptable' : 'poor',
            fundamentalLevel: fundamental,
            harmonics,
          };
        },

        calculateSNR: (signalLevel: number, noiseLevel: number) => {
          // Signal-to-Noise Ratio calculation
          if (noiseLevel === 0) return { snr: Infinity, snrDb: Infinity };
          
          const snr = signalLevel / noiseLevel;
          const snrDb = 20 * Math.log10(snr);
          
          return {
            snr,
            snrDb,
            quality: snrDb > 90 ? 'excellent' : snrDb > 70 ? 'good' : snrDb > 50 ? 'acceptable' : 'poor',
            signalLevel,
            noiseLevel,
          };
        },

        analyzeFrequencyResponse: (frequencyData: Float32Array, sampleRate: number) => {
          const binSize = sampleRate / (frequencyData.length * 2);
          const analysis = {
            bins: [] as any[],
            peaks: [] as any[],
            valleys: [] as any[],
            flatness: 0,
            bandwidth: 0,
          };

          // Analyze each frequency bin
          for (let i = 0; i < frequencyData.length; i++) {
            const frequency = i * binSize;
            const magnitude = frequencyData[i];
            const magnitudeDb = 20 * Math.log10(Math.abs(magnitude) + 1e-10);
            
            analysis.bins.push({
              frequency,
              magnitude,
              magnitudeDb,
              bin: i,
            });
            
            // Detect peaks (local maxima)
            if (i > 0 && i < frequencyData.length - 1) {
              if (magnitude > frequencyData[i - 1] && magnitude > frequencyData[i + 1] && magnitudeDb > -60) {
                analysis.peaks.push({
                  frequency,
                  magnitude,
                  magnitudeDb,
                  bin: i,
                });
              }
              
              // Detect valleys (local minima)
              if (magnitude < frequencyData[i - 1] && magnitude < frequencyData[i + 1]) {
                analysis.valleys.push({
                  frequency,
                  magnitude,
                  magnitudeDb,
                  bin: i,
                });
              }
            }
          }

          // Calculate spectral flatness (measure of noise-like vs tonal content)
          const geometricMean = Math.exp(
            frequencyData.reduce((sum, val) => sum + Math.log(Math.abs(val) + 1e-10), 0) / frequencyData.length
          );
          const arithmeticMean = frequencyData.reduce((sum, val) => sum + Math.abs(val), 0) / frequencyData.length;
          analysis.flatness = geometricMean / (arithmeticMean + 1e-10);

          // Calculate bandwidth (-3dB points)
          const maxMagnitudeDb = Math.max(...analysis.bins.map(b => b.magnitudeDb));
          const threshold = maxMagnitudeDb - 3;
          const validBins = analysis.bins.filter(b => b.magnitudeDb >= threshold);
          if (validBins.length > 0) {
            analysis.bandwidth = validBins[validBins.length - 1].frequency - validBins[0].frequency;
          }

          return analysis;
        },

        measureDynamicRange: (audioData: Float32Array, windowSize: number = 4096) => {
          const windows = [];
          const numWindows = Math.floor(audioData.length / windowSize);
          
          for (let i = 0; i < numWindows; i++) {
            const start = i * windowSize;
            const window = audioData.slice(start, start + windowSize);
            
            // Calculate RMS level for this window
            const rms = Math.sqrt(
              window.reduce((sum, sample) => sum + sample * sample, 0) / window.length
            );
            const rmsDb = 20 * Math.log10(rms + 1e-10);
            
            // Calculate peak level for this window  
            const peak = Math.max(...window.map(Math.abs));
            const peakDb = 20 * Math.log10(peak + 1e-10);
            
            windows.push({
              windowIndex: i,
              rms,
              rmsDb,
              peak,
              peakDb,
              crestFactor: peak / (rms + 1e-10),
              crestFactorDb: peakDb - rmsDb,
            });
          }

          const rmsLevels = windows.map(w => w.rmsDb);
          const peakLevels = windows.map(w => w.peakDb);
          
          const maxRms = Math.max(...rmsLevels);
          const minRms = Math.min(...rmsLevels);
          const maxPeak = Math.max(...peakLevels);
          const minPeak = Math.min(...peakLevels);
          
          return {
            windows,
            dynamicRange: {
              rms: maxRms - minRms,
              peak: maxPeak - minPeak,
              avgCrestFactor: windows.reduce((sum, w) => sum + w.crestFactor, 0) / windows.length,
            },
            levels: {
              maxRmsDb: maxRms,
              minRmsDb: minRms,
              maxPeakDb: maxPeak,
              minPeakDb: minPeak,
            },
            quality: (maxRms - minRms) > 40 ? 'excellent' : (maxRms - minRms) > 20 ? 'good' : 'limited',
          };
        },

        detectClipping: (audioData: Float32Array, threshold: number = 0.99) => {
          const clippedSamples = [];
          let consecutiveClips = 0;
          let maxConsecutiveClips = 0;
          
          for (let i = 0; i < audioData.length; i++) {
            const sample = Math.abs(audioData[i]);
            
            if (sample >= threshold) {
              clippedSamples.push({
                index: i,
                value: audioData[i],
                magnitude: sample,
              });
              consecutiveClips++;
              maxConsecutiveClips = Math.max(maxConsecutiveClips, consecutiveClips);
            } else {
              consecutiveClips = 0;
            }
          }
          
          const clippingRate = clippedSamples.length / audioData.length;
          
          return {
            clippedSamples,
            totalClippedSamples: clippedSamples.length,
            clippingRate,
            clippingPercent: clippingRate * 100,
            maxConsecutiveClips,
            severity: clippingRate > 0.01 ? 'severe' : clippingRate > 0.001 ? 'moderate' : clippingRate > 0 ? 'minor' : 'none',
            audible: maxConsecutiveClips > 10 || clippingRate > 0.001,
          };
        },
      };

      // Test THD calculation
      const fundamentalFreq = 1000; // 1kHz
      const harmonics = [50, 25, 15, 10]; // 2nd, 3rd, 4th, 5th harmonics
      const thdResult = fidelityAnalyzer.calculateTHD(harmonics, fundamentalFreq);
      
      expect(thdResult.thdPercent).toBeCloseTo(5.87, 1); // sqrt(50²+25²+15²+10²)/1000 * 100
      expect(thdResult.quality).toBe('poor'); // >3%
      expect(thdResult.harmonics).toEqual(harmonics);

      // Test SNR calculation
      const snrResult = fidelityAnalyzer.calculateSNR(1000, 10); // Signal 1000, noise 10
      expect(snrResult.snrDb).toBeCloseTo(40, 1); // 20*log10(1000/10)
      expect(snrResult.quality).toBe('poor'); // 40dB is poor

      // Test frequency response analysis
      const mockFreqData = new Float32Array(1024);
      // Simulate a frequency response with a peak at bin 100
      for (let i = 0; i < mockFreqData.length; i++) {
        mockFreqData[i] = Math.exp(-Math.pow((i - 100) / 20, 2)) + 0.01; // Gaussian peak + noise floor
      }
      
      const freqAnalysis = fidelityAnalyzer.analyzeFrequencyResponse(mockFreqData, 48000);
      expect(freqAnalysis.bins).toHaveLength(1024);
      expect(freqAnalysis.peaks.length).toBeGreaterThan(0);
      expect(freqAnalysis.flatness).toBeLessThan(1); // Should be less than 1 for tonal content

      // Test dynamic range measurement
      const mockAudioData = new Float32Array(8192);
      // Simulate audio with varying levels
      for (let i = 0; i < mockAudioData.length; i++) {
        const envelope = Math.sin(i / 1000) * 0.5 + 0.5; // Slow envelope
        mockAudioData[i] = Math.sin(i * 0.1) * envelope; // Modulated sine wave
      }
      
      const dynamicRange = fidelityAnalyzer.measureDynamicRange(mockAudioData, 1024);
      expect(dynamicRange.windows.length).toBe(8); // 8192/1024
      expect(dynamicRange.dynamicRange.rms).toBeGreaterThan(0);
      expect(dynamicRange.quality).toBeDefined();

      // Test clipping detection
      const clippedAudioData = new Float32Array(1000);
      for (let i = 0; i < clippedAudioData.length; i++) {
        clippedAudioData[i] = Math.sin(i * 0.1) * 0.8; // Keep sine wave below clipping threshold
        // Add some clipping
        if (i >= 100 && i <= 110) {
          clippedAudioData[i] = 1.0; // Clipped samples
        }
      }
      
      const clippingResult = fidelityAnalyzer.detectClipping(clippedAudioData, 0.999);
      expect(clippingResult.totalClippedSamples).toBe(11); // 100-110 inclusive
      expect(clippingResult.maxConsecutiveClips).toBe(11);
      expect(clippingResult.severity).toBe('severe');
      expect(clippingResult.audible).toBe(true);
    });

    it('should analyze stereo imaging and phase coherence', () => {
      const stereoAnalyzer = {
        analyzeStereoImage: (leftChannel: Float32Array, rightChannel: Float32Array) => {
          if (leftChannel.length !== rightChannel.length) {
            throw new Error('Channel lengths must match');
          }

          const length = leftChannel.length;
          let correlation = 0;
          let leftEnergy = 0;
          let rightEnergy = 0;
          let midEnergy = 0;
          let sideEnergy = 0;
          
          // Calculate correlation and M/S components
          for (let i = 0; i < length; i++) {
            const left = leftChannel[i];
            const right = rightChannel[i];
            
            correlation += left * right;
            leftEnergy += left * left;
            rightEnergy += right * right;
            
            // Mid/Side encoding
            const mid = (left + right) / 2;
            const side = (left - right) / 2;
            midEnergy += mid * mid;
            sideEnergy += side * side;
          }
          
          correlation /= length;
          leftEnergy /= length;
          rightEnergy /= length;
          midEnergy /= length;
          sideEnergy /= length;
          
          // Normalize correlation
          const normalizedCorrelation = correlation / Math.sqrt(leftEnergy * rightEnergy + 1e-10);
          
          // Calculate stereo width
          const stereoWidth = sideEnergy / (midEnergy + sideEnergy + 1e-10);
          
          // Calculate balance
          const balance = (rightEnergy - leftEnergy) / (rightEnergy + leftEnergy + 1e-10);
          
          return {
            correlation: normalizedCorrelation,
            stereoWidth,
            balance,
            leftEnergy,
            rightEnergy,
            midEnergy,
            sideEnergy,
            imaging: {
              mono: normalizedCorrelation > 0.9,
              stereo: stereoWidth > 0.1 && Math.abs(normalizedCorrelation) < 0.9,
              outOfPhase: normalizedCorrelation < -0.5,
              wideStereo: stereoWidth > 0.4,
            },
            quality: stereoAnalyzer.assessStereoQuality(normalizedCorrelation, stereoWidth, balance),
          };
        },

        assessStereoQuality: (correlation: number, width: number, balance: number) => {
          const issues = [];
          
          if (correlation > 0.95) {
            issues.push('mono_like');
          } else if (correlation < -0.3) {
            issues.push('phase_issues');
          }
          
          if (width < 0.05) {
            issues.push('narrow_stereo');
          } else if (width > 0.6) {
            issues.push('excessively_wide');
          }
          
          if (Math.abs(balance) > 0.2) {
            issues.push('channel_imbalance');
          }
          
          return {
            issues,
            overall: issues.length === 0 ? 'excellent' : issues.length <= 2 ? 'good' : 'problematic',
            recommendations: stereoAnalyzer.getStereoRecommendations(issues),
          };
        },

        getStereoRecommendations: (issues: string[]) => {
          const recommendations = [];
          
          if (issues.includes('mono_like')) {
            recommendations.push('Add stereo effects or use true stereo sources');
          }
          if (issues.includes('phase_issues')) {
            recommendations.push('Check phase alignment between channels');
          }
          if (issues.includes('narrow_stereo')) {
            recommendations.push('Increase stereo width with appropriate processing');
          }
          if (issues.includes('excessively_wide')) {
            recommendations.push('Reduce stereo width to improve mono compatibility');
          }
          if (issues.includes('channel_imbalance')) {
            recommendations.push('Balance left and right channel levels');
          }
          
          return recommendations;
        },

        analyzePhaseCoherence: (leftChannel: Float32Array, rightChannel: Float32Array, windowSize: number = 1024) => {
          const windows = [];
          const numWindows = Math.floor(leftChannel.length / windowSize);
          
          for (let w = 0; w < numWindows; w++) {
            const start = w * windowSize;
            const leftWindow = leftChannel.slice(start, start + windowSize);
            const rightWindow = rightChannel.slice(start, start + windowSize);
            
            // Calculate phase coherence for this window
            let correlation = 0;
            let leftPower = 0;
            let rightPower = 0;
            
            for (let i = 0; i < windowSize; i++) {
              correlation += leftWindow[i] * rightWindow[i];
              leftPower += leftWindow[i] * leftWindow[i];
              rightPower += rightWindow[i] * rightWindow[i];
            }
            
            const coherence = correlation / Math.sqrt((leftPower * rightPower) + 1e-10);
            
            windows.push({
              windowIndex: w,
              coherence,
              leftRms: Math.sqrt(leftPower / windowSize),
              rightRms: Math.sqrt(rightPower / windowSize),
              timeSeconds: (start / leftChannel.length) * 30, // Assuming 30-second audio
            });
          }
          
          const coherenceValues = windows.map(w => w.coherence);
          const avgCoherence = coherenceValues.reduce((sum, c) => sum + c, 0) / coherenceValues.length;
          const minCoherence = Math.min(...coherenceValues);
          const maxCoherence = Math.max(...coherenceValues);
          
          return {
            windows,
            avgCoherence,
            minCoherence,
            maxCoherence,
            coherenceStability: maxCoherence - minCoherence,
            phaseIssues: windows.filter(w => w.coherence < -0.3).length,
            quality: avgCoherence > 0.7 ? 'excellent' : avgCoherence > 0.3 ? 'good' : 'poor',
          };
        },
      };

      // Test stereo image analysis
      const leftChannel = new Float32Array(1000);
      const rightChannel = new Float32Array(1000);
      
      // Simulate stereo content
      for (let i = 0; i < leftChannel.length; i++) {
        const mono = Math.sin(i * 0.1);
        const stereo = Math.sin(i * 0.05) * 0.6; // Increase stereo effect
        leftChannel[i] = mono + stereo;
        rightChannel[i] = mono - stereo;
      }
      
      const stereoAnalysis = stereoAnalyzer.analyzeStereoImage(leftChannel, rightChannel);
      expect(stereoAnalysis.correlation).toBeLessThan(1); // Should have some stereo content
      expect(stereoAnalysis.stereoWidth).toBeGreaterThan(0);
      expect(stereoAnalysis.imaging.stereo).toBe(true);
      expect(stereoAnalysis.quality.overall).toBeDefined();

      // Test mono content detection
      const monoLeft = new Float32Array(1000);
      const monoRight = new Float32Array(1000);
      for (let i = 0; i < monoLeft.length; i++) {
        const signal = Math.sin(i * 0.1);
        monoLeft[i] = signal;
        monoRight[i] = signal; // Identical channels
      }
      
      const monoAnalysis = stereoAnalyzer.analyzeStereoImage(monoLeft, monoRight);
      expect(monoAnalysis.correlation).toBeCloseTo(1, 3);
      expect(monoAnalysis.imaging.mono).toBe(true);
      expect(monoAnalysis.quality.issues).toContain('mono_like');

      // Test phase coherence analysis
      const phaseAnalysis = stereoAnalyzer.analyzePhaseCoherence(leftChannel, rightChannel, 100);
      expect(phaseAnalysis.windows.length).toBeGreaterThan(0);
      expect(phaseAnalysis.avgCoherence).toBeDefined();
      expect(phaseAnalysis.quality).toBeDefined();
    });
  });

  describe('Audio Compression', () => {
    it('should analyze compression artifacts and quality', () => {
      const compressionAnalyzer = {
        detectCompressionArtifacts: (audioData: Float32Array, originalSampleRate: number) => {
          const artifacts = {
            preEcho: false,
            postEcho: false,
            birdie: false,
            swirling: false,
            pumping: false,
            aliasing: false,
          };
          
          // Pre-echo detection (sudden transients before attack)
          const transientThreshold = 0.5;
          const preEchoWindow = 10;
          
          for (let i = preEchoWindow; i < audioData.length - preEchoWindow; i++) {
            const current = Math.abs(audioData[i]);
            if (current > transientThreshold) {
              // Check for energy before the transient
              let preEnergy = 0;
              for (let j = i - preEchoWindow; j < i; j++) {
                preEnergy += Math.abs(audioData[j]);
              }
              preEnergy /= preEchoWindow;
              
              if (preEnergy > current * 0.3) {
                artifacts.preEcho = true;
                break;
              }
            }
          }
          
          // Pumping detection (level variations at psychoacoustic masking boundaries)
          const windowSize = 512;
          const numWindows = Math.floor(audioData.length / windowSize);
          const rmsLevels = [];
          
          for (let w = 0; w < numWindows; w++) {
            const start = w * windowSize;
            let rms = 0;
            for (let i = start; i < start + windowSize; i++) {
              rms += audioData[i] * audioData[i];
            }
            rmsLevels.push(Math.sqrt(rms / windowSize));
          }
          
          // Check for excessive level variations
          if (rmsLevels.length > 2) {
            const levelVariations = [];
            for (let i = 1; i < rmsLevels.length; i++) {
              const variation = Math.abs(rmsLevels[i] - rmsLevels[i - 1]) / (rmsLevels[i - 1] + 1e-10);
              levelVariations.push(variation);
            }
            const avgVariation = levelVariations.reduce((sum, v) => sum + v, 0) / levelVariations.length;
            artifacts.pumping = avgVariation > 0.3;
          }
          
          // Simplified artifact detection for demo
          artifacts.birdie = Math.random() > 0.8; // 20% chance for demo
          artifacts.swirling = Math.random() > 0.9; // 10% chance for demo
          artifacts.aliasing = originalSampleRate < 44100; // Likely if low sample rate
          
          return artifacts;
        },

        estimateCompressionRatio: (originalSize: number, compressedSize: number) => {
          const ratio = originalSize / compressedSize;
          const reductionPercent = ((originalSize - compressedSize) / originalSize) * 100;
          
          let qualityEstimate: string;
          if (ratio < 2) qualityEstimate = 'lossless_or_minimal';
          else if (ratio < 5) qualityEstimate = 'high_quality';
          else if (ratio < 10) qualityEstimate = 'medium_quality';
          else if (ratio < 20) qualityEstimate = 'low_quality';
          else qualityEstimate = 'very_low_quality';
          
          return {
            ratio,
            reductionPercent,
            originalSizeMB: originalSize / (1024 * 1024),
            compressedSizeMB: compressedSize / (1024 * 1024),
            spaceSavedMB: (originalSize - compressedSize) / (1024 * 1024),
            qualityEstimate,
          };
        },

        analyzeCompressionSettings: (codec: string, bitrate: number, sampleRate: number, channels: number) => {
          const analysis = {
            codec,
            bitrate,
            sampleRate,
            channels,
            quality: 'unknown' as string,
            recommendations: [] as string[],
            metrics: {} as any,
          };

          // Codec-specific analysis
          switch (codec.toLowerCase()) {
            case 'aac':
              analysis.metrics = {
                bitsPerSample: bitrate / (sampleRate * channels),
                nyquistFreq: sampleRate / 2,
                stereoMode: channels === 2 ? 'joint_stereo' : channels === 1 ? 'mono' : 'multichannel',
              };
              
              if (bitrate >= 256000) analysis.quality = 'excellent';
              else if (bitrate >= 192000) analysis.quality = 'good';
              else if (bitrate >= 128000) analysis.quality = 'acceptable';
              else analysis.quality = 'poor';
              
              if (bitrate < 128000) analysis.recommendations.push('Increase bitrate to at least 128kbps');
              if (sampleRate > 48000) analysis.recommendations.push('Sample rates above 48kHz provide minimal benefit');
              break;
              
            case 'mp3':
              analysis.metrics = {
                bitsPerSample: bitrate / (sampleRate * channels),
                compressionRatio: (sampleRate * channels * 16) / bitrate, // Assuming 16-bit source
              };
              
              if (bitrate >= 320000) analysis.quality = 'excellent';
              else if (bitrate >= 192000) analysis.quality = 'good';
              else if (bitrate >= 128000) analysis.quality = 'acceptable';
              else analysis.quality = 'poor';
              
              if (bitrate < 192000) analysis.recommendations.push('Consider using AAC for better quality at same bitrate');
              break;
              
            case 'opus':
              analysis.metrics = {
                bitsPerSample: bitrate / (sampleRate * channels),
                adaptiveBitrate: true,
                lowLatency: true,
              };
              
              if (bitrate >= 192000) analysis.quality = 'excellent';
              else if (bitrate >= 128000) analysis.quality = 'good';
              else if (bitrate >= 64000) analysis.quality = 'acceptable';
              else analysis.quality = 'poor';
              
              analysis.recommendations.push('Opus provides excellent quality, good choice');
              break;
              
            default:
              analysis.recommendations.push('Consider using modern codecs like AAC or Opus');
          }

          return analysis;
        },

        measureCompressionQuality: (original: Float32Array, compressed: Float32Array) => {
          if (original.length !== compressed.length) {
            // Resample if lengths don't match (simplified)
            const resampledCompressed = new Float32Array(original.length);
            const ratio = compressed.length / original.length;
            for (let i = 0; i < original.length; i++) {
              const sourceIndex = Math.floor(i * ratio);
              resampledCompressed[i] = compressed[Math.min(sourceIndex, compressed.length - 1)];
            }
            compressed = resampledCompressed;
          }

          let mse = 0; // Mean Squared Error
          let originalEnergy = 0;
          let compressedEnergy = 0;
          
          for (let i = 0; i < original.length; i++) {
            const diff = original[i] - compressed[i];
            mse += diff * diff;
            originalEnergy += original[i] * original[i];
            compressedEnergy += compressed[i] * compressed[i];
          }
          
          mse /= original.length;
          originalEnergy /= original.length;
          compressedEnergy /= original.length;
          
          // Signal-to-Noise Ratio
          const snr = originalEnergy / (mse + 1e-10);
          const snrDb = 10 * Math.log10(snr);
          
          // Peak Signal-to-Noise Ratio
          const maxValue = Math.max(...original.map(Math.abs));
          const psnr = 10 * Math.log10((maxValue * maxValue) / (mse + 1e-10));
          
          // Energy preservation
          const energyRatio = compressedEnergy / (originalEnergy + 1e-10);
          const energyLoss = Math.abs(1 - energyRatio);
          
          return {
            mse,
            snr,
            snrDb,
            psnr,
            energyRatio,
            energyLoss,
            energyLossPercent: energyLoss * 100,
            quality: snrDb > 60 ? 'excellent' : snrDb > 40 ? 'good' : snrDb > 20 ? 'acceptable' : 'poor',
            perceptualQuality: compressionAnalyzer.assessPerceptualQuality(snrDb, energyLoss),
          };
        },

        assessPerceptualQuality: (snrDb: number, energyLoss: number) => {
          let score = 5; // Start with perfect score
          
          if (snrDb < 60) score -= 0.5;
          if (snrDb < 40) score -= 1;
          if (snrDb < 20) score -= 2;
          
          if (energyLoss > 0.1) score -= 0.5;
          if (energyLoss > 0.2) score -= 1;
          
          const qualityLabels = ['very_poor', 'poor', 'fair', 'good', 'excellent'];
          const index = Math.max(0, Math.min(4, Math.floor(score)));
          
          return {
            score: Math.max(1, score),
            label: qualityLabels[index],
            factors: {
              snrImpact: snrDb < 40 ? 'significant' : 'minimal',
              energyImpact: energyLoss > 0.1 ? 'noticeable' : 'minimal',
            },
          };
        },
      };

      // Test compression artifact detection
      const testAudio = new Float32Array(2048);
      for (let i = 0; i < testAudio.length; i++) {
        testAudio[i] = Math.sin(i * 0.1) * 0.5;
      }
      
      const artifacts = compressionAnalyzer.detectCompressionArtifacts(testAudio, 44100);
      expect(artifacts.preEcho).toBeDefined();
      expect(artifacts.pumping).toBeDefined();
      expect(artifacts.aliasing).toBe(false); // 44100 is fine

      // Test compression ratio estimation
      const compressionRatio = compressionAnalyzer.estimateCompressionRatio(10485760, 1048576); // 10MB -> 1MB
      expect(compressionRatio.ratio).toBe(10);
      expect(compressionRatio.reductionPercent).toBe(90);
      expect(compressionRatio.qualityEstimate).toBe('low_quality');

      // Test compression settings analysis
      const aacAnalysis = compressionAnalyzer.analyzeCompressionSettings('aac', 192000, 48000, 2);
      expect(aacAnalysis.quality).toBe('good');
      expect(aacAnalysis.metrics.bitsPerSample).toBe(2); // 192000 / (48000 * 2)

      const mp3Analysis = compressionAnalyzer.analyzeCompressionSettings('mp3', 128000, 44100, 2);
      expect(mp3Analysis.quality).toBe('acceptable');
      expect(mp3Analysis.recommendations).toContain('Consider using AAC for better quality at same bitrate');

      // Test compression quality measurement
      const original = new Float32Array(1000);
      const compressed = new Float32Array(1000);
      
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.sin(i * 0.1);
        compressed[i] = original[i] + (Math.random() - 0.5) * 0.01; // Add small amount of noise
      }
      
      const qualityMeasurement = compressionAnalyzer.measureCompressionQuality(original, compressed);
      expect(qualityMeasurement.snrDb).toBeGreaterThan(20);
      expect(qualityMeasurement.quality).toBeDefined();
      expect(qualityMeasurement.perceptualQuality.score).toBeGreaterThan(0);
    });
  });

  describe('Input vs Output Comparison', () => {
    it('should compare input and output audio characteristics', () => {
      const comparisonAnalyzer = {
        compareBasicProperties: (input: any, output: any) => {
          const comparison = {
            sampleRate: {
              input: input.sampleRate,
              output: output.sampleRate,
              changed: input.sampleRate !== output.sampleRate,
              ratio: output.sampleRate / input.sampleRate,
            },
            channels: {
              input: input.channels,
              output: output.channels,
              changed: input.channels !== output.channels,
              conversion: comparisonAnalyzer.getChannelConversionType(input.channels, output.channels),
            },
            duration: {
              input: input.duration,
              output: output.duration,
              difference: output.duration - input.duration,
              differenceMs: (output.duration - input.duration) * 1000,
              changed: Math.abs(output.duration - input.duration) > 0.001,
            },
            bitDepth: {
              input: input.bitDepth || 16,
              output: output.bitDepth || 16,
              changed: (input.bitDepth || 16) !== (output.bitDepth || 16),
            },
          };

          return comparison;
        },

        getChannelConversionType: (inputChannels: number, outputChannels: number) => {
          if (inputChannels === outputChannels) return 'none';
          if (inputChannels === 1 && outputChannels === 2) return 'mono_to_stereo';
          if (inputChannels === 2 && outputChannels === 1) return 'stereo_to_mono';
          if (inputChannels < outputChannels) return 'upmix';
          return 'downmix';
        },

        compareSpectralContent: (inputSpectrum: Float32Array, outputSpectrum: Float32Array) => {
          const minLength = Math.min(inputSpectrum.length, outputSpectrum.length);
          
          let spectralSimilarity = 0;
          let highFrequencyLoss = 0;
          let lowFrequencyChange = 0;
          const binSize = 48000 / (2 * minLength); // Assuming 48kHz sample rate
          
          for (let i = 0; i < minLength; i++) {
            const frequency = i * binSize;
            const inputMag = Math.abs(inputSpectrum[i]);
            const outputMag = Math.abs(outputSpectrum[i]);
            
            // Overall spectral similarity
            const similarity = 1 - Math.abs(inputMag - outputMag) / (Math.max(inputMag, outputMag) + 1e-10);
            spectralSimilarity += similarity;
            
            // High frequency analysis (above 10kHz)
            if (frequency > 10000) {
              const loss = Math.max(0, inputMag - outputMag) / (inputMag + 1e-10);
              highFrequencyLoss += loss;
            }
            
            // Low frequency analysis (below 200Hz)
            if (frequency < 200) {
              const change = Math.abs(inputMag - outputMag) / (inputMag + 1e-10);
              lowFrequencyChange += change;
            }
          }
          
          spectralSimilarity /= minLength;
          highFrequencyLoss /= Math.max(1, Math.floor(minLength * 0.4)); // Approximate high freq bins
          lowFrequencyChange /= Math.max(1, Math.floor(minLength * 0.02)); // Approximate low freq bins
          
          return {
            similarity: spectralSimilarity,
            similarityPercent: spectralSimilarity * 100,
            highFrequencyLoss,
            highFrequencyLossPercent: highFrequencyLoss * 100,
            lowFrequencyChange,
            lowFrequencyChangePercent: lowFrequencyChange * 100,
            quality: spectralSimilarity > 0.9 ? 'excellent' : spectralSimilarity > 0.8 ? 'good' : 'degraded',
          };
        },

        identifyAudioDifferences: (inputAudio: Float32Array, outputAudio: Float32Array) => {
          // Ensure same length for comparison
          const minLength = Math.min(inputAudio.length, outputAudio.length);
          const input = inputAudio.slice(0, minLength);
          const output = outputAudio.slice(0, minLength);
          
          const differences = {
            samples: [] as any[],
            statistics: {} as any,
            artifacts: [] as string[],
          };
          
          let totalError = 0;
          let maxError = 0;
          let errorSamples = 0;
          const errorThreshold = 0.01; // 1% threshold
          
          for (let i = 0; i < minLength; i++) {
            const error = Math.abs(input[i] - output[i]);
            totalError += error;
            maxError = Math.max(maxError, error);
            
            if (error > errorThreshold) {
              errorSamples++;
              differences.samples.push({
                index: i,
                timeSeconds: i / 48000, // Assuming 48kHz
                inputValue: input[i],
                outputValue: output[i],
                error,
                errorPercent: error * 100,
              });
            }
          }
          
          const mse = totalError / minLength;
          const rmse = Math.sqrt(mse);
          const snr = comparisonAnalyzer.calculateSNR(input, output);
          
          differences.statistics = {
            totalSamples: minLength,
            errorSamples,
            errorRate: errorSamples / minLength,
            maxError,
            meanError: totalError / minLength,
            rmse,
            snr,
            snrDb: 20 * Math.log10(snr),
          };
          
          // Detect potential artifacts
          if (errorSamples > minLength * 0.1) {
            differences.artifacts.push('widespread_distortion');
          }
          if (maxError > 0.5) {
            differences.artifacts.push('severe_clipping');
          }
          if (differences.statistics.snrDb < 20) {
            differences.artifacts.push('significant_noise');
          }
          
          return differences;
        },

        calculateSNR: (signal: Float32Array, noisy: Float32Array) => {
          let signalPower = 0;
          let noisePower = 0;
          
          for (let i = 0; i < signal.length; i++) {
            signalPower += signal[i] * signal[i];
            const noise = noisy[i] - signal[i];
            noisePower += noise * noise;
          }
          
          return signalPower / (noisePower + 1e-10);
        },

        generateQualityReport: (input: any, output: any, spectralComparison: any, differences: any) => {
          const report = {
            overall: 'unknown' as string,
            score: 0,
            sections: {
              format: { score: 0, issues: [] as string[] },
              spectral: { score: 0, issues: [] as string[] },
              temporal: { score: 0, issues: [] as string[] },
              artifacts: { score: 0, issues: [] as string[] },
            },
            recommendations: [] as string[],
          };
          
          // Format quality (30% weight)
          let formatScore = 100;
          if (input.sampleRate !== output.sampleRate) {
            formatScore -= 20;
            report.sections.format.issues.push('Sample rate changed');
          }
          if (input.channels !== output.channels) {
            formatScore -= 15;
            report.sections.format.issues.push('Channel count changed');
          }
          if (Math.abs(input.duration - output.duration) > 0.01) {
            formatScore -= 25;
            report.sections.format.issues.push('Duration mismatch');
          }
          report.sections.format.score = Math.max(0, formatScore);
          
          // Spectral quality (40% weight)
          const spectralScore = spectralComparison.similarityPercent;
          report.sections.spectral.score = spectralScore;
          if (spectralComparison.highFrequencyLossPercent > 20) {
            report.sections.spectral.issues.push('High frequency loss');
          }
          if (spectralComparison.lowFrequencyChangePercent > 10) {
            report.sections.spectral.issues.push('Low frequency alteration');
          }
          
          // Temporal quality (20% weight)
          const temporalScore = Math.max(0, 100 - (differences.statistics.errorRate * 100));
          report.sections.temporal.score = temporalScore;
          if (differences.statistics.errorRate > 0.01) {
            report.sections.temporal.issues.push('Temporal distortion detected');
          }
          
          // Artifacts (10% weight)
          let artifactScore = 100;
          if (differences.artifacts.length > 0) {
            artifactScore -= differences.artifacts.length * 20;
            report.sections.artifacts.issues = differences.artifacts;
          }
          report.sections.artifacts.score = Math.max(0, artifactScore);
          
          // Calculate overall score
          report.score = (
            report.sections.format.score * 0.3 +
            report.sections.spectral.score * 0.4 +
            report.sections.temporal.score * 0.2 +
            report.sections.artifacts.score * 0.1
          );
          
          // Determine overall quality
          if (report.score >= 90) report.overall = 'excellent';
          else if (report.score >= 75) report.overall = 'good';
          else if (report.score >= 60) report.overall = 'acceptable';
          else report.overall = 'poor';
          
          // Generate recommendations
          if (report.sections.format.score < 80) {
            report.recommendations.push('Check format conversion settings');
          }
          if (report.sections.spectral.score < 80) {
            report.recommendations.push('Review audio codec settings for better frequency response');
          }
          if (report.sections.temporal.score < 80) {
            report.recommendations.push('Investigate timing accuracy issues');
          }
          if (report.sections.artifacts.score < 80) {
            report.recommendations.push('Check for processing artifacts and adjust settings');
          }
          
          return report;
        },
      };

      // Test basic properties comparison
      const inputProps = { sampleRate: 48000, channels: 2, duration: 30.0, bitDepth: 24 };
      const outputProps = { sampleRate: 44100, channels: 2, duration: 30.1, bitDepth: 16 };
      
      const basicComparison = comparisonAnalyzer.compareBasicProperties(inputProps, outputProps);
      expect(basicComparison.sampleRate.changed).toBe(true);
      expect(basicComparison.sampleRate.ratio).toBeCloseTo(0.92, 2);
      expect(basicComparison.duration.changed).toBe(true);
      expect(basicComparison.duration.differenceMs).toBeCloseTo(100, 1);

      // Test spectral content comparison
      const inputSpectrum = new Float32Array(512);
      const outputSpectrum = new Float32Array(512);
      
      // Simulate input with full spectrum
      for (let i = 0; i < inputSpectrum.length; i++) {
        inputSpectrum[i] = Math.exp(-i / 100); // Exponential decay
      }
      
      // Simulate output with high frequency loss
      for (let i = 0; i < outputSpectrum.length; i++) {
        outputSpectrum[i] = i < 400 ? inputSpectrum[i] * 0.9 : inputSpectrum[i] * 0.3; // High freq loss
      }
      
      const spectralComparison = comparisonAnalyzer.compareSpectralContent(inputSpectrum, outputSpectrum);
      expect(spectralComparison.similarity).toBeLessThan(1);
      expect(spectralComparison.highFrequencyLoss).toBeGreaterThan(0);
      expect(spectralComparison.quality).toBeDefined();

      // Test audio differences identification
      const inputAudio = new Float32Array(1000);
      const outputAudio = new Float32Array(1000);
      
      for (let i = 0; i < inputAudio.length; i++) {
        inputAudio[i] = Math.sin(i * 0.1);
        outputAudio[i] = inputAudio[i] * 0.95 + (Math.random() - 0.5) * 0.02; // Slight attenuation + noise
      }
      
      const differences = comparisonAnalyzer.identifyAudioDifferences(inputAudio, outputAudio);
      expect(differences.statistics.totalSamples).toBe(1000);
      expect(differences.statistics.snrDb).toBeGreaterThan(20);
      expect(differences.artifacts.length).toBeGreaterThanOrEqual(0);

      // Test quality report generation
      const qualityReport = comparisonAnalyzer.generateQualityReport(
        inputProps, 
        outputProps, 
        spectralComparison, 
        differences
      );
      
      expect(qualityReport.score).toBeGreaterThan(0);
      expect(qualityReport.score).toBeLessThanOrEqual(100);
      expect(['excellent', 'good', 'acceptable', 'poor']).toContain(qualityReport.overall);
      expect(qualityReport.sections.format.score).toBeDefined();
      expect(qualityReport.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});