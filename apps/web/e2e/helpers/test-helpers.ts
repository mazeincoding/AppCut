/**
 * Helper functions for E2E tests
 * Common utilities for test setup, data creation, and assertions
 */

import { Page, expect, Download } from '@playwright/test'
import { createMockVideoFile, createMockAudioFile, createMockImageFile } from '../fixtures/test-data'

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for application to be fully loaded
   */
  async waitForAppLoad() {
    await this.page.waitForLoadState('networkidle')
    await expect(this.page.locator('body')).not.toHaveClass(/loading/)
  }

  /**
   * Create temporary files for upload testing
   */
  async createTempMediaFiles() {
    const video = createMockVideoFile('test-video.mp4', 1024 * 1024) // 1MB
    const audio = createMockAudioFile('test-audio.mp3', 256 * 1024)  // 256KB
    const image = createMockImageFile('test-image.jpg', 64 * 1024)   // 64KB

    return { video, audio, image }
  }

  /**
   * Mock file upload by injecting files into the page
   */
  async mockFileUpload(selector: string, files: File[]) {
    await this.page.evaluate(async ({ selector, fileData }) => {
      const input = document.querySelector(selector) as HTMLInputElement
      if (!input) throw new Error(`Input element not found: ${selector}`)

      const dataTransfer = new DataTransfer()
      
      for (const file of fileData) {
        const blob = new Blob([new ArrayBuffer(file.size)], { type: file.type })
        const mockFile = new File([blob], file.name, { type: file.type })
        dataTransfer.items.add(mockFile)
      }

      input.files = dataTransfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, {
      selector,
      fileData: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    })
  }

  /**
   * Wait for video element to be ready for playback
   */
  async waitForVideoReady(videoSelector: string = 'video') {
    await this.page.waitForFunction(
      (selector) => {
        const video = document.querySelector(selector) as HTMLVideoElement
        return video && video.readyState >= 2 // HAVE_CURRENT_DATA
      },
      videoSelector,
      { timeout: 30000 }
    )
  }

  /**
   * Simulate user interaction delays for realistic testing
   */
  async userDelay(ms: number = 100) {
    await this.page.waitForTimeout(ms)
  }

  /**
   * Take screenshot for debugging
   */
  async takeDebugScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/debug-${name}-${Date.now()}.png`,
      fullPage: true 
    })
  }

  /**
   * Mock browser APIs that might not be available in test environment
   */
  async mockBrowserAPIs() {
    await this.page.addInitScript(() => {
      // Mock MediaRecorder if not available
      if (!(window as any).MediaRecorder) {
        (window as any).MediaRecorder = class MockMediaRecorder {
          static isTypeSupported() { return true }
          constructor() {}
          start() {}
          stop() {}
          addEventListener() {}
          removeEventListener() {}
        } as any
      }

      // Mock navigator.mediaDevices
      if (!navigator.mediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', {
          value: {
            getUserMedia: () => Promise.resolve(new MediaStream()),
            getDisplayMedia: () => Promise.resolve(new MediaStream())
          }
        })
      }

      // Mock File API extensions
      if (!(window as any).showOpenFilePicker) {
        (window as any).showOpenFilePicker = () => Promise.reject(new Error('Not supported in test'))
      }

      // Mock OPFS (Origin Private File System)
      if (!navigator.storage?.getDirectory) {
        Object.defineProperty(navigator, 'storage', {
          value: {
            getDirectory: () => Promise.reject(new Error('OPFS not available in test'))
          }
        })
      }
    })
  }

  /**
   * Verify download was triggered and get file info
   */
  async verifyDownload(downloadPromise: Promise<Download>) {
    const download = await downloadPromise
    
    expect(download).toBeTruthy()
    
    const filename = download.suggestedFilename()
    const path = await download.path()
    
    expect(filename).toBeTruthy()
    expect(path).toBeTruthy()
    
    return { filename, path, download }
  }

  /**
   * Monitor network requests during test execution
   */
  async monitorNetworkRequests() {
    const requests: any[] = []
    
    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      })
    })

    this.page.on('response', response => {
      const request = requests.find(r => r.url === response.url())
      if (request) {
        request.status = response.status()
        request.responseTime = Date.now() - request.timestamp
      }
    })

    return requests
  }

  /**
   * Wait for specific element to become stable (stop moving/changing)
   */
  async waitForElementStable(selector: string, stableTime: number = 1000) {
    let lastBoundingBox: any = null
    let stableStart = 0

    await this.page.waitForFunction(
      ({ selector, stableTime }) => {
        const element = document.querySelector(selector)
        if (!element) return false

        const currentBox = element.getBoundingClientRect()
        const currentTime = Date.now()
        
        const boxString = `${currentBox.x},${currentBox.y},${currentBox.width},${currentBox.height}`
        
        if (boxString !== (window as any).lastBoxString) {
          (window as any).lastBoxString = boxString
          ;(window as any).stableStart = currentTime
          return false
        }

        return (currentTime - (window as any).stableStart) >= stableTime
      },
      { selector, stableTime },
      { timeout: 10000 }
    )
  }

  /**
   * Check if browser supports required features
   */
  async checkBrowserSupport() {
    const support = await this.page.evaluate(() => {
      return {
        mediaRecorder: !!window.MediaRecorder,
        webWorkers: !!window.Worker,
        indexedDB: !!window.indexedDB,
        canvas: !!document.createElement('canvas').getContext,
        webGL: !!document.createElement('canvas').getContext('webgl'),
        audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
        fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
        dragAndDrop: 'draggable' in document.createElement('div'),
        fullscreen: !!(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled)
      }
    })

    return support
  }

  /**
   * Simulate realistic user behavior patterns
   */
  async simulateUserBehavior() {
    // Add slight mouse movements to simulate real user
    await this.page.mouse.move(100, 100)
    await this.userDelay(50)
    await this.page.mouse.move(200, 200)
    await this.userDelay(50)
  }

  /**
   * Clean up test artifacts
   */
  async cleanup() {
    // Clear any stored data
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear IndexedDB
      if (window.indexedDB) {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name) indexedDB.deleteDatabase(db.name)
          })
        })
      }
    })
    
    // Clear service workers
    await this.page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))
      }
    })
  }

  /**
   * Assert timeline state
   */
  async assertTimelineState(expectedElements: number, expectedDuration?: number) {
    const timelineInfo = await this.page.evaluate(() => {
      const timeline = document.querySelector('[data-testid="timeline"]')
      const elements = timeline?.querySelectorAll('[data-testid="timeline-element"]')
      const duration = timeline?.getAttribute('data-duration')
      
      return {
        elementCount: elements?.length || 0,
        duration: duration ? parseFloat(duration) : null
      }
    })

    expect(timelineInfo.elementCount).toBe(expectedElements)
    
    if (expectedDuration !== undefined) {
      expect(timelineInfo.duration).toBe(expectedDuration)
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as any
      const memory = (performance as any).memory
      
      return {
        loadTime: navigation?.loadEventEnd - navigation?.navigationStart,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart,
        memoryUsage: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        } : null,
        resourceCount: performance.getEntriesByType('resource').length
      }
    })
  }
}