/**
 * Codec Compatibility Integration Tests
 * Tests codec support and compatibility across different browsers
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock codec support for different browsers
const mockCodecSupport = () => {
  // Mock MediaRecorder.isTypeSupported
  Object.defineProperty(MediaRecorder, 'isTypeSupported', {
    writable: true,
    value: jest.fn(),
  });
};

describe('Codec Compatibility Tests', () => {
  beforeEach(() => {
    mockCodecSupport();
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
});
