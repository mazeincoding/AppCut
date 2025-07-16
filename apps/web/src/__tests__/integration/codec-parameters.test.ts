import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { FFmpegUtils } from '../../lib/ffmpeg-utils';

describe('Codec Parameters', () => {
  let exportEngine: ExportEngine;
  let ffmpegUtils: FFmpegUtils;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    ffmpegUtils = new FFmpegUtils();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bitrate settings', () => {
    it('should apply custom video bitrate settings', async () => {
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

      const customBitrates = [
        { video: '1000k', audio: '128k', expected: { video: 1000000, audio: 128000 } },
        { video: '2500k', audio: '192k', expected: { video: 2500000, audio: 192000 } },
        { video: '5000k', audio: '256k', expected: { video: 5000000, audio: 256000 } }
      ];

      for (const bitrate of customBitrates) {
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          codecParams: {
            videoBitrate: bitrate.video,
            audioBitrate: bitrate.audio
          }
        });

        expect(result.metadata.videoBitrate).toBeCloseTo(bitrate.expected.video, -3);
        expect(result.metadata.audioBitrate).toBeCloseTo(bitrate.expected.audio, -3);
      }
    });

    it('should handle variable bitrate (VBR) settings', async () => {
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

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        codecParams: {
          videoBitrate: 'variable',
          vbrQuality: 23, // CRF value for H.264
          audioBitrate: 'variable',
          audioQuality: 0.5 // VBR quality 0-1
        }
      });

      expect(result.metadata.encodingMode).toBe('VBR');
      expect(result.metadata.crfValue).toBe(23);
    });

    it('should validate bitrate ranges', async () => {
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

      // Test invalid bitrates
      const invalidBitrates = [
        { video: '50k', audio: '32k' }, // Too low
        { video: '50000k', audio: '1000k' }, // Too high
        { video: 'invalid', audio: '128k' } // Invalid format
      ];

      for (const bitrate of invalidBitrates) {
        await expect(exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          codecParams: {
            videoBitrate: bitrate.video,
            audioBitrate: bitrate.audio
          }
        })).rejects.toThrow(/bitrate/i);
      }
    });
  });

  describe('Keyframe intervals', () => {
    it('should set custom keyframe intervals', async () => {
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

      const keyframeIntervals = [1, 2, 5, 10]; // seconds

      for (const interval of keyframeIntervals) {
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          codecParams: {
            keyframeInterval: interval,
            frameRate: 30
          }
        });

        const expectedKeyframes = Math.ceil(60 / interval);
        expect(result.metadata.keyframeCount).toBeCloseTo(expectedKeyframes, 1);
        expect(result.metadata.keyframeInterval).toBe(interval * 30); // frames
      }
    });

    it('should handle GOP (Group of Pictures) settings', async () => {
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

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        codecParams: {
          gopSize: 60, // 2 seconds at 30fps
          bFrames: 2,
          frameRate: 30
        }
      });

      expect(result.metadata.gopSize).toBe(60);
      expect(result.metadata.bFrameCount).toBe(2);
    });

    it('should optimize keyframes for streaming', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 120000,
            src: 'test-video.mp4'
          }
        ],
        duration: 120000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        codecParams: {
          optimizeForStreaming: true,
          keyframeInterval: 2, // Every 2 seconds for better seeking
          profile: 'baseline' // Compatible profile
        }
      });

      expect(result.metadata.streamingOptimized).toBe(true);
      expect(result.metadata.profile).toBe('baseline');
    });
  });

  describe('Codec profiles', () => {
    it('should apply H.264 profiles correctly', async () => {
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

      const profiles = ['baseline', 'main', 'high'];

      for (const profile of profiles) {
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          codecParams: {
            videoCodec: 'h264',
            profile: profile,
            level: '4.0'
          }
        });

        expect(result.metadata.videoCodec).toBe('h264');
        expect(result.metadata.profile).toBe(profile);
        expect(result.metadata.level).toBe('4.0');
      }
    });

    it('should handle VP9 codec parameters', async () => {
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

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'webm',
        codecParams: {
          videoCodec: 'vp9',
          tileColumns: 2,
          tileRows: 1,
          cpuUsed: 2 // Speed vs quality tradeoff
        }
      });

      expect(result.metadata.videoCodec).toBe('vp9');
      expect(result.metadata.tileColumns).toBe(2);
      expect(result.metadata.cpuUsed).toBe(2);
    });

    it('should validate codec compatibility', async () => {
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

      // Test incompatible codec/format combinations
      const incompatibleCombos = [
        { format: 'mp4', videoCodec: 'vp9' }, // VP9 not standard in MP4
        { format: 'webm', videoCodec: 'h264' }, // H.264 not standard in WebM
        { format: 'mov', audioCodec: 'opus' } // Opus not standard in MOV
      ];

      for (const combo of incompatibleCombos) {
        await expect(exportEngine.exportVideo({
          timeline,
          format: combo.format,
          codecParams: {
            videoCodec: combo.videoCodec,
            audioCodec: combo.audioCodec
          }
        })).rejects.toThrow(/codec.*compatible/i);
      }
    });
  });

  describe('Advanced codec settings', () => {
    it('should handle multi-pass encoding', async () => {
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

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        codecParams: {
          passes: 2,
          targetBitrate: '2000k',
          maxBitrate: '2500k',
          bufferSize: '4000k'
        }
      });

      expect(result.metadata.encodingPasses).toBe(2);
      expect(result.metadata.targetBitrate).toBe(2000000);
    });

    it('should configure rate control modes', async () => {
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

      const rateControlModes = ['CBR', 'VBR', 'CRF'];

      for (const mode of rateControlModes) {
        const codecParams = {
          rateControl: mode,
          ...(mode === 'CBR' && { bitrate: '1500k' }),
          ...(mode === 'VBR' && { minBitrate: '500k', maxBitrate: '3000k' }),
          ...(mode === 'CRF' && { crf: 23 })
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          codecParams
        });

        expect(result.metadata.rateControlMode).toBe(mode);
      }
    });

    it('should handle hardware acceleration settings', async () => {
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

      // Test hardware acceleration if available
      const hwAccelOptions = ['auto', 'nvenc', 'qsv', 'vaapi', 'none'];

      for (const hwAccel of hwAccelOptions) {
        try {
          const result = await exportEngine.exportVideo({
            timeline,
            format: 'mp4',
            codecParams: {
              hardwareAcceleration: hwAccel,
              videoCodec: hwAccel === 'nvenc' ? 'h264_nvenc' : 'h264'
            }
          });

          if (hwAccel !== 'none') {
            expect(result.metadata.hardwareAccelerated).toBe(true);
            expect(result.metadata.accelerationType).toBe(hwAccel);
          }
        } catch (error) {
          // Hardware acceleration might not be available
          if (!error.message.includes('not available')) {
            throw error;
          }
        }
      }
    });
  });
});