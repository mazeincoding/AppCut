/**
 * Quota Exceeded Integration Tests
 * Tests storage quota limits and graceful handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Quota Exceeded Tests', () => {
  let mockQuotaAPI: any;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock Storage Quota API
    mockQuotaAPI = {
      quota: 1024 * 1024 * 100, // 100MB
      usage: 0,
      estimate: jest.fn(),
    };

    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: () => Promise.resolve({
          quota: mockQuotaAPI.quota,
          usage: mockQuotaAPI.usage,
        }),
        persist: jest.fn().mockResolvedValue(true),
      },
      writable: true,
    });

    // Mock IndexedDB
    const mockIDBRequest = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
    };

    global.indexedDB = {
      open: jest.fn().mockReturnValue(mockIDBRequest),
      deleteDatabase: jest.fn().mockReturnValue(mockIDBRequest),
    } as any;

    // Mock console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Storage Quota Limits', () => {
    it('should detect storage quota usage', async () => {
      const quotaManager = {
        checkQuotaUsage: async () => {
          const estimate = await navigator.storage.estimate();
          return {
            quota: estimate.quota || 0,
            usage: estimate.usage || 0,
            usagePercentage: estimate.quota ? (estimate.usage || 0) / estimate.quota * 100 : 0,
            remaining: (estimate.quota || 0) - (estimate.usage || 0),
          };
        },

        isQuotaExceeded: async (requiredSpace: number) => {
          const usage = await quotaManager.checkQuotaUsage();
          return usage.remaining < requiredSpace;
        },

        getQuotaWarningThreshold: () => 0.8, // 80%
      };

      const usage = await quotaManager.checkQuotaUsage();
      expect(usage.quota).toBe(mockQuotaAPI.quota);
      expect(usage.usage).toBe(mockQuotaAPI.usage);
      expect(usage.usagePercentage).toBe(0);

      // Test quota exceeded check
      const largeFileSize = mockQuotaAPI.quota + 1000;
      const exceeded = await quotaManager.isQuotaExceeded(largeFileSize);
      expect(exceeded).toBe(true);
    });

    it('should handle quota estimation errors', async () => {
      // Mock quota estimation failure
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockRejectedValue(new Error('Quota API not available')),
        },
        writable: true,
      });

      const quotaManager = {
        checkQuotaUsage: async () => {
          try {
            const estimate = await navigator.storage.estimate();
            return { quota: estimate.quota || 0, usage: estimate.usage || 0 };
          } catch (error) {
            console.warn('Quota estimation failed:', error);
            return { quota: 0, usage: 0, fallback: true };
          }
        },
      };

      const usage = await quotaManager.checkQuotaUsage();
      expect(usage.fallback).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Quota estimation failed:', expect.any(Error));
    });

    it('should implement quota monitoring with warnings', async () => {
      const quotaMonitor = {
        warningThreshold: 0.8,
        criticalThreshold: 0.95,
        lastWarningTime: 0,

        checkAndWarn: async () => {
          const estimate = await navigator.storage.estimate();
          const usageRatio = (estimate.usage || 0) / (estimate.quota || 1);
          
          const warnings = [];
          
          if (usageRatio > quotaMonitor.criticalThreshold) {
            warnings.push({
              level: 'critical',
              message: 'Storage almost full! Clear some projects to continue.',
              percentage: Math.round(usageRatio * 100),
            });
          } else if (usageRatio > quotaMonitor.warningThreshold) {
            warnings.push({
              level: 'warning',
              message: 'Storage getting full. Consider clearing unused projects.',
              percentage: Math.round(usageRatio * 100),
            });
          }
          
          return warnings;
        },
      };

      // Simulate high usage
      mockQuotaAPI.usage = mockQuotaAPI.quota * 0.96; // 96% usage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: () => Promise.resolve({
            quota: mockQuotaAPI.quota,
            usage: mockQuotaAPI.usage,
          }),
        },
        writable: true,
      });

      const warnings = await quotaMonitor.checkAndWarn();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].level).toBe('critical');
      expect(warnings[0].percentage).toBe(96);
    });

    it('should handle IndexedDB quota exceeded errors', async () => {
      const dbManager = {
        saveData: async (data: any) => {
          return new Promise((resolve, reject) => {
            // Simulate IndexedDB quota exceeded
            const mockRequest = {
              onsuccess: null,
              onerror: null,
              result: null,
              error: { name: 'QuotaExceededError' },
            };

            setTimeout(() => {
              if (mockRequest.onerror) {
                mockRequest.onerror(new Event('error'));
              }
            }, 10);

            mockRequest.onerror = () => {
              reject(new Error('QuotaExceededError'));
            };
          });
        },

        handleQuotaError: (error: Error) => {
          if (error.message.includes('QuotaExceededError')) {
            return {
              handled: true,
              userMessage: 'Storage is full. Please delete some projects or clear browser data.',
              suggestedActions: [
                'Delete unused projects',
                'Clear browser storage',
                'Export projects and start fresh',
              ],
            };
          }
          return { handled: false };
        },
      };

      try {
        await dbManager.saveData({ large: 'data' });
      } catch (error) {
        const handling = dbManager.handleQuotaError(error);
        expect(handling.handled).toBe(true);
        expect(handling.userMessage).toContain('Storage is full');
        expect(handling.suggestedActions).toContain('Delete unused projects');
      }
    });
  });

  describe('File Size Limits', () => {
    it('should validate file sizes against limits', () => {
      const fileSizeValidator = {
        maxFileSize: 500 * 1024 * 1024, // 500MB
        maxTotalProjectSize: 2 * 1024 * 1024 * 1024, // 2GB

        validateFileSize: (file: File) => {
          const validation = {
            valid: true,
            errors: [] as string[],
            warnings: [] as string[],
          };

          if (file.size > fileSizeValidator.maxFileSize) {
            validation.valid = false;
            validation.errors.push(
              `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds limit of ${Math.round(fileSizeValidator.maxFileSize / 1024 / 1024)}MB`
            );
          }

          if (file.size > fileSizeValidator.maxFileSize * 0.8) {
            validation.warnings.push('Large file detected. This may affect performance.');
          }

          return validation;
        },

        validateProjectSize: (currentSize: number, newFileSize: number) => {
          const totalSize = currentSize + newFileSize;
          
          if (totalSize > fileSizeValidator.maxTotalProjectSize) {
            return {
              valid: false,
              error: `Project would exceed ${Math.round(fileSizeValidator.maxTotalProjectSize / 1024 / 1024 / 1024)}GB limit`,
              currentSize: Math.round(currentSize / 1024 / 1024),
              newFileSize: Math.round(newFileSize / 1024 / 1024),
              totalSize: Math.round(totalSize / 1024 / 1024),
            };
          }

          return { valid: true };
        },
      };

      // Test oversized file
      const largeFile = new File([''], 'large.mp4', { type: 'video/mp4' });
      Object.defineProperty(largeFile, 'size', { value: 600 * 1024 * 1024 }); // 600MB

      const validation = fileSizeValidator.validateFileSize(largeFile);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('exceeds limit');

      // Test project size validation
      const projectValidation = fileSizeValidator.validateProjectSize(
        1.5 * 1024 * 1024 * 1024, // 1.5GB current
        600 * 1024 * 1024 // 600MB new file
      );
      expect(projectValidation.valid).toBe(false);
      expect(projectValidation.error).toContain('exceed');
    });

    it('should implement progressive file size warnings', () => {
      const progressiveValidator = {
        sizeThresholds: [
          { size: 50 * 1024 * 1024, message: 'Medium file size', level: 'info' },
          { size: 100 * 1024 * 1024, message: 'Large file - may affect performance', level: 'warning' },
          { size: 250 * 1024 * 1024, message: 'Very large file - consider compression', level: 'warning' },
          { size: 500 * 1024 * 1024, message: 'File too large for upload', level: 'error' },
        ],

        getFileSizeWarning: (fileSize: number) => {
          for (let i = progressiveValidator.sizeThresholds.length - 1; i >= 0; i--) {
            const threshold = progressiveValidator.sizeThresholds[i];
            if (fileSize >= threshold.size) {
              return {
                threshold: threshold.size,
                message: threshold.message,
                level: threshold.level,
                sizeMB: Math.round(fileSize / 1024 / 1024),
                thresholdMB: Math.round(threshold.size / 1024 / 1024),
              };
            }
          }
          return null;
        },
      };

      // Test different file sizes
      const mediumFileWarning = progressiveValidator.getFileSizeWarning(75 * 1024 * 1024);
      expect(mediumFileWarning?.level).toBe('info');

      const largeFileWarning = progressiveValidator.getFileSizeWarning(200 * 1024 * 1024);
      expect(largeFileWarning?.level).toBe('warning');
      expect(largeFileWarning?.message).toContain('Large file');

      const oversizedWarning = progressiveValidator.getFileSizeWarning(600 * 1024 * 1024);
      expect(oversizedWarning?.level).toBe('error');
      expect(oversizedWarning?.message).toContain('too large');
    });

    it('should suggest file compression for large files', () => {
      const compressionSuggester = {
        compressionThreshold: 100 * 1024 * 1024, // 100MB

        analyzeFile: (file: File) => {
          const analysis = {
            needsCompression: file.size > compressionSuggester.compressionThreshold,
            currentSize: file.size,
            estimatedCompressedSize: 0,
            suggestions: [] as string[],
          };

          if (analysis.needsCompression) {
            // Estimate compression based on file type
            if (file.type.startsWith('video/')) {
              analysis.estimatedCompressedSize = file.size * 0.6; // 40% compression
              analysis.suggestions.push('Reduce video quality or resolution');
              analysis.suggestions.push('Use a more efficient codec (H.264/H.265)');
              analysis.suggestions.push('Trim unnecessary parts of the video');
            } else if (file.type.startsWith('audio/')) {
              analysis.estimatedCompressedSize = file.size * 0.4; // 60% compression
              analysis.suggestions.push('Reduce audio bitrate');
              analysis.suggestions.push('Convert to compressed format (MP3, AAC)');
            }
          }

          return analysis;
        },

        getCompressionOptions: (fileType: string) => {
          const options = {
            video: [
              { quality: 'high', compression: 0.7, description: 'High quality (30% smaller)' },
              { quality: 'medium', compression: 0.5, description: 'Medium quality (50% smaller)' },
              { quality: 'low', compression: 0.3, description: 'Low quality (70% smaller)' },
            ],
            audio: [
              { bitrate: '128kbps', compression: 0.4, description: 'Good quality (60% smaller)' },
              { bitrate: '96kbps', compression: 0.3, description: 'Fair quality (70% smaller)' },
              { bitrate: '64kbps', compression: 0.2, description: 'Basic quality (80% smaller)' },
            ],
          };

          if (fileType.startsWith('video/')) return options.video;
          if (fileType.startsWith('audio/')) return options.audio;
          return [];
        },
      };

      const largeVideo = new File([''], 'large.mp4', { type: 'video/mp4' });
      Object.defineProperty(largeVideo, 'size', { value: 200 * 1024 * 1024 }); // 200MB

      const analysis = compressionSuggester.analyzeFile(largeVideo);
      expect(analysis.needsCompression).toBe(true);
      expect(analysis.suggestions).toContain('Reduce video quality or resolution');

      const compressionOptions = compressionSuggester.getCompressionOptions('video/mp4');
      expect(compressionOptions).toHaveLength(3);
      expect(compressionOptions[0].quality).toBe('high');
    });
  });

  describe('Graceful Handling', () => {
    it('should implement storage cleanup strategies', async () => {
      const cleanupManager = {
        getCleanupCandidates: async () => {
          // Mock project data with usage info
          return [
            { id: 'project1', size: 50 * 1024 * 1024, lastAccessed: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // 1 week old
            { id: 'project2', size: 30 * 1024 * 1024, lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000 }, // 1 month old
            { id: 'project3', size: 100 * 1024 * 1024, lastAccessed: Date.now() - 1 * 24 * 60 * 60 * 1000 }, // 1 day old
          ];
        },

        suggestCleanup: async (requiredSpace: number) => {
          const candidates = await cleanupManager.getCleanupCandidates();
          
          // Sort by last accessed (oldest first)
          candidates.sort((a, b) => a.lastAccessed - b.lastAccessed);
          
          const suggestions = [];
          let freedSpace = 0;
          
          for (const candidate of candidates) {
            if (freedSpace >= requiredSpace) break;
            
            suggestions.push({
              projectId: candidate.id,
              size: candidate.size,
              sizeMB: Math.round(candidate.size / 1024 / 1024),
              daysOld: Math.round((Date.now() - candidate.lastAccessed) / (24 * 60 * 60 * 1000)),
              action: 'delete',
            });
            
            freedSpace += candidate.size;
          }
          
          return {
            suggestions,
            totalFreedMB: Math.round(freedSpace / 1024 / 1024),
            sufficient: freedSpace >= requiredSpace,
          };
        },

        performCleanup: async (projectIds: string[]) => {
          // Simulate cleanup
          let freedSpace = 0;
          const cleaned = [];
          
          for (const id of projectIds) {
            // Mock deletion
            freedSpace += 50 * 1024 * 1024; // Assume 50MB per project
            cleaned.push(id);
          }
          
          return { cleaned, freedSpace };
        },
      };

      const requiredSpace = 80 * 1024 * 1024; // 80MB needed
      const cleanup = await cleanupManager.suggestCleanup(requiredSpace);
      
      expect(cleanup.suggestions.length).toBeGreaterThan(0);
      expect(cleanup.suggestions[0].projectId).toBe('project2'); // Oldest first
      expect(cleanup.sufficient).toBe(true);

      // Test cleanup execution
      const result = await cleanupManager.performCleanup(['project1', 'project2']);
      expect(result.cleaned).toEqual(['project1', 'project2']);
      expect(result.freedSpace).toBeGreaterThan(0);
    });

    it('should implement quota-aware operations', async () => {
      const quotaAwareManager = {
        canPerformOperation: async (operation: string, estimatedSize: number) => {
          const estimate = await navigator.storage.estimate();
          const available = (estimate.quota || 0) - (estimate.usage || 0);
          
          if (available < estimatedSize) {
            return {
              allowed: false,
              reason: 'insufficient_storage',
              available: Math.round(available / 1024 / 1024),
              required: Math.round(estimatedSize / 1024 / 1024),
            };
          }
          
          if (available < estimatedSize * 2) {
            return {
              allowed: true,
              warning: 'low_storage',
              available: Math.round(available / 1024 / 1024),
              required: Math.round(estimatedSize / 1024 / 1024),
            };
          }
          
          return { allowed: true };
        },

        performWithQuotaCheck: async (operation: () => Promise<any>, estimatedSize: number) => {
          const check = await quotaAwareManager.canPerformOperation('test', estimatedSize);
          
          if (!check.allowed) {
            throw new Error(`Cannot perform operation: ${check.reason}`);
          }
          
          try {
            const result = await operation();
            return { success: true, result, warning: check.warning };
          } catch (error) {
            if (error.message.includes('QuotaExceededError')) {
              throw new Error('Storage quota exceeded during operation');
            }
            throw error;
          }
        },
      };

      // Test with sufficient storage
      const mockOperation = jest.fn().mockResolvedValue('success');
      const result = await quotaAwareManager.performWithQuotaCheck(mockOperation, 10 * 1024 * 1024);
      expect(result.success).toBe(true);
      expect(mockOperation).toHaveBeenCalled();

      // Test with insufficient storage
      const largeOperation = jest.fn();
      await expect(
        quotaAwareManager.performWithQuotaCheck(largeOperation, mockQuotaAPI.quota + 1000)
      ).rejects.toThrow('Cannot perform operation');
      expect(largeOperation).not.toHaveBeenCalled();
    });

    it('should provide user-friendly quota messages', () => {
      const messageManager = {
        getQuotaMessage: (situation: string, context: any = {}) => {
          const messages = {
            quota_warning: `Storage is ${context.percentage}% full. Consider cleaning up old projects.`,
            quota_critical: `Storage almost full! Only ${context.remainingMB}MB remaining.`,
            quota_exceeded: 'Storage is full. Delete some projects to continue.',
            file_too_large: `File size (${context.fileMB}MB) exceeds the ${context.limitMB}MB limit.`,
            project_too_large: `Adding this file would exceed the project size limit.`,
            cleanup_suggestion: `Delete ${context.count} old projects to free up ${context.spaceMB}MB.`,
          };
          
          return messages[situation] || 'Storage issue detected.';
        },

        getActionableAdvice: (situation: string) => {
          const advice = {
            quota_exceeded: [
              'Delete unused projects from the project list',
              'Export important projects and remove them locally',
              'Clear browser storage in Settings > Privacy',
              'Use browser\'s storage management tools',
            ],
            file_too_large: [
              'Compress the video file before uploading',
              'Split large files into smaller segments',
              'Use a different video format with better compression',
              'Reduce video resolution or quality',
            ],
            project_too_large: [
              'Remove some media files from the project',
              'Export the current project and start a new one',
              'Use lower quality media files',
              'Delete unused project elements',
            ],
          };
          
          return advice[situation] || ['Contact support for assistance'];
        },
      };

      const warningMessage = messageManager.getQuotaMessage('quota_warning', { percentage: 85 });
      expect(warningMessage).toContain('85% full');

      const fileTooLargeMessage = messageManager.getQuotaMessage('file_too_large', { 
        fileMB: 600, 
        limitMB: 500 
      });
      expect(fileTooLargeMessage).toContain('600MB');
      expect(fileTooLargeMessage).toContain('500MB');

      const advice = messageManager.getActionableAdvice('quota_exceeded');
      expect(advice).toContain('Delete unused projects from the project list');
      expect(advice.length).toBeGreaterThan(1);
    });
  });
});