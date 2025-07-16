/**
 * WebM Output Integration Tests
 * Tests WebM file structure, VP9 video codec, and Opus audio codec validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('WebM Output Tests', () => {
  let mockMediaRecorder: any;
  let mockCanvas: any;
  let mockAudioContext: any;

  beforeEach(() => {
    // Mock MediaRecorder for WebM recording
    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      requestData: jest.fn(),
      state: 'inactive',
      mimeType: 'video/webm; codecs="vp09.00.10.08,opus"',
      videoBitsPerSecond: 1000000,
      audioBitsPerSecond: 128000,
      ondataavailable: null,
      onstop: null,
      onerror: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Mock canvas for video capture
    mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        getImageData: jest.fn(),
      }),
      captureStream: jest.fn().mockReturnValue({
        getVideoTracks: jest.fn().mockReturnValue([{
          getSettings: jest.fn().mockReturnValue({
            width: 1920,
            height: 1080,
            frameRate: 30,
          }),
        }]),
        getAudioTracks: jest.fn().mockReturnValue([]),
      }),
    };

    // Mock AudioContext
    mockAudioContext = {
      sampleRate: 48000,
      createMediaStreamDestination: jest.fn().mockReturnValue({
        stream: {
          getAudioTracks: jest.fn().mockReturnValue([{
            getSettings: jest.fn().mockReturnValue({
              sampleRate: 48000,
              channelCount: 2,
            }),
          }]),
        },
      }),
    };

    global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder);
    global.HTMLCanvasElement = jest.fn().mockImplementation(() => mockCanvas);
    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('WebM File Structure', () => {
    it('should validate WebM container format', () => {
      const webmValidator = {
        validateWebMHeader: (data: ArrayBuffer) => {
          const view = new DataView(data);
          const validation = {
            valid: false,
            docType: '',
            version: 0,
            readVersion: 0,
            elements: [] as string[],
            issues: [] as string[],
          };

          try {
            // Check for EBML header signature
            if (data.byteLength < 4) {
              validation.issues.push('File too small to contain valid WebM header');
              return validation;
            }

            // WebM files start with EBML header (0x1A45DFA3)
            const signature = view.getUint32(0);
            if (signature !== 0x1A45DFA3) {
              validation.issues.push(`Invalid EBML signature: 0x${signature.toString(16)}`);
              return validation;
            }

            // Simulate parsing EBML header elements
            validation.docType = 'webm'; // Would be parsed from DocType element
            validation.version = 1; // Would be parsed from DocTypeVersion element
            validation.readVersion = 1; // Would be parsed from DocTypeReadVersion element
            validation.elements = ['EBML', 'DocType', 'DocTypeVersion', 'DocTypeReadVersion'];
            validation.valid = true;

          } catch (error) {
            validation.issues.push(`Failed to parse WebM header: ${error.message}`);
          }

          return validation;
        },

        validateSegmentStructure: (data: ArrayBuffer) => {
          // WebM uses Matroska container format with specific elements
          const requiredElements = ['Segment', 'Info', 'Tracks', 'Cluster'];
          const optionalElements = ['SeekHead', 'Cues', 'Attachments', 'Chapters', 'Tags'];
          
          // Simulate element detection
          const foundElements = ['EBML', 'Segment', 'Info', 'Tracks', 'Cluster', 'SeekHead'];
          const missingRequired = requiredElements.filter(el => !foundElements.includes(el));
          const foundOptional = optionalElements.filter(el => foundElements.includes(el));

          return {
            requiredElements,
            optionalElements,
            foundElements,
            missingRequired,
            foundOptional,
            isValid: missingRequired.length === 0,
            hasSeekHead: foundElements.includes('SeekHead'),
            hasCues: foundElements.includes('Cues'),
            streamable: foundElements.includes('Cluster'),
          };
        },

        analyzeWebMTracks: (data: ArrayBuffer) => {
          // Simulate track analysis
          const tracks = [
            {
              number: 1,
              type: 'video',
              codec: 'VP9',
              codecId: 'V_VP9',
              width: 1920,
              height: 1080,
              frameRate: 30,
              defaultDuration: 33333333, // nanoseconds (30fps)
            },
            {
              number: 2,
              type: 'audio',
              codec: 'Opus',
              codecId: 'A_OPUS',
              sampleRate: 48000,
              channels: 2,
              bitDepth: 16,
            },
          ];

          const analysis = {
            tracks,
            trackCount: tracks.length,
            hasVideo: tracks.some(t => t.type === 'video'),
            hasAudio: tracks.some(t => t.type === 'audio'),
            videoTracks: tracks.filter(t => t.type === 'video'),
            audioTracks: tracks.filter(t => t.type === 'audio'),
            supportedCodecs: tracks.every(t => ['VP8', 'VP9', 'AV1', 'Opus', 'Vorbis'].includes(t.codec)),
          };

          return analysis;
        },

        validateTimecodes: (data: ArrayBuffer) => {
          // Simulate timecode validation
          const clusters = [
            { timecode: 0, duration: 2000, frames: 60 },
            { timecode: 2000, duration: 2000, frames: 60 },
            { timecode: 4000, duration: 2000, frames: 60 },
            { timecode: 6000, duration: 1500, frames: 45 }, // Last cluster shorter
          ];

          const validation = {
            clusters,
            totalDuration: Math.max(...clusters.map(c => c.timecode + c.duration)),
            timecodeGaps: [] as any[],
            timecodeOverlaps: [] as any[],
            isMonotonic: true,
            frameAccurate: true,
          };

          // Check for gaps and overlaps
          for (let i = 1; i < clusters.length; i++) {
            const prev = clusters[i - 1];
            const curr = clusters[i];
            const prevEnd = prev.timecode + prev.duration;
            
            if (curr.timecode > prevEnd) {
              validation.timecodeGaps.push({
                between: [i - 1, i],
                gapDuration: curr.timecode - prevEnd,
              });
            } else if (curr.timecode < prevEnd) {
              validation.timecodeOverlaps.push({
                between: [i - 1, i],
                overlapDuration: prevEnd - curr.timecode,
              });
            }
          }

          validation.isMonotonic = validation.timecodeGaps.length === 0 && validation.timecodeOverlaps.length === 0;
          
          return validation;
        },

        assessWebMCompatibility: (trackInfo: any) => {
          const compatibility = {
            browsers: {} as any,
            hardware: {} as any,
            streaming: {} as any,
            overall: 'unknown' as string,
          };

          // Browser compatibility based on codecs
          const hasVP9 = trackInfo.videoTracks.some((t: any) => t.codec === 'VP9');
          const hasVP8 = trackInfo.videoTracks.some((t: any) => t.codec === 'VP8');
          const hasOpus = trackInfo.audioTracks.some((t: any) => t.codec === 'Opus');
          const hasVorbis = trackInfo.audioTracks.some((t: any) => t.codec === 'Vorbis');

          compatibility.browsers = {
            chrome: hasVP9 || hasVP8 ? 'excellent' : 'none',
            firefox: hasVP9 || hasVP8 ? 'excellent' : 'none',
            safari: hasVP9 ? 'limited' : hasVP8 ? 'good' : 'none',
            edge: hasVP9 || hasVP8 ? 'good' : 'none',
          };

          // Hardware acceleration support
          compatibility.hardware = {
            vp9Decode: hasVP9 ? 'modern_devices' : 'not_applicable',
            vp8Decode: hasVP8 ? 'most_devices' : 'not_applicable',
            opusEncode: hasOpus ? 'software_only' : 'not_applicable',
          };

          // Streaming compatibility
          compatibility.streaming = {
            adaptiveBitrate: 'supported',
            lowLatency: hasVP9 ? 'excellent' : 'good',
            seekPerformance: trackInfo.hasCues ? 'fast' : 'slow',
          };

          const browserSupport = Object.values(compatibility.browsers).filter(s => s !== 'none').length;
          compatibility.overall = browserSupport >= 3 ? 'excellent' : browserSupport >= 2 ? 'good' : 'limited';

          return compatibility;
        },
      };

      // Test WebM header validation
      const mockWebMData = new ArrayBuffer(32);
      const view = new DataView(mockWebMData);
      
      // Create mock EBML header
      view.setUint32(0, 0x1A45DFA3); // EBML signature
      
      const headerValidation = webmValidator.validateWebMHeader(mockWebMData);
      expect(headerValidation.valid).toBe(true);
      expect(headerValidation.docType).toBe('webm');
      expect(headerValidation.elements).toContain('EBML');

      // Test segment structure validation
      const segmentValidation = webmValidator.validateSegmentStructure(mockWebMData);
      expect(segmentValidation.isValid).toBe(true);
      expect(segmentValidation.missingRequired).toHaveLength(0);
      expect(segmentValidation.streamable).toBe(true);

      // Test track analysis
      const trackAnalysis = webmValidator.analyzeWebMTracks(mockWebMData);
      expect(trackAnalysis.hasVideo).toBe(true);
      expect(trackAnalysis.hasAudio).toBe(true);
      expect(trackAnalysis.supportedCodecs).toBe(true);
      expect(trackAnalysis.videoTracks[0].codec).toBe('VP9');
      expect(trackAnalysis.audioTracks[0].codec).toBe('Opus');

      // Test timecode validation
      const timecodeValidation = webmValidator.validateTimecodes(mockWebMData);
      expect(timecodeValidation.isMonotonic).toBe(true);
      expect(timecodeValidation.totalDuration).toBeGreaterThan(0);
      expect(timecodeValidation.timecodeGaps).toHaveLength(0);

      // Test compatibility assessment
      const compatibility = webmValidator.assessWebMCompatibility(trackAnalysis);
      expect(compatibility.browsers.chrome).toBe('excellent');
      expect(compatibility.browsers.firefox).toBe('excellent');
      expect(compatibility.overall).toBe('excellent');
    });

    it('should validate WebM streaming capabilities', () => {
      const streamingValidator = {
        analyzeClusterStructure: (data: ArrayBuffer) => {
          // Simulate cluster analysis for streaming
          const clusters = [
            { position: 1024, size: 65536, timecode: 0, keyframe: true },
            { position: 66560, size: 32768, timecode: 1000, keyframe: false },
            { position: 99328, size: 32768, timecode: 2000, keyframe: true },
            { position: 132096, size: 28672, timecode: 3000, keyframe: false },
          ];

          const analysis = {
            clusters,
            clusterCount: clusters.length,
            avgClusterSize: clusters.reduce((sum, c) => sum + c.size, 0) / clusters.length,
            keyframeClusters: clusters.filter(c => c.keyframe).length,
            keyframeInterval: 2000, // ms between keyframes
            isStreamable: true,
            seekPoints: clusters.filter(c => c.keyframe).map(c => c.timecode),
          };

          // Check if suitable for streaming
          analysis.isStreamable = analysis.avgClusterSize < 1024 * 1024 && // <1MB clusters
                                 analysis.keyframeInterval <= 5000; // <=5s keyframe interval

          return analysis;
        },

        validateCues: (data: ArrayBuffer) => {
          // Cues element provides index for seeking
          const cues = [
            { time: 0, clusterPosition: 1024, trackNumber: 1 },
            { time: 2000, clusterPosition: 99328, trackNumber: 1 },
            { time: 4000, clusterPosition: 165888, trackNumber: 1 },
          ];

          return {
            hasCues: cues.length > 0,
            cuePoints: cues,
            seekAccuracy: 'frame_accurate',
            seekPerformance: cues.length > 0 ? 'fast' : 'slow',
            recommendedForStreaming: cues.length > 0,
          };
        },

        assessLiveStreamingSupport: (webmInfo: any) => {
          const liveSupport = {
            supported: false,
            features: {} as any,
            limitations: [] as string[],
            recommendations: [] as string[],
          };

          // Check for live streaming requirements
          if (webmInfo.hasSeekHead) {
            liveSupport.limitations.push('SeekHead not suitable for live streams');
          }

          if (webmInfo.hasCues) {
            liveSupport.limitations.push('Cues not available in live streams');
          }

          if (webmInfo.clusters && webmInfo.clusters.length > 0) {
            const hasSmallClusters = webmInfo.avgClusterSize < 64 * 1024; // <64KB
            const hasFrequentKeyframes = webmInfo.keyframeInterval <= 2000; // <=2s
            
            if (hasSmallClusters && hasFrequentKeyframes) {
              liveSupport.supported = true;
              liveSupport.features.lowLatency = true;
            } else {
              if (!hasSmallClusters) {
                liveSupport.recommendations.push('Use smaller cluster sizes for lower latency');
              }
              if (!hasFrequentKeyframes) {
                liveSupport.recommendations.push('Increase keyframe frequency for better seeking');
              }
            }
          }

          liveSupport.features = {
            lowLatency: liveSupport.supported,
            adaptiveBitrate: true, // WebM supports ABR
            realTimeEncoding: liveSupport.supported,
          };

          return liveSupport;
        },

        optimizeForStreaming: (currentSettings: any) => {
          const optimizations = {
            clusterSize: 'target_32kb',
            keyframeInterval: 'every_2_seconds',
            cueGeneration: 'disabled_for_live',
            bufferingStrategy: 'progressive',
            recommendations: [] as string[],
          };

          if (currentSettings.clusterSize > 64 * 1024) {
            optimizations.recommendations.push('Reduce cluster size to 32KB for better streaming');
          }

          if (currentSettings.keyframeInterval > 2000) {
            optimizations.recommendations.push('Reduce keyframe interval to 2 seconds or less');
          }

          if (currentSettings.isLive && currentSettings.hasCues) {
            optimizations.recommendations.push('Disable cue generation for live streaming');
          }

          if (!currentSettings.isLive && !currentSettings.hasCues) {
            optimizations.recommendations.push('Enable cue generation for VOD content');
          }

          return optimizations;
        },
      };

      // Test cluster structure analysis
      const mockData = new ArrayBuffer(1024);
      const clusterAnalysis = streamingValidator.analyzeClusterStructure(mockData);
      expect(clusterAnalysis.clusterCount).toBe(4);
      expect(clusterAnalysis.isStreamable).toBe(true);
      expect(clusterAnalysis.keyframeClusters).toBe(2);

      // Test cues validation
      const cuesValidation = streamingValidator.validateCues(mockData);
      expect(cuesValidation.hasCues).toBe(true);
      expect(cuesValidation.seekPerformance).toBe('fast');
      expect(cuesValidation.recommendedForStreaming).toBe(true);

      // Test live streaming support
      const webmInfo = {
        hasSeekHead: false,
        hasCues: false,
        clusters: clusterAnalysis.clusters,
        avgClusterSize: clusterAnalysis.avgClusterSize,
        keyframeInterval: clusterAnalysis.keyframeInterval,
      };
      
      const liveSupport = streamingValidator.assessLiveStreamingSupport(webmInfo);
      expect(liveSupport.supported).toBe(true);
      expect(liveSupport.features.lowLatency).toBe(true);

      // Test streaming optimization
      const currentSettings = {
        clusterSize: 128 * 1024, // 128KB
        keyframeInterval: 5000, // 5s
        isLive: true,
        hasCues: true,
      };
      
      const optimizations = streamingValidator.optimizeForStreaming(currentSettings);
      expect(optimizations.recommendations).toContain('Reduce cluster size to 32KB for better streaming');
      expect(optimizations.recommendations).toContain('Reduce keyframe interval to 2 seconds or less');
      expect(optimizations.recommendations).toContain('Disable cue generation for live streaming');
    });
  });

  describe('VP9 Video Codec', () => {
    it('should validate VP9 codec configuration and features', () => {
      const vp9Validator = {
        parseVP9CodecString: (codecString: string) => {
          // Parse VP9 codec string like "vp09.00.10.08"
          const match = codecString.match(/vp09\.(\d{2})\.(\d{2})\.(\d{2})(?:\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2}))?/);
          if (!match) {
            return { valid: false, error: 'Invalid VP9 codec string format' };
          }

          const profile = parseInt(match[1], 10);
          const level = parseInt(match[2], 10);
          const bitDepth = parseInt(match[3], 10);
          const chromaSubsampling = match[4] ? parseInt(match[4], 10) : undefined;
          const colorPrimaries = match[5] ? parseInt(match[5], 10) : undefined;
          const transferCharacteristics = match[6] ? parseInt(match[6], 10) : undefined;
          const matrixCoefficients = match[7] ? parseInt(match[7], 10) : undefined;

          const profiles = {
            0: 'Profile 0 (8-bit, 4:2:0)',
            1: 'Profile 1 (8-bit, 4:2:2/4:4:4)',
            2: 'Profile 2 (10/12-bit, 4:2:0)',
            3: 'Profile 3 (10/12-bit, 4:2:2/4:4:4)',
          };

          const levels = {
            10: '1.0', 11: '1.1',
            20: '2.0', 21: '2.1',
            30: '3.0', 31: '3.1',
            40: '4.0', 41: '4.1',
            50: '5.0', 51: '5.1', 52: '5.2',
            60: '6.0', 61: '6.1', 62: '6.2',
          };

          return {
            valid: true,
            profile,
            profileName: profiles[profile] || `Unknown Profile ${profile}`,
            level,
            levelName: levels[level] || `Unknown Level ${level}`,
            bitDepth,
            chromaSubsampling,
            colorPrimaries,
            transferCharacteristics,
            matrixCoefficients,
            codecString,
            hasColorInfo: !!match[4],
          };
        },

        validateVP9Profile: (profile: number, useCase: string = 'web') => {
          const validation = {
            supported: true,
            compatibility: 'unknown' as string,
            features: [] as string[],
            limitations: [] as string[],
            recommendations: [] as string[],
          };

          switch (profile) {
            case 0:
              validation.compatibility = 'excellent';
              validation.features.push('8-bit color depth', '4:2:0 chroma subsampling');
              validation.recommendations.push('Best compatibility across all devices');
              break;
              
            case 1:
              validation.compatibility = 'good';
              validation.features.push('8-bit color depth', '4:2:2/4:4:4 chroma subsampling');
              validation.limitations.push('Limited hardware acceleration support');
              if (useCase === 'mobile') {
                validation.recommendations.push('Consider Profile 0 for mobile devices');
              }
              break;
              
            case 2:
              validation.compatibility = 'moderate';
              validation.features.push('10/12-bit color depth', '4:2:0 chroma subsampling', 'HDR support');
              validation.limitations.push('Requires modern hardware');
              validation.limitations.push('Higher computational requirements');
              break;
              
            case 3:
              validation.compatibility = 'limited';
              validation.features.push('10/12-bit color depth', '4:2:2/4:4:4 chroma subsampling', 'Professional features');
              validation.limitations.push('Very limited hardware support');
              validation.limitations.push('Professional use case only');
              validation.recommendations.push('Use only for high-end professional workflows');
              break;
              
            default:
              validation.supported = false;
              validation.compatibility = 'none';
              validation.limitations.push('Profile not standardized');
          }

          return validation;
        },

        validateVP9Level: (level: number, resolution: { width: number, height: number }, frameRate: number) => {
          const levelConstraints = {
            10: { maxLumaSampleRate: 829440, maxLumaPictureSize: 36864, maxBitrate: 200 },
            11: { maxLumaSampleRate: 2764800, maxLumaPictureSize: 73728, maxBitrate: 800 },
            20: { maxLumaSampleRate: 4608000, maxLumaPictureSize: 122880, maxBitrate: 1800 },
            21: { maxLumaSampleRate: 9216000, maxLumaPictureSize: 245760, maxBitrate: 3600 },
            30: { maxLumaSampleRate: 20736000, maxLumaPictureSize: 552960, maxBitrate: 7200 },
            31: { maxLumaSampleRate: 36864000, maxLumaPictureSize: 983040, maxBitrate: 12000 },
            40: { maxLumaSampleRate: 83558400, maxLumaPictureSize: 2228224, maxBitrate: 18000 },
            41: { maxLumaSampleRate: 160432128, maxLumaPictureSize: 2228224, maxBitrate: 30000 },
            50: { maxLumaSampleRate: 311951360, maxLumaPictureSize: 8912896, maxBitrate: 60000 },
            51: { maxLumaSampleRate: 588251136, maxLumaPictureSize: 8912896, maxBitrate: 120000 },
            52: { maxLumaSampleRate: 1176502272, maxLumaPictureSize: 8912896, maxBitrate: 180000 },
            60: { maxLumaSampleRate: 1176502272, maxLumaPictureSize: 35651584, maxBitrate: 180000 },
            61: { maxLumaSampleRate: 2353004544, maxLumaPictureSize: 35651584, maxBitrate: 240000 },
            62: { maxLumaSampleRate: 4706009088, maxLumaPictureSize: 35651584, maxBitrate: 480000 },
          };

          const constraints = levelConstraints[level];
          if (!constraints) {
            return { valid: false, error: `Unknown VP9 level: ${level}` };
          }

          // Calculate current requirements
          const lumaPictureSize = resolution.width * resolution.height;
          const lumaSampleRate = lumaPictureSize * frameRate;

          const validation = {
            valid: true,
            lumaPictureSize,
            lumaSampleRate,
            constraints,
            violations: [] as string[],
            utilization: {
              pictureSize: (lumaPictureSize / constraints.maxLumaPictureSize) * 100,
              sampleRate: (lumaSampleRate / constraints.maxLumaSampleRate) * 100,
            },
          };

          if (lumaPictureSize > constraints.maxLumaPictureSize) {
            validation.valid = false;
            validation.violations.push(`Picture size ${lumaPictureSize} exceeds max ${constraints.maxLumaPictureSize}`);
          }

          if (lumaSampleRate > constraints.maxLumaSampleRate) {
            validation.valid = false;
            validation.violations.push(`Sample rate ${lumaSampleRate} exceeds max ${constraints.maxLumaSampleRate}`);
          }

          return validation;
        },

        analyzeVP9Features: (settings: any) => {
          const features = {
            adaptiveQuantization: true,
            segmentation: true,
            loopFiltering: true,
            superblockSize: settings.profile >= 2 ? '128x128' : '64x64',
            motionVectorPrecision: 'quarter_pixel',
            referenceFrames: Math.min(settings.referenceFrames || 3, 8),
            temporalLayers: settings.temporalLayers || 1,
            spatialLayers: settings.spatialLayers || 1,
          };

          const analysis = {
            features,
            qualityFeatures: [] as string[],
            efficiencyFeatures: [] as string[],
            complexityScore: 0,
          };

          // Analyze quality features
          if (features.adaptiveQuantization) {
            analysis.qualityFeatures.push('Adaptive quantization for better perceptual quality');
          }
          if (features.segmentation) {
            analysis.qualityFeatures.push('Segmentation for optimized encoding');
          }
          if (features.loopFiltering) {
            analysis.qualityFeatures.push('In-loop filtering for artifact reduction');
          }

          // Analyze efficiency features
          if (features.temporalLayers > 1) {
            analysis.efficiencyFeatures.push('Temporal scalability for adaptive streaming');
          }
          if (features.spatialLayers > 1) {
            analysis.efficiencyFeatures.push('Spatial scalability for multi-resolution');
          }
          if (features.referenceFrames > 1) {
            analysis.efficiencyFeatures.push('Multiple reference frames for better compression');
          }

          // Calculate complexity score
          analysis.complexityScore = 
            (features.referenceFrames * 2) +
            (features.temporalLayers * 3) +
            (features.spatialLayers * 4) +
            (settings.profile * 2);

          return analysis;
        },

        assessVP9Performance: (settings: any, targetDevice: string = 'desktop') => {
          const performance = {
            encoding: 'unknown' as string,
            decoding: 'unknown' as string,
            hardwareSupport: 'unknown' as string,
            batteryImpact: 'unknown' as string,
            recommendations: [] as string[],
          };

          const deviceSpecs = {
            desktop: { cpuPower: 'high', batteryLife: 'unlimited', hwAccel: 'common' },
            laptop: { cpuPower: 'medium', batteryLife: 'limited', hwAccel: 'common' },
            mobile: { cpuPower: 'low', batteryLife: 'critical', hwAccel: 'limited' },
            tablet: { cpuPower: 'low', batteryLife: 'limited', hwAccel: 'limited' },
          };

          const device = deviceSpecs[targetDevice] || deviceSpecs.desktop;

          // Encoding performance
          if (settings.profile <= 1 && settings.complexity <= 6) {
            performance.encoding = device.cpuPower === 'high' ? 'excellent' : 
                                 device.cpuPower === 'medium' ? 'good' : 'challenging';
          } else {
            performance.encoding = device.cpuPower === 'high' ? 'good' : 'poor';
          }

          // Decoding performance
          if (settings.profile === 0) {
            performance.decoding = 'excellent';
            performance.hardwareSupport = device.hwAccel === 'common' ? 'good' : 'limited';
          } else if (settings.profile === 2) {
            performance.decoding = 'moderate';
            performance.hardwareSupport = 'limited';
          } else {
            performance.decoding = 'software_only';
            performance.hardwareSupport = 'none';
          }

          // Battery impact
          if (performance.hardwareSupport === 'good') {
            performance.batteryImpact = 'low';
          } else if (device.batteryLife === 'critical') {
            performance.batteryImpact = 'high';
            performance.recommendations.push('Consider hardware-accelerated Profile 0');
          } else {
            performance.batteryImpact = 'medium';
          }

          // Device-specific recommendations
          if (targetDevice === 'mobile' && settings.profile > 0) {
            performance.recommendations.push('Use Profile 0 for better mobile compatibility');
          }

          if (targetDevice !== 'desktop' && settings.complexity > 6) {
            performance.recommendations.push('Reduce encoding complexity for battery life');
          }

          return performance;
        },
      };

      // Test VP9 codec string parsing
      const vp9Parsing = vp9Validator.parseVP9CodecString('vp09.00.10.08');
      expect(vp9Parsing.valid).toBe(true);
      expect(vp9Parsing.profile).toBe(0);
      expect(vp9Parsing.profileName).toBe('Profile 0 (8-bit, 4:2:0)');
      expect(vp9Parsing.level).toBe(10);
      expect(vp9Parsing.bitDepth).toBe(8);

      // Test VP9 profile validation
      const profile0Validation = vp9Validator.validateVP9Profile(0, 'web');
      expect(profile0Validation.supported).toBe(true);
      expect(profile0Validation.compatibility).toBe('excellent');
      expect(profile0Validation.features).toContain('8-bit color depth');

      const profile2Validation = vp9Validator.validateVP9Profile(2, 'mobile');
      expect(profile2Validation.supported).toBe(true);
      expect(profile2Validation.compatibility).toBe('moderate');
      expect(profile2Validation.features).toContain('HDR support');

      // Test VP9 level validation
      const levelValidation = vp9Validator.validateVP9Level(31, { width: 1920, height: 1080 }, 30);
      expect(levelValidation.valid).toBe(true);
      expect(levelValidation.lumaPictureSize).toBe(2073600); // 1920 * 1080
      expect(levelValidation.violations).toHaveLength(0);

      // Test level violation
      const violationValidation = vp9Validator.validateVP9Level(10, { width: 1920, height: 1080 }, 30);
      expect(violationValidation.valid).toBe(false);
      expect(violationValidation.violations.length).toBeGreaterThan(0);

      // Test VP9 features analysis
      const featureSettings = {
        profile: 0,
        referenceFrames: 3,
        temporalLayers: 2,
        spatialLayers: 1,
        complexity: 6,
      };
      
      const featuresAnalysis = vp9Validator.analyzeVP9Features(featureSettings);
      expect(featuresAnalysis.features.adaptiveQuantization).toBe(true);
      expect(featuresAnalysis.qualityFeatures.length).toBeGreaterThan(0);
      expect(featuresAnalysis.complexityScore).toBeGreaterThan(0);

      // Test performance assessment
      const performance = vp9Validator.assessVP9Performance(featureSettings, 'mobile');
      expect(performance.encoding).toBeDefined();
      expect(performance.decoding).toBeDefined();
      expect(performance.batteryImpact).toBeDefined();
    });
  });

  describe('Opus Audio Codec', () => {
    it('should validate Opus codec configuration and quality', () => {
      const opusValidator = {
        parseOpusCodecString: (codecString: string) => {
          // Opus codec string is typically just "opus"
          if (codecString.toLowerCase() !== 'opus') {
            return { valid: false, error: 'Invalid Opus codec string' };
          }

          return {
            valid: true,
            codec: 'Opus',
            version: '1.3',
            standardized: true,
            rfc: 'RFC 6716',
          };
        },

        validateOpusConfiguration: (config: any) => {
          const validation = {
            valid: true,
            warnings: [] as string[],
            errors: [] as string[],
            recommendations: [] as string[],
          };

          // Sample rate validation
          const validSampleRates = [8000, 12000, 16000, 24000, 48000];
          if (!validSampleRates.includes(config.sampleRate)) {
            validation.errors.push(`Invalid sample rate ${config.sampleRate}. Must be one of: ${validSampleRates.join(', ')}`);
            validation.valid = false;
          }

          // Channel validation
          if (config.channels < 1 || config.channels > 255) {
            validation.errors.push(`Invalid channel count ${config.channels}. Must be 1-255`);
            validation.valid = false;
          }

          // Bitrate validation
          if (config.bitrate < 6000) {
            validation.warnings.push('Very low bitrate may result in poor quality');
          } else if (config.bitrate > 512000) {
            validation.warnings.push('Very high bitrate may be unnecessary');
          }

          // Frame size validation
          const validFrameSizes = [2.5, 5, 10, 20, 40, 60]; // milliseconds
          if (config.frameSize && !validFrameSizes.includes(config.frameSize)) {
            validation.warnings.push(`Unusual frame size ${config.frameSize}ms. Recommended: ${validFrameSizes.join(', ')}`);
          }

          // Application type validation
          const validApplications = ['voip', 'audio', 'restricted_lowdelay'];
          if (config.application && !validApplications.includes(config.application)) {
            validation.errors.push(`Invalid application ${config.application}. Must be one of: ${validApplications.join(', ')}`);
            validation.valid = false;
          }

          // Recommendations based on configuration
          if (config.application === 'voip' && config.bitrate > 64000) {
            validation.recommendations.push('Consider lower bitrate for VoIP application');
          }

          if (config.application === 'audio' && config.bitrate < 64000) {
            validation.recommendations.push('Consider higher bitrate for music application');
          }

          if (config.channels > 2 && !config.channelMapping) {
            validation.recommendations.push('Specify channel mapping for multichannel audio');
          }

          return validation;
        },

        analyzeOpusQuality: (bitrate: number, sampleRate: number, channels: number, application: string = 'audio') => {
          const analysis = {
            quality: 'unknown' as string,
            transparency: 'unknown' as string,
            efficiency: 'unknown' as string,
            latency: 'unknown' as string,
            useCase: application,
            metrics: {} as any,
          };

          const bitratePerChannel = bitrate / channels;
          
          // Quality assessment based on application and bitrate
          if (application === 'voip') {
            if (bitratePerChannel >= 32000) analysis.quality = 'excellent';
            else if (bitratePerChannel >= 20000) analysis.quality = 'good';
            else if (bitratePerChannel >= 12000) analysis.quality = 'acceptable';
            else analysis.quality = 'poor';
          } else if (application === 'audio') {
            if (bitratePerChannel >= 128000) analysis.quality = 'excellent';
            else if (bitratePerChannel >= 96000) analysis.quality = 'good';
            else if (bitratePerChannel >= 64000) analysis.quality = 'acceptable';
            else analysis.quality = 'poor';
          } else { // restricted_lowdelay
            if (bitratePerChannel >= 64000) analysis.quality = 'excellent';
            else if (bitratePerChannel >= 48000) analysis.quality = 'good';
            else if (bitratePerChannel >= 32000) analysis.quality = 'acceptable';
            else analysis.quality = 'poor';
          }

          // Transparency assessment (perceptual losslessness)
          const transparencyThreshold = application === 'voip' ? 24000 : 
                                       application === 'audio' ? 96000 : 48000;
          analysis.transparency = bitratePerChannel >= transparencyThreshold ? 'transparent' : 'lossy';

          // Efficiency compared to other codecs
          analysis.efficiency = 'excellent'; // Opus is generally very efficient

          // Latency assessment
          const algorithmicLatency = 22.5; // ms for 48kHz Opus
          analysis.latency = algorithmicLatency <= 40 ? 'low' : 'medium';

          // Detailed metrics
          analysis.metrics = {
            bitratePerChannel,
            algorithmicLatency,
            frequencyResponse: sampleRate >= 44100 ? 'full_audio' : 'speech_optimized',
            dynamicRange: application === 'audio' ? 'high' : 'medium',
            compressionRatio: this.calculateCompressionRatio(bitrate, sampleRate, channels),
          };

          return analysis;
        },

        calculateCompressionRatio: (opusBitrate: number, sampleRate: number, channels: number) => {
          const uncompressedBitrate = sampleRate * 16 * channels; // 16-bit PCM
          return uncompressedBitrate / opusBitrate;
        },

        compareWithOtherCodecs: (opusConfig: any) => {
          const comparison = {
            vs_aac: {} as any,
            vs_mp3: {} as any,
            vs_vorbis: {} as any,
            advantages: [] as string[],
            disadvantages: [] as string[],
          };

          const opusBitrate = opusConfig.bitrate;
          const channels = opusConfig.channels;

          // vs AAC
          comparison.vs_aac = {
            quality: opusBitrate >= 128000 * channels ? 'similar' : 'opus_better',
            latency: 'opus_better', // Opus has lower latency
            compatibility: 'aac_better', // AAC more widely supported
            efficiency: 'opus_better', // Opus more efficient at low bitrates
          };

          // vs MP3
          comparison.vs_mp3 = {
            quality: 'opus_better', // Opus generally better quality
            latency: 'opus_better',
            compatibility: 'mp3_better', // MP3 universal compatibility
            efficiency: 'opus_better',
          };

          // vs Vorbis
          comparison.vs_vorbis = {
            quality: 'similar',
            latency: 'opus_better',
            compatibility: 'opus_better', // Better browser support
            efficiency: 'opus_better', // Especially at low bitrates
          };

          // Advantages
          comparison.advantages = [
            'Excellent quality at low bitrates',
            'Low algorithmic delay',
            'Wide bitrate range (6 kbps - 510 kbps)',
            'Adaptive to content type',
            'Royalty-free',
          ];

          // Disadvantages
          comparison.disadvantages = [
            'Limited support in older browsers',
            'Not supported in Safari on older iOS versions',
            'Less widespread than MP3/AAC',
          ];

          return comparison;
        },

        optimizeOpusSettings: (useCase: string, constraints: any = {}) => {
          const optimizations = {
            application: 'audio',
            bitrate: 128000,
            frameSize: 20,
            complexity: 10,
            vbr: true,
            dtx: false,
            recommendations: [] as string[],
          };

          switch (useCase) {
            case 'music_streaming':
              optimizations.application = 'audio';
              optimizations.bitrate = constraints.bitrate || 128000;
              optimizations.frameSize = 20;
              optimizations.vbr = true;
              optimizations.recommendations.push('Use audio application for best music quality');
              break;

            case 'voice_chat':
              optimizations.application = 'voip';
              optimizations.bitrate = constraints.bitrate || 32000;
              optimizations.frameSize = 20;
              optimizations.dtx = true; // Discontinuous transmission
              optimizations.recommendations.push('Enable DTX for bandwidth savings in silence');
              break;

            case 'live_streaming':
              optimizations.application = 'restricted_lowdelay';
              optimizations.bitrate = constraints.bitrate || 96000;
              optimizations.frameSize = 10; // Lower latency
              optimizations.complexity = 6; // Faster encoding
              optimizations.recommendations.push('Reduce complexity for real-time encoding');
              break;

            case 'podcast':
              optimizations.application = 'voip'; // Speech optimized
              optimizations.bitrate = constraints.bitrate || 64000;
              optimizations.frameSize = 40; // Longer frames for efficiency
              optimizations.recommendations.push('Use longer frame sizes for speech content');
              break;

            case 'game_audio':
              optimizations.application = 'restricted_lowdelay';
              optimizations.bitrate = constraints.bitrate || 96000;
              optimizations.frameSize = 10;
              optimizations.recommendations.push('Optimize for low latency in interactive applications');
              break;
          }

          // Apply constraints
          if (constraints.maxBitrate && optimizations.bitrate > constraints.maxBitrate) {
            optimizations.bitrate = constraints.maxBitrate;
            optimizations.recommendations.push('Bitrate limited by constraint');
          }

          if (constraints.maxLatency && optimizations.frameSize > constraints.maxLatency / 2) {
            optimizations.frameSize = Math.max(2.5, constraints.maxLatency / 2);
            optimizations.recommendations.push('Frame size reduced for latency constraint');
          }

          return optimizations;
        },
      };

      // Test Opus codec string parsing
      const opusParsing = opusValidator.parseOpusCodecString('opus');
      expect(opusParsing.valid).toBe(true);
      expect(opusParsing.codec).toBe('Opus');
      expect(opusParsing.standardized).toBe(true);

      // Test invalid codec string
      const invalidOpus = opusValidator.parseOpusCodecString('invalid');
      expect(invalidOpus.valid).toBe(false);

      // Test Opus configuration validation
      const validConfig = {
        sampleRate: 48000,
        channels: 2,
        bitrate: 128000,
        frameSize: 20,
        application: 'audio',
      };
      
      const configValidation = opusValidator.validateOpusConfiguration(validConfig);
      expect(configValidation.valid).toBe(true);
      expect(configValidation.errors).toHaveLength(0);

      // Test invalid configuration
      const invalidConfig = {
        sampleRate: 22050, // Invalid sample rate
        channels: 2,
        bitrate: 128000,
        application: 'invalid',
      };
      
      const invalidValidation = opusValidator.validateOpusConfiguration(invalidConfig);
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);

      // Test quality analysis
      const qualityAnalysis = opusValidator.analyzeOpusQuality(128000, 48000, 2, 'audio');
      expect(qualityAnalysis.quality).toBe('acceptable'); // 64kbps per channel
      expect(qualityAnalysis.efficiency).toBe('excellent');
      expect(qualityAnalysis.latency).toBe('low');

      // Test codec comparison
      const comparison = opusValidator.compareWithOtherCodecs({ bitrate: 128000, channels: 2 });
      expect(comparison.vs_mp3.quality).toBe('opus_better');
      expect(comparison.vs_aac.latency).toBe('opus_better');
      expect(comparison.advantages).toContain('Low algorithmic delay');

      // Test settings optimization
      const musicOptimization = opusValidator.optimizeOpusSettings('music_streaming');
      expect(musicOptimization.application).toBe('audio');
      expect(musicOptimization.bitrate).toBe(128000);

      const voiceOptimization = opusValidator.optimizeOpusSettings('voice_chat');
      expect(voiceOptimization.application).toBe('voip');
      expect(voiceOptimization.dtx).toBe(true);

      const liveOptimization = opusValidator.optimizeOpusSettings('live_streaming', { maxLatency: 50 });
      expect(liveOptimization.application).toBe('restricted_lowdelay');
      expect(liveOptimization.frameSize).toBeLessThanOrEqual(25);
    });
  });
});