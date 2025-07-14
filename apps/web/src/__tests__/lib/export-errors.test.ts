import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  ExportError,
  MediaRecorderError,
  AudioMixerError,
  CanvasRenderError,
  TimelineError,
  BrowserCompatibilityError,
  MemoryError,
  getUserFriendlyErrorMessage,
  logExportError,
  checkBrowserCompatibility,
  estimateMemoryUsage
} from '@/lib/export-errors'

describe('Export Errors', () => {
  let originalConsoleError: any

  beforeEach(() => {
    // Mock console.error
    originalConsoleError = console.error
    console.error = jest.fn()
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  describe('ExportError class', () => {
    it('should create error with message and code', () => {
      const error = new ExportError('Test message', 'TEST_CODE')
      
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ExportError)
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('ExportError')
    })

    it('should create error with details', () => {
      const details = { context: 'test', value: 42 }
      const error = new ExportError('Test message', 'TEST_CODE', details)
      
      expect(error.details).toEqual(details)
    })

    it('should have proper prototype chain', () => {
      const error = new ExportError('Test', 'CODE')
      
      expect(error instanceof Error).toBe(true)
      expect(error instanceof ExportError).toBe(true)
    })
  })

  describe('MediaRecorderError class', () => {
    it('should create MediaRecorder error', () => {
      const error = new MediaRecorderError('Recording failed')
      
      expect(error).toBeInstanceOf(ExportError)
      expect(error.message).toBe('Recording failed')
      expect(error.code).toBe('MEDIARECORDER_ERROR')
      expect(error.name).toBe('MediaRecorderError')
    })

    it('should include details when provided', () => {
      const details = { mimeType: 'video/webm', bitrate: 1000000 }
      const error = new MediaRecorderError('Recording failed', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('AudioMixerError class', () => {
    it('should create AudioMixer error', () => {
      const error = new AudioMixerError('Audio mixing failed')
      
      expect(error).toBeInstanceOf(ExportError)
      expect(error.message).toBe('Audio mixing failed')
      expect(error.code).toBe('AUDIO_MIXER_ERROR')
      expect(error.name).toBe('AudioMixerError')
    })

    it('should handle audio-specific details', () => {
      const details = { sampleRate: 44100, channels: 2 }
      const error = new AudioMixerError('Audio mixing failed', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('CanvasRenderError class', () => {
    it('should create CanvasRender error', () => {
      const error = new CanvasRenderError('Canvas rendering failed')
      
      expect(error).toBeInstanceOf(ExportError)
      expect(error.message).toBe('Canvas rendering failed')
      expect(error.code).toBe('CANVAS_RENDER_ERROR')
      expect(error.name).toBe('CanvasRenderError')
    })

    it('should handle canvas-specific details', () => {
      const details = { width: 1920, height: 1080, context: '2d' }
      const error = new CanvasRenderError('Canvas rendering failed', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('TimelineError class', () => {
    it('should create Timeline error', () => {
      const error = new TimelineError('Timeline processing failed')
      
      expect(error).toBeInstanceOf(ExportError)
      expect(error.message).toBe('Timeline processing failed')
      expect(error.code).toBe('TIMELINE_ERROR')
      expect(error.name).toBe('TimelineError')
    })

    it('should handle timeline-specific details', () => {
      const details = { elementCount: 10, duration: 30 }
      const error = new TimelineError('Timeline processing failed', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('BrowserCompatibilityError class', () => {
    it('should create BrowserCompatibility error', () => {
      const error = new BrowserCompatibilityError('Browser not supported')
      
      expect(error).toBeInstanceOf(ExportError)
      expect(error.message).toBe('Browser not supported')
      expect(error.code).toBe('BROWSER_COMPATIBILITY_ERROR')
      expect(error.name).toBe('BrowserCompatibilityError')
    })

    it('should handle browser-specific details', () => {
      const details = { userAgent: 'Mozilla/5.0...', missingFeatures: ['MediaRecorder'] }
      const error = new BrowserCompatibilityError('Browser not supported', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('MemoryError class', () => {
    it('should create Memory error', () => {
      const error = new MemoryError('Out of memory')
      
      expect(error).toBeInstanceOf(ExportError)
      expect(error.message).toBe('Out of memory')
      expect(error.code).toBe('MEMORY_ERROR')
      expect(error.name).toBe('MemoryError')
    })

    it('should handle memory-specific details', () => {
      const details = { estimatedMemory: 2048, availableMemory: 1024 }
      const error = new MemoryError('Out of memory', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('getUserFriendlyErrorMessage function', () => {
    it('should return friendly message for MediaRecorderError', () => {
      const error = new MediaRecorderError('Technical error message')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Failed to record video. Please check your browser\'s media recording capabilities.')
    })

    it('should return friendly message for AudioMixerError', () => {
      const error = new AudioMixerError('Technical error message')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Failed to process audio tracks. Please check your audio files and try again.')
    })

    it('should return friendly message for CanvasRenderError', () => {
      const error = new CanvasRenderError('Technical error message')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Failed to render video frames. Please check your video elements and try again.')
    })

    it('should return friendly message for TimelineError', () => {
      const error = new TimelineError('Technical error message')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Timeline processing error. Please check your project timeline and try again.')
    })

    it('should return friendly message for BrowserCompatibilityError', () => {
      const error = new BrowserCompatibilityError('Technical error message')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Your browser doesn\'t support video export. Please try using a modern Chrome or Firefox browser.')
    })

    it('should return friendly message for MemoryError', () => {
      const error = new MemoryError('Technical error message')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Insufficient memory to complete export. Please try exporting at a lower quality or shorter duration.')
    })

    it('should return original message for unknown ExportError code', () => {
      const error = new ExportError('Custom message', 'UNKNOWN_CODE')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Custom message')
    })

    it('should return original message for non-ExportError', () => {
      const error = new Error('Generic error message')
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('Generic error message')
    })

    it('should handle error without message', () => {
      const error = new Error()
      const friendlyMessage = getUserFriendlyErrorMessage(error)
      
      expect(friendlyMessage).toBe('An unknown error occurred during export.')
    })
  })

  describe('logExportError function', () => {
    it('should log error with context information', () => {
      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      
      logExportError(error, 'test context')
      
      expect(console.error).toHaveBeenCalledWith('Export Error:', expect.objectContaining({
        error: 'Test error',
        stack: 'Error stack trace',
        context: 'test context',
        timestamp: expect.any(String),
        userAgent: expect.any(String),
        url: expect.any(String)
      }))
    })

    it('should include timestamp in ISO format', () => {
      const error = new Error('Test error')
      const beforeLog = new Date().toISOString()
      
      logExportError(error, 'test')
      
      const afterLog = new Date().toISOString()
      const loggedData = (console.error as jest.Mock).mock.calls[0][1]
      
      expect(loggedData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(loggedData.timestamp >= beforeLog).toBe(true)
      expect(loggedData.timestamp <= afterLog).toBe(true)
    })

    it('should handle different error types', () => {
      const exportError = new MediaRecorderError('MediaRecorder failed')
      
      logExportError(exportError, 'export context')
      
      expect(console.error).toHaveBeenCalledWith('Export Error:', expect.objectContaining({
        error: 'MediaRecorder failed',
        context: 'export context'
      }))
    })

    it('should handle error without stack trace', () => {
      const error = new Error('Test error')
      delete error.stack
      
      logExportError(error, 'test context')
      
      expect(console.error).toHaveBeenCalledWith('Export Error:', expect.objectContaining({
        error: 'Test error',
        stack: undefined
      }))
    })
  })

  describe('checkBrowserCompatibility function', () => {
    it('should return supported true when all features available', () => {
      // Mock all required APIs as available
      global.window.MediaRecorder = jest.fn() as any
      HTMLCanvasElement.prototype.captureStream = jest.fn()
      global.window.AudioContext = jest.fn() as any
      
      // Mock MediaRecorder.isTypeSupported
      global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true)
      
      const result = checkBrowserCompatibility()
      
      expect(result.supported).toBe(true)
      expect(result.issues).toEqual([])
    })

    it('should detect missing MediaRecorder', () => {
      delete global.window.MediaRecorder
      
      const result = checkBrowserCompatibility()
      
      expect(result.supported).toBe(false)
      expect(result.issues).toContain('MediaRecorder API not supported')
    })

    it('should detect missing captureStream', () => {
      delete HTMLCanvasElement.prototype.captureStream
      
      const result = checkBrowserCompatibility()
      
      expect(result.supported).toBe(false)
      expect(result.issues).toContain('Canvas stream capture not supported')
    })

    it('should detect missing Web Audio API', () => {
      delete global.window.AudioContext
      delete global.window.webkitAudioContext
      
      const result = checkBrowserCompatibility()
      
      expect(result.supported).toBe(false)
      expect(result.issues).toContain('Web Audio API not supported')
    })

    it('should support webkit AudioContext', () => {
      delete global.window.AudioContext
      global.window.webkitAudioContext = jest.fn() as any
      
      const result = checkBrowserCompatibility()
      
      expect(result.issues).not.toContain('Web Audio API not supported')
    })

    it('should detect missing video codecs', () => {
      global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(false)
      
      const result = checkBrowserCompatibility()
      
      expect(result.supported).toBe(false)
      expect(result.issues).toContain('No supported video codecs available')
    })

    it('should handle multiple compatibility issues', () => {
      delete global.window.MediaRecorder
      delete HTMLCanvasElement.prototype.captureStream
      delete global.window.AudioContext
      delete global.window.webkitAudioContext
      
      const result = checkBrowserCompatibility()
      
      expect(result.supported).toBe(false)
      expect(result.issues.length).toBeGreaterThan(1)
      expect(result.issues).toContain('MediaRecorder API not supported')
      expect(result.issues).toContain('Canvas stream capture not supported')
      expect(result.issues).toContain('Web Audio API not supported')
    })
  })

  describe('estimateMemoryUsage function', () => {
    it('should calculate memory usage for 1080p video', () => {
      const result = estimateMemoryUsage(1920, 1080, 10, 30)
      
      // 1920 * 1080 * 4 bytes * 30 fps * 10 seconds = 2.4GB
      expect(result.estimatedMB).toBeGreaterThan(2000)
      expect(result.warning).toBeTruthy()
    })

    it('should calculate memory usage for 720p video', () => {
      const result = estimateMemoryUsage(1280, 720, 5, 30)
      
      // Much smaller memory usage
      expect(result.estimatedMB).toBeLessThan(1000)
      expect(result.warning).toBeNull()
    })

    it('should provide warning for high memory usage', () => {
      const result = estimateMemoryUsage(1920, 1080, 30, 30)
      
      expect(result.estimatedMB).toBeGreaterThan(1000)
      expect(result.warning).toContain('High memory usage')
    })

    it('should provide warning for very high memory usage', () => {
      const result = estimateMemoryUsage(3840, 2160, 30, 30) // 4K, 30 seconds
      
      expect(result.estimatedMB).toBeGreaterThan(2000)
      expect(result.warning).toContain('Very high memory usage')
    })

    it('should handle small videos without warning', () => {
      const result = estimateMemoryUsage(640, 480, 5, 30)
      
      expect(result.estimatedMB).toBeLessThan(500)
      expect(result.warning).toBeNull()
    })

    it('should handle different frame rates', () => {
      const result30fps = estimateMemoryUsage(1920, 1080, 10, 30)
      const result60fps = estimateMemoryUsage(1920, 1080, 10, 60)
      
      expect(result60fps.estimatedMB).toBe(result30fps.estimatedMB * 2)
    })

    it('should round memory estimates', () => {
      const result = estimateMemoryUsage(100, 100, 1, 1)
      
      expect(result.estimatedMB).toBe(Math.round(result.estimatedMB))
      expect(Number.isInteger(result.estimatedMB)).toBe(true)
    })

    it('should handle zero values gracefully', () => {
      const result = estimateMemoryUsage(0, 0, 0, 0)
      
      expect(result.estimatedMB).toBe(0)
      expect(result.warning).toBeNull()
    })

    it('should handle edge case dimensions', () => {
      const result = estimateMemoryUsage(1, 1, 1, 1)
      
      expect(result.estimatedMB).toBe(0) // Very small, rounds to 0
      expect(result.warning).toBeNull()
    })
  })
})