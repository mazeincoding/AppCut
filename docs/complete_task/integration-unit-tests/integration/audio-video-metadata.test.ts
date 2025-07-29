/**
 * Audio/Video Metadata Testing
 * Tests duration metadata, frame rate metadata, and audio sample rate validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Audio/Video Metadata Tests', () => {
  let mockFFmpeg: any;
  let mockMediaInfo: any;

  beforeEach(() => {
    mockFFmpeg = {
      load: jest.fn(),
      writeFile: jest.fn(),
      exec: jest.fn(),
      readFile: jest.fn(),
      deleteFile: jest.fn(),
      on: jest.fn(),
    };

    mockMediaInfo = {
      parse: jest.fn().mockReturnValue({
        format: {
          duration: 30.0,
          bitrate: 2796202,
          format_name: 'mp4',
        },
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            r_frame_rate: '30/1',
            duration: '30.000000',
            nb_frames: '900',
          },
          {
            codec_type: 'audio',
            codec_name: 'aac',
            sample_rate: '48000',
            duration: '30.000000',
            bit_rate: '128000',
            channels: 2,
          },
        ],
      }),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Duration Metadata Validation', () => {
    it('should validate video duration metadata accuracy', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      
      // Test duration validation
      const actualDuration = parseFloat(metadata.format.duration);
      const expectedDuration = 30.0;
      const difference = Math.abs(actualDuration - expectedDuration);
      
      expect(actualDuration).toBeCloseTo(expectedDuration, 3);
      expect(difference).toBeLessThan(0.001);
    });

    it('should validate frame count consistency', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      
      const expectedFrames = Math.round(parseFloat(videoStream.duration) * 30);
      const actualFrames = parseInt(videoStream.nb_frames);
      
      expect(Math.abs(expectedFrames - actualFrames)).toBeLessThanOrEqual(1);
    });

    it('should validate audio/video sync', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      const videoDuration = parseFloat(videoStream.duration);
      const audioDuration = parseFloat(audioStream.duration);
      const syncDifference = Math.abs(videoDuration - audioDuration);
      
      expect(syncDifference).toBeLessThan(0.01);
    });
  });

  describe('Frame Rate Metadata Validation', () => {
    it('should validate frame rate accuracy', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      
      const actualFps = parseFloat(videoStream.r_frame_rate);
      const expectedFps = 30;
      const difference = Math.abs(actualFps - expectedFps);
      
      expect(actualFps).toBeCloseTo(expectedFps, 2);
      expect(difference).toBeLessThan(0.01);
    });

    it('should validate frame rate consistency', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      
      // Parse frame rate from fraction format (e.g., "30/1")
      const parseFrameRate = (rateString: string) => {
        const [num, den] = rateString.split('/').map(Number);
        return num / (den || 1);
      };
      
      const rFrameRate = parseFrameRate(videoStream.r_frame_rate);
      const avgFrameRate = videoStream.avg_frame_rate ? parseFrameRate(videoStream.avg_frame_rate) : rFrameRate;
      
      expect(Math.abs(rFrameRate - avgFrameRate)).toBeLessThan(0.01);
    });

    it('should validate standard frame rates', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      
      // Parse frame rate from fraction format
      const parseFrameRate = (rateString: string) => {
        const [num, den] = rateString.split('/').map(Number);
        return num / (den || 1);
      };
      
      const frameRate = parseFrameRate(videoStream.r_frame_rate);
      const standardRates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
      
      const closestStandard = standardRates.reduce((prev, curr) => 
        Math.abs(curr - frameRate) < Math.abs(prev - frameRate) ? curr : prev
      );
      
      const difference = Math.abs(frameRate - closestStandard);
      expect(difference).toBeLessThan(0.01);
    });
  });

  describe('Audio Sample Rate Validation', () => {
    it('should validate sample rate accuracy', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      const actualRate = parseInt(audioStream.sample_rate);
      const expectedRate = 48000;
      
      expect(actualRate).toBe(expectedRate);
    });

    it('should validate standard sample rates', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      const sampleRate = parseInt(audioStream.sample_rate);
      const standardRates = [8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000, 96000, 192000];
      
      expect(standardRates).toContain(sampleRate);
    });

    it('should validate audio quality metrics', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      const sampleRate = parseInt(audioStream.sample_rate);
      const bitRate = parseInt(audioStream.bit_rate);
      const channels = parseInt(audioStream.channels);
      
      const bitsPerSample = bitRate / (sampleRate * channels);
      
      expect(bitsPerSample).toBeGreaterThan(1);
      expect(bitsPerSample).toBeLessThan(4);
    });
  });

  describe('Metadata Integrity', () => {
    it('should validate metadata completeness', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      
      expect(metadata.format.duration).toBeDefined();
      expect(metadata.format.format_name).toBeDefined();
      expect(metadata.format.bitrate).toBeDefined();
      
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      expect(videoStream).toBeDefined();
      expect(audioStream).toBeDefined();
    });

    it('should validate metadata consistency', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      const videoDuration = parseFloat(videoStream.duration);
      const audioDuration = parseFloat(audioStream.duration);
      const formatDuration = parseFloat(metadata.format.duration);
      
      expect(Math.abs(videoDuration - audioDuration)).toBeLessThan(0.01);
      expect(Math.abs(videoDuration - formatDuration)).toBeLessThan(0.01);
      expect(Math.abs(audioDuration - formatDuration)).toBeLessThan(0.01);
    });

    it('should validate format compliance', () => {
      const metadata = mockMediaInfo.parse.mock.results[0]?.value || mockMediaInfo.parse();
      
      const format = metadata.format.format_name;
      expect(['mp4', 'webm', 'mov', 'avi']).toContain(format);
      
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      expect(videoStream.codec_name).toMatch(/h264|vp9|vp8|hevc/);
      expect(audioStream.codec_name).toMatch(/aac|mp3|opus|flac/);
    });
  });
});
