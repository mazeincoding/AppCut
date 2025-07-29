/**
 * Network Failures Integration Tests
 * Tests network failure scenarios for video export functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Network Failures Tests', () => {
  let originalFetch: typeof fetch;
  let originalNavigator: any;

  beforeEach(() => {
    // Store original implementations
    originalFetch = global.fetch;
    originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator');

    // Mock Response class
    global.Response = jest.fn().mockImplementation((body) => ({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob([body || 'test'], { type: 'video/mp4' })),
      text: () => Promise.resolve(body || 'success'),
      json: () => Promise.resolve({}),
    }));

    // Mock navigator.onLine
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        ...window.navigator,
        onLine: true,
      },
    });
  });

  afterEach(() => {
    // Restore original implementations
    global.fetch = originalFetch;
    if (originalNavigator) {
      Object.defineProperty(window, 'navigator', originalNavigator);
    }
    jest.clearAllMocks();
  });

  describe('Offline Media Handling', () => {
    it('should detect offline mode', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const isOffline = !navigator.onLine;
      expect(isOffline).toBe(true);
    });

    it('should handle offline media files', async () => {
      // Test blob URL pattern recognition (using mock)
      const mockBlobUrl = 'blob:http://localhost/test-blob-id';
      
      // Should recognize blob URLs for offline handling
      expect(mockBlobUrl).toMatch(/^blob:/);
      expect(typeof mockBlobUrl).toBe('string');
      
      // Test offline media handling logic
      const isOfflineCompatible = (url: string) => {
        return url.startsWith('blob:') || url.startsWith('data:');
      };
      
      expect(isOfflineCompatible(mockBlobUrl)).toBe(true);
      expect(isOfflineCompatible('data:video/mp4;base64,test')).toBe(true);
      expect(isOfflineCompatible('http://example.com/video.mp4')).toBe(false);
    });

    it('should fallback for offline media loading', async () => {
      const loadMediaOffline = (url: string) => {
        if (url.startsWith('blob:') || url.startsWith('data:')) {
          return Promise.resolve({ success: true, offline: true });
        }
        if (!navigator.onLine) {
          return Promise.reject(new Error('No network connection'));
        }
        return Promise.resolve({ success: true, offline: false });
      };

      // Test blob URL (should work offline)
      const blobUrl = 'blob:http://localhost/test';
      const blobResult = await loadMediaOffline(blobUrl);
      expect(blobResult.success).toBe(true);
      expect(blobResult.offline).toBe(true);

      // Test network URL when offline
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await expect(loadMediaOffline('http://example.com/video.mp4'))
        .rejects.toThrow('No network connection');
    });
  });

  describe('Network Interruption', () => {
    it('should handle fetch network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const fetchWithRetry = async (url: string, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fetch(url);
          } catch (error) {
            if (i === retries - 1) throw error;
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };

      await expect(fetchWithRetry('http://example.com/video.mp4'))
        .rejects.toThrow('Network error');
      
      expect(fetch).toHaveBeenCalledTimes(3); // Retried 3 times
    });

    it('should handle network timeout', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 50)
        )
      );

      const fetchWithTimeout = (url: string, timeout = 100) => {
        return Promise.race([
          fetch(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      };

      await expect(fetchWithTimeout('http://example.com/video.mp4', 75))
        .rejects.toThrow('Timeout');
    });

    it('should detect connection state changes', (done) => {
      let connectionLost = false;
      let connectionRestored = false;

      const handleOffline = () => {
        connectionLost = true;
      };

      const handleOnline = () => {
        connectionRestored = true;
      };

      // Add event listeners
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      
      setTimeout(() => {
        expect(connectionLost).toBe(true);
        
        // Simulate online event
        window.dispatchEvent(new Event('online'));
        
        setTimeout(() => {
          expect(connectionRestored).toBe(true);
          
          // Cleanup
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('online', handleOnline);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Retry Mechanisms', () => {
    it('should implement exponential backoff for retries', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(new Response('success'));
      });

      const fetchWithBackoff = async (url: string, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fetch(url);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            // Exponential backoff: 100ms, 200ms, 400ms
            const delay = 100 * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      const response = await fetchWithBackoff('http://example.com/video.mp4');
      expect(response).toBeDefined();
      expect(response.ok).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should handle partial network recovery', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Connection lost'));
        }
        if (callCount === 2) {
          return Promise.reject(new Error('Still unstable'));
        }
        return Promise.resolve(new Response('success'));
      });

      const robustFetch = async (url: string) => {
        const maxRetries = 3;
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            const response = await fetch(url);
            if (response.ok) return response;
            throw new Error(`HTTP ${response.status}`);
          } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        }
        throw lastError;
      };

      const response = await robustFetch('http://example.com/video.mp4');
      expect(response).toBeDefined();
      expect(response.ok).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should respect maximum retry limits', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Persistent network error'));

      const fetchWithLimits = async (url: string, maxRetries = 2) => {
        let attempts = 0;
        while (attempts < maxRetries) {
          try {
            return await fetch(url);
          } catch (error) {
            attempts++;
            if (attempts >= maxRetries) {
              throw new Error(`Failed after ${attempts} attempts: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      };

      await expect(fetchWithLimits('http://example.com/video.mp4'))
        .rejects.toThrow('Failed after 2 attempts');
      
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Offline Export Mode', () => {
    it('should enable offline-only export mode', () => {
      const exportConfig = {
        offlineMode: true,
        allowNetworkResources: false,
        useLocalResourcesOnly: true,
      };

      expect(exportConfig.offlineMode).toBe(true);
      expect(exportConfig.allowNetworkResources).toBe(false);
    });

    it('should validate local resources before export', () => {
      const validateLocalResources = (resources: string[]) => {
        const localResources = resources.filter(url => 
          url.startsWith('blob:') || 
          url.startsWith('data:') || 
          url.startsWith('file:')
        );
        const networkResources = resources.filter(url => 
          url.startsWith('http:') || 
          url.startsWith('https:')
        );

        return {
          valid: networkResources.length === 0,
          localCount: localResources.length,
          networkCount: networkResources.length,
          networkResources,
        };
      };

      const testResources = [
        'blob:http://localhost/video1',
        'data:image/png;base64,iVBOR...',
        'http://example.com/video2.mp4',
      ];

      const validation = validateLocalResources(testResources);
      expect(validation.valid).toBe(false);
      expect(validation.localCount).toBe(2);
      expect(validation.networkCount).toBe(1);
      expect(validation.networkResources).toEqual(['http://example.com/video2.mp4']);
    });

    it('should cache network resources for offline use', async () => {
      const resourceCache = new Map<string, Blob>();

      const cacheResource = async (url: string) => {
        if (resourceCache.has(url)) {
          return resourceCache.get(url);
        }

        try {
          const response = await fetch(url);
          const blob = await response.blob();
          resourceCache.set(url, blob);
          return blob;
        } catch (error) {
          throw new Error(`Failed to cache resource: ${url}`);
        }
      };

      // Mock successful fetch
      global.fetch = jest.fn().mockResolvedValue(
        new Response(new Blob(['test'], { type: 'video/mp4' }))
      );

      const blob = await cacheResource('http://example.com/video.mp4');
      expect(blob).toBeInstanceOf(Blob);
      expect(resourceCache.has('http://example.com/video.mp4')).toBe(true);

      // Second call should use cache
      const cachedBlob = await cacheResource('http://example.com/video.mp4');
      expect(cachedBlob).toBe(blob);
      expect(fetch).toHaveBeenCalledTimes(1); // Only called once
    });
  });
});