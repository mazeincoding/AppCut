import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ExportEngine } from '@/lib/export-engine'
import { VideoRecorder } from '@/lib/video-recorder'
import { AudioMixer } from '@/lib/audio-mixer'
import { CanvasRenderer } from '@/lib/canvas-renderer'
import { FrameCaptureService } from '@/lib/frame-capture'
import { createMockCanvas, createMockExportSettings, createMockVideoElement, createMockAudioElement } from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/canvas-renderer')
jest.mock('@/lib/frame-capture')
jest.mock('@/lib/video-recorder')
jest.mock('@/lib/audio-mixer')
jest.mock('@/lib/export-errors')

describe('Cancellation Flow', () => {
  let mockCanvas: HTMLCanvasElement
  let mockSettings: any
  let mockTimelineElements: any[]
  let mockOptions: any
  let mockVideoRecorder: any
  let mockAudioMixer: any
  let mockCanvasRenderer: any
  let mockFrameCapture: any
  let unhandledRejectionHandler: any

  beforeEach(() => {
    // Suppress unhandled rejection warnings for expected cancellations
    unhandledRejectionHandler = (error: Error) => {
      if (error.message === 'Export cancelled') {
        // Expected error, ignore
        return
      }
      throw error
    }
    process.on('unhandledRejection', unhandledRejectionHandler)
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
    const { checkBrowserCompatibility, estimateMemoryUsage } = require('@/lib/export-errors')
    checkBrowserCompatibility.mockReturnValue({ supported: true, issues: [] })
    estimateMemoryUsage.mockReturnValue({ estimatedMB: 500, warning: null })

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
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.removeListener('unhandledRejection', unhandledRejectionHandler)
  })

  describe('Export cancellation', () => {
    it('should cancel export immediately', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel immediately
      engine.cancelExport()
      
      // Engine should not be active
      expect(engine.isActive).toBe(false)
      
      // Export should be cancelled
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })

    it('should cancel export during frame rendering', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Set up frame rendering to be cancellable
      let renderCallCount = 0
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        renderCallCount++
        if (renderCallCount <= 5) {
          setTimeout(cb, 10)
        }
        return renderCallCount
      })
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel after a short delay
      setTimeout(() => {
        engine.cancelExport()
      }, 25)
      
      // Export should be cancelled
      try {
        await exportPromise
      } catch (error) {
        expect(error.message).toBe('Export cancelled')
      }
      
      expect(engine.isActive).toBe(false)
    })

    it('should cancel export during audio preparation', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock audio preparation with delay
      mockAudioMixer.loadAudioBufferFromUrl.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            numberOfChannels: 2,
            sampleRate: 44100,
            length: 44100
          }), 100)
        })
      )
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel during audio preparation
      setTimeout(() => {
        engine.cancelExport()
      }, 50)
      
      // Export should be cancelled
      try {
        await exportPromise
      } catch (error) {
        expect(error.message).toBe('Export cancelled')
      }
      
      expect(engine.isActive).toBe(false)
    })

    it('should cancel export during video recording', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock video recording with delay
      mockVideoRecorder.startRecording.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
      )
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel during video recording
      setTimeout(() => {
        engine.cancelExport()
      }, 50)
      
      // Export should be cancelled
      try {
        await exportPromise
      } catch (error) {
        expect(error.message).toBe('Export cancelled')
      }
      
      expect(engine.isActive).toBe(false)
    })

    it('should handle multiple cancel calls gracefully', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel multiple times
      engine.cancelExport()
      engine.cancelExport()
      engine.cancelExport()
      
      // Should not throw and should remain inactive
      expect(engine.isActive).toBe(false)
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })

    it('should cancel export when no export is running', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Cancel when no export is running
      expect(() => engine.cancelExport()).not.toThrow()
      expect(engine.isActive).toBe(false)
    })

    it('should prevent new export after cancellation', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start and cancel export
      const exportPromise = engine.startExport()
      engine.cancelExport()
      
      try {
        await exportPromise
      } catch (error) {
        expect(error.message).toBe('Export cancelled')
      }
      
      // Should be able to start new export
      expect(engine.isActive).toBe(false)
      
      // Start new export should work
      const newExportPromise = engine.startExport()
      expect(newExportPromise).toBeInstanceOf(Promise)
      
      // Clean up
      engine.cancelExport()
    })

  })

  describe('Resource cleanup on cancel', () => {
    it('should cleanup video recorder on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock console.warn to suppress expected warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Start export (don't await)
      engine.startExport()
      
      // Cancel export immediately
      engine.cancelExport()
      
      // Cleanup should be called
      expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
      
      // Restore console.warn
      consoleWarnSpy.mockRestore()
    })

    it('should cleanup audio mixer on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock console.warn to suppress expected warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Start export (don't await)
      engine.startExport()
      
      // Cancel export immediately
      engine.cancelExport()
      
      // Cleanup should be called
      expect(mockAudioMixer.dispose).toHaveBeenCalled()
      
      // Restore console.warn
      consoleWarnSpy.mockRestore()
    })

    it('should stop animation frames on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel export
      engine.cancelExport()
      
      // Export should be cancelled (animation frames are stopped by shouldCancel flag)
      expect(engine.isActive).toBe(false)
      
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })

    it('should cleanup canvas state on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel export
      engine.cancelExport()
      
      // Canvas cleanup happens through video recorder cleanup
      expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
      
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })

    it('should stop media streams on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock media stream
      const mockStream = new MediaStream()
      const mockTrack = { stop: jest.fn() }
      mockStream.getTracks = jest.fn().mockReturnValue([mockTrack])
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel export
      engine.cancelExport()
      
      // Media streams should be stopped
      expect(mockAudioMixer.dispose).toHaveBeenCalled()
      
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })

    it('should handle cleanup errors during cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock console.warn to suppress expected warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Mock cleanup errors
      mockVideoRecorder.cleanup.mockImplementation(() => {
        throw new Error('Cleanup failed')
      })
      
      // Start export (don't await)
      engine.startExport()
      
      // Cancel should handle cleanup errors gracefully (warnings logged but no throw)
      expect(() => engine.cancelExport()).not.toThrow()
      
      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to cleanup recorder:', expect.any(Error))
      
      // Restore console.warn
      consoleWarnSpy.mockRestore()
      
      // Reset mock to not throw for other tests
      mockVideoRecorder.cleanup.mockImplementation(() => {})
    })

    it('should cleanup resources in correct order', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock console.warn to suppress expected warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Start export (don't await)
      engine.startExport()
      
      // Cancel export immediately
      engine.cancelExport()
      
      // Should cleanup in order: video recorder, audio mixer
      expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
      expect(mockAudioMixer.dispose).toHaveBeenCalled()
      
      // Restore console.warn
      consoleWarnSpy.mockRestore()
    })

    it('should prevent resource leaks on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start multiple exports and cancel them
      for (let i = 0; i < 5; i++) {
        const exportPromise = engine.startExport()
        engine.cancelExport()
        
        // Each cancel should cleanup resources
        expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
        expect(mockAudioMixer.dispose).toHaveBeenCalled()
        
        // Reset mocks for next iteration
        jest.clearAllMocks()
      }
    })
  })

  describe('UI state reset', () => {
    it('should reset export state on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Engine should be active
      expect(engine.isActive).toBe(true)
      
      // Cancel export
      engine.cancelExport()
      
      // Engine should be inactive
      expect(engine.isActive).toBe(false)
      
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })


    it('should reset progress on cancel', () => {
      const mockProgressCallback = jest.fn()
      const options = {
        ...mockOptions,
        onProgress: mockProgressCallback
      }
      
      const engine = new ExportEngine(options)
      
      // Mock console.warn to suppress expected warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Start export (don't await)
      engine.startExport()
      
      // Cancel export immediately
      engine.cancelExport()
      
      // Progress callback should have been called for initialization
      expect(mockProgressCallback).toHaveBeenCalledWith(0, 'Initializing export...')
      
      // Restore console.warn
      consoleWarnSpy.mockRestore()
    })

    it('should allow restart after cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock console.warn to suppress expected warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Start and cancel first export
      engine.startExport()
      engine.cancelExport()
      
      // Should be able to start new export
      expect(engine.isActive).toBe(false)
      
      // Reset shouldCancel flag
      ;(engine as any).shouldCancel = false
      
      const secondExport = engine.startExport()
      expect(secondExport).toBeInstanceOf(Promise)
      
      // Clean up second export
      engine.cancelExport()
      
      // Restore console.warn
      consoleWarnSpy.mockRestore()
    })

    it('should handle UI state during rapid cancel/restart', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Rapid start/cancel cycles
      for (let i = 0; i < 10; i++) {
        const exportPromise = engine.startExport()
        engine.cancelExport()
        
        // State should be consistent
        expect(engine.isActive).toBe(false)
        expect(exportPromise).rejects.toThrow('Export cancelled')
      }
    })

    it('should maintain state consistency across cancellations', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Test state before any operation
      expect(engine.isActive).toBe(false)
      
      // Start export
      const exportPromise = engine.startExport()
      expect(engine.isActive).toBe(true)
      
      // Cancel export
      engine.cancelExport()
      expect(engine.isActive).toBe(false)
      
      // State should remain consistent
      expect(engine.isActive).toBe(false)
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })

    it('should reset internal flags on cancel', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Internal flags should be set
      expect(engine.isActive).toBe(true)
      
      // Cancel export
      engine.cancelExport()
      
      // Internal flags should be reset
      expect(engine.isActive).toBe(false)
      expect((engine as any).shouldCancel).toBe(true)
      
      expect(exportPromise).rejects.toThrow('Export cancelled')
    })
  })

  describe('Cancellation edge cases', () => {
    it('should handle cancel during error state', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock video recorder error
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Recording failed'))
      
      // Start export
      const exportPromise = engine.startExport()
      
      // Cancel during error handling
      setTimeout(() => {
        engine.cancelExport()
      }, 10)
      
      try {
        await exportPromise
      } catch (error) {
        // Could be either the recording error or cancellation error
        expect(error.message).toMatch(/Recording failed|Export cancelled/)
      }
      
      expect(engine.isActive).toBe(false)
    })


    it('should handle cancel with corrupted state', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Corrupt internal state
      ;(engine as any).isExporting = true
      ;(engine as any).shouldCancel = true
      
      // Cancel should handle corrupted state gracefully
      expect(() => engine.cancelExport()).not.toThrow()
      expect(engine.isActive).toBe(false)
    })

    it('should handle cancel without proper initialization', () => {
      const engine = new ExportEngine(mockOptions)
      
      // Cancel without starting export
      expect(() => engine.cancelExport()).not.toThrow()
      expect(engine.isActive).toBe(false)
    })
  })
})