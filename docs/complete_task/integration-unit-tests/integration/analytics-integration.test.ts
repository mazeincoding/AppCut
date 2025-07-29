import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { AnalyticsService } from '../../lib/analytics-service';

describe('Analytics Integration', () => {
  let exportEngine: ExportEngine;
  let analyticsService: AnalyticsService;
  let mockAnalytics: jest.Mock;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    analyticsService = new AnalyticsService();
    mockAnalytics = jest.fn();
    
    // Mock analytics tracking
    global.gtag = mockAnalytics;
    global.analytics = {
      track: mockAnalytics,
      identify: mockAnalytics,
      page: mockAnalytics
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Test export tracking', () => {
    it('should track export start events', async () => {
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

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableAnalytics: true
      });

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'export_started', {
        format: 'mp4',
        quality: 'medium',
        duration: 30000,
        elements_count: 1,
        timestamp: expect.any(Number)
      });
    });

    it('should track export completion events', async () => {
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
        enableAnalytics: true
      });

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'export_completed', {
        format: 'mp4',
        quality: 'medium',
        duration: 30000,
        file_size: result.blob.size,
        export_time: expect.any(Number),
        success: true
      });
    });

    it('should track export progress milestones', async () => {
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

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableAnalytics: true,
        trackProgress: true
      });

      // Should track progress at 25%, 50%, 75%, 100%
      const progressCalls = mockAnalytics.mock.calls.filter(call => 
        call[1] === 'export_progress'
      );

      expect(progressCalls.length).toBeGreaterThanOrEqual(3);
      expect(progressCalls.some(call => call[2].progress === 25)).toBe(true);
      expect(progressCalls.some(call => call[2].progress === 50)).toBe(true);
      expect(progressCalls.some(call => call[2].progress === 75)).toBe(true);
    });

    it('should track user engagement metrics', async () => {
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
            type: 'text',
            startTime: 5000,
            duration: 10000,
            content: 'Test Text'
          }
        ],
        duration: 30000
      };

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        enableAnalytics: true
      });

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'user_engagement', {
        session_duration: expect.any(Number),
        elements_added: 2,
        text_overlays_used: 1,
        quality_selected: 'high',
        format_selected: 'mp4'
      });
    });

    it('should track feature usage', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'test-video.mp4',
            effects: ['fade', 'scale']
          },
          {
            id: '2',
            type: 'audio',
            startTime: 0,
            duration: 30000,
            src: 'test-audio.mp3',
            volume: 0.8
          }
        ],
        duration: 30000
      };

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableAnalytics: true
      });

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'feature_usage', {
        video_effects_used: ['fade', 'scale'],
        audio_tracks_used: 1,
        volume_adjusted: true,
        multi_track_editing: true
      });
    });
  });

  describe('Test error reporting', () => {
    it('should track export failures', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'non-existent-file.mp4'
          }
        ],
        duration: 30000
      };

      try {
        await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium',
          enableAnalytics: true
        });
      } catch (error) {
        // Expected error
      }

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'export_failed', {
        error_type: 'file_not_found',
        error_message: expect.any(String),
        format: 'mp4',
        quality: 'medium',
        timestamp: expect.any(Number)
      });
    });

    it('should track browser compatibility issues', async () => {
      // Mock unsupported browser
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1)',
        configurable: true
      });

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

      try {
        await exportEngine.exportVideo({
          timeline,
          format: 'webm',
          quality: 'medium',
          enableAnalytics: true
        });
      } catch (error) {
        // Expected compatibility error
      }

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'compatibility_error', {
        browser: 'IE',
        version: '9.0',
        feature: 'webm_export',
        supported: false
      });

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
    });

    it('should track memory and performance issues', async () => {
      // Mock low memory condition
      global.performance.memory = {
        usedJSHeapSize: 1900000000, // 1.9GB
        totalJSHeapSize: 2000000000, // 2GB
        jsHeapSizeLimit: 2000000000
      };

      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 300000, // 5 minutes
            src: 'large-video.mp4'
          }
        ],
        duration: 300000
      };

      try {
        await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'high',
          enableAnalytics: true
        });
      } catch (error) {
        // Expected memory error
      }

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'performance_issue', {
        issue_type: 'memory_pressure',
        memory_usage: 1900000000,
        memory_limit: 2000000000,
        video_duration: 300000,
        quality: 'high'
      });
    });

    it('should track user cancellations', async () => {
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

      const exportPromise = exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        enableAnalytics: true
      });

      // Simulate user cancellation
      setTimeout(() => {
        exportEngine.cancelExport();
      }, 1000);

      try {
        await exportPromise;
      } catch (error) {
        // Expected cancellation
      }

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'export_cancelled', {
        cancellation_time: expect.any(Number),
        progress_at_cancellation: expect.any(Number),
        format: 'mp4',
        quality: 'high'
      });
    });
  });

  describe('Test performance metrics', () => {
    it('should track export performance metrics', async () => {
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

      const startTime = performance.now();
      
      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableAnalytics: true
      });

      const endTime = performance.now();

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'performance_metrics', {
        export_duration: expect.any(Number),
        video_duration: 60000,
        export_speed_ratio: expect.any(Number),
        memory_peak: expect.any(Number),
        cpu_usage: expect.any(Number)
      });
    });

    it('should track file size optimization metrics', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'test-video.mp4',
            metadata: {
              originalSize: 10000000 // 10MB
            }
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableAnalytics: true
      });

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'compression_metrics', {
        original_size: 10000000,
        compressed_size: result.blob.size,
        compression_ratio: expect.any(Number),
        quality_setting: 'medium',
        format: 'mp4'
      });
    });

    it('should track browser performance metrics', async () => {
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

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableAnalytics: true
      });

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'browser_performance', {
        user_agent: navigator.userAgent,
        hardware_concurrency: navigator.hardwareConcurrency,
        memory_info: expect.any(Object),
        connection_type: expect.any(String),
        device_type: expect.any(String)
      });
    });

    it('should track quality vs performance tradeoffs', async () => {
      const qualities = ['low', 'medium', 'high'];
      const performanceData = [];

      for (const quality of qualities) {
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

        const startTime = performance.now();
        
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality,
          enableAnalytics: true
        });

        const exportTime = performance.now() - startTime;
        performanceData.push({
          quality,
          export_time: exportTime,
          file_size: result.blob.size
        });
      }

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'quality_performance_analysis', {
        performance_data: performanceData,
        optimal_quality: expect.any(String),
        recommendations: expect.any(Array)
      });
    });

    it('should track user workflow patterns', async () => {
      const workflowSteps = [
        'project_created',
        'media_uploaded',
        'timeline_edited',
        'effects_applied',
        'export_initiated',
        'export_completed'
      ];

      for (const step of workflowSteps) {
        analyticsService.trackWorkflowStep(step, {
          timestamp: Date.now(),
          session_id: 'test-session'
        });
      }

      expect(mockAnalytics).toHaveBeenCalledWith('event', 'workflow_completed', {
        steps: workflowSteps,
        total_time: expect.any(Number),
        efficiency_score: expect.any(Number),
        session_id: 'test-session'
      });
    });
  });
});