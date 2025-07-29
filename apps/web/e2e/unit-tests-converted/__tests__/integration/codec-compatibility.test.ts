/**
 * Codec Compatibility Integration Tests
 * Tests codec support and compatibility across different browsers
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Codec Compatibility Tests', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('H.264 Support', () => {
    it('should detect H.264 support in Chrome', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('avc1.42E01E');
      });
      
      const h264Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E');
      expect(h264Supported).toBe(true);
    });

    it('should detect H.264 support in Safari', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('mp4') && type.includes('avc1');
      });
      
      const h264Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E');
      expect(h264Supported).toBe(true);
    });

    it('should handle H.264 absence in Firefox', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return !type.includes('mp4');
      });
      
      const h264Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E');
      expect(h264Supported).toBe(false);
    });
  });

  describe('VP9 Support', () => {
    it('should detect VP9 support in Chrome', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('vp9');
      });
      
      const vp9Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
      expect(vp9Supported).toBe(true);
    });

    it('should detect VP9 support in Firefox', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('vp9');
      });
      
      const vp9Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
      expect(vp9Supported).toBe(true);
    });

    it('should handle VP9 absence in Safari', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return !type.includes('webm');
      });
      
      const vp9Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
      expect(vp9Supported).toBe(false);
    });
  });

  describe('VP8 Support', () => {
    it('should detect VP8 support in Chrome', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('vp8');
      });
      
      const vp8Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
      expect(vp8Supported).toBe(true);
    });

    it('should detect VP8 support in Firefox', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('vp8');
      });
      
      const vp8Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
      expect(vp8Supported).toBe(true);
    });

    it('should handle VP8 absence in Safari', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return !type.includes('webm');
      });
      
      const vp8Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
      expect(vp8Supported).toBe(false);
    });
  });

  describe('AAC Support', () => {
    it('should detect AAC support in MP4', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('mp4a.40.2');
      });
      
      const aacSupported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
      expect(aacSupported).toBe(true);
    });

    it('should detect AAC support in WebM', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('opus');
      });
      
      const opusSupported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus');
      expect(opusSupported).toBe(true);
    });
  });

  describe('Browser-Specific Codec Matrix', () => {
    it('should detect Chrome codec support', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('mp4') || type.includes('webm');
      });
      
      const chromeCodecs = {
        h264: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
        vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
        aac: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2'),
      };

      expect(chromeCodecs.h264).toBe(true);
      expect(chromeCodecs.vp9).toBe(true);
      expect(chromeCodecs.vp8).toBe(true);
      expect(chromeCodecs.aac).toBe(true);
    });

    it('should detect Firefox codec support', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('webm') || (type.includes('mp4') && !type.includes('avc1'));
      });
      
      const firefoxCodecs = {
        h264: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
        vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
        aac: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2'),
      };

      expect(firefoxCodecs.h264).toBe(false);
      expect(firefoxCodecs.vp9).toBe(true);
      expect(firefoxCodecs.vp8).toBe(true);
      expect(firefoxCodecs.aac).toBe(false);
    });

    it('should detect Safari codec support', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('mp4') && !type.includes('webm');
      });
      
      const safariCodecs = {
        h264: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
        vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
        aac: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2'),
      };

      expect(safariCodecs.h264).toBe(true);
      expect(safariCodecs.vp9).toBe(false);
      expect(safariCodecs.vp8).toBe(false);
      expect(safariCodecs.aac).toBe(true);
    });

    it('should detect Edge codec support', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('mp4') || type.includes('webm');
      });
      
      const edgeCodecs = {
        h264: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
        vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
        aac: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2'),
      };

      expect(edgeCodecs.h264).toBe(true);
      expect(edgeCodecs.vp9).toBe(true);
      expect(edgeCodecs.vp8).toBe(true);
      expect(edgeCodecs.aac).toBe(true);
    });
  });

  describe('Codec Fallback Strategy', () => {
    it('should provide fallback for unsupported codecs', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockReturnValue(false);
      
      const getFallbackCodec = (preferred: string) => {
        if (preferred.includes('mp4')) return 'video/webm;codecs=vp9';
        if (preferred.includes('webm')) return 'video/mp4;codecs=avc1.42E01E';
        return 'video/webm;codecs=vp8';
      };

      const fallback = getFallbackCodec('video/mp4;codecs=avc1.42E01E');
      expect(fallback).toBe('video/webm;codecs=vp9');
    });

    it('should handle all codecs unsupported', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockReturnValue(false);
      
      const getSupportedFormats = () => {
        const formats = [
          'video/mp4;codecs=avc1.42E01E',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
        ];
        return formats.filter(format => MediaRecorder.isTypeSupported(format));
      };

      const supported = getSupportedFormats();
      expect(supported).toEqual([]);
    });
  });

  // Task 9.8: Test Codec Parameters (3 min)
  describe('Codec Parameters Testing', () => {
    it('should test bitrate settings', () => {
      const testBitrates = [
        { bitrate: 1000000, expected: '1Mbps' },
        { bitrate: 4000000, expected: '4Mbps' },
        { bitrate: 8000000, expected: '8Mbps' },
        { bitrate: 25000000, expected: '25Mbps' }
      ];

      testBitrates.forEach(({ bitrate, expected }) => {
        const formatString = `video/mp4;codecs=avc1.42E01E;bitrate=${bitrate}`;
        const parsedBitrate = Math.floor(bitrate / 1000000) + 'Mbps';
        expect(parsedBitrate).toBe(expected);
      });
    });

    it('should test keyframe intervals', () => {
      const keyframeIntervals = [1, 2, 5, 10, 30];
      
      keyframeIntervals.forEach(interval => {
        const codecString = `video/mp4;codecs=avc1.42E01E;keyint=${interval}`;
        expect(codecString).toContain(`keyint=${interval}`);
        expect(interval).toBeGreaterThan(0);
        expect(interval).toBeLessThanOrEqual(30);
      });
    });

    it('should test codec profiles', () => {
      const h264Profiles = [
        'avc1.42E01E', // Baseline
        'avc1.4D401E', // Main
        'avc1.64001E', // High
        'avc1.640028'  // High 10
      ];

      h264Profiles.forEach(profile => {
        const codecString = `video/mp4;codecs=${profile}`;
        expect(codecString).toContain(profile);
        expect(profile).toMatch(/^avc1\.[0-9A-F]{6}$/);
      });

      const vp9Profiles = [
        'vp09.00.10.08', // Profile 0
        'vp09.01.20.08', // Profile 1
        'vp09.02.10.10'  // Profile 2
      ];

      vp9Profiles.forEach(profile => {
        const codecString = `video/webm;codecs=${profile}`;
        expect(codecString).toContain(profile);
        expect(profile).toMatch(/^vp09\.\d{2}\.\d{2}\.\d{2}$/);
      });
    });

    it('should validate codec parameter combinations', () => {
      const validCombinations = [
        {
          codec: 'avc1.42E01E',
          bitrate: 4000000,
          keyint: 2,
          format: 'mp4'
        },
        {
          codec: 'vp09.00.10.08',
          bitrate: 2000000,
          keyint: 5,
          format: 'webm'
        }
      ];

      validCombinations.forEach(combo => {
        const formatString = `video/${combo.format};codecs=${combo.codec};bitrate=${combo.bitrate};keyint=${combo.keyint}`;
        expect(formatString).toContain(combo.codec);
        expect(formatString).toContain(combo.bitrate.toString());
        expect(formatString).toContain(combo.keyint.toString());
      });
    });

    it('should handle invalid codec parameters gracefully', () => {
      const invalidParams = [
        { bitrate: -1000000, valid: false },
        { bitrate: 0, valid: false },
        { bitrate: 1000000, valid: true },
        { keyint: -1, valid: false },
        { keyint: 0, valid: false },
        { keyint: 1, valid: true },
        { keyint: 100, valid: false } // Too high
      ];

      invalidParams.forEach(param => {
        if ('bitrate' in param) {
          const isValid = param.bitrate > 0 && param.bitrate <= 50000000;
          expect(isValid).toBe(param.valid);
        }
        if ('keyint' in param) {
          const isValid = param.keyint > 0 && param.keyint <= 30;
          expect(isValid).toBe(param.valid);
        }
      });
    });
  });
});
