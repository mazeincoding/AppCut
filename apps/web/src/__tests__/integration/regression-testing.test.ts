import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';
import { TimelineStore } from '../../stores/timeline-store';
import { MediaStore } from '../../stores/media-store';
import { ProjectStore } from '../../stores/project-store';

describe('Regression Testing', () => {
  let exportEngine: ExportEngine;
  let timelineStore: TimelineStore;
  let mediaStore: MediaStore;
  let projectStore: ProjectStore;

  beforeEach(() => {
    exportEngine = new ExportEngine();
    timelineStore = new TimelineStore();
    mediaStore = new MediaStore();
    projectStore = new ProjectStore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Test existing functionality', () => {
    it('should maintain basic video export functionality', async () => {
      // Test the core video export that should always work
      const basicTimeline = {
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
        timeline: basicTimeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toContain('video');
      expect(result.metadata.duration).toBe(30000);
    });

    it('should maintain timeline editing operations', async () => {
      // Test core timeline operations
      const element = {
        id: '1',
        type: 'video',
        startTime: 0,
        duration: 60000,
        src: 'test-video.mp4'
      };

      // Add element
      timelineStore.addElement(element);
      expect(timelineStore.getElements()).toHaveLength(1);

      // Update element
      timelineStore.updateElement('1', { duration: 45000 });
      const updated = timelineStore.getElementById('1');
      expect(updated?.duration).toBe(45000);

      // Remove element
      timelineStore.removeElement('1');
      expect(timelineStore.getElements()).toHaveLength(0);
    });

    it('should maintain media file handling', async () => {
      const mockFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      
      // Add media file
      const mediaId = await mediaStore.addMedia(mockFile);
      expect(mediaId).toBeDefined();

      // Retrieve media
      const media = await mediaStore.getMedia(mediaId);
      expect(media).toBeDefined();
      expect(media?.name).toBe('test.mp4');

      // Remove media
      await mediaStore.removeMedia(mediaId);
      const removedMedia = await mediaStore.getMedia(mediaId);
      expect(removedMedia).toBeNull();
    });

    it('should maintain project CRUD operations', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Regression test project',
        settings: {
          resolution: '1920x1080',
          frameRate: 30
        }
      };

      // Create project
      const projectId = await projectStore.createProject(projectData);
      expect(projectId).toBeDefined();

      // Read project
      const project = await projectStore.getProject(projectId);
      expect(project?.name).toBe('Test Project');

      // Update project
      await projectStore.updateProject(projectId, { name: 'Updated Project' });
      const updatedProject = await projectStore.getProject(projectId);
      expect(updatedProject?.name).toBe('Updated Project');

      // Delete project
      await projectStore.deleteProject(projectId);
      const deletedProject = await projectStore.getProject(projectId);
      expect(deletedProject).toBeNull();
    });

    it('should maintain audio processing functionality', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'audio',
            startTime: 0,
            duration: 30000,
            src: 'test-audio.mp3',
            volume: 0.8
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.hasAudio).toBe(true);
      expect(result.metadata.audioTracks).toBe(1);
    });

    it('should maintain text overlay functionality', async () => {
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
            content: 'Test Text',
            style: {
              fontSize: 24,
              color: '#ffffff'
            }
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.textOverlays).toBe(1);
    });
  });

  describe('Verify no feature breaks', () => {
    it('should not break existing export formats', async () => {
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

      const formats = ['mp4', 'webm', 'mov'];
      
      for (const format of formats) {
        const result = await exportEngine.exportVideo({
          timeline,
          format,
          quality: 'medium'
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.blob.type).toContain(format === 'mov' ? 'video' : format);
      }
    });

    it('should not break quality settings', async () => {
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

      const qualities = ['low', 'medium', 'high'];
      
      for (const quality of qualities) {
        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality
        });

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.metadata.quality).toBe(quality);
      }
    });

    it('should not break timeline duration calculations', async () => {
      const testCases = [
        {
          elements: [
            { id: '1', type: 'video', startTime: 0, duration: 30000, src: 'test.mp4' }
          ],
          expectedDuration: 30000
        },
        {
          elements: [
            { id: '1', type: 'video', startTime: 0, duration: 20000, src: 'test1.mp4' },
            { id: '2', type: 'video', startTime: 20000, duration: 15000, src: 'test2.mp4' }
          ],
          expectedDuration: 35000
        },
        {
          elements: [
            { id: '1', type: 'video', startTime: 5000, duration: 25000, src: 'test.mp4' }
          ],
          expectedDuration: 30000
        }
      ];

      for (const testCase of testCases) {
        const timeline = {
          elements: testCase.elements,
          duration: testCase.expectedDuration
        };

        const result = await exportEngine.exportVideo({
          timeline,
          format: 'mp4',
          quality: 'medium'
        });

        expect(result.metadata.duration).toBe(testCase.expectedDuration);
      }
    });

    it('should not break multi-track functionality', async () => {
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'video',
            startTime: 0,
            duration: 30000,
            src: 'video.mp4',
            track: 0
          },
          {
            id: '2',
            type: 'audio',
            startTime: 0,
            duration: 30000,
            src: 'audio.mp3',
            track: 1
          },
          {
            id: '3',
            type: 'text',
            startTime: 10000,
            duration: 10000,
            content: 'Overlay',
            track: 2
          }
        ],
        duration: 30000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metadata.trackCount).toBe(3);
    });

    it('should not break trimming and splitting operations', async () => {
      const element = {
        id: '1',
        type: 'video',
        startTime: 0,
        duration: 60000,
        src: 'test-video.mp4'
      };

      timelineStore.addElement(element);

      // Test trimming
      timelineStore.trimElement('1', { start: 5000, end: 45000 });
      const trimmed = timelineStore.getElementById('1');
      expect(trimmed?.duration).toBe(40000);

      // Test splitting
      const splitElements = timelineStore.splitElement('1', 20000);
      expect(splitElements).toHaveLength(2);
      expect(splitElements[0].duration).toBe(20000);
      expect(splitElements[1].duration).toBe(20000);
    });
  });

  describe('Test backwards compatibility', () => {
    it('should handle legacy project formats', async () => {
      // Simulate old project format
      const legacyProject = {
        version: '1.0',
        timeline: {
          tracks: [
            {
              id: 'track1',
              type: 'video',
              elements: [
                {
                  id: '1',
                  startTime: 0,
                  duration: 30000,
                  src: 'legacy-video.mp4'
                }
              ]
            }
          ]
        }
      };

      // Should migrate and work with current system
      const migratedProject = projectStore.migrateProject(legacyProject);
      expect(migratedProject.version).not.toBe('1.0');
      expect(migratedProject.timeline.elements).toBeDefined();
    });

    it('should handle legacy export settings', async () => {
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

      // Legacy export format
      const legacySettings = {
        outputFormat: 'mp4', // Old property name
        videoQuality: 'high', // Old property name
        audioQuality: 'medium' // Old property name
      };

      const result = await exportEngine.exportVideo({
        timeline,
        ...legacySettings,
        // Should handle both old and new property names
        format: legacySettings.outputFormat,
        quality: legacySettings.videoQuality
      });

      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('should handle legacy media metadata', async () => {
      const legacyMedia = {
        id: '1',
        filename: 'old-video.mp4', // Legacy property
        filesize: 1024000, // Legacy property
        metadata: {
          width: 1920,
          height: 1080,
          duration: 60000
        }
      };

      // Should normalize to current format
      const normalizedMedia = mediaStore.normalizeMediaMetadata(legacyMedia);
      expect(normalizedMedia.name).toBe('old-video.mp4');
      expect(normalizedMedia.size).toBe(1024000);
    });

    it('should handle legacy timeline element properties', async () => {
      const legacyElement = {
        id: '1',
        type: 'video',
        start: 0, // Legacy property name
        end: 30000, // Legacy property name
        source: 'test-video.mp4', // Legacy property name
        volume: 1.0,
        opacity: 1.0
      };

      // Should convert to current format
      const normalizedElement = timelineStore.normalizeElement(legacyElement);
      expect(normalizedElement.startTime).toBe(0);
      expect(normalizedElement.duration).toBe(30000);
      expect(normalizedElement.src).toBe('test-video.mp4');
    });

    it('should maintain API compatibility', async () => {
      // Test that old API calls still work
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

      // Old API format (should still work)
      const legacyResult = await exportEngine.export({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      // New API format
      const newResult = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(legacyResult.blob).toBeInstanceOf(Blob);
      expect(newResult.blob).toBeInstanceOf(Blob);
      expect(legacyResult.metadata.duration).toBe(newResult.metadata.duration);
    });

    it('should handle version migration gracefully', async () => {
      const versions = ['1.0', '1.1', '1.2', '2.0'];
      
      for (const version of versions) {
        const versionedProject = {
          version,
          name: `Project v${version}`,
          timeline: {
            elements: [
              {
                id: '1',
                type: 'video',
                startTime: 0,
                duration: 30000,
                src: 'test.mp4'
              }
            ],
            duration: 30000
          }
        };

        const migrated = projectStore.migrateProject(versionedProject);
        expect(migrated.version).toBeDefined();
        expect(migrated.timeline.elements).toHaveLength(1);
      }
    });
  });
});