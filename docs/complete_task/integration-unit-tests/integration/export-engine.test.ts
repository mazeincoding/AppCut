import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ExportEngine } from '@/lib/export-engine'
import { createMockExportSettings, createMockCanvas, createMockVideoElement, createMockAudioElement, createMockTextElement } from '../utils/test-helpers'

// Mock all the dependencies
jest.mock('@/lib/canvas-renderer')
jest.mock('@/lib/frame-capture')
jest.mock('@/lib/video-recorder')
jest.mock('@/lib/audio-mixer')
jest.mock('@/lib/export-errors')

// Mock globals
global.MediaStream = jest.fn().mockImplementation(() => ({
  id: 'mock-stream',
  active: true,
  getTracks: jest.fn().mockReturnValue([])
}))

global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
  setTimeout(cb, 16)
  return 1
})

describe('Export Engine Integration', () => {
  let canvas: HTMLCanvasElement
  let mockSettings: any
  let mockTimelineElements: any[]
  let mockOptions: any

  beforeEach(() => {
    canvas = createMockCanvas()
    mockSettings = createMockExportSettings()
    mockTimelineElements = [
      createMockVideoElement(),
      createMockAudioElement(),
      createMockTextElement()
    ]
    
    mockOptions = {
      canvas,
      settings: mockSettings,
      timelineElements: mockTimelineElements,
      duration: 10,
      fps: 30,
      onProgress: jest.fn(),
      onError: jest.fn()
    }

    // Mock browser compatibility
    const { checkBrowserCompatibility, estimateMemoryUsage } = require('@/lib/export-errors')
    checkBrowserCompatibility.mockReturnValue({ supported: true, issues: [] })
    estimateMemoryUsage.mockReturnValue({ estimatedMB: 500, warning: null })

    // Mock video recorder
    const { VideoRecorder } = require('@/lib/video-recorder')
    VideoRecorder.mockImplementation(() => ({
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'video/mp4' })),
      setAudioStream: jest.fn(),
      cleanup: jest.fn()
    }))

    // Mock audio mixer
    const { AudioMixer } = require('@/lib/audio-mixer')
    AudioMixer.mockImplementation(() => ({
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
          start: jest.fn()
        }),
        createMediaStreamDestination: () => ({
          stream: new global.MediaStream()
        })
      }),
      dispose: jest.fn()
    }))

    // Mock frame capture
    const { FrameCaptureService } = require('@/lib/frame-capture')
    FrameCaptureService.mockImplementation(() => ({
      getTotalFrames: jest.fn().mockReturnValue(300),
      getFrameData: jest.fn().mockImplementation((frame) => ({
        frameNumber: frame,
        timestamp: frame / 30,
        elements: []
      })),
      getVisibleElements: jest.fn().mockReturnValue([])
    }))

    // Mock canvas renderer
    const { CanvasRenderer } = require('@/lib/canvas-renderer')
    CanvasRenderer.mockImplementation(() => ({
      clearFrame: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      drawText: jest.fn()
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Full export pipeline', () => {
    it('should initialize export engine with all dependencies', () => {
      const engine = new ExportEngine(mockOptions)
      
      expect(engine).toBeInstanceOf(ExportEngine)
      expect(engine.isActive).toBe(false)
    })

    it('should perform complete export workflow', async () => {
      const mockProgressCallback = jest.fn()
      const mockErrorCallback = jest.fn()
      
      const options = {
        ...mockOptions,
        onProgress: mockProgressCallback,
        onError: mockErrorCallback
      }
      
      const engine = new ExportEngine(options)
      
      // Make the frame capture service return only 3 frames for quick test
      const { FrameCaptureService } = require('@/lib/frame-capture')
      FrameCaptureService.mockImplementation(() => ({
        getTotalFrames: jest.fn().mockReturnValue(3),
        getFrameData: jest.fn().mockImplementation((frame) => ({
          frameNumber: frame,
          timestamp: frame / 30,
          elements: []
        })),
        getVisibleElements: jest.fn().mockReturnValue([])
      }))
      
      // Mock frame completion behavior - complete after 3 frames
      let frameCount = 0
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        frameCount++
        if (frameCount <= 3) {
          setTimeout(cb, 1)
        }
        return 1
      })
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(mockProgressCallback).toHaveBeenCalled()
      expect(mockErrorCallback).not.toHaveBeenCalled()
    }, 10000)

    it('should handle export cancellation', () => {
      const engine = new ExportEngine(mockOptions)
      
      expect(() => engine.cancelExport()).not.toThrow()
      expect(engine.isActive).toBe(false)
    })

    it('should prevent multiple simultaneous exports', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Make the first export hang by never completing the animation frame
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        // Don't call cb immediately to keep export hanging
        return 1
      })
      
      // Start one export first
      const firstExportPromise = engine.startExport()
      
      // Try to start another export immediately
      await expect(engine.startExport()).rejects.toThrow('Export already in progress')
      
      // Cancel the first export to clean up
      engine.cancelExport()
      
      // Wait for the first export to complete/fail
      try {
        await firstExportPromise
      } catch (error) {
        // Expected to fail due to cancellation
      }
    })
  })

  describe('Component interactions', () => {
    it('should initialize all required components', () => {
      const engine = new ExportEngine(mockOptions)
      
      const CanvasRenderer = require('@/lib/canvas-renderer').CanvasRenderer
      const FrameCaptureService = require('@/lib/frame-capture').FrameCaptureService
      const VideoRecorder = require('@/lib/video-recorder').VideoRecorder
      const AudioMixer = require('@/lib/audio-mixer').AudioMixer
      
      expect(CanvasRenderer).toHaveBeenCalledWith(canvas, mockSettings)
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: mockSettings.width,
          height: mockSettings.height
        }),
        mockSettings
      )
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          canvas,
          settings: mockSettings,
          fps: 30
        })
      )
      expect(AudioMixer).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleRate: 44100,
          channels: 2,
          duration: 10
        })
      )
    })

    it('should coordinate between canvas renderer and frame capture', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const mockRenderer = require('@/lib/canvas-renderer').CanvasRenderer.prototype
      const mockCapture = require('@/lib/frame-capture').FrameCaptureService.prototype
      
      mockCapture.getTotalFrames.mockReturnValue(3)
      mockCapture.getFrameData.mockImplementation((frame) => ({
        frameNumber: frame,
        timestamp: frame / 30,
        elements: []
      }))
      mockCapture.getVisibleElements.mockReturnValue([])
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      mockVideoRecorder.stopRecording.mockResolvedValue(new Blob(['test'], { type: 'video/mp4' }))
      
      // Mock frame rendering completion
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        setTimeout(() => {
          // Simulate rapid frame completion
          for (let i = 0; i < 5; i++) {
            try { cb() } catch (e) { /* ignore */ }
          }
        }, 10)
        return 1
      })
      
      await engine.startExport()
      
      expect(mockRenderer.clearFrame).toHaveBeenCalled()
      expect(mockCapture.getFrameData).toHaveBeenCalled()
      expect(mockCapture.getVisibleElements).toHaveBeenCalled()
    })

    it('should handle audio-video coordination', async () => {
      const audioElement = createMockAudioElement()
      const videoElement = createMockVideoElement()
      videoElement.hasAudio = true
      
      const optionsWithAudio = {
        ...mockOptions,
        timelineElements: [audioElement, videoElement]
      }
      
      const engine = new ExportEngine(optionsWithAudio)
      
      const mockAudioMixer = require('@/lib/audio-mixer').AudioMixer.prototype
      mockAudioMixer.loadAudioBufferFromUrl.mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 44100
      })
      mockAudioMixer.mixTracks.mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 441000
      })
      
      const audioSources = engine.getAudioSources()
      
      expect(audioSources).toHaveLength(2)
      expect(audioSources[0].elementId).toBe(audioElement.id)
      expect(audioSources[1].elementId).toBe(videoElement.id)
    })

    it('should coordinate video recorder with canvas stream', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.setAudioStream = jest.fn()
      mockVideoRecorder.startRecording = jest.fn().mockResolvedValue(undefined)
      mockVideoRecorder.stopRecording = jest.fn().mockResolvedValue(new Blob(['test'], { type: 'video/mp4' }))
      
      const mockAudioMixer = require('@/lib/audio-mixer').AudioMixer.prototype
      mockAudioMixer.getAudioContext = jest.fn().mockReturnValue({
        createBufferSource: () => ({
          buffer: null,
          connect: jest.fn(),
          start: jest.fn()
        }),
        createMediaStreamDestination: () => ({
          stream: new global.MediaStream()
        })
      })
      mockAudioMixer.mixTracks = jest.fn().mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 441000
      })
      
      const mockFrameCapture = require('@/lib/frame-capture').FrameCaptureService.prototype
      mockFrameCapture.getTotalFrames.mockReturnValue(1)
      mockFrameCapture.getFrameData.mockReturnValue({
        frameNumber: 0,
        timestamp: 0,
        elements: []
      })
      mockFrameCapture.getVisibleElements.mockReturnValue([])
      
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        setTimeout(cb, 10)
        return 1
      })
      
      await engine.startExport()
      
      expect(mockVideoRecorder.setAudioStream).toHaveBeenCalled()
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
      expect(mockVideoRecorder.stopRecording).toHaveBeenCalled()
    })
  })

  describe('Error propagation', () => {
    it('should handle pre-flight check failures', async () => {
      const { checkBrowserCompatibility } = require('@/lib/export-errors')
      checkBrowserCompatibility.mockReturnValue({
        supported: false,
        issues: ['MediaRecorder not supported']
      })
      
      const engine = new ExportEngine(mockOptions)
      
      await expect(engine.startExport()).rejects.toThrow('Browser not compatible')
    })

    it('should handle memory estimation warnings', async () => {
      const { estimateMemoryUsage } = require('@/lib/export-errors')
      estimateMemoryUsage.mockReturnValue({
        estimatedMB: 4000,
        warning: 'Very high memory usage'
      })
      
      const engine = new ExportEngine(mockOptions)
      
      await expect(engine.startExport()).rejects.toThrow('exceed available memory')
    })

    it('should handle canvas rendering errors', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const mockRenderer = require('@/lib/canvas-renderer').CanvasRenderer.prototype
      mockRenderer.clearFrame.mockImplementation(() => {
        throw new Error('Canvas rendering failed')
      })
      
      const mockFrameCapture = require('@/lib/frame-capture').FrameCaptureService.prototype
      mockFrameCapture.getTotalFrames.mockReturnValue(1)
      mockFrameCapture.getFrameData.mockReturnValue({
        frameNumber: 0,
        timestamp: 0,
        elements: []
      })
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        setTimeout(cb, 10)
        return 1
      })
      
      await expect(engine.startExport()).rejects.toThrow()
    })

    it('should handle video recorder errors', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('MediaRecorder failed'))
      
      await expect(engine.startExport()).rejects.toThrow('MediaRecorder failed')
    })

    it('should handle audio mixer errors', async () => {
      const audioElement = createMockAudioElement()
      const optionsWithAudio = {
        ...mockOptions,
        timelineElements: [audioElement]
      }
      
      const engine = new ExportEngine(optionsWithAudio)
      
      const mockAudioMixer = require('@/lib/audio-mixer').AudioMixer.prototype
      mockAudioMixer.loadAudioBufferFromUrl.mockRejectedValue(new Error('Failed to load audio'))
      
      // Should not throw but should log warning
      await expect(engine.startExport()).resolves.toBeDefined()
    })

    it('should call error callback on failures', async () => {
      const mockErrorCallback = jest.fn()
      const optionsWithError = {
        ...mockOptions,
        onError: mockErrorCallback
      }
      
      const engine = new ExportEngine(optionsWithError)
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Test error'))
      
      await expect(engine.startExport()).rejects.toThrow()
      expect(mockErrorCallback).toHaveBeenCalled()
    })

    it('should clean up resources on error', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Test error'))
      mockVideoRecorder.cleanup = jest.fn()
      
      const mockAudioMixer = require('@/lib/audio-mixer').AudioMixer.prototype
      mockAudioMixer.dispose = jest.fn()
      
      await expect(engine.startExport()).rejects.toThrow()
      
      expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
      expect(mockAudioMixer.dispose).toHaveBeenCalled()
    })
  })

  describe('Progress tracking', () => {
    it('should report progress during export', async () => {
      const mockProgressCallback = jest.fn()
      const optionsWithProgress = {
        ...mockOptions,
        onProgress: mockProgressCallback
      }
      
      const engine = new ExportEngine(optionsWithProgress)
      
      const mockFrameCapture = require('@/lib/frame-capture').FrameCaptureService.prototype
      mockFrameCapture.getTotalFrames.mockReturnValue(10)
      mockFrameCapture.getFrameData.mockImplementation((frame) => ({
        frameNumber: frame,
        timestamp: frame / 30,
        elements: []
      }))
      mockFrameCapture.getVisibleElements.mockReturnValue([])
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      mockVideoRecorder.stopRecording.mockResolvedValue(new Blob(['test'], { type: 'video/mp4' }))
      
      let frameCount = 0
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        setTimeout(() => {
          frameCount++
          if (frameCount <= 12) { // Ensure we complete all frames
            cb()
          }
        }, 5)
        return 1
      })
      
      await engine.startExport()
      
      expect(mockProgressCallback).toHaveBeenCalledWith(0, 'Initializing export...')
      expect(mockProgressCallback).toHaveBeenCalledWith(100, 'Export complete!')
    })

    it('should track frame rendering progress', async () => {
      const mockProgressCallback = jest.fn()
      const optionsWithProgress = {
        ...mockOptions,
        onProgress: mockProgressCallback
      }
      
      const engine = new ExportEngine(optionsWithProgress)
      
      const mockFrameCapture = require('@/lib/frame-capture').FrameCaptureService.prototype
      mockFrameCapture.getTotalFrames.mockReturnValue(4)
      mockFrameCapture.getFrameData.mockImplementation((frame) => ({
        frameNumber: frame,
        timestamp: frame / 30,
        elements: []
      }))
      mockFrameCapture.getVisibleElements.mockReturnValue([])
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      mockVideoRecorder.stopRecording.mockResolvedValue(new Blob(['test'], { type: 'video/mp4' }))
      
      let frameCount = 0
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        setTimeout(() => {
          frameCount++
          if (frameCount <= 6) {
            cb()
          }
        }, 5)
        return 1
      })
      
      await engine.startExport()
      
      // Should report frame rendering progress
      const progressCalls = mockProgressCallback.mock.calls
      const frameProgressCalls = progressCalls.filter(call => 
        call[1] && call[1].includes('Rendering frame')
      )
      
      expect(frameProgressCalls.length).toBeGreaterThan(0)
    })
  })

  describe('Resource management', () => {
    it('should clean up resources after successful export', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      mockVideoRecorder.stopRecording.mockResolvedValue(new Blob(['test'], { type: 'video/mp4' }))
      mockVideoRecorder.cleanup = jest.fn()
      
      const mockAudioMixer = require('@/lib/audio-mixer').AudioMixer.prototype
      mockAudioMixer.dispose = jest.fn()
      
      const mockFrameCapture = require('@/lib/frame-capture').FrameCaptureService.prototype
      mockFrameCapture.getTotalFrames.mockReturnValue(1)
      mockFrameCapture.getFrameData.mockReturnValue({
        frameNumber: 0,
        timestamp: 0,
        elements: []
      })
      mockFrameCapture.getVisibleElements.mockReturnValue([])
      
      global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
        setTimeout(cb, 10)
        return 1
      })
      
      await engine.startExport()
      
      expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
      expect(mockAudioMixer.dispose).toHaveBeenCalled()
      expect(engine.isActive).toBe(false)
    })

    it('should handle cleanup errors gracefully', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const mockVideoRecorder = require('@/lib/video-recorder').VideoRecorder.prototype
      mockVideoRecorder.cleanup = jest.fn().mockImplementation(() => {
        throw new Error('Cleanup failed')
      })
      
      const mockAudioMixer = require('@/lib/audio-mixer').AudioMixer.prototype
      mockAudioMixer.dispose = jest.fn().mockImplementation(() => {
        throw new Error('Dispose failed')
      })
      
      // Should not throw during cleanup
      expect(() => {
        ;(engine as any).cleanupResources()
      }).not.toThrow()
    })
  })
})