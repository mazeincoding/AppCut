import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { FFmpegUtils } from '../../lib/ffmpeg-utils';

describe('Format Conversion', () => {
  let exportEngine: ExportEngine;
  let ffmpegUtils: FFmpegUtils;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    ffmpegUtils = new FFmpegUtils();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Input format handling', () => {
    it('should handle various video input formats', async () => {
      const inputFormats = [
        { format: 'mp4', codec: 'h264' },
        { format: 'webm', codec: 'vp9' },
        { format: 'mov', codec: 'h264' },
        { format: 'avi', codec: 'xvid' },
        { format: 'mkv', codec: 'h265' },
        { format: 'flv', codec: 'h264' },
        { format: '3gp', codec: 'h263' }
      ];

      for (const input of inputFormats) {
        const timeline = {
          elements: [
            {
              id: '1',
              type: 'video',
              startTime: 0,
              duration: 30000,
              src: `test-video.${input.format}`,
              metadata: {
                format: input.format,
                videoCodec: input.codec
              }
            }
          ],
          duration: 30000
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4', // Convert all to MP4
          quality: 'medium'
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.metadata.inputFormat).toBe(input.format);
        expect(result.metadata.outputFormat).toBe('mp4');
        expect(result.metadata.conversionApplied).toBe(true);
      }
    });

    it('should handle various audio input formats', async () => {
      const audioFormats = [
        { format: 'mp3', codec: 'mp3' },
        { format: 'wav', codec: 'pcm' },
        { format: 'ogg', codec: 'vorbis' },
        { format: 'aac', codec: 'aac' },
        { format: 'flac', codec: 'flac' },
        { format: 'm4a', codec: 'aac' },
        { format: 'wma', codec: 'wmav2' }
      ];

      for (const audio of audioFormats) {
        const timeline = {
          elements: [
            {
              id: '1',
              type: 'audio',
              startTime: 0,
              duration: 30000,
              src: `test-audio.${audio.format}`,
              metadata: {
                format: audio.format,
                audioCodec: audio.codec
              }
            }
          ],
          duration: 30000
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium'
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.metadata.audioInputFormat).toBe(audio.format);
        expect(result.metadata.audioConversionApplied).toBe(true);
      }
    });

    it('should handle mixed input formats in single timeline', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 15000,
            src: 'video1.mp4',
            metadata: { format: 'mp4', videoCodec: 'h264' }
          },
          {
            id: '2',
            type: 'video',
            startTime: 15000,
            duration: 15000,
            src: 'video2.webm',
            metadata: { format: 'webm', videoCodec: 'vp9' }
          },
          {
            id: '3',
            type: 'audio',
            startTime: 0,
            duration: 30000,
            src: 'audio.mp3',
            metadata: { format: 'mp3', audioCodec: 'mp3' }
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.inputFormats).toEqual(['mp4', 'webm', 'mp3']);
      expect(result.metadata.formatNormalizationApplied).toBe(true);
    });
  });

  describe('Format transcoding', () => {
    it('should transcode between different container formats', async () => {
      const conversionTests = [
        { from: 'mp4', to: 'webm' },
        { from: 'webm', to: 'mp4' },
        { from: 'mov', to: 'mp4' },
        { from: 'avi', to: 'mp4' },
        { from: 'mkv', to: 'webm' }
      ];

      for (const test of conversionTests) {
        const timeline = {
          elements: [
            {
              id: '1',
              type: 'video',
              startTime: 0,
              duration: 30000,
              src: `input.${test.from}`,
              metadata: { format: test.from }
            }
          ],
          duration: 30000
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: test.to,
          quality: 'medium'
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.blob.type).toContain(test.to);
        expect(result.metadata.transcoded).toBe(true);
        expect(result.metadata.sourceFormat).toBe(test.from);
        expect(result.metadata.targetFormat).toBe(test.to);
      }
    });

    it('should handle codec transcoding within same container', async () => {
      const codecTests = [
        { container: 'mp4', fromCodec: 'h265', toCodec: 'h264' },
        { container: 'webm', fromCodec: 'vp8', toCodec: 'vp9' },
        { container: 'mov', fromCodec: 'prores', toCodec: 'h264' }
      ];

      for (const test of codecTests) {
        const timeline = {
          elements: [
            {
              id: '1',
              type: 'video',
              startTime: 0,
              duration: 30000,
              src: `input.${test.container}`,
              metadata: {
                format: test.container,
                videoCodec: test.fromCodec
              }
            }
          ],
          duration: 30000
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: test.container,
          codecParams: {
            videoCodec: test.toCodec
          }
        });

        expect(result.metadata.videoCodec).toBe(test.toCodec);
        expect(result.metadata.codecTranscoded).toBe(true);
      }
    });

    it('should optimize transcoding parameters', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 60000,
            src: 'high-quality-input.mov',
            metadata: {
              format: 'mov',
              videoCodec: 'prores',
              bitrate: 50000000, // 50 Mbps
              resolution: '4096x2160'
            }
          }
        ],
        duration: 60000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        optimizeTranscoding: true
      });

      expect(result.metadata.transcodingOptimized).toBe(true);
      expect(result.metadata.outputBitrate).toBeLessThan(50000000);
      expect(result.metadata.processingTime).toBeDefined();
    });
  });

  describe('Quality preservation', () => {
    it('should preserve quality during lossless conversions', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'lossless-input.mov',
            metadata: {
              format: 'mov',
              videoCodec: 'prores',
              quality: 'lossless'
            }
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'lossless',
        preserveQuality: true
      });

      expect(result.metadata.qualityPreserved).toBe(true);
      expect(result.metadata.qualityLoss).toBe(0);
    });

    it('should handle quality degradation gracefully', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'high-quality.mp4',
            metadata: {
              bitrate: 10000000, // 10 Mbps
              resolution: '1920x1080'
            }
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'webm',
        quality: 'low', // Intentional quality reduction
        targetBitrate: '500k'
      });

      expect(result.metadata.qualityReduced).toBe(true);
      expect(result.metadata.bitrateReduction).toBeGreaterThan(0.9); // 90%+ reduction
      expect(result.metadata.estimatedQualityLoss).toBeDefined();
    });

    it('should maintain aspect ratio during conversion', async () => {
      const aspectRatios = [
        { width: 1920, height: 1080, ratio: '16:9' },
        { width: 1280, height: 720, ratio: '16:9' },
        { width: 1024, height: 768, ratio: '4:3' },
        { width: 2560, height: 1440, ratio: '16:9' }
      ];

      for (const ar of aspectRatios) {
        const timeline = {
          elements: [
            {
              id: '1',
              type: 'video',
              startTime: 0,
              duration: 30000,
              src: 'input.mp4',
              metadata: {
                width: ar.width,
                height: ar.height,
                aspectRatio: ar.ratio
              }
            }
          ],
          duration: 30000
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: 'webm',
          maintainAspectRatio: true
        });

        const outputRatio = result.metadata.width / result.metadata.height;
        const expectedRatio = ar.width / ar.height;
        expect(outputRatio).toBeCloseTo(expectedRatio, 2);
      }
    });

    it('should handle frame rate conversion', async () => {
      const frameRateTests = [
        { input: 24, output: 30 },
        { input: 30, output: 60 },
        { input: 60, output: 30 },
        { input: 25, output: 30 }, // PAL to NTSC
        { input: 29.97, output: 30 }
      ];

      for (const test of frameRateTests) {
        const timeline = {
          elements: [
            {
              id: '1',
              type: 'video',
              startTime: 0,
              duration: 30000,
              src: 'input.mp4',
              metadata: {
                frameRate: test.input
              }
            }
          ],
          duration: 30000
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          targetFrameRate: test.output
        });

        expect(result.metadata.frameRate).toBeCloseTo(test.output, 1);
        expect(result.metadata.frameRateConverted).toBe(test.input !== test.output);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle unsupported input formats', async () => {
      const unsupportedFormats = ['rm', 'wmv', 'asf', 'vob'];

      for (const format of unsupportedFormats) {
        const timeline = {
          elements: [
            {
              id: '1',
              type: 'video',
              startTime: 0,
              duration: 30000,
              src: `unsupported.${format}`
            }
          ],
          duration: 30000
        };

        await expect(exportEngine.exportVideo({
          timeline,
          format: 'mp4'
        })).rejects.toThrow(/unsupported.*format/i);
      }
    });

    it('should handle corrupted input files', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'corrupted.mp4',
            metadata: {
              corrupted: true
            }
          }
        ],
        duration: 30000
      };

      await expect(exportEngine.exportVideo({
        timeline,
        format: 'mp4'
      })).rejects.toThrow(/corrupted.*file/i);
    });

    it('should provide fallback options for failed conversions', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'problematic.avi',
            metadata: {
              hasIssues: true
            }
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        enableFallbacks: true,
        fallbackQuality: 'low'
      });

      expect(result.metadata.fallbackUsed).toBe(true);
      expect(result.metadata.originalConversionFailed).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
    });
  });
});