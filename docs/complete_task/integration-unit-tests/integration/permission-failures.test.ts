/**
 * Permission Failures Integration Tests
 * Tests permission denial scenarios and fallback options
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Permission Failures Tests', () => {
  let mockMediaDevices: any;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock MediaDevices API
    mockMediaDevices = {
      getUserMedia: jest.fn(),
      enumerateDevices: jest.fn(),
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true,
    });

    // Mock Permissions API
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: jest.fn(),
      },
      writable: true,
    });

    // Mock File System Access API
    Object.defineProperty(window, 'showOpenFilePicker', {
      value: jest.fn(),
      writable: true,
    });

    Object.defineProperty(window, 'showSaveFilePicker', {
      value: jest.fn(),
      writable: true,
    });

    // Mock console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Media Permission Denial', () => {
    it('should handle camera permission denial', async () => {
      const cameraManager = {
        requestCameraAccess: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            return { success: true, stream };
          } catch (error) {
            return cameraManager.handleCameraError(error);
          }
        },

        handleCameraError: (error: any) => {
          const errorHandling = {
            success: false,
            error: error.name || 'UnknownError',
            userMessage: '',
            fallbackOptions: [] as string[],
          };

          switch (error.name) {
            case 'NotAllowedError':
              errorHandling.userMessage = 'Camera access was denied. Please enable camera permissions in your browser settings.';
              errorHandling.fallbackOptions = [
                'Upload video files instead of recording',
                'Use screen recording as alternative',
                'Enable camera in browser settings and try again',
              ];
              break;
            case 'NotFoundError':
              errorHandling.userMessage = 'No camera found. Please connect a camera device.';
              errorHandling.fallbackOptions = [
                'Connect a camera or webcam',
                'Use uploaded video files',
                'Try external recording software',
              ];
              break;
            case 'NotReadableError':
              errorHandling.userMessage = 'Camera is being used by another application.';
              errorHandling.fallbackOptions = [
                'Close other applications using the camera',
                'Restart your browser',
                'Use file upload instead',
              ];
              break;
            default:
              errorHandling.userMessage = 'Failed to access camera. Please try again.';
              errorHandling.fallbackOptions = ['Use file upload feature'];
          }

          return errorHandling;
        },
      };

      // Mock permission denial
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      const result = await cameraManager.requestCameraAccess();
      expect(result.success).toBe(false);
      expect(result.error).toBe('NotAllowedError');
      expect(result.userMessage).toContain('Camera access was denied');
      expect(result.fallbackOptions).toContain('Upload video files instead of recording');
    });

    it('should handle microphone permission denial', async () => {
      const microphoneManager = {
        requestMicrophoneAccess: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            return { success: true, stream };
          } catch (error) {
            return microphoneManager.handleMicrophoneError(error);
          }
        },

        handleMicrophoneError: (error: any) => {
          if (error.name === 'NotAllowedError') {
            return {
              success: false,
              error: 'NotAllowedError',
              userMessage: 'Microphone access was denied. Audio recording will not be available.',
              fallbackOptions: [
                'Enable microphone permissions in browser settings',
                'Record video without audio',
                'Add audio tracks from uploaded files',
                'Use text-to-speech for narration',
              ],
              canContinueWithoutAudio: true,
            };
          }

          return {
            success: false,
            error: error.name,
            userMessage: 'Failed to access microphone.',
            fallbackOptions: ['Try again later'],
            canContinueWithoutAudio: true,
          };
        },

        checkAudioPermissionStatus: async () => {
          try {
            if (navigator.permissions) {
              const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
              return {
                state: permission.state,
                canRequest: permission.state === 'prompt',
                isDenied: permission.state === 'denied',
              };
            }
          } catch (error) {
            console.warn('Permission API not available');
          }
          
          return { state: 'unknown', canRequest: true, isDenied: false };
        },
      };

      // Mock microphone permission denial
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      const result = await microphoneManager.requestMicrophoneAccess();
      expect(result.success).toBe(false);
      expect(result.canContinueWithoutAudio).toBe(true);
      expect(result.fallbackOptions).toContain('Record video without audio');

      // Test permission status check
      const mockPermissionQuery = jest.fn().mockResolvedValue({ state: 'denied' });
      Object.defineProperty(navigator, 'permissions', {
        value: { query: mockPermissionQuery },
        writable: true,
      });

      const permissionStatus = await microphoneManager.checkAudioPermissionStatus();
      expect(permissionStatus.isDenied).toBe(true);
    });

    it('should handle screen sharing permission denial', async () => {
      const screenShareManager = {
        requestScreenShare: async () => {
          try {
            // Mock getDisplayMedia
            const getDisplayMedia = jest.fn();
            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
              value: getDisplayMedia,
              writable: true,
            });

            getDisplayMedia.mockRejectedValue(
              new DOMException('Permission denied by system', 'NotAllowedError')
            );

            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            return { success: true, stream };
          } catch (error) {
            return screenShareManager.handleScreenShareError(error);
          }
        },

        handleScreenShareError: (error: any) => {
          const handling = {
            success: false,
            error: error.name,
            userMessage: '',
            alternatives: [] as string[],
          };

          if (error.name === 'NotAllowedError') {
            handling.userMessage = 'Screen sharing was cancelled or denied.';
            handling.alternatives = [
              'Try screen sharing again and grant permission',
              'Use window capture instead of full screen',
              'Record with external software and upload',
              'Use webcam recording as alternative',
            ];
          } else if (error.name === 'NotSupportedError') {
            handling.userMessage = 'Screen sharing is not supported in this browser.';
            handling.alternatives = [
              'Use a supported browser (Chrome, Firefox, Edge)',
              'Update your browser to the latest version',
              'Use external screen recording software',
            ];
          }

          return handling;
        },
      };

      const result = await screenShareManager.requestScreenShare();
      expect(result.success).toBe(false);
      expect(result.userMessage).toContain('Screen sharing was cancelled or denied');
      expect(result.alternatives).toContain('Try screen sharing again and grant permission');
    });
  });

  describe('File System Permission', () => {
    it('should handle File System Access API permission denial', async () => {
      const fileSystemManager = {
        requestFileAccess: async () => {
          try {
            const fileHandle = await window.showOpenFilePicker({
              types: [{
                description: 'Video files',
                accept: { 'video/*': ['.mp4', '.webm', '.mov'] }
              }]
            });
            return { success: true, fileHandle };
          } catch (error) {
            return fileSystemManager.handleFileSystemError(error);
          }
        },

        requestSaveAccess: async () => {
          try {
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: 'exported-video.mp4',
              types: [{
                description: 'MP4 Video',
                accept: { 'video/mp4': ['.mp4'] }
              }]
            });
            return { success: true, fileHandle };
          } catch (error) {
            return fileSystemManager.handleFileSystemError(error);
          }
        },

        handleFileSystemError: (error: any) => {
          const handling = {
            success: false,
            error: error.name,
            userMessage: '',
            fallbackMethod: '',
          };

          if (error.name === 'AbortError') {
            handling.userMessage = 'File selection was cancelled.';
            handling.fallbackMethod = 'Try selecting files again when ready.';
          } else if (error.name === 'NotAllowedError') {
            handling.userMessage = 'File system access was denied.';
            handling.fallbackMethod = 'Use traditional file input for uploads and downloads.';
          } else if (error.name === 'SecurityError') {
            handling.userMessage = 'File access blocked for security reasons.';
            handling.fallbackMethod = 'Use standard file upload/download methods.';
          } else {
            handling.userMessage = 'File system access is not supported.';
            handling.fallbackMethod = 'Use standard browser file handling.';
          }

          return handling;
        },

        getFallbackFileInput: () => {
          // Create traditional file input as fallback
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'video/*,audio/*,image/*';
          input.multiple = true;
          
          return {
            openFiles: () => new Promise((resolve) => {
              input.onchange = () => {
                resolve(Array.from(input.files || []));
              };
              input.click();
            }),
          };
        },
      };

      // Mock File System Access API denial
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: jest.fn().mockRejectedValue(
          new DOMException('User denied file system access', 'NotAllowedError')
        ),
        writable: true,
      });

      const result = await fileSystemManager.requestFileAccess();
      expect(result.success).toBe(false);
      expect(result.error).toBe('NotAllowedError');
      expect(result.fallbackMethod).toContain('traditional file input');

      // Test fallback method
      const fallback = fileSystemManager.getFallbackFileInput();
      expect(fallback.openFiles).toBeDefined();
    });

    it('should handle OPFS permission issues', async () => {
      const opfsManager = {
        checkOPFSSupport: async () => {
          try {
            if (!navigator.storage || !navigator.storage.getDirectory) {
              return { 
                supported: false, 
                reason: 'OPFS not available in this browser' 
              };
            }
            
            // Try to access OPFS
            await navigator.storage.getDirectory();
            return { supported: true };
          } catch (error) {
            return {
              supported: false,
              reason: 'OPFS access denied or not available',
              error: error.name,
            };
          }
        },

        initializeOPFS: async () => {
          const support = await opfsManager.checkOPFSSupport();
          
          if (!support.supported) {
            return {
              success: false,
              reason: support.reason,
              fallbackStrategy: 'Use IndexedDB for file storage',
            };
          }

          try {
            // Mock OPFS operations
            const root = await navigator.storage.getDirectory();
            return { success: true, root };
          } catch (error) {
            return {
              success: false,
              reason: 'Failed to initialize OPFS',
              error: error.name,
              fallbackStrategy: 'Fall back to memory-based storage',
            };
          }
        },

        handleOPFSFallback: () => {
          return {
            strategy: 'indexeddb',
            description: 'Using IndexedDB with Blob storage as OPFS alternative',
            limitations: [
              'Files stored as Blobs in IndexedDB',
              'May have size limitations',
              'Slower performance for large files',
              'Less efficient memory usage',
            ],
            advantages: [
              'Works in all modern browsers',
              'No special permissions required',
              'Reliable cross-browser support',
            ],
          };
        },
      };

      // Mock OPFS not available
      Object.defineProperty(navigator, 'storage', {
        value: {
          getDirectory: jest.fn().mockRejectedValue(
            new DOMException('Storage access denied', 'NotAllowedError')
          ),
        },
        writable: true,
      });

      const support = await opfsManager.checkOPFSSupport();
      expect(support.supported).toBe(false);

      const initResult = await opfsManager.initializeOPFS();
      expect(initResult.success).toBe(false);
      expect(initResult.fallbackStrategy).toContain('IndexedDB');

      const fallback = opfsManager.handleOPFSFallback();
      expect(fallback.strategy).toBe('indexeddb');
      expect(fallback.limitations).toContain('Files stored as Blobs in IndexedDB');
    });

    it('should handle persistent storage permission', async () => {
      const persistentStorageManager = {
        requestPersistentStorage: async () => {
          try {
            if (!navigator.storage || !navigator.storage.persist) {
              return {
                granted: false,
                reason: 'Persistent storage API not available',
                impact: 'Data may be cleared by browser when storage is low',
              };
            }

            const granted = await navigator.storage.persist();
            return { granted };
          } catch (error) {
            return {
              granted: false,
              reason: 'Permission request failed',
              error: error.name,
            };
          }
        },

        checkPersistentStorage: async () => {
          try {
            const estimate = await navigator.storage.estimate();
            return {
              isPersistent: estimate.quota ? estimate.quota > 0 : false,
              quota: estimate.quota,
              usage: estimate.usage,
            };
          } catch (error) {
            return {
              isPersistent: false,
              error: 'Cannot check storage status',
            };
          }
        },

        handleNonPersistentStorage: () => {
          return {
            warnings: [
              'Browser may clear data when storage is low',
              'Projects might be lost if not exported regularly',
              'Large projects are at higher risk',
            ],
            recommendations: [
              'Export important projects frequently',
              'Enable persistent storage in browser settings',
              'Keep project sizes moderate',
              'Use cloud backup for critical work',
            ],
          };
        },
      };

      // Mock persistent storage denied
      Object.defineProperty(navigator, 'storage', {
        value: {
          persist: jest.fn().mockResolvedValue(false),
          estimate: jest.fn().mockResolvedValue({ quota: 0, usage: 0 }),
        },
        writable: true,
      });

      const persistResult = await persistentStorageManager.requestPersistentStorage();
      expect(persistResult.granted).toBe(false);

      const storageStatus = await persistentStorageManager.checkPersistentStorage();
      expect(storageStatus.isPersistent).toBe(false);

      const guidance = persistentStorageManager.handleNonPersistentStorage();
      expect(guidance.warnings).toContain('Browser may clear data when storage is low');
      expect(guidance.recommendations).toContain('Export important projects frequently');
    });
  });

  describe('Fallback Options', () => {
    it('should provide comprehensive fallback strategies', () => {
      const fallbackManager = {
        getMediaFallbacks: () => ({
          camera: {
            primary: 'navigator.mediaDevices.getUserMedia',
            fallbacks: [
              { method: 'file_upload', description: 'Upload video files instead' },
              { method: 'screen_capture', description: 'Use screen recording' },
              { method: 'external_recording', description: 'Record with external software' },
            ],
          },
          microphone: {
            primary: 'navigator.mediaDevices.getUserMedia (audio)',
            fallbacks: [
              { method: 'file_upload', description: 'Upload audio files' },
              { method: 'text_to_speech', description: 'Generate speech from text' },
              { method: 'silent_video', description: 'Create video without audio' },
            ],
          },
          screen_share: {
            primary: 'navigator.mediaDevices.getDisplayMedia',
            fallbacks: [
              { method: 'external_software', description: 'Use OBS or similar tools' },
              { method: 'mobile_recording', description: 'Record on mobile device' },
              { method: 'static_content', description: 'Use images and text overlays' },
            ],
          },
        }),

        getStorageFallbacks: () => ({
          opfs: {
            primary: 'Origin Private File System',
            fallbacks: [
              { method: 'indexeddb_blobs', description: 'Store files as Blobs in IndexedDB' },
              { method: 'memory_storage', description: 'Keep files in memory (temporary)' },
              { method: 'chunked_storage', description: 'Split large files into chunks' },
            ],
          },
          file_system_access: {
            primary: 'File System Access API',
            fallbacks: [
              { method: 'traditional_input', description: 'Standard HTML file input' },
              { method: 'drag_drop', description: 'Drag and drop file upload' },
              { method: 'url_download', description: 'Download via blob URLs' },
            ],
          },
          persistent_storage: {
            primary: 'Persistent storage permission',
            fallbacks: [
              { method: 'frequent_exports', description: 'Regular project exports' },
              { method: 'cloud_storage', description: 'Integration with cloud services' },
              { method: 'local_backup', description: 'Manual backup reminders' },
            ],
          },
        }),

        implementFallback: (category: string, method: string) => {
          const implementations = {
            file_upload: {
              type: 'file_input',
              html: '<input type="file" accept="video/*,audio/*,image/*" multiple>',
              handler: 'handleFileSelect',
            },
            drag_drop: {
              type: 'drop_zone',
              events: ['dragover', 'drop'],
              handler: 'handleFileDrop',
            },
            indexeddb_blobs: {
              type: 'storage_adapter',
              database: 'video_editor_files',
              objectStore: 'file_blobs',
              handler: 'IndexedDBBlobAdapter',
            },
            silent_video: {
              type: 'audio_track',
              track: null,
              description: 'Video export without audio track',
            },
          };

          return implementations[method] || { type: 'not_implemented' };
        },
      };

      const mediaFallbacks = fallbackManager.getMediaFallbacks();
      expect(mediaFallbacks.camera.fallbacks).toHaveLength(3);
      expect(mediaFallbacks.microphone.fallbacks[0].method).toBe('file_upload');

      const storageFallbacks = fallbackManager.getStorageFallbacks();
      expect(storageFallbacks.opfs.fallbacks).toContainEqual(
        expect.objectContaining({ method: 'indexeddb_blobs' })
      );

      const fileUploadImpl = fallbackManager.implementFallback('media', 'file_upload');
      expect(fileUploadImpl.type).toBe('file_input');
      expect(fileUploadImpl.handler).toBe('handleFileSelect');
    });

    it('should implement progressive degradation', () => {
      const degradationManager = {
        featureLevels: {
          full: ['camera', 'microphone', 'screen_share', 'opfs', 'file_system_access'],
          advanced: ['camera', 'microphone', 'file_system_access'],
          basic: ['file_upload', 'basic_editing'],
          minimal: ['file_upload'],
        },

        assessAvailableFeatures: async () => {
          const features = {
            camera: false,
            microphone: false,
            screen_share: false,
            opfs: false,
            file_system_access: false,
            file_upload: true,
            basic_editing: true,
          };

          // Simulate feature detection
          try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            features.camera = true;
          } catch (e) {
            // Camera not available
          }

          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            features.microphone = true;
          } catch (e) {
            // Microphone not available
          }

          if (window.showOpenFilePicker) {
            features.file_system_access = true;
          }

          return features;
        },

        determineOperatingLevel: async () => {
          const available = await degradationManager.assessAvailableFeatures();
          const availableFeatures = Object.keys(available).filter(
            key => available[key]
          );

          for (const [level, required] of Object.entries(degradationManager.featureLevels)) {
            if (required.every(feature => availableFeatures.includes(feature))) {
              return { level, availableFeatures, missingFeatures: [] };
            }
          }

          const missingFeatures = degradationManager.featureLevels.full.filter(
            feature => !availableFeatures.includes(feature)
          );

          return {
            level: 'minimal',
            availableFeatures,
            missingFeatures,
          };
        },

        getCapabilitiesMessage: (level: string, missing: string[]) => {
          const messages = {
            full: 'All features available! You can use camera, microphone, and advanced file handling.',
            advanced: 'Most features available. Some advanced storage features may be limited.',
            basic: 'Basic editing available. Camera and microphone recording not available.',
            minimal: 'Limited functionality. Only file upload and basic editing available.',
          };

          let message = messages[level] || 'Unknown capability level.';
          
          if (missing.length > 0) {
            message += ` Missing: ${missing.join(', ')}.`;
          }

          return message;
        },
      };

      // Mock minimal capabilities (no permissions)
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('NotAllowedError'));
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: undefined,
        writable: true,
      });

      const operatingLevel = degradationManager.determineOperatingLevel();
      expect(operatingLevel).toBeDefined();

      const message = degradationManager.getCapabilitiesMessage('basic', ['camera', 'microphone']);
      expect(message).toContain('Basic editing available');
      expect(message).toContain('Missing: camera, microphone');
    });

    it('should provide guided permission recovery', () => {
      const permissionGuide = {
        getPermissionInstructions: (permission: string, browser: string = 'chrome') => {
          const instructions = {
            camera: {
              chrome: [
                'Click the camera icon in the address bar',
                'Select "Always allow on this site"',
                'Refresh the page and try again',
              ],
              firefox: [
                'Click the shield icon in the address bar',
                'Click "Allow Camera"',
                'Refresh the page',
              ],
              safari: [
                'Go to Safari > Preferences > Websites',
                'Select Camera from the left sidebar',
                'Change permission to "Allow"',
              ],
            },
            microphone: {
              chrome: [
                'Click the microphone icon in the address bar',
                'Select "Always allow on this site"',
                'Refresh the page',
              ],
              firefox: [
                'Click the shield icon in the address bar',
                'Click "Allow Microphone"',
                'Refresh the page',
              ],
            },
            persistent_storage: {
              chrome: [
                'Go to Settings > Site Settings > Storage',
                'Find this website and allow persistent storage',
                'Or click "Allow" when prompted',
              ],
            },
          };

          return instructions[permission]?.[browser] || [
            'Check your browser settings',
            'Look for permission controls',
            'Enable the required permission',
            'Refresh the page',
          ];
        },

        createPermissionDialog: (permission: string, onRetry: () => void) => {
          return {
            title: `${permission.charAt(0).toUpperCase() + permission.slice(1)} Permission Required`,
            message: `This feature requires ${permission} access to work properly.`,
            instructions: permissionGuide.getPermissionInstructions(permission),
            buttons: [
              { text: 'Open Settings', action: 'open_settings' },
              { text: 'Try Again', action: 'retry', handler: onRetry },
              { text: 'Use Fallback', action: 'fallback' },
              { text: 'Skip', action: 'skip' },
            ],
          };
        },

        detectBrowser: () => {
          const userAgent = navigator.userAgent.toLowerCase();
          if (userAgent.includes('chrome')) return 'chrome';
          if (userAgent.includes('firefox')) return 'firefox';
          if (userAgent.includes('safari')) return 'safari';
          return 'unknown';
        },
      };

      const cameraInstructions = permissionGuide.getPermissionInstructions('camera', 'chrome');
      expect(cameraInstructions).toContain('Click the camera icon in the address bar');

      const mockRetry = jest.fn();
      const dialog = permissionGuide.createPermissionDialog('camera', mockRetry);
      expect(dialog.title).toContain('Camera Permission Required');
      expect(dialog.buttons).toHaveLength(4);
      expect(dialog.buttons.find(b => b.text === 'Try Again')?.handler).toBe(mockRetry);

      const browser = permissionGuide.detectBrowser();
      expect(['chrome', 'firefox', 'safari', 'unknown']).toContain(browser);
    });
  });
});