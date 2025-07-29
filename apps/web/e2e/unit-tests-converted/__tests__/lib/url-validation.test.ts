import { 
  validateAppUrl, 
  sanitizeAppUrl, 
  isValidElectronUrl,
  validateUrlBatch 
} from '../../lib/url-validation';

describe('URL Validation', () => {
  describe('validateAppUrl', () => {
    it('should validate correct app:// URLs', () => {
      const result = validateAppUrl('app://example.com/path');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect protocol not at start', () => {
      const result = validateAppUrl('/some/path/app://example.com');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Protocol not at start of URL');
    });

    it('should detect multiple protocols', () => {
      const result = validateAppUrl('app://example.com/app://path');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Multiple protocols found (2 instances)');
    });

    it('should detect protocol in path', () => {
      const result = validateAppUrl('app://example.com/app://path');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Multiple protocols found (2 instances)');
    });

    it('should detect multiple forward slashes', () => {
      const result = validateAppUrl('app:///path/to/resource');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Multiple forward slashes after protocol');
    });

    it('should detect double slashes in path', () => {
      const result = validateAppUrl('app://example.com//path');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Double slashes found in URL path');
    });

    it('should detect root-relative paths', () => {
      const result = validateAppUrl('/path/to/resource');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Root-relative path should use app:// protocol');
    });

    it('should skip validation for external URLs', () => {
      const httpResult = validateAppUrl('https://example.com');
      expect(httpResult.valid).toBe(true);
      
      const mailtoResult = validateAppUrl('mailto:test@example.com');
      expect(mailtoResult.valid).toBe(true);
    });

    it('should skip validation for special schemes', () => {
      const dataResult = validateAppUrl('data:text/plain;base64,SGVsbG8=');
      expect(dataResult.valid).toBe(true);
      
      const blobResult = validateAppUrl('blob:https://example.com/uuid');
      expect(blobResult.valid).toBe(true);
      
      const fragmentResult = validateAppUrl('#section');
      expect(fragmentResult.valid).toBe(true);
    });
  });

  describe('validateAppUrl with autoFix', () => {
    it('should fix protocol not at start', () => {
      const result = validateAppUrl('/some/path/app://example.com', { autoFix: true });
      expect(result.correctedUrl).toBe('app://example.com');
    });

    it('should fix multiple protocols', () => {
      const result = validateAppUrl('app://example.com/app://path', { autoFix: true });
      expect(result.correctedUrl).toBe('app://example.com/path');
    });

    it('should fix multiple forward slashes', () => {
      const result = validateAppUrl('app:///path/to/resource', { autoFix: true });
      expect(result.correctedUrl).toBe('app:///path/to/resource'); // Normalized to single extra slash
    });

    it('should fix root-relative paths', () => {
      const result = validateAppUrl('/path/to/resource', { autoFix: true });
      expect(result.correctedUrl).toBe('app:///path/to/resource');
    });
  });

  describe('sanitizeAppUrl', () => {
    it('should return corrected URL for invalid URLs', () => {
      const sanitized = sanitizeAppUrl('/path/to/resource');
      expect(sanitized).toBe('app:///path/to/resource');
    });

    it('should return original URL for valid URLs', () => {
      const sanitized = sanitizeAppUrl('app://example.com/path');
      expect(sanitized).toBe('app://example.com/path');
    });

    it('should not modify external URLs', () => {
      const sanitized = sanitizeAppUrl('https://example.com');
      expect(sanitized).toBe('https://example.com');
    });
  });

  describe('isValidElectronUrl', () => {
    it('should accept valid app:// URLs', () => {
      expect(isValidElectronUrl('app://example.com/path')).toBe(true);
    });

    it('should accept external URLs', () => {
      expect(isValidElectronUrl('https://example.com')).toBe(true);
      expect(isValidElectronUrl('mailto:test@example.com')).toBe(true);
    });

    it('should accept special schemes', () => {
      expect(isValidElectronUrl('data:text/plain;base64,SGVsbG8=')).toBe(true);
      expect(isValidElectronUrl('#section')).toBe(true);
    });

    it('should reject invalid app:// URLs', () => {
      expect(isValidElectronUrl('app:///invalid')).toBe(false);
      expect(isValidElectronUrl('/app://invalid')).toBe(false);
    });
  });

  describe('validateUrlBatch', () => {
    it('should validate multiple URLs', () => {
      const urls = [
        'app://valid.com/path',
        '/invalid/path',
        'https://external.com',
        'app:///invalid'
      ];

      const results = validateUrlBatch(urls);
      
      expect(results).toHaveLength(4);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
      expect(results[3].valid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error when throwOnInvalid is true', () => {
      expect(() => {
        validateAppUrl('/invalid/path', { throwOnInvalid: true });
      }).toThrow('Invalid app:// URL');
    });

    it('should not throw error when throwOnInvalid is false', () => {
      expect(() => {
        validateAppUrl('/invalid/path', { throwOnInvalid: false });
      }).not.toThrow();
    });
  });

  describe('logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log issues when logIssues is true', () => {
      validateAppUrl('/invalid/path', { logIssues: true });
      expect(consoleSpy).toHaveBeenCalledWith(
        '[URL Validation]',
        expect.objectContaining({
          originalUrl: '/invalid/path',
          issues: expect.arrayContaining(['Root-relative path should use app:// protocol'])
        })
      );
    });

    it('should not log when logIssues is false', () => {
      validateAppUrl('/invalid/path', { logIssues: false });
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});