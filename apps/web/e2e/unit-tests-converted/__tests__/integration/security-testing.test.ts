import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExportEngine } from '../../lib/export-engine';

describe('Security Testing', () => {
  let exportEngine: ExportEngine;

  beforeEach(() => {
    exportEngine = new ExportEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File upload security', () => {
    it('should validate file types', async () => {
      const maliciousFile = new File(['<script>alert("xss")</script>'], 'malicious.html', { type: 'text/html' });
      
      await expect(async () => {
        await exportEngine.validateFile(maliciousFile);
      }).rejects.toThrow(/invalid.*file.*type/i);
    });

    it('should validate file size limits', async () => {
      const oversizedFile = new File(['x'.repeat(1000)], 'huge.mp4', { type: 'video/mp4' });
      Object.defineProperty(oversizedFile, 'size', { value: 2 * 1024 * 1024 * 1024 });

      await expect(async () => {
        await exportEngine.validateFile(oversizedFile);
      }).rejects.toThrow(/file.*too.*large/i);
    });

    it('should sanitize file names', async () => {
      const dangerousName = '../../../etc/passwd.mp4';
      const file = new File(['video content'], dangerousName, { type: 'video/mp4' });
      
      const sanitized = exportEngine.sanitizeFileName(dangerousName);
      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain('..\\');
    });
  });

  describe('XSS prevention', () => {
    it('should sanitize text content', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const timeline = {
        elements: [
          {
            id: '1',
            type: 'text',
            startTime: 0,
            duration: 5000,
            content: xssPayload
          }
        ],
        duration: 5000
      };

      const result = await exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      });

      expect(result.metadata.textContent).not.toContain('<script>');
    });
  });

  describe('Data validation', () => {
    it('should validate timeline elements', async () => {
      const invalidElement = {
        id: '',
        type: 'invalid_type',
        startTime: -1000,
        duration: -5000,
        src: ''
      };

      const timeline = {
        elements: [invalidElement],
        duration: 30000
      };

      await expect(exportEngine.exportVideo({
        timeline,
        format: 'mp4',
        quality: 'medium'
      })).rejects.toThrow(/invalid.*element/i);
    });
  });
});