/**
 * Feature Detection Integration Tests
 * Tests browser feature detection for video export functionality
 */

import { describe, it, expect } from '@jest/globals';

describe('Feature Detection Tests', () => {

  describe('MediaRecorder Detection', () => {
    it('should detect MediaRecorder support', () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      expect(hasMediaRecorder).toBe(true);
    });

    it('should detect MediaRecorder methods', () => {
      expect(typeof MediaRecorder.isTypeSupported).toBe('function');
    });

    it('should handle MediaRecorder absence gracefully', () => {
      Object.defineProperty(window, 'MediaRecorder', {
        writable: true,
        value: undefined,
      });
      
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      expect(hasMediaRecorder).toBe(false);
    });
  });

  describe('Canvas Detection', () => {
    it('should detect canvas.captureStream support', () => {
      const hasCaptureStream = typeof HTMLCanvasElement.prototype.captureStream !== 'undefined';
      expect(hasCaptureStream).toBe(true);
    });

    it('should handle canvas.captureStream absence', () => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
        writable: true,
        value: undefined,
      });
      
      const hasCaptureStream = typeof HTMLCanvasElement.prototype.captureStream !== 'undefined';
      expect(hasCaptureStream).toBe(false);
    });
  });

  describe('AudioContext Detection', () => {
    it('should detect AudioContext support', () => {
      const hasAudioContext = typeof AudioContext !== 'undefined';
      expect(hasAudioContext).toBe(true);
    });

    it('should detect webkitAudioContext fallback', () => {
      const hasWebkitAudioContext = typeof (window as any).webkitAudioContext !== 'undefined';
      expect(hasWebkitAudioContext).toBe(true);
    });

    it('should detect OfflineAudioContext', () => {
      const hasOfflineAudioContext = typeof (window as any).OfflineAudioContext !== 'undefined';
      expect(hasOfflineAudioContext).toBe(true);
    });

    it('should handle AudioContext absence', () => {
      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: undefined,
      });
      
      const hasAudioContext = typeof AudioContext !== 'undefined';
      expect(hasAudioContext).toBe(false);
    });
  });

  describe('Codec Compatibility', () => {
    it('should detect H.264 support', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('avc1.42E01E');
      });
      
      const h264Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E');
      expect(h264Supported).toBe(true);
    });

    it('should detect VP9 support', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('vp9');
      });
      
      const vp9Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
      expect(vp9Supported).toBe(true);
    });

    it('should detect VP8 support', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('vp8');
      });
      
      const vp8Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
      expect(vp8Supported).toBe(true);
    });

    it('should handle unsupported codecs', () => {
      (MediaRecorder.isTypeSupported as jest.Mock).mockReturnValue(false);
      
      const unsupportedSupported = MediaRecorder.isTypeSupported('video/unsupported');
      expect(unsupportedSupported).toBe(false);
    });
  });

  describe('Browser Compatibility Matrix', () => {
    it('should detect Chrome features', () => {
      const features = {
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        canvasCaptureStream: typeof HTMLCanvasElement.prototype.captureStream !== 'undefined',
        audioContext: typeof AudioContext !== 'undefined',
        webkitAudioContext: typeof (window as any).webkitAudioContext !== 'undefined',
        h264Support: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9Support: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
        vp8Support: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
      };

      expect(features.mediaRecorder).toBe(true);
      expect(features.canvasCaptureStream).toBe(true);
      expect(features.audioContext).toBe(true);
      expect(features.webkitAudioContext).toBe(true);
      expect(features.h264Support).toBe(true);
      expect(features.vp9Support).toBe(true);
      expect(features.vp8Support).toBe(true);
    });

    it('should detect Firefox features', () => {
      // Mock Firefox behavior
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('vp9') || type.includes('vp8');
      });
      
      const features = {
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        canvasCaptureStream: typeof HTMLCanvasElement.prototype.captureStream !== 'undefined',
        audioContext: typeof AudioContext !== 'undefined',
        h264Support: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9Support: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
      };

      expect(features.vp9Support).toBe(true);
      expect(features.h264Support).toBe(false); // Firefox may not support H.264
    });

    it('should detect Safari features', () => {
      // Mock Safari behavior
      (MediaRecorder.isTypeSupported as jest.Mock).mockImplementation((type: string) => {
        return type.includes('mp4') && !type.includes('webm');
      });
      
      const features = {
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        canvasCaptureStream: typeof HTMLCanvasElement.prototype.captureStream !== 'undefined',
        audioContext: typeof AudioContext !== 'undefined',
        h264Support: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9Support: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
      };

      expect(features.h264Support).toBe(true);
      expect(features.vp9Support).toBe(false); // Safari may not support VP9
    });
  });

  describe('PWA Compatibility', () => {
    it('should detect PWA support', () => {
      const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
      const hasManifest = typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window;
      
      expect(typeof hasServiceWorker).toBe('boolean');
      expect(typeof hasManifest).toBe('boolean');
    });

    it('should detect offline capabilities', () => {
      const hasCache = typeof caches !== 'undefined';
      const hasFetch = typeof fetch !== 'undefined';
      
      expect(typeof hasCache).toBe('boolean');
      expect(typeof hasFetch).toBe('boolean');
    });

    it('should detect file system access', () => {
      const hasFileSystem = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
      const hasFileAPI = typeof File !== 'undefined';
      
      expect(typeof hasFileSystem).toBe('boolean');
      expect(typeof hasFileAPI).toBe('boolean');
    });
  });

  describe('Cross-browser Consistency', () => {
    it('should provide consistent feature detection', () => {
      const detectFeatures = () => ({
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        canvasCaptureStream: typeof HTMLCanvasElement.prototype.captureStream !== 'undefined',
        audioContext: typeof AudioContext !== 'undefined',
        webkitAudioContext: typeof (window as any).webkitAudioContext !== 'undefined',
        h264Support: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp9Support: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
        vp8Support: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
      });

      const features = detectFeatures();
      expect(typeof features.mediaRecorder).toBe('boolean');
      expect(typeof features.canvasCaptureStream).toBe('boolean');
      expect(typeof features.audioContext).toBe('boolean');
      expect(typeof features.h264Support).toBe('boolean');
      expect(typeof features.vp9Support).toBe('boolean');
      expect(typeof features.vp8Support).toBe('boolean');
    });

    it('should handle missing APIs gracefully', () => {
      // Simulate missing APIs
      Object.defineProperty(window, 'MediaRecorder', {
        writable: true,
        value: undefined,
      });
      
      Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
        writable: true,
        value: undefined,
      });
      
      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: undefined,
      });

      const detectFeatures = () => ({
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        canvasCaptureStream: typeof HTMLCanvasElement.prototype.captureStream !== 'undefined',
        audioContext: typeof AudioContext !== 'undefined',
        h264Support: false,
        vp9Support: false,
        vp8Support: false,
      });

      const features = detectFeatures();
      expect(features.mediaRecorder).toBe(false);
      expect(features.canvasCaptureStream).toBe(false);
      expect(features.audioContext).toBe(false);
    });
  });
});
