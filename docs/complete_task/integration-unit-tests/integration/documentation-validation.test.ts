import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { DocumentationValidator } from '../../lib/documentation-validator';

describe('Documentation Validation', () => {
  let exportEngine: ExportEngine;
  let docValidator: DocumentationValidator;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    docValidator = new DocumentationValidator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Test documented workflows', () => {
    it('should validate basic video editing workflow from docs', async () => {
      // Test the workflow documented in README.md
      const documentedWorkflow = {
        steps: [
          'Upload video file',
          'Add to timeline',
          'Trim video',
          'Add text overlay',
          'Export video'
        ]
      };

      // Step 1: Upload video file
      const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      expect(videoFile).toBeInstanceOf(File);

      // Step 2: Add to timeline
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 60000,
            src: URL.createObjectURL(videoFile)
          }
        ],
        duration: 60000
      };

      // Step 3: Trim video (documented trim operation)
      const trimmedTimeline = {
        ...timeline,
        elements: [
          {
            ...timeline.elements[0],
            startTime: 5000,
            duration: 30000
          }
        ],
        duration: 30000
      };

      // Step 4: Add text overlay (documented text overlay)
      const finalTimeline = {
        ...trimmedTimeline,
        elements: [
          ...trimmedTimeline.elements,
          {
            id: '2',
            type: 'text',
            startTime: 0,
            duration: 5000,
            content: 'My Video Title',
            style: {
              fontSize: 24,
              color: '#ffffff'
            }
          }
        ]
      };

      // Step 5: Export video (documented export process)
      const result = await exportEngine.exportVideo({
        timeline: finalTimeline,
        format: 'mp4',
        quality: 'high'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.duration).toBe(30000);
    });

    it('should validate social media workflow from docs', async () => {
      // Test Instagram square format workflow from documentation
      const instagramWorkflow = {
        aspectRatio: '1:1',
        resolution: '1080x1080',
        duration: 15000, // 15 seconds max for Instagram
        format: 'mp4'
      };

      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 15000,
            src: 'source-video.mp4'
          },
          {
            id: '2',
            type: 'text',
            startTime: 2000,
            duration: 3000,
            content: '#MyContent',
            style: {
              fontSize: 32,
              color: '#ff6b6b'
            }
          }
        ],
        duration: 15000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: instagramWorkflow.format,
        quality: 'high',
        resolution: instagramWorkflow.resolution
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.aspectRatio).toBe('1:1');
      expect(result.metadata.duration).toBe(15000);
    });

    it('should validate podcast workflow from docs', async () => {
      // Test audio-focused workflow documented for podcasts
      const podcastWorkflow = {
        primaryContent: 'audio',
        staticImage: true,
        duration: 1800000, // 30 minutes
        audioOptimized: true
      };

      const timeline = {
        elements: [
          {
            id: '1',
            type: 'audio',
            startTime: 0,
            duration: 1800000,
            src: 'podcast-recording.wav'
          },
          {
            id: '2',
            type: 'image',
            startTime: 0,
            duration: 1800000,
            src: 'podcast-cover.jpg'
          }
        ],
        duration: 1800000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium',
        optimizeForAudio: true,
        videoBitrate: '500k',
        audioBitrate: '128k'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.audioOptimized).toBe(true);
      expect(result.metadata.videoBitrate).toBeLessThan(1000000);
    });

    it('should validate keyboard shortcuts from docs', async () => {
      const documentedShortcuts = {
        'Ctrl+E': 'export',
        'Ctrl+P': 'preview',
        'Space': 'playPause',
        'Escape': 'cancel',
        'Ctrl+Z': 'undo',
        'Ctrl+Y': 'redo'
      };

      for (const [shortcut, expectedAction] of Object.entries(documentedShortcuts)) {
        const mockKeyEvent = new KeyboardEvent('keydown', {
          key: shortcut.split('+').pop(),
          ctrlKey: shortcut.includes('Ctrl'),
          code: shortcut.split('+').pop()
        });

        const action = exportEngine.handleKeyboardShortcut(mockKeyEvent);
        expect(action).toBe(expectedAction);
      }
    });

    it('should validate supported formats from docs', async () => {
      const documentedFormats = {
        input: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
        output: ['mp4', 'webm', 'mov'],
        audio: ['mp3', 'wav', 'ogg', 'aac'],
        image: ['jpg', 'png', 'gif']
      };

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

      for (const format of documentedFormats.output) {
        const result = await exportEngine.exportVideo({
          timeline,
          format,
          quality: 'medium'
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.blob.type).toContain(format === 'mov' ? 'video' : format);
      }
    });
  });

  describe('Verify API documentation', () => {
    it('should validate ExportEngine API matches documentation', async () => {
      const documentedAPI = {
        methods: [
          'exportVideo',
          'generatePreview',
          'cancelExport',
          'getProgress',
          'validateFile'
        ],
        exportVideoParams: [
          'timeline',
          'format',
          'quality',
          'resolution',
          'frameRate',
          'bitrate'
        ]
      };

      // Verify methods exist
      for (const method of documentedAPI.methods) {
        expect(typeof exportEngine[method]).toBe('function');
      }

      // Verify exportVideo accepts documented parameters
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
        resolution: '1920x1080',
        frameRate: 30,
        bitrate: '2000k'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata).toBeDefined();
    });

    it('should validate timeline element API from docs', async () => {
      const documentedElementTypes = ['video', 'audio', 'text', 'image'];
      const requiredProperties = ['id', 'type', 'startTime', 'duration'];

      for (const elementType of documentedElementTypes) {
        const element = {
          id: '1',
          type: elementType,
          startTime: 0,
          duration: 30000,
          src: elementType === 'text' ? undefined : `test.${elementType === 'image' ? 'jpg' : 'mp4'}`,
          content: elementType === 'text' ? 'Test Text' : undefined
        };

        // Verify required properties
        for (const prop of requiredProperties) {
          expect(element).toHaveProperty(prop);
        }

        const timeline = {
          elements: [element],
          duration: 30000
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium'
        });

        expect(result.blob).toBeInstanceOf(Blob);
      }
    });

    it('should validate error handling API from docs', async () => {
      const documentedErrors = [
        'INVALID_TIMELINE',
        'UNSUPPORTED_FORMAT',
        'FILE_NOT_FOUND',
        'EXPORT_CANCELLED',
        'MEMORY_ERROR'
      ];

      const errorScenarios = [
        {
          scenario: 'invalid timeline',
          timeline: null,
          expectedError: 'INVALID_TIMELINE'
        },
        {
          scenario: 'unsupported format',
          timeline: { elements: [], duration: 0 },
          format: 'invalid_format',
          expectedError: 'UNSUPPORTED_FORMAT'
        }
      ];

      for (const scenario of errorScenarios) {
        try {
          await exportEngine.exportVideo({
            timeline: scenario.timeline,
            format: scenario.format || 'mp4',
            quality: 'medium'
          });
          fail(`Expected error for ${scenario.scenario}`);
        } catch (error) {
          expect(error.code).toBe(scenario.expectedError);
          expect(documentedErrors).toContain(error.code);
        }
      }
    });

    it('should validate configuration options from docs', async () => {
      const documentedConfig = {
        qualities: ['low', 'medium', 'high', 'lossless'],
        formats: ['mp4', 'webm', 'mov'],
        resolutions: ['720p', '1080p', '4k'],
        frameRates: [24, 30, 60]
      };

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

      // Test documented quality options
      for (const quality of documentedConfig.qualities) {
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.metadata.quality).toBe(quality);
      }
    });
  });

  describe('Test troubleshooting guides', () => {
    it('should validate memory error troubleshooting', async () => {
      // Test documented memory error solutions
      const memoryErrorSolutions = [
        'Reduce video quality',
        'Process in smaller chunks',
        'Close other browser tabs',
        'Use lower resolution'
      ];

      // Simulate memory pressure
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
            duration: 300000,
            src: 'large-video.mp4'
          }
        ],
        duration: 300000
      };

      try {
        await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'high'
        });
      } catch (error) {
        expect(error.troubleshootingSteps).toEqual(
          expect.arrayContaining(memoryErrorSolutions)
        );
      }
    });

    it('should validate browser compatibility troubleshooting', async () => {
      const compatibilityGuide = {
        'Chrome 90+': ['mp4', 'webm'],
        'Firefox 88+': ['mp4', 'webm'],
        'Safari 14+': ['mp4', 'mov'],
        'Edge 90+': ['mp4', 'webm']
      };

      // Mock different browsers
      const browsers = [
        { userAgent: 'Chrome/89.0', supported: false },
        { userAgent: 'Chrome/91.0', supported: true },
        { userAgent: 'Firefox/87.0', supported: false },
        { userAgent: 'Firefox/89.0', supported: true }
      ];

      for (const browser of browsers) {
        Object.defineProperty(navigator, 'userAgent', {
          value: browser.userAgent,
          configurable: true
        });

        const compatibility = exportEngine.checkBrowserCompatibility();
        expect(compatibility.supported).toBe(browser.supported);
        
        if (!browser.supported) {
          expect(compatibility.troubleshootingSteps).toContain('Update your browser');
        }
      }
    });

    it('should validate export failure troubleshooting', async () => {
      const exportFailureSolutions = [
        'Check file format compatibility',
        'Verify file is not corrupted',
        'Try lower quality settings',
        'Ensure sufficient storage space'
      ];

      const timeline = {
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
      };

      try {
        await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium'
        });
      } catch (error) {
        expect(error.troubleshootingSteps).toEqual(
          expect.arrayContaining(exportFailureSolutions)
        );
      }
    });

    it('should validate performance optimization guide', async () => {
      const performanceOptimizations = [
        'Use lower quality for faster exports',
        'Close unnecessary browser tabs',
        'Export shorter segments',
        'Use hardware acceleration if available'
      ];

      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 600000, // 10 minutes
            src: 'long-video.mp4'
          }
        ],
        duration: 600000
      };

      const optimizations = exportEngine.getPerformanceOptimizations({
        timeline,
        format: 'mp4',
        quality: 'high'
      });

      expect(optimizations).toEqual(
        expect.arrayContaining(performanceOptimizations)
      );
    });

    it('should validate FAQ solutions', async () => {
      const faqSolutions = {
        'Why is my export taking so long?': [
          'Large file size',
          'High quality settings',
          'Complex timeline',
          'Limited system resources'
        ],
        'Why is the exported file size different?': [
          'Compression settings',
          'Quality level',
          'Format differences',
          'Content complexity'
        ],
        'Why does my video look different after export?': [
          'Quality settings',
          'Format conversion',
          'Color space changes',
          'Compression artifacts'
        ]
      };

      for (const [question, expectedReasons] of Object.entries(faqSolutions)) {
        const faqAnswer = docValidator.getFAQAnswer(question);
        expect(faqAnswer.reasons).toEqual(
          expect.arrayContaining(expectedReasons)
        );
      }
    });

    it('should validate step-by-step guides', async () => {
      const stepByStepGuides = {
        'How to create a basic video': [
          'Upload video file',
          'Drag to timeline',
          'Trim if needed',
          'Click export',
          'Choose format and quality',
          'Download result'
        ],
        'How to add text overlays': [
          'Click text tool',
          'Enter text content',
          'Position on timeline',
          'Customize style',
          'Preview result',
          'Export video'
        ]
      };

      for (const [guide, steps] of Object.entries(stepByStepGuides)) {
        const guideSteps = docValidator.getStepByStepGuide(guide);
        expect(guideSteps).toEqual(steps);
      }
    });
  });
});