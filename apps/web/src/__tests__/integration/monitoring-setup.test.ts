import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { MonitoringService } from '../../lib/monitoring-service';

describe('Monitoring Setup', () => {
  let exportEngine: ExportEngine;
  let monitoringService: MonitoringService;
  let mockAlert: jest.Mock;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    monitoringService = new MonitoringService();
    mockAlert = jest.fn();
    
    // Mock monitoring services
    global.Sentry = {
      captureException: mockAlert,
      captureMessage: mockAlert,
      addBreadcrumb: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Setup export monitoring', () => {
    it('should monitor export success rates', async () => {
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

      // Successful export
      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableMonitoring: true
      });

      expect(result.blob).toBeInstanceOf(Blob);
      
      const metrics = monitoringService.getExportMetrics();
      expect(metrics.successRate).toBeGreaterThan(0.9);
      expect(metrics.totalExports).toBeGreaterThan(0);
      expect(metrics.successfulExports).toBeGreaterThan(0);
    });

    it('should monitor export failure rates', async () => {
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
          enableMonitoring: true
        });
      } catch (error) {
        // Expected failure
      }

      const metrics = monitoringService.getExportMetrics();
      expect(metrics.failureRate).toBeGreaterThan(0);
      expect(metrics.failedExports).toBeGreaterThan(0);
      expect(metrics.commonFailureReasons).toContain('file_not_found');
    });

    it('should monitor export performance metrics', async () => {
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
        enableMonitoring: true
      });

      const exportTime = performance.now() - startTime;
      const metrics = monitoringService.getPerformanceMetrics();

      expect(metrics.averageExportTime).toBeGreaterThan(0);
      expect(metrics.p95ExportTime).toBeGreaterThan(metrics.averageExportTime);
      expect(metrics.exportSpeedRatio).toBeGreaterThan(0);
    });

    it('should monitor resource usage during exports', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 120000,
            src: 'large-video.mp4'
          }
        ],
        duration: 120000
      };

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        enableMonitoring: true
      });

      const resourceMetrics = monitoringService.getResourceMetrics();
      
      expect(resourceMetrics.peakMemoryUsage).toBeGreaterThan(0);
      expect(resourceMetrics.averageCpuUsage).toBeGreaterThan(0);
      expect(resourceMetrics.diskIOOperations).toBeGreaterThan(0);
    });

    it('should monitor concurrent export limits', async () => {
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

      // Start multiple concurrent exports
      const concurrentExports = Array.from({ length: 10 }, (_, i) =>
        exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'low',
          exportId: `concurrent-${i}`,
          enableMonitoring: true
        }).catch(error => ({ error }))
      );

      await Promise.all(concurrentExports);

      const concurrencyMetrics = monitoringService.getConcurrencyMetrics();
      expect(concurrencyMetrics.maxConcurrentExports).toBeLessThanOrEqual(5);
      expect(concurrencyMetrics.queuedExports).toBeGreaterThan(0);
      expect(concurrencyMetrics.rejectedExports).toBeGreaterThan(0);
    });
  });

  describe('Setup error tracking', () => {
    it('should track and categorize export errors', async () => {
      const errorScenarios = [
        {
          timeline: { elements: [], duration: 0 },
          expectedCategory: 'validation_error'
        },
        {
          timeline: {
            elements: [
              {
                id: '1',
                type: 'video',
                startTime: 0,
                duration: 30000,
                src: 'corrupted-file.mp4'
              }
            ],
            duration: 30000
          },
          expectedCategory: 'file_error'
        }
      ];

      for (const scenario of errorScenarios) {
        try {
          await exportEngine.exportVideo({
            timeline: scenario.timeline,
            format: 'mp4',
            quality: 'medium',
            enableMonitoring: true
          });
        } catch (error) {
          // Expected errors
        }
      }

      const errorMetrics = monitoringService.getErrorMetrics();
      expect(errorMetrics.errorCategories).toContain('validation_error');
      expect(errorMetrics.errorCategories).toContain('file_error');
      expect(errorMetrics.totalErrors).toBeGreaterThan(0);
    });

    it('should track browser-specific errors', async () => {
      const browserErrors = [
        {
          userAgent: 'Chrome/89.0',
          expectedError: 'browser_compatibility'
        },
        {
          userAgent: 'Safari/13.0',
          expectedError: 'codec_support'
        }
      ];

      for (const browserError of browserErrors) {
        Object.defineProperty(navigator, 'userAgent', {
          value: browserError.userAgent,
          configurable: true
        });

        try {
          await exportEngine.exportVideo({
            timeline: {
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
            },
            format: 'webm',
            quality: 'medium',
            enableMonitoring: true
          });
        } catch (error) {
          // Expected browser-specific errors
        }
      }

      const browserMetrics = monitoringService.getBrowserErrorMetrics();
      expect(browserMetrics.errorsByBrowser).toBeDefined();
      expect(browserMetrics.compatibilityIssues).toBeGreaterThan(0);
    });

    it('should track memory-related errors', async () => {
      // Simulate low memory condition
      global.performance.memory = {
        usedJSHeapSize: 1900000000,
        totalJSHeapSize: 2000000000,
        jsHeapSizeLimit: 2000000000
      };

      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 600000, // 10 minutes
            src: 'large-video.mp4'
          }
        ],
        duration: 600000
      };

      try {
        await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'high',
          enableMonitoring: true
        });
      } catch (error) {
        // Expected memory error
      }

      const memoryMetrics = monitoringService.getMemoryErrorMetrics();
      expect(memoryMetrics.memoryErrors).toBeGreaterThan(0);
      expect(memoryMetrics.averageMemoryAtFailure).toBeGreaterThan(1800000000);
    });

    it('should provide error context and stack traces', async () => {
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
          format: 'invalid_format',
          quality: 'medium',
          enableMonitoring: true
        });
      } catch (error) {
        // Expected format error
      }

      expect(mockAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          stack: expect.any(String),
          context: expect.objectContaining({
            timeline: expect.any(Object),
            format: 'invalid_format',
            quality: 'medium'
          })
        })
      );
    });
  });

  describe('Setup performance alerts', () => {
    it('should alert on slow export performance', async () => {
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

      // Mock slow export
      const originalExport = exportEngine.exportVideo;
      exportEngine.exportVideo = jest.fn().mockImplementation(async (options) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        return originalExport.call(exportEngine, options);
      });

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        enableMonitoring: true
      });

      const alerts = monitoringService.getPerformanceAlerts();
      expect(alerts.slowExports).toBeGreaterThan(0);
      expect(alerts.alertTriggered).toBe(true);
    });

    it('should alert on high memory usage', async () => {
      // Simulate high memory usage
      global.performance.memory = {
        usedJSHeapSize: 1800000000, // 1.8GB
        totalJSHeapSize: 2000000000, // 2GB
        jsHeapSizeLimit: 2000000000
      };

      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 120000,
            src: 'large-video.mp4'
          }
        ],
        duration: 120000
      };

      await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'high',
        enableMonitoring: true
      });

      const memoryAlerts = monitoringService.getMemoryAlerts();
      expect(memoryAlerts.highMemoryUsage).toBe(true);
      expect(memoryAlerts.memoryThresholdExceeded).toBe(true);
    });

    it('should alert on high error rates', async () => {
      // Simulate multiple failed exports
      const failedExports = Array.from({ length: 10 }, () =>
        exportEngine.exportVideo({
          timeline: {
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
          },
          format: 'mp4',
          quality: 'medium',
          enableMonitoring: true
        }).catch(() => {})
      );

      await Promise.all(failedExports);

      const errorAlerts = monitoringService.getErrorRateAlerts();
      expect(errorAlerts.highErrorRate).toBe(true);
      expect(errorAlerts.errorRateThreshold).toBeLessThan(errorAlerts.currentErrorRate);
    });

    it('should alert on service availability issues', async () => {
      // Mock service unavailability
      const mockFetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      global.fetch = mockFetch;

      try {
        await monitoringService.checkServiceHealth();
      } catch (error) {
        // Expected service error
      }

      const serviceAlerts = monitoringService.getServiceAlerts();
      expect(serviceAlerts.serviceUnavailable).toBe(true);
      expect(serviceAlerts.affectedServices).toContain('export-service');
    });

    it('should configure alert thresholds', async () => {
      const alertConfig = {
        errorRateThreshold: 0.05, // 5%
        responseTimeThreshold: 5000, // 5 seconds
        memoryUsageThreshold: 0.8, // 80%
        concurrencyThreshold: 10
      };

      monitoringService.configureAlerts(alertConfig);

      const config = monitoringService.getAlertConfiguration();
      expect(config.errorRateThreshold).toBe(0.05);
      expect(config.responseTimeThreshold).toBe(5000);
      expect(config.memoryUsageThreshold).toBe(0.8);
      expect(config.concurrencyThreshold).toBe(10);
    });

    it('should send alerts to multiple channels', async () => {
      const alertChannels = ['email', 'slack', 'webhook'];
      
      monitoringService.configureAlertChannels(alertChannels);

      // Trigger an alert condition
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

      // Mock high error rate
      for (let i = 0; i < 20; i++) {
        try {
          await exportEngine.exportVideo({
            timeline: { elements: [], duration: 0 },
            format: 'mp4',
            quality: 'medium',
            enableMonitoring: true
          });
        } catch (error) {
          // Expected errors to trigger alert
        }
      }

      const sentAlerts = monitoringService.getSentAlerts();
      expect(sentAlerts.channels).toEqual(expect.arrayContaining(alertChannels));
      expect(sentAlerts.alertsSent).toBeGreaterThan(0);
    });
  });
});