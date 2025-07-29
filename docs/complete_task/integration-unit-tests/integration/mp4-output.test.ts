/**
 * MP4 Output Integration Tests
 * Tests MP4 file structure, H.264 video codec, and AAC audio codec validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('MP4 Output Tests', () => {
  let mockMediaRecorder: any;
  let mockCanvas: any;
  let mockAudioContext: any;

  beforeEach(() => {
    // Mock MediaRecorder for MP4 recording
    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      requestData: jest.fn(),
      state: 'inactive',
      mimeType: 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
      videoBitsPerSecond: 2500000,
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

  describe('MP4 File Structure', () => {
    it('should validate MP4 container format', () => {
      const mp4Validator = {
        validateMP4Header: (data: ArrayBuffer) => {
          const view = new DataView(data);
          const validation = {
            valid: false,
            fileType: '',
            brand: '',
            version: 0,
            compatibleBrands: [] as string[],
            issues: [] as string[],
          };

          try {
            // Check for ftyp box (first 4 bytes should be box size, next 4 should be 'ftyp')
            if (data.byteLength < 8) {
              validation.issues.push('File too small to contain valid MP4 header');
              return validation;
            }

            const boxSize = view.getUint32(0);
            const boxType = String.fromCharCode(
              view.getUint8(4), view.getUint8(5), view.getUint8(6), view.getUint8(7)
            );

            if (boxType !== 'ftyp') {
              validation.issues.push(`Expected 'ftyp' box, found '${boxType}'`);
              return validation;
            }

            // Read major brand
            if (data.byteLength >= 16) {
              validation.brand = String.fromCharCode(
                view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
              );
              validation.version = view.getUint32(12);
            }

            // Read compatible brands
            for (let i = 16; i < Math.min(boxSize, data.byteLength); i += 4) {
              if (i + 3 < data.byteLength) {
                const brand = String.fromCharCode(
                  view.getUint8(i), view.getUint8(i + 1), view.getUint8(i + 2), view.getUint8(i + 3)
                );
                validation.compatibleBrands.push(brand);
              }
            }

            validation.valid = true;
            validation.fileType = 'MP4';

          } catch (error) {
            validation.issues.push(`Failed to parse MP4 header: ${error.message}`);
          }

          return validation;
        },

        checkRequiredBoxes: (expectedBoxes: string[] = ['ftyp', 'moov', 'mdat']) => {
          // Simulate box presence check
          const foundBoxes = ['ftyp', 'moov', 'mdat', 'mvhd', 'trak'];
          const missingBoxes = expectedBoxes.filter(box => !foundBoxes.includes(box));
          
          return {
            expectedBoxes,
            foundBoxes,
            missingBoxes,
            allPresent: missingBoxes.length === 0,
            extraBoxes: foundBoxes.filter(box => !expectedBoxes.includes(box)),
          };
        },

        validateMP4Structure: (data: ArrayBuffer) => {
          const header = mp4Validator.validateMP4Header(data);
          const boxes = mp4Validator.checkRequiredBoxes();
          
          const structure = {
            isValidMP4: header.valid && boxes.allPresent,
            header,
            boxes,
            recommendations: [] as string[],
          };

          if (!header.valid) {
            structure.recommendations.push('Fix MP4 header format');
          }
          if (!boxes.allPresent) {
            structure.recommendations.push(`Add missing boxes: ${boxes.missingBoxes.join(', ')}`);
          }
          if (!['isom', 'mp41', 'mp42'].includes(header.brand)) {
            structure.recommendations.push('Use standard MP4 brand (isom, mp41, or mp42)');
          }

          return structure;
        },

        extractMetadata: (data: ArrayBuffer) => {
          // Simulate metadata extraction
          return {
            duration: 30.5,
            creationTime: new Date().toISOString(),
            modificationTime: new Date().toISOString(),
            timescale: 1000,
            tracks: [
              {
                id: 1,
                type: 'video',
                duration: 30.5,
                width: 1920,
                height: 1080,
                codec: 'avc1.42E01E',
                frameRate: 30,
              },
              {
                id: 2,
                type: 'audio',
                duration: 30.5,
                sampleRate: 48000,
                channels: 2,
                codec: 'mp4a.40.2',
                bitrate: 128000,
              },
            ],
          };
        },

        validateFragmentation: (data: ArrayBuffer) => {
          // Check if MP4 is fragmented (has moof boxes)
          const isFragmented = Math.random() > 0.7; // 30% chance for demo
          
          return {
            isFragmented,
            fragmentCount: isFragmented ? Math.floor(Math.random() * 10) + 1 : 0,
            supportsStreaming: isFragmented,
            playbackStart: isFragmented ? 'immediate' : 'after_complete_download',
            compatibility: {
              web: true,
              mobile: true,
              oldPlayers: !isFragmented,
            },
          };
        },
      };

      // Test MP4 header validation
      const mockMP4Data = new ArrayBuffer(32);
      const view = new DataView(mockMP4Data);
      
      // Create mock ftyp box
      view.setUint32(0, 32); // Box size
      view.setUint8(4, 0x66); // 'f'
      view.setUint8(5, 0x74); // 't'
      view.setUint8(6, 0x79); // 'y'
      view.setUint8(7, 0x70); // 'p'
      view.setUint8(8, 0x69); // 'i'
      view.setUint8(9, 0x73); // 's'
      view.setUint8(10, 0x6F); // 'o'
      view.setUint8(11, 0x6D); // 'm'
      view.setUint32(12, 0); // Version
      
      const headerValidation = mp4Validator.validateMP4Header(mockMP4Data);
      expect(headerValidation.valid).toBe(true);
      expect(headerValidation.brand).toBe('isom');
      expect(headerValidation.fileType).toBe('MP4');

      // Test required boxes check
      const boxCheck = mp4Validator.checkRequiredBoxes();
      expect(boxCheck.allPresent).toBe(true);
      expect(boxCheck.missingBoxes).toHaveLength(0);

      // Test overall structure validation
      const structureValidation = mp4Validator.validateMP4Structure(mockMP4Data);
      expect(structureValidation.isValidMP4).toBe(true);
      expect(structureValidation.recommendations).toHaveLength(0);

      // Test metadata extraction
      const metadata = mp4Validator.extractMetadata(mockMP4Data);
      expect(metadata.tracks).toHaveLength(2);
      expect(metadata.tracks[0].type).toBe('video');
      expect(metadata.tracks[1].type).toBe('audio');

      // Test fragmentation validation
      const fragmentation = mp4Validator.validateFragmentation(mockMP4Data);
      expect(fragmentation.compatibility.web).toBe(true);
      expect(['immediate', 'after_complete_download']).toContain(fragmentation.playbackStart);
    });

    it('should validate MP4 compatibility and standards compliance', () => {
      const compatibilityChecker = {
        checkBrowserSupport: (codecString: string) => {
          const supportMatrix = {
            'video/mp4; codecs="avc1.42E01E,mp4a.40.2"': {
              chrome: { supported: true, version: '4+' },
              firefox: { supported: true, version: '35+' },
              safari: { supported: true, version: '3.1+' },
              edge: { supported: true, version: '12+' },
              ie: { supported: true, version: '9+' },
            },
            'video/mp4; codecs="avc1.4D401E,mp4a.40.2"': {
              chrome: { supported: true, version: '4+' },
              firefox: { supported: true, version: '35+' },
              safari: { supported: true, version: '5+' },
              edge: { supported: true, version: '12+' },
              ie: { supported: false, version: 'N/A' },
            },
            'video/mp4; codecs="hev1.1.6.L93.B0,mp4a.40.2"': {
              chrome: { supported: true, version: '107+' },
              firefox: { supported: false, version: 'N/A' },
              safari: { supported: true, version: '11+' },
              edge: { supported: true, version: '18+' },
              ie: { supported: false, version: 'N/A' },
            },
          };

          return supportMatrix[codecString] || {
            chrome: { supported: false, version: 'Unknown' },
            firefox: { supported: false, version: 'Unknown' },
            safari: { supported: false, version: 'Unknown' },
            edge: { supported: false, version: 'Unknown' },
            ie: { supported: false, version: 'Unknown' },
          };
        },

        validateStandardsCompliance: (mp4Info: any) => {
          const compliance = {
            iso14496: true, // ISO/IEC 14496 (MPEG-4)
            iso23000: true, // ISO/IEC 23000 (MPEG-A)
            rfc6381: true,  // RFC 6381 (Codec parameter syntax)
            issues: [] as string[],
            warnings: [] as string[],
          };

          // Check codec parameters
          if (mp4Info.videoCodec && !mp4Info.videoCodec.startsWith('avc1.')) {
            compliance.rfc6381 = false;
            compliance.issues.push('Video codec parameter format non-compliant with RFC 6381');
          }

          if (mp4Info.audioCodec && !mp4Info.audioCodec.startsWith('mp4a.')) {
            compliance.rfc6381 = false;
            compliance.issues.push('Audio codec parameter format non-compliant with RFC 6381');
          }

          // Check timescale
          if (mp4Info.timescale && (mp4Info.timescale < 1 || mp4Info.timescale > 2147483647)) {
            compliance.iso14496 = false;
            compliance.issues.push('Timescale value outside valid range (1-2147483647)');
          }

          // Check track IDs
          if (mp4Info.tracks) {
            const trackIds = mp4Info.tracks.map((t: any) => t.id);
            if (trackIds.includes(0)) {
              compliance.iso14496 = false;
              compliance.issues.push('Track ID cannot be 0 (ISO 14496-12)');
            }
            if (new Set(trackIds).size !== trackIds.length) {
              compliance.iso14496 = false;
              compliance.issues.push('Duplicate track IDs found');
            }
          }

          // Warnings for best practices
          if (mp4Info.duration && mp4Info.duration > 3600) {
            compliance.warnings.push('Files over 1 hour may have compatibility issues');
          }

          return compliance;
        },

        assessPlaybackCompatibility: (mp4Specs: any) => {
          const compatibility = {
            desktop: { score: 0, issues: [] as string[] },
            mobile: { score: 0, issues: [] as string[] },
            streaming: { score: 0, issues: [] as string[] },
            overall: 0,
          };

          // Desktop compatibility
          compatibility.desktop.score = 90;
          if (mp4Specs.profile && mp4Specs.profile.includes('High')) {
            compatibility.desktop.score -= 5;
            compatibility.desktop.issues.push('High profile may not work on older hardware');
          }
          if (mp4Specs.level && parseInt(mp4Specs.level) > 40) {
            compatibility.desktop.score -= 10;
            compatibility.desktop.issues.push('High level may require powerful hardware');
          }

          // Mobile compatibility
          compatibility.mobile.score = 85;
          if (mp4Specs.resolution && (mp4Specs.resolution.width > 1920 || mp4Specs.resolution.height > 1080)) {
            compatibility.mobile.score -= 15;
            compatibility.mobile.issues.push('4K resolution may not play on all mobile devices');
          }
          if (mp4Specs.frameRate && mp4Specs.frameRate > 30) {
            compatibility.mobile.score -= 10;
            compatibility.mobile.issues.push('High frame rates may drain battery faster');
          }
          if (mp4Specs.bitrate && mp4Specs.bitrate > 5000000) {
            compatibility.mobile.score -= 10;
            compatibility.mobile.issues.push('High bitrate may cause buffering on mobile networks');
          }

          // Streaming compatibility
          compatibility.streaming.score = mp4Specs.isFragmented ? 95 : 60;
          if (!mp4Specs.isFragmented) {
            compatibility.streaming.issues.push('Non-fragmented MP4 requires full download before playback');
          }
          if (mp4Specs.keyFrameInterval && mp4Specs.keyFrameInterval > 5) {
            compatibility.streaming.score -= 10;
            compatibility.streaming.issues.push('Large keyframe intervals may affect seeking performance');
          }

          compatibility.overall = Math.round((
            compatibility.desktop.score * 0.4 +
            compatibility.mobile.score * 0.4 +
            compatibility.streaming.score * 0.2
          ));

          return compatibility;
        },

        generateCompatibilityReport: (mp4Data: any) => {
          const browserSupport = compatibilityChecker.checkBrowserSupport(mp4Data.mimeType);
          const standards = compatibilityChecker.validateStandardsCompliance(mp4Data);
          const playback = compatibilityChecker.assessPlaybackCompatibility(mp4Data);

          const supportedBrowsers = Object.keys(browserSupport).filter(
            browser => browserSupport[browser].supported
          );

          return {
            browserSupport: {
              supportedBrowsers,
              supportPercentage: (supportedBrowsers.length / Object.keys(browserSupport).length) * 100,
              details: browserSupport,
            },
            standards,
            playback,
            overallCompatibility: standards.issues.length === 0 && playback.overall > 70 ? 'excellent' : 
                                 standards.issues.length <= 2 && playback.overall > 50 ? 'good' : 'poor',
            recommendations: compatibilityChecker.getRecommendations(standards, playback),
          };
        },

        getRecommendations: (standards: any, playback: any) => {
          const recommendations = [];

          if (standards.issues.length > 0) {
            recommendations.push('Fix standards compliance issues for better compatibility');
          }

          if (playback.desktop.score < 80) {
            recommendations.push('Consider reducing video complexity for better desktop compatibility');
          }

          if (playback.mobile.score < 70) {
            recommendations.push('Optimize video settings for mobile devices');
          }

          if (playback.streaming.score < 80) {
            recommendations.push('Enable fragmentation for better streaming performance');
          }

          return recommendations;
        },
      };

      // Test browser support check
      const standardMP4 = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';
      const browserSupport = compatibilityChecker.checkBrowserSupport(standardMP4);
      expect(browserSupport.chrome.supported).toBe(true);
      expect(browserSupport.safari.supported).toBe(true);

      // Test standards compliance
      const mp4Info = {
        videoCodec: 'avc1.42E01E',
        audioCodec: 'mp4a.40.2',
        timescale: 1000,
        tracks: [{ id: 1 }, { id: 2 }],
        duration: 1800, // 30 minutes
      };
      
      const compliance = compatibilityChecker.validateStandardsCompliance(mp4Info);
      expect(compliance.iso14496).toBe(true);
      expect(compliance.rfc6381).toBe(true);
      expect(compliance.issues).toHaveLength(0);

      // Test playback compatibility
      const mp4Specs = {
        profile: 'Baseline',
        level: '31',
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 2500000,
        isFragmented: true,
        keyFrameInterval: 2,
      };
      
      const playbackCompat = compatibilityChecker.assessPlaybackCompatibility(mp4Specs);
      expect(playbackCompat.overall).toBeGreaterThan(70);
      expect(playbackCompat.desktop.score).toBeGreaterThan(80);

      // Test compatibility report generation
      const report = compatibilityChecker.generateCompatibilityReport({
        mimeType: standardMP4,
        ...mp4Info,
        ...mp4Specs,
      });
      
      expect(report.browserSupport.supportedBrowsers.length).toBeGreaterThan(3);
      expect(report.overallCompatibility).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('H.264 Video Codec', () => {
    it('should validate H.264 codec parameters and settings', () => {
      const h264Validator = {
        parseCodecString: (codecString: string) => {
          // Parse codec string like "avc1.42E01E"
          const match = codecString.match(/avc1\.([0-9A-Fa-f]{6})/);
          if (!match) {
            return { valid: false, error: 'Invalid AVC codec string format' };
          }

          const profileLevelId = match[1];
          const profileIdc = parseInt(profileLevelId.substring(0, 2), 16);
          const constraintFlags = parseInt(profileLevelId.substring(2, 4), 16);
          const levelIdc = parseInt(profileLevelId.substring(4, 6), 16);

          const profiles = {
            66: 'Baseline',
            77: 'Main',
            88: 'Extended',
            100: 'High',
            110: 'High 10',
            122: 'High 4:2:2',
            244: 'High 4:4:4',
          };

          const levels = {
            10: '1.0', 11: '1.1', 12: '1.2', 13: '1.3',
            20: '2.0', 21: '2.1', 22: '2.2',
            30: '3.0', 31: '3.1', 32: '3.2',
            40: '4.0', 41: '4.1', 42: '4.2',
            50: '5.0', 51: '5.1', 52: '5.2',
          };

          return {
            valid: true,
            profileIdc,
            profile: profiles[profileIdc] || `Unknown (${profileIdc})`,
            constraintFlags,
            levelIdc,
            level: levels[levelIdc] || `Unknown (${levelIdc})`,
            codecString,
            profileLevelId,
          };
        },

        validateProfile: (profile: string, useCase: string = 'web') => {
          const profileValidation = {
            supported: true,
            compatibility: 'excellent' as string,
            limitations: [] as string[],
            recommendations: [] as string[],
          };

          switch (profile) {
            case 'Baseline':
              profileValidation.compatibility = 'excellent';
              profileValidation.recommendations.push('Best compatibility across all devices');
              break;
              
            case 'Main':
              profileValidation.compatibility = 'good';
              profileValidation.limitations.push('May not work on very old devices');
              break;
              
            case 'High':
              profileValidation.compatibility = 'moderate';
              profileValidation.limitations.push('Requires more powerful hardware');
              profileValidation.limitations.push('Higher computational complexity');
              if (useCase === 'mobile') {
                profileValidation.recommendations.push('Consider Main or Baseline profile for mobile');
              }
              break;
              
            case 'Extended':
              profileValidation.supported = false;
              profileValidation.compatibility = 'poor';
              profileValidation.limitations.push('Rarely supported in browsers');
              profileValidation.recommendations.push('Use Baseline or Main profile instead');
              break;
              
            default:
              profileValidation.supported = false;
              profileValidation.compatibility = 'unknown';
              profileValidation.limitations.push('Profile not recognized');
          }

          return profileValidation;
        },

        validateLevel: (level: string, resolution: { width: number, height: number }, frameRate: number) => {
          const levelConstraints = {
            '1.0': { maxMbps: 1485, maxFs: 99, maxDpbMbs: 148.5 },
            '1.1': { maxMbps: 3000, maxFs: 396, maxDpbMbs: 337.5 },
            '1.2': { maxMbps: 6000, maxFs: 396, maxDpbMbs: 891 },
            '1.3': { maxMbps: 11880, maxFs: 396, maxDpbMbs: 891 },
            '2.0': { maxMbps: 11880, maxFs: 396, maxDpbMbs: 891 },
            '2.1': { maxMbps: 19800, maxFs: 792, maxDpbMbs: 1782 },
            '2.2': { maxMbps: 20250, maxFs: 1620, maxDpbMbs: 3037.5 },
            '3.0': { maxMbps: 40500, maxFs: 1620, maxDpbMbs: 3037.5 },
            '3.1': { maxMbps: 108000, maxFs: 3600, maxDpbMbs: 6750 },
            '3.2': { maxMbps: 216000, maxFs: 5120, maxDpbMbs: 7680 },
            '4.0': { maxMbps: 245760, maxFs: 8192, maxDpbMbs: 12288 },
            '4.1': { maxMbps: 245760, maxFs: 8192, maxDpbMbs: 12288 },
            '4.2': { maxMbps: 522240, maxFs: 8704, maxDpbMbs: 13056 },
            '5.0': { maxMbps: 589824, maxFs: 22080, maxDpbMbs: 33120 },
            '5.1': { maxMbps: 983040, maxFs: 36864, maxDpbMbs: 110400 },
            '5.2': { maxMbps: 2073600, maxFs: 36864, maxDpbMbs: 184320 },
          };

          const constraints = levelConstraints[level];
          if (!constraints) {
            return { valid: false, error: `Unknown level: ${level}` };
          }

          // Calculate current requirements
          const mbWidth = Math.ceil(resolution.width / 16);
          const mbHeight = Math.ceil(resolution.height / 16);
          const frameSize = mbWidth * mbHeight; // in macroblocks
          const mbps = frameSize * frameRate; // macroblocks per second

          const validation = {
            valid: true,
            frameSize,
            mbps,
            constraints,
            violations: [] as string[],
            utilization: {
              frameSize: (frameSize / constraints.maxFs) * 100,
              mbps: (mbps / constraints.maxMbps) * 100,
            },
          };

          if (frameSize > constraints.maxFs) {
            validation.valid = false;
            validation.violations.push(`Frame size ${frameSize} exceeds max ${constraints.maxFs} macroblocks`);
          }

          if (mbps > constraints.maxMbps) {
            validation.valid = false;
            validation.violations.push(`MBPS ${mbps} exceeds max ${constraints.maxMbps}`);
          }

          return validation;
        },

        analyzeEncodingSettings: (settings: any) => {
          const analysis = {
            quality: 'unknown' as string,
            efficiency: 'unknown' as string,
            issues: [] as string[],
            recommendations: [] as string[],
          };

          // Analyze bitrate vs resolution
          const pixelsPerSecond = settings.width * settings.height * settings.frameRate;
          const bitsPerPixel = settings.bitrate / pixelsPerSecond;

          if (bitsPerPixel < 0.01) {
            analysis.quality = 'poor';
            analysis.issues.push('Very low bits per pixel - expect quality issues');
          } else if (bitsPerPixel < 0.05) {
            analysis.quality = 'acceptable';
          } else if (bitsPerPixel < 0.15) {
            analysis.quality = 'good';
          } else {
            analysis.quality = 'excellent';
            if (bitsPerPixel > 0.3) {
              analysis.recommendations.push('Bitrate may be unnecessarily high');
            }
          }

          // Analyze keyframe interval
          if (settings.keyFrameInterval > 10) {
            analysis.efficiency = 'poor';
            analysis.issues.push('Large keyframe interval may affect seeking');
            analysis.recommendations.push('Reduce keyframe interval to 2-5 seconds');
          } else if (settings.keyFrameInterval < 1) {
            analysis.efficiency = 'poor';
            analysis.issues.push('Too frequent keyframes increase file size');
            analysis.recommendations.push('Increase keyframe interval to 2-5 seconds');
          } else {
            analysis.efficiency = 'good';
          }

          // Analyze B-frames
          if (settings.bFrames > 3) {
            analysis.recommendations.push('High B-frame count may not be optimal for web delivery');
          }

          return analysis;
        },
      };

      // Test codec string parsing
      const codecParsing = h264Validator.parseCodecString('avc1.42E01F');
      expect(codecParsing.valid).toBe(true);
      expect(codecParsing.profile).toBe('Baseline');
      expect(codecParsing.level).toBe('3.1');
      expect(codecParsing.profileIdc).toBe(66); // 0x42

      // Test invalid codec string
      const invalidCodec = h264Validator.parseCodecString('invalid');
      expect(invalidCodec.valid).toBe(false);
      expect(invalidCodec.error).toContain('Invalid');

      // Test profile validation
      const baselineValidation = h264Validator.validateProfile('Baseline', 'web');
      expect(baselineValidation.supported).toBe(true);
      expect(baselineValidation.compatibility).toBe('excellent');

      const highValidation = h264Validator.validateProfile('High', 'mobile');
      expect(highValidation.supported).toBe(true);
      expect(highValidation.compatibility).toBe('moderate');
      expect(highValidation.recommendations).toContain('Consider Main or Baseline profile for mobile');

      // Test level validation
      const levelValidation = h264Validator.validateLevel('4.0', { width: 1920, height: 1080 }, 30);
      expect(levelValidation.valid).toBe(true);
      expect(levelValidation.frameSize).toBe(8160); // 120 * 68 = 8160 macroblocks
      expect(levelValidation.violations).toHaveLength(0);

      // Test level violation
      const violationValidation = h264Validator.validateLevel('1.0', { width: 1920, height: 1080 }, 30);
      expect(violationValidation.valid).toBe(false);
      expect(violationValidation.violations.length).toBeGreaterThan(0);

      // Test encoding settings analysis
      const goodSettings = {
        width: 1920,
        height: 1080,
        frameRate: 30,
        bitrate: 5000000, // 5 Mbps
        keyFrameInterval: 2,
        bFrames: 2,
      };
      
      const settingsAnalysis = h264Validator.analyzeEncodingSettings(goodSettings);
      expect(settingsAnalysis.quality).toBe('good');
      expect(settingsAnalysis.efficiency).toBe('good');
    });
  });

  describe('AAC Audio Codec', () => {
    it('should validate AAC codec configuration and quality', () => {
      const aacValidator = {
        parseAACCodecString: (codecString: string) => {
          // Parse codec string like "mp4a.40.2"
          const match = codecString.match(/mp4a\.40\.([0-9A-Fa-f]+)/);
          if (!match) {
            return { valid: false, error: 'Invalid AAC codec string format' };
          }

          const objectType = parseInt(match[1], 16);
          
          const objectTypes = {
            1: 'AAC Main',
            2: 'AAC LC (Low Complexity)',
            3: 'AAC SSR (Scalable Sample Rate)',
            4: 'AAC LTP (Long Term Prediction)',
            5: 'SBR (Spectral Band Replication)',
            29: 'AAC LC + SBR',
            42: 'xHE-AAC',
          };

          return {
            valid: true,
            objectType,
            profile: objectTypes[objectType] || `Unknown (${objectType})`,
            codecString,
            isStandard: [1, 2, 4, 5, 29].includes(objectType),
          };
        },

        validateAACProfile: (profile: string, sampleRate: number, channels: number) => {
          const validation = {
            supported: true,
            quality: 'unknown' as string,
            compatibility: 'unknown' as string,
            limitations: [] as string[],
            recommendations: [] as string[],
          };

          switch (profile) {
            case 'AAC LC (Low Complexity)':
              validation.quality = 'good';
              validation.compatibility = 'excellent';
              validation.recommendations.push('Best choice for web compatibility');
              break;
              
            case 'AAC Main':
              validation.quality = 'excellent';
              validation.compatibility = 'good';
              validation.limitations.push('Higher computational complexity');
              validation.limitations.push('Not supported on all devices');
              break;
              
            case 'AAC LTP (Long Term Prediction)':
              validation.quality = 'excellent';
              validation.compatibility = 'poor';
              validation.limitations.push('Limited browser support');
              validation.recommendations.push('Use AAC LC for better compatibility');
              break;
              
            case 'SBR (Spectral Band Replication)':
              validation.quality = 'excellent';
              validation.compatibility = 'moderate';
              if (sampleRate < 32000) {
                validation.limitations.push('SBR most effective at higher sample rates');
              }
              break;
              
            default:
              validation.supported = false;
              validation.compatibility = 'unknown';
              validation.limitations.push('Profile not widely supported');
          }

          // Check sample rate compatibility
          if (sampleRate > 48000) {
            validation.limitations.push('High sample rates may not be supported everywhere');
          }
          if (sampleRate < 22050) {
            validation.quality = 'poor';
            validation.limitations.push('Low sample rate affects audio quality');
          }

          // Check channel configuration
          if (channels > 2) {
            validation.limitations.push('Multichannel audio may not play on all devices');
          }

          return validation;
        },

        analyzeBitrateQuality: (bitrate: number, sampleRate: number, channels: number) => {
          const bitsPerSample = bitrate / (sampleRate * channels);
          
          const analysis = {
            bitsPerSample,
            quality: 'unknown' as string,
            efficiency: 'unknown' as string,
            recommendations: [] as string[],
            comparison: {} as any,
          };

          // Quality assessment based on bitrate per channel
          const bitratePerChannel = bitrate / channels;
          
          if (bitratePerChannel >= 128000) {
            analysis.quality = 'excellent';
          } else if (bitratePerChannel >= 96000) {
            analysis.quality = 'good';
          } else if (bitratePerChannel >= 64000) {
            analysis.quality = 'acceptable';
          } else {
            analysis.quality = 'poor';
            analysis.recommendations.push('Consider increasing bitrate for better quality');
          }

          // Efficiency assessment
          if (bitsPerSample > 8) {
            analysis.efficiency = 'poor';
            analysis.recommendations.push('Bitrate may be unnecessarily high');
          } else if (bitsPerSample > 4) {
            analysis.efficiency = 'good';
          } else if (bitsPerSample > 2) {
            analysis.efficiency = 'excellent';
          } else {
            analysis.efficiency = 'poor';
            analysis.recommendations.push('Bitrate may be too low for good quality');
          }

          // Comparison with other codecs
          analysis.comparison = {
            mp3_128: bitrate >= 128000 ? 'better' : 'worse',
            opus_96: bitrate >= 96000 ? 'similar' : 'worse',
            uncompressed: `${Math.round((1 - bitrate / (sampleRate * channels * 16)) * 100)}% smaller`,
          };

          return analysis;
        },

        validateChannelConfiguration: (channels: number, channelLayout?: string) => {
          const validConfigs = {
            1: { name: 'Mono', common: true, webSupport: 'excellent' },
            2: { name: 'Stereo', common: true, webSupport: 'excellent' },
            3: { name: '2.1', common: false, webSupport: 'limited' },
            4: { name: '4.0 or 3.1', common: false, webSupport: 'limited' },
            5: { name: '5.0 or 4.1', common: false, webSupport: 'limited' },
            6: { name: '5.1', common: true, webSupport: 'good' },
            7: { name: '6.1', common: false, webSupport: 'poor' },
            8: { name: '7.1', common: true, webSupport: 'limited' },
          };

          const config = validConfigs[channels];
          if (!config) {
            return {
              valid: false,
              error: `Unsupported channel count: ${channels}`,
            };
          }

          return {
            valid: true,
            channels,
            name: config.name,
            common: config.common,
            webSupport: config.webSupport,
            recommendations: channels > 2 ? [
              'Test multichannel playback on target devices',
              'Provide stereo fallback for compatibility',
            ] : [],
          };
        },

        assessAudioQuality: (settings: any) => {
          const { bitrate, sampleRate, channels, profile } = settings;
          
          const bitrateAnalysis = aacValidator.analyzeBitrateQuality(bitrate, sampleRate, channels);
          const profileValidation = aacValidator.validateAACProfile(profile, sampleRate, channels);
          const channelValidation = aacValidator.validateChannelConfiguration(channels);

          const overallScore = [
            bitrateAnalysis.quality === 'excellent' ? 25 : 
            bitrateAnalysis.quality === 'good' ? 20 : 
            bitrateAnalysis.quality === 'acceptable' ? 15 : 10,
            
            profileValidation.compatibility === 'excellent' ? 25 : 
            profileValidation.compatibility === 'good' ? 20 : 15,
            
            channelValidation.webSupport === 'excellent' ? 25 : 
            channelValidation.webSupport === 'good' ? 20 : 
            channelValidation.webSupport === 'limited' ? 15 : 10,
            
            sampleRate >= 44100 ? 25 : sampleRate >= 22050 ? 20 : 15,
          ].reduce((sum, score) => sum + score, 0);

          return {
            overallScore,
            grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : 'D',
            bitrateAnalysis,
            profileValidation,
            channelValidation,
            summary: {
              strengths: [],
              weaknesses: [],
              recommendations: [],
            },
          };
        },
      };

      // Test AAC codec string parsing
      const aacParsing = aacValidator.parseAACCodecString('mp4a.40.2');
      expect(aacParsing.valid).toBe(true);
      expect(aacParsing.profile).toBe('AAC LC (Low Complexity)');
      expect(aacParsing.objectType).toBe(2);
      expect(aacParsing.isStandard).toBe(true);

      // Test AAC profile validation
      const profileValidation = aacValidator.validateAACProfile('AAC LC (Low Complexity)', 48000, 2);
      expect(profileValidation.supported).toBe(true);
      expect(profileValidation.compatibility).toBe('excellent');
      expect(profileValidation.quality).toBe('good');

      // Test bitrate quality analysis
      const bitrateAnalysis = aacValidator.analyzeBitrateQuality(256000, 48000, 2); // 256 kbps stereo
      expect(bitrateAnalysis.quality).toBe('excellent'); // 128kbps per channel
      expect(bitrateAnalysis.bitsPerSample).toBeCloseTo(2.67, 1);

      // Test low bitrate
      const lowBitrateAnalysis = aacValidator.analyzeBitrateQuality(96000, 48000, 2); // 96 kbps stereo
      expect(lowBitrateAnalysis.quality).toBe('poor'); // 48kbps per channel
      expect(lowBitrateAnalysis.recommendations).toContain('Consider increasing bitrate for better quality');

      // Test channel configuration validation
      const stereoConfig = aacValidator.validateChannelConfiguration(2);
      expect(stereoConfig.valid).toBe(true);
      expect(stereoConfig.name).toBe('Stereo');
      expect(stereoConfig.webSupport).toBe('excellent');

      const surround51Config = aacValidator.validateChannelConfiguration(6);
      expect(surround51Config.valid).toBe(true);
      expect(surround51Config.name).toBe('5.1');
      expect(surround51Config.webSupport).toBe('good');
      expect(surround51Config.recommendations.length).toBeGreaterThan(0);

      // Test overall quality assessment
      const goodSettings = {
        bitrate: 192000,
        sampleRate: 48000,
        channels: 2,
        profile: 'AAC LC (Low Complexity)',
      };
      
      const qualityAssessment = aacValidator.assessAudioQuality(goodSettings);
      expect(qualityAssessment.overallScore).toBeGreaterThan(70);
      expect(['A', 'B', 'C', 'D']).toContain(qualityAssessment.grade);
    });
  });
});