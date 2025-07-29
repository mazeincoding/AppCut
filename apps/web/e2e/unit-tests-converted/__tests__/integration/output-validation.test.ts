import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { FFmpegUtils } from '../../lib/ffmpeg-utils';

describe('Output Validation', () => {
  let exportEngine: ExportEngine;
  let ffmpegUtils: FFmpegUtils;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    ffmpegUtils = new FFmpegUtils();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validate file integrity', () => {
    it('should validate MP4 file structure', async () => {
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
        quality: 'medium'
      });

      // Validate MP4 structure
      const arrayBuffer = await result.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Check for MP4 signature (ftyp box)
      const ftypSignature = Array.from(uint8Array.slice(4, 8))
        .map(byte => String.fromCharCode(byte))
        .join('');
      
      expect(ftypSignature).toBe('ftyp');
      
      // Validate file is not corrupted
      expect(uint8Array.length).toBeGreaterThan(1000);
      expect(result.blob.type).toContain('video');
    });

    it('should validate WebM file structure', async () => {
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
        quality: 'medium'
      });

      const arrayBuffer = await result.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Check for WebM/Matroska signature
      const ebmlSignature = Array.from(uint8Array.slice(0, 4));
      expect(ebmlSignature).toEqual([0x1A, 0x45, 0xDF, 0xA3]); // EBML signature
      
      expect(result.blob.type).toContain('webm');
    });

    it('should validate MOV file structure', async () => {
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
        format: 'mov',
        quality: 'medium'
      });

      const arrayBuffer = await result.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Check for QuickTime signature
      const qtSignature = Array.from(uint8Array.slice(4, 8))
        .map(byte => String.fromCharCode(byte))
        .join('');
      
      expect(['ftyp', 'mdat', 'moov']).toContain(qtSignature);
      expect(result.blob.type).toContain('video');
    });

    it('should detect corrupted output files', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'corrupted-input.mp4'
          }
        ],
        duration: 30000
      };

      try {
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium',
          validateOutput: true
        });

        // If export succeeds, validate the output
        const isValid = await exportEngine.validateOutputFile(result.blob);
        expect(isValid).toBe(true);
      } catch (error) {
        // If export fails due to corrupted input, that's expected
        expect(error.message).toMatch(/corrupted|invalid|failed/i);
      }
    });

    it('should validate audio track integrity', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'test-video.mp4'
          },
          {
            id: '2',
            type: 'audio',
            startTime: 0,
            duration: 30000,
            src: 'test-audio.mp3'
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(result.metadata.hasAudio).toBe(true);
      expect(result.metadata.audioTracks).toBeGreaterThan(0);
      expect(result.metadata.audioCodec).toBeDefined();
    });

    it('should validate video track integrity', async () => {
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
        quality: 'medium'
      });

      expect(result.metadata.hasVideo).toBe(true);
      expect(result.metadata.videoTracks).toBeGreaterThan(0);
      expect(result.metadata.videoCodec).toBeDefined();
      expect(result.metadata.width).toBeGreaterThan(0);
      expect(result.metadata.height).toBeGreaterThan(0);
    });
  });

  describe('Test playback compatibility', () => {
    it('should be playable in HTML5 video element', async () => {
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
        quality: 'medium'
      });

      // Create a video element to test playback
      const video = document.createElement('video');
      const url = URL.createObjectURL(result.blob);
      video.src = url;

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          expect(video.duration).toBeCloseTo(30, 1); // 30 seconds ±1
          expect(video.videoWidth).toBeGreaterThan(0);
          expect(video.videoHeight).toBeGreaterThan(0);
          URL.revokeObjectURL(url);
          resolve(true);
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Video failed to load'));
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          URL.revokeObjectURL(url);
          reject(new Error('Video load timeout'));
        }, 5000);
      });
    });

    it('should be compatible with different browsers', async () => {
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

      const formats = [
        { format: 'mp4', expectedSupport: ['chrome', 'firefox', 'safari', 'edge'] },
        { format: 'webm', expectedSupport: ['chrome', 'firefox', 'edge'] },
        { format: 'mov', expectedSupport: ['safari', 'chrome'] }
      ];

      for (const { format, expectedSupport } of formats) {
        const result = await exportEngine.exportVideo({
          timeline,
          format,
          quality: 'medium'
        });

        // Test browser compatibility
        const video = document.createElement('video');
        const canPlay = video.canPlayType(result.blob.type);
        
        if (expectedSupport.includes('chrome')) {
          expect(['probably', 'maybe']).toContain(canPlay);
        }
      }
    });

    it('should maintain aspect ratio during playback', async () => {
      const aspectRatios = [
        { width: 1920, height: 1080, ratio: 16/9 },
        { width: 1080, height: 1920, ratio: 9/16 },
        { width: 1080, height: 1080, ratio: 1/1 }
      ];

      for (const ar of aspectRatios) {
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
          quality: 'medium',
          resolution: `${ar.width}x${ar.height}`
        });

        const video = document.createElement('video');
        const url = URL.createObjectURL(result.blob);
        video.src = url;

        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            const actualRatio = video.videoWidth / video.videoHeight;
            expect(actualRatio).toBeCloseTo(ar.ratio, 2);
            URL.revokeObjectURL(url);
            resolve(true);
          };
        });
      }
    });

    it('should handle seeking correctly', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 60000, // 1 minute
            src: 'test-video.mp4'
          }
        ],
        duration: 60000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      const video = document.createElement('video');
      const url = URL.createObjectURL(result.blob);
      video.src = url;

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          // Test seeking to different positions
          const seekPositions = [0, 15, 30, 45, 60];
          let seekTests = 0;

          const testSeek = (position: number) => {
            video.currentTime = position;
            video.onseeked = () => {
              expect(video.currentTime).toBeCloseTo(position, 1);
              seekTests++;
              
              if (seekTests === seekPositions.length) {
                URL.revokeObjectURL(url);
                resolve(true);
              } else if (seekTests < seekPositions.length) {
                testSeek(seekPositions[seekTests]);
              }
            };
          };

          testSeek(seekPositions[0]);
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Video seeking test failed'));
        };
      });
    });

    it('should support different playback speeds', async () => {
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
        quality: 'medium'
      });

      const video = document.createElement('video');
      const url = URL.createObjectURL(result.blob);
      video.src = url;

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          const playbackRates = [0.5, 1.0, 1.25, 1.5, 2.0];
          
          playbackRates.forEach(rate => {
            video.playbackRate = rate;
            expect(video.playbackRate).toBe(rate);
          });

          URL.revokeObjectURL(url);
          resolve(true);
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Playback rate test failed'));
        };
      });
    });
  });

  describe('Format standards compliance', () => {
    it('should comply with MP4 standards', async () => {
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
        quality: 'medium'
      });

      expect(result.metadata.format).toBe('mp4');
      expect(result.metadata.container).toBe('mp4');
      expect(['h264', 'h265']).toContain(result.metadata.videoCodec);
      expect(['aac', 'mp3']).toContain(result.metadata.audioCodec);
    });

    it('should comply with WebM standards', async () => {
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
        quality: 'medium'
      });

      expect(result.metadata.format).toBe('webm');
      expect(result.metadata.container).toBe('webm');
      expect(['vp8', 'vp9', 'av1']).toContain(result.metadata.videoCodec);
      expect(['vorbis', 'opus']).toContain(result.metadata.audioCodec);
    });

    it('should comply with MOV standards', async () => {
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
        format: 'mov',
        quality: 'medium'
      });

      expect(result.metadata.format).toBe('mov');
      expect(result.metadata.container).toBe('mov');
      expect(['h264', 'h265', 'prores']).toContain(result.metadata.videoCodec);
      expect(['aac', 'pcm']).toContain(result.metadata.audioCodec);
    });

    it('should include proper metadata headers', async () => {
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
        quality: 'medium',
        metadata: {
          title: 'Test Video',
          creator: 'OpenCut',
          description: 'Test export'
        }
      });

      expect(result.metadata.title).toBe('Test Video');
      expect(result.metadata.creator).toBe('OpenCut');
      expect(result.metadata.description).toBe('Test export');
      expect(result.metadata.creationTime).toBeDefined();
    });

    it('should validate codec profiles and levels', async () => {
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
        quality: 'high',
        codecParams: {
          profile: 'high',
          level: '4.0'
        }
      });

      expect(result.metadata.profile).toBe('high');
      expect(result.metadata.level).toBe('4.0');
      expect(result.metadata.profileCompliant).toBe(true);
    });
  });
});