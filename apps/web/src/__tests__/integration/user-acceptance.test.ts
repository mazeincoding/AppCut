import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { TimelineStore } from '../../stores/timeline-store';

describe('User Acceptance Testing', () => {
  let exportEngine: ExportEngine;
  let timelineStore: TimelineStore;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    timelineStore = new TimelineStore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Typical user workflows', () => {
    it('should handle basic video editing workflow', async () => {
      // User uploads a video
      const videoFile = new File(['video content'], 'my-video.mp4', { type: 'video/mp4' });
      
      // User adds video to timeline
      timelineStore.addElement({
        id: '1',
        type: 'video',
        startTime: 0,
        duration: 60000,
        src: URL.createObjectURL(videoFile)
      });

      // User trims the video
      timelineStore.updateElement('1', {
        startTime: 5000,
        duration: 30000
      });

      // User adds a title overlay
      timelineStore.addElement({
        id: '2',
        type: 'text',
        startTime: 0,
        duration: 5000,
        content: 'My Video Title',
        style: {
          fontSize: 24,
          color: '#ffffff',
          position: { x: 50, y: 10 }
        }
      });

      // User exports the video
      const result = await exportEngine.exportVideo({
        timeline: timelineStore.getTimeline(),
        format: 'mp4',
        quality: 'high'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.duration).toBe(30000);
      expect(result.metadata.elementsCount).toBe(2);
    });

    it('should handle social media content creation workflow', async () => {
      // User creates content for Instagram (square format)
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 15000, // 15 seconds for Instagram
            src: 'source-video.mp4'
          },
          {
            id: '2',
            type: 'audio',
            startTime: 0,
            duration: 15000,
            src: 'background-music.mp3',
            volume: 0.3
          },
          {
            id: '3',
            type: 'text',
            startTime: 2000,
            duration: 3000,
            content: '#MyContent',
            style: {
              fontSize: 32,
              color: '#ff6b6b',
              animation: 'fadeIn'
            }
          }
        ],
        duration: 15000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        resolution: '1080x1080', // Square format
        optimizeForSocial: true
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.aspectRatio).toBe('1:1');
      expect(result.metadata.socialOptimized).toBe(true);
      expect(result.metadata.duration).toBe(15000);
    });

    it('should handle podcast/audio content workflow', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'audio',
            startTime: 0,
            duration: 1800000, // 30 minutes
            src: 'podcast-recording.wav'
          },
          {
            id: '2',
            type: 'audio',
            startTime: 0,
            duration: 10000,
            src: 'intro-music.mp3',
            volume: 0.8
          },
          {
            id: '3',
            type: 'audio',
            startTime: 1790000,
            duration: 10000,
            src: 'outro-music.mp3',
            volume: 0.8
          },
          {
            id: '4',
            type: 'image',
            startTime: 0,
            duration: 1800000,
            src: 'podcast-cover.jpg' // Static image for video version
          }
        ],
        duration: 1800000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        optimizeForAudio: true,
        videoBitrate: '500k', // Low video bitrate for audio content
        audioBitrate: '128k'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.audioOptimized).toBe(true);
      expect(result.metadata.videoBitrate).toBeLessThan(1000000);
    });

    it('should handle educational content workflow', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 300000, // 5 minutes
            src: 'screen-recording.mp4'
          },
          {
            id: '2',
            type: 'audio',
            startTime: 0,
            duration: 300000,
            src: 'narration.wav'
          },
          // Multiple text overlays for key points
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `text-${i + 3}`,
            type: 'text',
            startTime: i * 60000,
            duration: 5000,
            content: `Key Point ${i + 1}`,
            style: {
              fontSize: 28,
              color: '#2196f3',
              backgroundColor: 'rgba(255,255,255,0.9)',
              position: { x: 10, y: 80 }
            }
          }))
        ],
        duration: 300000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        optimizeForEducation: true
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.educationOptimized).toBe(true);
      expect(result.metadata.textOverlaysCount).toBe(5);
    });
  });

  describe('Usability feedback simulation', () => {
    it('should provide clear progress feedback', async () => {
      const progressUpdates: any[] = [];
      
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

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      expect(progressUpdates.length).toBeGreaterThan(5);
      
      // Progress should be increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].percentage).toBeGreaterThanOrEqual(progressUpdates[i - 1].percentage);
      }

      // Should include time estimates
      progressUpdates.forEach(update => {
        expect(update).toHaveProperty('percentage');
        expect(update).toHaveProperty('timeRemaining');
        expect(update).toHaveProperty('currentStep');
      });
    });

    it('should provide helpful error messages', async () => {
      const errorScenarios = [
        {
          timeline: {
            elements: [
              {
                id: '1',
                type: 'video',
                startTime: 0,
                duration: 60000,
                src: 'non-existent-file.mp4'
              }
            ],
            duration: 60000
          },
          expectedError: /file.*not.*found/i
        },
        {
          timeline: {
            elements: [
              {
                id: '1',
                type: 'video',
                startTime: 0,
                duration: 60000,
                src: 'corrupted-file.mp4'
              }
            ],
            duration: 60000
          },
          expectedError: /corrupted.*invalid/i
        }
      ];

      for (const scenario of errorScenarios) {
        try {
          await exportEngine.exportVideo({
            timeline: scenario.timeline,
            format: 'mp4',
            quality: 'medium'
          });
          fail('Expected error was not thrown');
        } catch (error) {
          expect(error.message).toMatch(scenario.expectedError);
          expect(error.userFriendly).toBe(true);
          expect(error.suggestions).toBeDefined();
        }
      }
    });

    it('should handle user cancellation gracefully', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 180000, // 3 minutes
            src: 'long-video.mp4'
          }
        ],
        duration: 180000
      };

      const exportPromise = exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high'
      });

      // Simulate user cancellation after 2 seconds
      setTimeout(() => {
        exportEngine.cancelExport();
      }, 2000);

      try {
        await exportPromise;
        fail('Export should have been cancelled');
      } catch (error) {
        expect(error.message).toContain('cancelled');
        expect(error.code).toBe('USER_CANCELLED');
      }

      // Verify cleanup
      expect(exportEngine.isExporting()).toBe(false);
    });

    it('should provide export quality preview', async () => {
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

      const preview = await exportEngine.generatePreview({
        timeline,
        format: 'mp4',
        quality: 'high',
        previewDuration: 10000 // 10 second preview
      });

      expect(preview.blob).toBeInstanceOf(Blob);
      expect(preview.metadata.duration).toBe(10000);
      expect(preview.metadata.isPreview).toBe(true);
      expect(preview.metadata.estimatedFullSize).toBeDefined();
      expect(preview.metadata.estimatedFullDuration).toBeDefined();
    });
  });

  describe('Accessibility and ease of use', () => {
    it('should support keyboard shortcuts for common actions', async () => {
      const shortcuts = {
        'Ctrl+E': 'export',
        'Ctrl+P': 'preview',
        'Escape': 'cancel',
        'Space': 'playPause'
      };

      for (const [shortcut, action] of Object.entries(shortcuts)) {
        const mockKeyEvent = new KeyboardEvent('keydown', {
          key: shortcut.split('+').pop(),
          ctrlKey: shortcut.includes('Ctrl'),
          code: shortcut.split('+').pop()
        });

        const actionTriggered = exportEngine.handleKeyboardShortcut(mockKeyEvent);
        expect(actionTriggered).toBe(action);
      }
    });

    it('should provide screen reader friendly interface', async () => {
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

      const accessibilityInfo = exportEngine.getAccessibilityInfo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(accessibilityInfo.ariaLabels).toBeDefined();
      expect(accessibilityInfo.descriptions).toBeDefined();
      expect(accessibilityInfo.keyboardNavigation).toBe(true);
      expect(accessibilityInfo.screenReaderSupport).toBe(true);
    });

    it('should handle different device capabilities', async () => {
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

      const deviceCapabilities = [
        { type: 'mobile', memory: '2GB', cpu: 'low' },
        { type: 'tablet', memory: '4GB', cpu: 'medium' },
        { type: 'desktop', memory: '16GB', cpu: 'high' }
      ];

      for (const device of deviceCapabilities) {
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'auto',
          deviceCapabilities: device
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.metadata.optimizedForDevice).toBe(device.type);
        
        if (device.cpu === 'low') {
          expect(result.metadata.quality).toBe('medium');
        }
      }
    });
  });
});