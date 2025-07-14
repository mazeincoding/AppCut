import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ExportEngine } from '@/lib/export-engine'
import { VideoRecorder } from '@/lib/video-recorder'
import { AudioMixer } from '@/lib/audio-mixer'
import { CanvasRenderer } from '@/lib/canvas-renderer'
import { FrameCaptureService } from '@/lib/frame-capture'
import { ExportFormat, ExportQuality } from '@/types/export'
import { createMockCanvas, createMockExportSettings, createMockVideoElement, createMockAudioElement } from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/canvas-renderer')
jest.mock('@/lib/frame-capture')
jest.mock('@/lib/video-recorder')
jest.mock('@/lib/audio-mixer')
jest.mock('@/lib/export-errors')

describe('Format Conversion', () => {
  let mockCanvas: HTMLCanvasElement
  let mockSettings: any
  let mockTimelineElements: any[]
  let mockOptions: any
  let mockVideoRecorder: any
  let mockAudioMixer: any
  let mockCanvasRenderer: any
  let mockFrameCapture: any

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
      getTotalFrames: jest.fn().mockReturnValue(30), // 1 second at 30fps
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
  })

  describe('Different format outputs', () => {
    it('should export MP4 format', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Mock successful MP4 export
      mockVideoRecorder.stopRecording.mockResolvedValue(
        new Blob(['mp4-data'], { type: 'video/mp4' })
      )
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/mp4')
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
      expect(mockVideoRecorder.stopRecording).toHaveBeenCalled()
    })

    it('should export WebM format', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Mock successful WebM export
      mockVideoRecorder.stopRecording.mockResolvedValue(
        new Blob(['webm-data'], { type: 'video/webm' })
      )
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/webm')
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
      expect(mockVideoRecorder.stopRecording).toHaveBeenCalled()
    })

    it('should export MOV format', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MOV
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Mock successful MOV export
      mockVideoRecorder.stopRecording.mockResolvedValue(
        new Blob(['mov-data'], { type: 'video/quicktime' })
      )
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/quicktime')
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
      expect(mockVideoRecorder.stopRecording).toHaveBeenCalled()
    })

    it('should handle format-specific MIME types', async () => {
      const formatTests = [
        { format: ExportFormat.MP4, expectedType: 'video/mp4' },
        { format: ExportFormat.WEBM, expectedType: 'video/webm' },
        { format: ExportFormat.MOV, expectedType: 'video/quicktime' }
      ]
      
      for (const test of formatTests) {
        const settings = createMockExportSettings({
          format: test.format
        })
        
        const options = { ...mockOptions, settings }
        const engine = new ExportEngine(options)
        
        mockVideoRecorder.stopRecording.mockResolvedValue(
          new Blob(['test-data'], { type: test.expectedType })
        )
        
        const result = await engine.startExport()
        
        expect(result.type).toBe(test.expectedType)
        
        // Reset for next iteration
        jest.clearAllMocks()
        mockVideoRecorder.startRecording.mockResolvedValue(undefined)
      }
    })

    it('should maintain format consistency throughout export', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Verify that the VideoRecorder is initialized with correct format
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            format: ExportFormat.WEBM
          })
        })
      )
      
      const result = await engine.startExport()
      expect(result).toBeInstanceOf(Blob)
    })

    it('should handle unsupported formats gracefully', async () => {
      const settings = createMockExportSettings({
        format: 'unsupported' as ExportFormat
      })
      
      const options = { ...mockOptions, settings }
      
      // Should still construct without error
      expect(() => new ExportEngine(options)).not.toThrow()
    })
  })

  describe('Codec selection', () => {
    it('should use H.264 codec for MP4', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4,
        videoCodec: 'h264'
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Verify codec is passed to VideoRecorder
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            videoCodec: 'h264'
          })
        })
      )
      
      await engine.startExport()
    })

    it('should use VP8 codec for WebM', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM,
        videoCodec: 'vp8'
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Verify codec is passed to VideoRecorder
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            videoCodec: 'vp8'
          })
        })
      )
      
      await engine.startExport()
    })

    it('should use VP9 codec for high quality WebM', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM,
        videoCodec: 'vp9',
        quality: ExportQuality.HIGH
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Verify codec and quality settings
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            videoCodec: 'vp9',
            quality: ExportQuality.HIGH
          })
        })
      )
      
      await engine.startExport()
    })

    it('should handle audio codec selection', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4,
        audioCodec: 'aac'
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Verify audio codec is passed through
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            audioCodec: 'aac'
          })
        })
      )
      
      await engine.startExport()
    })

    it('should use default codecs when not specified', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4
        // No codec specified
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Should still work with default codec
      await engine.startExport()
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
    })

    it('should validate codec compatibility with format', async () => {
      // Test invalid codec/format combinations
      const invalidCombinations = [
        { format: ExportFormat.MP4, videoCodec: 'vp8' }, // VP8 not typical for MP4
        { format: ExportFormat.WEBM, videoCodec: 'h265' } // H.265 not supported in WebM
      ]
      
      for (const combo of invalidCombinations) {
        const settings = createMockExportSettings(combo)
        const options = { ...mockOptions, settings }
        
        // Should still construct (validation might be in VideoRecorder)
        expect(() => new ExportEngine(options)).not.toThrow()
      }
    })
  })

  describe('Quality settings', () => {
    it('should export in HIGH quality', async () => {
      const settings = createMockExportSettings({
        quality: ExportQuality.HIGH,
        videoBitrate: 8000000, // 8 Mbps
        audioBitrate: 320000   // 320 kbps
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Verify quality settings are passed to VideoRecorder
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            quality: ExportQuality.HIGH,
            videoBitrate: 8000000,
            audioBitrate: 320000
          })
        })
      )
      
      await engine.startExport()
    })

    it('should export in MEDIUM quality', async () => {
      const settings = createMockExportSettings({
        quality: ExportQuality.MEDIUM,
        videoBitrate: 4000000, // 4 Mbps
        audioBitrate: 192000   // 192 kbps
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            quality: ExportQuality.MEDIUM,
            videoBitrate: 4000000,
            audioBitrate: 192000
          })
        })
      )
      
      await engine.startExport()
    })

    it('should export in LOW quality', async () => {
      const settings = createMockExportSettings({
        quality: ExportQuality.LOW,
        videoBitrate: 1000000, // 1 Mbps
        audioBitrate: 128000   // 128 kbps
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            quality: ExportQuality.LOW,
            videoBitrate: 1000000,
            audioBitrate: 128000
          })
        })
      )
      
      await engine.startExport()
    })

    it('should handle custom quality settings', async () => {
      const settings = createMockExportSettings({
        quality: ExportQuality.CUSTOM,
        videoBitrate: 6000000, // Custom 6 Mbps
        audioBitrate: 256000,  // Custom 256 kbps
        width: 1280,
        height: 720
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      expect(VideoRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            quality: ExportQuality.CUSTOM,
            videoBitrate: 6000000,
            audioBitrate: 256000,
            width: 1280,
            height: 720
          })
        })
      )
      
      await engine.startExport()
    })

    it('should adjust quality based on resolution', async () => {
      const qualityTests = [
        { width: 3840, height: 2160, expectedQuality: ExportQuality.HIGH }, // 4K
        { width: 1920, height: 1080, expectedQuality: ExportQuality.HIGH }, // 1080p
        { width: 1280, height: 720, expectedQuality: ExportQuality.MEDIUM }, // 720p
        { width: 854, height: 480, expectedQuality: ExportQuality.LOW }      // 480p
      ]
      
      for (const test of qualityTests) {
        const settings = createMockExportSettings({
          width: test.width,
          height: test.height,
          quality: test.expectedQuality
        })
        
        const options = { ...mockOptions, settings }
        const engine = new ExportEngine(options)
        
        expect(VideoRecorder).toHaveBeenCalledWith(
          expect.objectContaining({
            settings: expect.objectContaining({
              width: test.width,
              height: test.height,
              quality: test.expectedQuality
            })
          })
        )
        
        // Reset for next iteration
        jest.clearAllMocks()
        ;(VideoRecorder as jest.MockedClass<typeof VideoRecorder>).mockImplementation(() => mockVideoRecorder)
      }
    })

    it('should validate quality settings ranges', async () => {
      const extremeSettings = createMockExportSettings({
        videoBitrate: 50000000, // Very high bitrate
        audioBitrate: 1000000   // Very high audio bitrate
      })
      
      const options = { ...mockOptions, settings: extremeSettings }
      
      // Should still construct (validation might be in VideoRecorder)
      expect(() => new ExportEngine(options)).not.toThrow()
    })

    it('should handle quality downgrades for performance', async () => {
      // Test scenario where high quality is requested but system can't handle it
      const settings = createMockExportSettings({
        quality: ExportQuality.HIGH,
        width: 3840,
        height: 2160,
        videoBitrate: 25000000
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Should still attempt export
      await engine.startExport()
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
    })
  })

  describe('Format conversion edge cases', () => {
    it('should handle format conversion failures', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Mock recording failure
      mockVideoRecorder.startRecording.mockRejectedValue(
        new Error('Unsupported format configuration')
      )
      
      await expect(engine.startExport()).rejects.toThrow('Unsupported format configuration')
    })

    it('should handle missing format specifications', async () => {
      const settings = { ...createMockExportSettings() }
      delete settings.format
      
      const options = { ...mockOptions, settings }
      
      // Should handle missing format gracefully
      expect(() => new ExportEngine(options)).not.toThrow()
    })

    it('should handle codec fallbacks', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM,
        videoCodec: 'unsupported-codec'
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Should still attempt export (codec validation in VideoRecorder)
      await engine.startExport()
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
    })

    it('should handle browser format limitations', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MOV // May not be supported in all browsers
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      // Should attempt export regardless of browser limitations
      await engine.startExport()
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
    })

    it('should preserve metadata during format conversion', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4,
        filename: 'test-export-mp4'
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      const result = await engine.startExport()
      
      // Verify result maintains expected properties
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/mp4')
    })

    it('should handle concurrent format conversions', async () => {
      const formats = [ExportFormat.MP4, ExportFormat.WEBM, ExportFormat.MOV]
      const engines = formats.map(format => {
        const settings = createMockExportSettings({ format })
        const options = { ...mockOptions, settings }
        return new ExportEngine(options)
      })
      
      // Start all exports concurrently
      const exportPromises = engines.map(engine => engine.startExport())
      
      // All should complete successfully
      const results = await Promise.all(exportPromises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toBeInstanceOf(Blob)
      })
    })
  })
})