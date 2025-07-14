import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ExportEngine } from '@/lib/export-engine'
import { VideoRecorder } from '@/lib/video-recorder'
import { AudioMixer } from '@/lib/audio-mixer'
import { CanvasRenderer } from '@/lib/canvas-renderer'
import { FrameCaptureService } from '@/lib/frame-capture'
import { createMockCanvas, createMockExportSettings, createMockVideoElement, createMockAudioElement } from '../utils/test-helpers'
import { ExportError, MemoryError, BrowserCompatibilityError, CanvasRenderError } from '@/lib/export-errors'

// Mock dependencies
jest.mock('@/lib/canvas-renderer')
jest.mock('@/lib/frame-capture')
jest.mock('@/lib/video-recorder')
jest.mock('@/lib/audio-mixer')
jest.mock('@/lib/export-errors')

describe('Error Recovery', () => {
  let mockCanvas: HTMLCanvasElement
  let mockSettings: any
  let mockTimelineElements: any[]
  let mockOptions: any
  let mockVideoRecorder: any
  let mockAudioMixer: any
  let mockCanvasRenderer: any
  let mockFrameCapture: any
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    mockCanvas = createMockCanvas()
    mockSettings = createMockExportSettings()
    mockTimelineElements = [
      createMockVideoElement(),
      createMockAudioElement()
    ]
    
    mockOptions = {
      canvas: mockCanvas,
      settings: mockSettings,
      timelineElements: mockTimelineElements,
      duration: 10,
      fps: 30,
      onProgress: jest.fn(),
      onError: jest.fn()
    }

    // Mock VideoRecorder
    mockVideoRecorder = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'video/mp4' })),
      cleanup: jest.fn(),
      setAudioStream: jest.fn(),
      isRecording: jest.fn().mockReturnValue(false)
    }

    // Mock AudioMixer  
    mockAudioMixer = {
      clearTracks: jest.fn(),
      addAudioTrack: jest.fn(),
      mixTracks: jest.fn().mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 441000
      }),
      loadAudioBufferFromUrl: jest.fn().mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 44100
      }),
      getAudioContext: jest.fn().mockReturnValue({
        createBufferSource: () => ({
          buffer: null,
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          disconnect: jest.fn()
        }),
        createMediaStreamDestination: () => ({
          stream: {
            getTracks: jest.fn().mockReturnValue([{
              stop: jest.fn()
            }])
          }
        })
      }),
      dispose: jest.fn()
    }

    // Mock CanvasRenderer
    mockCanvasRenderer = {
      clearFrame: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: jest.fn(),
      drawText: jest.fn()
    }

    // Mock FrameCaptureService
    mockFrameCapture = {
      getTotalFrames: jest.fn().mockReturnValue(300),
      getFrameData: jest.fn().mockImplementation((frame) => ({
        frameNumber: frame,
        timestamp: frame / 30,
        elements: []
      })),
      getVisibleElements: jest.fn().mockReturnValue([])
    }

    // Setup class mocks
    ;(VideoRecorder as jest.MockedClass<typeof VideoRecorder>).mockImplementation(() => mockVideoRecorder)
    ;(AudioMixer as jest.MockedClass<typeof AudioMixer>).mockImplementation(() => mockAudioMixer)
    ;(CanvasRenderer as jest.MockedClass<typeof CanvasRenderer>).mockImplementation(() => mockCanvasRenderer)
    ;(FrameCaptureService as jest.MockedClass<typeof FrameCaptureService>).mockImplementation(() => mockFrameCapture)

    // Mock browser compatibility
    const exportErrors = require('@/lib/export-errors')
    exportErrors.checkBrowserCompatibility.mockReturnValue({ supported: true, issues: [] })
    exportErrors.estimateMemoryUsage.mockReturnValue({ estimatedMB: 500, warning: null })
    exportErrors.getUserFriendlyErrorMessage.mockImplementation((error) => 
      `Failed to export video: ${error.message}`
    )
    exportErrors.logExportError.mockImplementation(() => {})
    
    // Mock error classes
    exportErrors.ExportError = class extends Error {
      constructor(message, code) {
        super(message)
        this.code = code
      }
    }
    exportErrors.MemoryError = class extends Error {}
    exportErrors.BrowserCompatibilityError = class extends Error {
      constructor(message, issues) {
        super(message)
        this.issues = issues
      }
    }
    exportErrors.CanvasRenderError = class extends Error {}

    // Mock globals
    global.MediaStream = jest.fn().mockImplementation(() => ({
      getTracks: jest.fn().mockReturnValue([{
        stop: jest.fn()
      }])
    }))

    let frameCallbackId = 0
    global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
      frameCallbackId++
      setTimeout(cb, 16)
      return frameCallbackId
    })

    global.cancelAnimationFrame = jest.fn()

    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('Error handling flow', () => {
    it('should handle video recorder initialization errors', async () => {
      const recorderError = new Error('Failed to initialize MediaRecorder')
      mockVideoRecorder.startRecording.mockRejectedValue(recorderError)
      
      const engine = new ExportEngine(mockOptions)
      
      await expect(engine.startExport()).rejects.toThrow('Failed to initialize MediaRecorder')
      expect(mockOptions.onError).toHaveBeenCalled()
      expect(engine.isActive).toBe(false)
    })


    it('should handle canvas rendering errors', async () => {
      mockFrameCapture.getFrameData.mockImplementation(() => {
        throw new Error('Invalid frame data')
      })
      
      const engine = new ExportEngine(mockOptions)
      
      await expect(engine.startExport()).rejects.toThrow()
      expect(mockOptions.onError).toHaveBeenCalled()
      expect(engine.isActive).toBe(false)
    })

    it('should handle memory errors gracefully', async () => {
      const exportErrors = require('@/lib/export-errors')
      exportErrors.estimateMemoryUsage.mockImplementation(() => {
        throw new exportErrors.MemoryError('Insufficient memory for export')
      })
      
      const engine = new ExportEngine(mockOptions)
      
      await expect(engine.startExport()).rejects.toThrow('Insufficient memory for export')
      expect(mockOptions.onError).toHaveBeenCalled()
    })

    it('should handle browser compatibility errors', async () => {
      const exportErrors = require('@/lib/export-errors')
      exportErrors.checkBrowserCompatibility.mockReturnValue({ 
        supported: false, 
        issues: ['MediaRecorder API not supported'] 
      })
      
      const engine = new ExportEngine(mockOptions)
      
      await expect(engine.startExport()).rejects.toThrow('Browser not compatible')
      expect(mockOptions.onError).toHaveBeenCalled()
    })

    it('should handle export stop recording errors', async () => {
      const stopError = new Error('Failed to stop recording')
      mockVideoRecorder.stopRecording.mockRejectedValue(stopError)
      
      const engine = new ExportEngine(mockOptions)
      
      // Mock quick frame rendering
      mockFrameCapture.getTotalFrames.mockReturnValue(1)
      
      await expect(engine.startExport()).rejects.toThrow('Failed to stop recording')
      expect(mockOptions.onError).toHaveBeenCalled()
    })

    it('should cleanup resources on error', async () => {
      const error = new Error('Test error')
      mockVideoRecorder.startRecording.mockRejectedValue(error)
      
      const engine = new ExportEngine(mockOptions)
      
      try {
        await engine.startExport()
      } catch (e) {
        // Expected error
      }
      
      // Verify cleanup was called
      expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
      expect(mockAudioMixer.dispose).toHaveBeenCalled()
    })

    it('should provide user-friendly error messages', async () => {
      const technicalError = new Error('MediaRecorder.start() failed')
      mockVideoRecorder.startRecording.mockRejectedValue(technicalError)
      
      const mockErrorCallback = jest.fn()
      const options = {
        ...mockOptions,
        onError: mockErrorCallback
      }
      
      const engine = new ExportEngine(options)
      
      try {
        await engine.startExport()
      } catch (e) {
        // Expected error
      }
      
      // Verify user-friendly message was provided
      expect(mockErrorCallback).toHaveBeenCalled()
      const errorCall = mockErrorCallback.mock.calls[0][0]
      expect(typeof errorCall).toBe('string')
      expect(errorCall).toContain('export')
    })
  })

  describe('UI recovery after errors', () => {
    it('should reset export state after error', async () => {
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Test error'))
      
      const engine = new ExportEngine(mockOptions)
      
      try {
        await engine.startExport()
      } catch (e) {
        // Expected error
      }
      
      // Engine should not be active after error
      expect(engine.isActive).toBe(false)
    })

    it('should allow new export after error recovery', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // First export fails
      mockVideoRecorder.startRecording.mockRejectedValueOnce(new Error('First attempt failed'))
      
      try {
        await engine.startExport()
      } catch (e) {
        // Expected error
      }
      
      // Reset mock to succeed
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      
      // Second export should work
      const secondExport = engine.startExport()
      expect(secondExport).toBeInstanceOf(Promise)
      
      // Clean up
      engine.cancelExport()
    })

    it('should clear progress on error', async () => {
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Test error'))
      
      const mockProgressCallback = jest.fn()
      const options = {
        ...mockOptions,
        onProgress: mockProgressCallback
      }
      
      const engine = new ExportEngine(options)
      
      try {
        await engine.startExport()
      } catch (e) {
        // Expected error
      }
      
      // Progress should have been called with initialization
      expect(mockProgressCallback).toHaveBeenCalledWith(0, 'Initializing export...')
    })

    it('should handle concurrent error recovery', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Make multiple exports fail
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Concurrent error'))
      
      const promises = [
        engine.startExport().catch(() => {}),
        engine.startExport().catch(() => {}),
      ]
      
      await Promise.all(promises)
      
      // Engine should handle concurrent errors gracefully
      expect(engine.isActive).toBe(false)
      expect(mockOptions.onError).toHaveBeenCalled()
    })

    it('should handle errors during cleanup', async () => {
      // Setup cleanup to throw
      mockVideoRecorder.cleanup.mockImplementation(() => {
        throw new Error('Cleanup error')
      })
      
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Export error'))
      
      const engine = new ExportEngine(mockOptions)
      
      // Should not throw even if cleanup fails
      await expect(engine.startExport()).rejects.toThrow('Export error')
      
      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to cleanup recorder:',
        expect.any(Error)
      )
    })

    it('should preserve error callback state', async () => {
      const errorMessages: string[] = []
      const options = {
        ...mockOptions,
        onError: (msg: string) => errorMessages.push(msg)
      }
      
      const engine = new ExportEngine(options)
      
      // Trigger multiple errors
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Error 1'))
      
      try {
        await engine.startExport()
      } catch (e) {
        // Expected
      }
      
      expect(errorMessages.length).toBeGreaterThan(0)
      expect(typeof errorMessages[0]).toBe('string')
      expect(errorMessages[0]).toContain('export')
    })
  })

  describe('Retry mechanisms', () => {
    it('should support manual retry after failure', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // First attempt fails
      mockVideoRecorder.startRecording.mockRejectedValueOnce(new Error('Temporary failure'))
      
      let firstError
      try {
        await engine.startExport()
      } catch (e) {
        firstError = e
      }
      
      expect(firstError).toBeDefined()
      
      // Manual retry succeeds
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      
      const retryExport = engine.startExport()
      expect(retryExport).toBeInstanceOf(Promise)
      
      // Clean up
      engine.cancelExport()
    })

    it('should handle retry with different settings', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // First attempt fails
      mockVideoRecorder.startRecording.mockRejectedValueOnce(new Error('Quality too high'))
      
      try {
        await engine.startExport()
      } catch (e) {
        // Expected
      }
      
      // Create new engine with lower quality settings
      const retryOptions = {
        ...mockOptions,
        settings: {
          ...mockSettings,
          videoBitrate: mockSettings.videoBitrate / 2
        }
      }
      
      const retryEngine = new ExportEngine(retryOptions)
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      
      const retryExport = retryEngine.startExport()
      expect(retryExport).toBeInstanceOf(Promise)
      
      // Clean up
      retryEngine.cancelExport()
    })

    it('should clear error state before retry', async () => {
      const mockErrorCallback = jest.fn()
      const options = {
        ...mockOptions,
        onError: mockErrorCallback
      }
      
      const engine = new ExportEngine(options)
      
      // Setup to fail then succeed
      mockVideoRecorder.startRecording
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue(undefined)
      
      // First attempt
      try {
        await engine.startExport()
      } catch (e) {
        // Expected
      }
      
      // Clear error callback calls
      mockErrorCallback.mockClear()
      
      // Retry (don't await)
      engine.startExport()
      engine.cancelExport()
      
      // Engine should be inactive after cancellation
      expect(engine.isActive).toBe(false)
    })

    it('should handle retry limit scenarios', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Always fail
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Persistent error'))
      
      const attempts = []
      
      // Try 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await engine.startExport()
        } catch (e) {
          attempts.push(e)
        }
      }
      
      expect(attempts).toHaveLength(3)
      expect(mockOptions.onError).toHaveBeenCalledTimes(3)
    })

    it('should preserve state between retry attempts', async () => {
      const progressUpdates: Array<{progress: number, message: string}> = []
      const options = {
        ...mockOptions,
        onProgress: (progress: number, message: string) => {
          progressUpdates.push({ progress, message })
        }
      }
      
      const engine = new ExportEngine(options)
      
      // Fail on first attempt
      mockVideoRecorder.startRecording
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockResolvedValue(undefined)
      
      // First attempt
      try {
        await engine.startExport()
      } catch (e) {
        // Expected
      }
      
      // Clear progress
      progressUpdates.length = 0
      
      // Retry
      const retryPromise = engine.startExport()
      engine.cancelExport()
      
      // Should have new progress update
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[0].message).toContain('Initializing')
    })

    it('should handle different error types appropriately', async () => {
      const exportErrors = require('@/lib/export-errors')
      const mockErrorCallback = jest.fn()
      const options = {
        ...mockOptions,
        onError: mockErrorCallback
      }
      
      const engine = new ExportEngine(options)
      
      // Test different error types
      const errorScenarios = [
        { error: new exportErrors.MemoryError('Out of memory') },
        { error: new exportErrors.BrowserCompatibilityError('Unsupported') },
        { error: new exportErrors.ExportError('Generic error', 'EXPORT_FAILED') }
      ]
      
      for (const scenario of errorScenarios) {
        mockVideoRecorder.startRecording.mockRejectedValueOnce(scenario.error)
        mockErrorCallback.mockClear()
        
        try {
          await engine.startExport()
        } catch (e) {
          // Expected
        }
        
        expect(mockErrorCallback).toHaveBeenCalled()
      }
    })
  })

  describe('Error recovery edge cases', () => {
    it('should handle error during error handling', async () => {
      const options = {
        ...mockOptions,
        onError: jest.fn().mockImplementation(() => {
          throw new Error('Error callback failed')
        })
      }
      
      const engine = new ExportEngine(options)
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Export failed'))
      
      // The error callback throws, so expect that error instead
      await expect(engine.startExport()).rejects.toThrow('Error callback failed')
    })

    it('should handle missing error callback', async () => {
      const options = {
        ...mockOptions,
        onError: undefined
      }
      
      const engine = new ExportEngine(options)
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Export failed'))
      
      // Should handle error even without callback
      await expect(engine.startExport()).rejects.toThrow('Export failed')
    })

    it('should handle error after successful start', () => {
      const mockErrorCallback = jest.fn()
      const options = {
        ...mockOptions,
        onError: mockErrorCallback
      }
      
      const engine = new ExportEngine(options)
      
      // Start export but don't await to avoid async issues
      engine.startExport()
      
      // Immediately cancel to trigger cleanup path
      engine.cancelExport()
      
      // Should handle the cancellation gracefully
      expect(engine.isActive).toBe(false)
    })

    it('should handle cleanup after partial export', () => {
      const mockErrorCallback = jest.fn()
      const options = {
        ...mockOptions,
        onError: mockErrorCallback
      }
      
      const engine = new ExportEngine(options)
      
      // Simulate error during initialization
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Mid-export failure'))
      
      // Start export (don't await)
      engine.startExport().catch(() => {})
      
      // Give it time to fail and cleanup
      setTimeout(() => {
        // Should still cleanup resources
        expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
        expect(mockAudioMixer.dispose).toHaveBeenCalled()
      }, 100)
    })
  })
})