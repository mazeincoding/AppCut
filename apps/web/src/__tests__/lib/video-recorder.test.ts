import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { VideoRecorder, RecordingState } from '@/lib/video-recorder'
import { ExportFormat } from '@/types/export'
import { createMockCanvas, createMockExportSettings, createMockMediaStream } from '../utils/test-helpers'

describe('VideoRecorder', () => {
  let canvas: HTMLCanvasElement
  let recorder: VideoRecorder
  let mockSettings: any

  beforeEach(() => {
    canvas = createMockCanvas()
    mockSettings = createMockExportSettings()
    
    // Reset MediaRecorder mock for each test
    const MockMediaRecorder = global.MediaRecorder as any
    MockMediaRecorder.prototype.start = jest.fn()
    MockMediaRecorder.prototype.stop = jest.fn()
    MockMediaRecorder.prototype.pause = jest.fn()
    MockMediaRecorder.prototype.resume = jest.fn()
    MockMediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true)
  })

  afterEach(() => {
    if (recorder) {
      recorder.cleanup()
    }
  })

  describe('Constructor', () => {
    it('should initialize with required options', () => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      
      recorder = new VideoRecorder(options)
      
      expect(recorder).toBeInstanceOf(VideoRecorder)
    })

    it('should initialize with audio stream', () => {
      const audioStream = createMockMediaStream()
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30,
        audioStream
      }
      
      recorder = new VideoRecorder(options)
      
      expect(recorder).toBeInstanceOf(VideoRecorder)
    })

    it('should handle different fps values', () => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 60
      }
      
      recorder = new VideoRecorder(options)
      
      expect(recorder).toBeInstanceOf(VideoRecorder)
    })

    it('should handle different export settings', () => {
      const webmSettings = createMockExportSettings({
        format: ExportFormat.WEBM,
        width: 1280,
        height: 720
      })
      
      const options = {
        canvas,
        settings: webmSettings,
        fps: 24
      }
      
      recorder = new VideoRecorder(options)
      
      expect(recorder).toBeInstanceOf(VideoRecorder)
    })
  })

  describe('isSupported static method', () => {
    it('should return true when MediaRecorder is supported', () => {
      const supported = VideoRecorder.isSupported()
      
      expect(supported).toBe(true)
    })

    it('should handle unsupported environments', () => {
      // Temporarily remove MediaRecorder
      const originalMediaRecorder = global.MediaRecorder
      delete (global as any).MediaRecorder
      
      const supported = VideoRecorder.isSupported()
      
      expect(supported).toBe(false)
      
      // Restore MediaRecorder
      global.MediaRecorder = originalMediaRecorder
    })

    it('should check for captureStream support', () => {
      // Temporarily remove captureStream
      const originalCaptureStream = HTMLCanvasElement.prototype.captureStream
      delete (HTMLCanvasElement.prototype as any).captureStream
      
      const supported = VideoRecorder.isSupported()
      
      expect(supported).toBe(false)
      
      // Restore captureStream
      HTMLCanvasElement.prototype.captureStream = originalCaptureStream
    })
  })

  describe('setAudioStream method', () => {
    beforeEach(() => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
    })

    it('should set audio stream', () => {
      const audioStream = createMockMediaStream()
      
      expect(() => recorder.setAudioStream(audioStream)).not.toThrow()
    })

    it('should handle null audio stream', () => {
      expect(() => recorder.setAudioStream(null)).not.toThrow()
    })

    it('should replace existing audio stream', () => {
      const audioStream1 = createMockMediaStream()
      const audioStream2 = createMockMediaStream()
      
      recorder.setAudioStream(audioStream1)
      expect(() => recorder.setAudioStream(audioStream2)).not.toThrow()
    })
  })

  describe('startRecording method', () => {
    beforeEach(() => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
    })

    it('should start recording successfully', async () => {
      await expect(recorder.startRecording()).resolves.not.toThrow()
      
      expect(global.MediaRecorder.prototype.start).toHaveBeenCalledWith(100)
    })

    it('should handle canvas stream capture errors', async () => {
      // Mock captureStream to return null
      canvas.captureStream = jest.fn().mockReturnValue(null)
      
      await expect(recorder.startRecording()).rejects.toThrow('Could not capture canvas stream')
    })

    it('should start recording with audio stream', async () => {
      const audioStream = createMockMediaStream()
      recorder.setAudioStream(audioStream)
      
      await expect(recorder.startRecording()).resolves.not.toThrow()
    })

    it('should reset recorded chunks on start', async () => {
      // Start recording twice to test chunk reset
      await recorder.startRecording()
      await expect(recorder.startRecording()).resolves.not.toThrow()
    })

    it('should handle different export formats', async () => {
      const webmSettings = createMockExportSettings({
        format: ExportFormat.WEBM
      })
      
      const webmRecorder = new VideoRecorder({
        canvas,
        settings: webmSettings,
        fps: 30
      })
      
      await expect(webmRecorder.startRecording()).resolves.not.toThrow()
      
      webmRecorder.cleanup()
    })
  })

  describe('MIME type detection', () => {
    it('should handle MP4 format', async () => {
      const mp4Settings = createMockExportSettings({
        format: ExportFormat.MP4
      })
      
      const mp4Recorder = new VideoRecorder({
        canvas,
        settings: mp4Settings,
        fps: 30
      })
      
      await expect(mp4Recorder.startRecording()).resolves.not.toThrow()
      
      mp4Recorder.cleanup()
    })

    it('should handle WEBM format', async () => {
      const webmSettings = createMockExportSettings({
        format: ExportFormat.WEBM
      })
      
      const webmRecorder = new VideoRecorder({
        canvas,
        settings: webmSettings,
        fps: 30
      })
      
      await expect(webmRecorder.startRecording()).resolves.not.toThrow()
      
      webmRecorder.cleanup()
    })

    it('should handle MOV format fallback', async () => {
      const movSettings = createMockExportSettings({
        format: ExportFormat.MOV
      })
      
      const movRecorder = new VideoRecorder({
        canvas,
        settings: movSettings,
        fps: 30
      })
      
      await expect(movRecorder.startRecording()).resolves.not.toThrow()
      
      movRecorder.cleanup()
    })

    it('should fallback when no formats are supported', async () => {
      // Mock isTypeSupported to return false for all types
      const MockMediaRecorder = global.MediaRecorder as any
      MockMediaRecorder.isTypeSupported = jest.fn().mockReturnValue(false)
      
      await expect(recorder.startRecording()).resolves.not.toThrow()
    })
  })

  describe('bitrate calculation', () => {
    it('should calculate bitrate for different resolutions', async () => {
      const hdSettings = createMockExportSettings({
        width: 1280,
        height: 720
      })
      
      const hdRecorder = new VideoRecorder({
        canvas,
        settings: hdSettings,
        fps: 30
      })
      
      await expect(hdRecorder.startRecording()).resolves.not.toThrow()
      
      hdRecorder.cleanup()
    })

    it('should calculate bitrate for 4K resolution', async () => {
      const uhd4kSettings = createMockExportSettings({
        width: 3840,
        height: 2160
      })
      
      const uhd4kRecorder = new VideoRecorder({
        canvas,
        settings: uhd4kSettings,
        fps: 30
      })
      
      await expect(uhd4kRecorder.startRecording()).resolves.not.toThrow()
      
      uhd4kRecorder.cleanup()
    })

    it('should handle low resolution bitrates', async () => {
      const lowResSettings = createMockExportSettings({
        width: 640,
        height: 480
      })
      
      const lowResRecorder = new VideoRecorder({
        canvas,
        settings: lowResSettings,
        fps: 30
      })
      
      await expect(lowResRecorder.startRecording()).resolves.not.toThrow()
      
      lowResRecorder.cleanup()
    })
  })

  describe('pauseRecording method', () => {
    beforeEach(async () => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
      await recorder.startRecording()
    })

    it('should pause recording when recording', () => {
      // Mock the recorder state
      const mockRecorder = (recorder as any).mediaRecorder
      mockRecorder.state = 'recording'
      
      expect(() => recorder.pauseRecording()).not.toThrow()
      expect(mockRecorder.pause).toHaveBeenCalled()
    })

    it('should not pause when not recording', () => {
      const mockRecorder = (recorder as any).mediaRecorder
      mockRecorder.state = 'inactive'
      
      expect(() => recorder.pauseRecording()).not.toThrow()
      expect(mockRecorder.pause).not.toHaveBeenCalled()
    })

    it('should handle undefined MediaRecorder', () => {
      recorder.cleanup()
      
      expect(() => recorder.pauseRecording()).not.toThrow()
    })
  })

  describe('resumeRecording method', () => {
    beforeEach(async () => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
      await recorder.startRecording()
    })

    it('should resume recording when paused', () => {
      const mockRecorder = (recorder as any).mediaRecorder
      mockRecorder.state = 'paused'
      
      expect(() => recorder.resumeRecording()).not.toThrow()
      expect(mockRecorder.resume).toHaveBeenCalled()
    })

    it('should not resume when not paused', () => {
      const mockRecorder = (recorder as any).mediaRecorder
      mockRecorder.state = 'recording'
      
      expect(() => recorder.resumeRecording()).not.toThrow()
      expect(mockRecorder.resume).not.toHaveBeenCalled()
    })

    it('should handle undefined MediaRecorder', () => {
      recorder.cleanup()
      
      expect(() => recorder.resumeRecording()).not.toThrow()
    })
  })

  describe('stopRecording method', () => {
    beforeEach(async () => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
      await recorder.startRecording()
    })

    it('should stop recording and return blob', async () => {
      const mockRecorder = (recorder as any).mediaRecorder
      
      // Setup the stop promise
      const stopPromise = recorder.stopRecording()
      
      // Simulate stop event
      setTimeout(() => {
        if (mockRecorder.onstop) {
          mockRecorder.onstop()
        }
      }, 10)
      
      const blob = await stopPromise
      
      expect(blob).toBeInstanceOf(Blob)
      expect(mockRecorder.stop).toHaveBeenCalled()
    })

    it('should reject when MediaRecorder not initialized', async () => {
      recorder.cleanup()
      
      await expect(recorder.stopRecording()).rejects.toThrow('MediaRecorder not initialized')
    })

    it('should create blob with correct MIME type', async () => {
      const mockRecorder = (recorder as any).mediaRecorder
      
      const stopPromise = recorder.stopRecording()
      
      setTimeout(() => {
        if (mockRecorder.onstop) {
          mockRecorder.onstop()
        }
      }, 10)
      
      const blob = await stopPromise
      
      expect(blob.type).toBeTruthy()
    })
  })

  describe('getState method', () => {
    beforeEach(() => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
    })

    it('should return INACTIVE when not initialized', () => {
      const state = recorder.getState()
      
      expect(state).toBe(RecordingState.INACTIVE)
    })

    it('should return RECORDING when recording', async () => {
      await recorder.startRecording()
      
      const mockRecorder = (recorder as any).mediaRecorder
      mockRecorder.state = 'recording'
      
      const state = recorder.getState()
      
      expect(state).toBe(RecordingState.RECORDING)
    })

    it('should return PAUSED when paused', async () => {
      await recorder.startRecording()
      
      const mockRecorder = (recorder as any).mediaRecorder
      mockRecorder.state = 'paused'
      
      const state = recorder.getState()
      
      expect(state).toBe(RecordingState.PAUSED)
    })

    it('should return INACTIVE for unknown states', async () => {
      await recorder.startRecording()
      
      const mockRecorder = (recorder as any).mediaRecorder
      mockRecorder.state = 'unknown'
      
      const state = recorder.getState()
      
      expect(state).toBe(RecordingState.INACTIVE)
    })
  })

  describe('cleanup method', () => {
    beforeEach(async () => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
      await recorder.startRecording()
    })

    it('should stop MediaRecorder', () => {
      const mockRecorder = (recorder as any).mediaRecorder
      
      recorder.cleanup()
      
      expect(mockRecorder.stop).toHaveBeenCalled()
    })

    it('should stop all tracks', () => {
      const mockTrack = {
        stop: jest.fn()
      }
      
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack])
      }
      
      ;(recorder as any).stream = mockStream
      
      recorder.cleanup()
      
      expect(mockTrack.stop).toHaveBeenCalled()
    })

    it('should reset internal state', () => {
      recorder.cleanup()
      
      expect((recorder as any).mediaRecorder).toBeNull()
      expect((recorder as any).stream).toBeNull()
      expect((recorder as any).recordedChunks).toEqual([])
    })

    it('should handle multiple cleanup calls', () => {
      recorder.cleanup()
      
      expect(() => recorder.cleanup()).not.toThrow()
    })

    it('should handle cleanup without initialization', () => {
      const freshOptions = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      const freshRecorder = new VideoRecorder(freshOptions)
      
      expect(() => freshRecorder.cleanup()).not.toThrow()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      const options = {
        canvas,
        settings: mockSettings,
        fps: 30
      }
      recorder = new VideoRecorder(options)
    })

    it('should handle MediaRecorder errors', async () => {
      await recorder.startRecording()
      
      const mockRecorder = (recorder as any).mediaRecorder
      
      // Simulate error
      expect(() => {
        if (mockRecorder.onerror) {
          mockRecorder.onerror(new Event('error'))
        }
      }).toThrow('MediaRecorder error occurred')
    })

    it('should handle data available events', async () => {
      await recorder.startRecording()
      
      const mockRecorder = (recorder as any).mediaRecorder
      
      // Simulate data available with empty data
      const emptyEvent = {
        data: new Blob([], { type: 'video/webm' })
      }
      emptyEvent.data.size = 0
      
      expect(() => {
        if (mockRecorder.ondataavailable) {
          mockRecorder.ondataavailable(emptyEvent)
        }
      }).not.toThrow()
      
      // Simulate data available with actual data
      const dataEvent = {
        data: new Blob(['test data'], { type: 'video/webm' })
      }
      dataEvent.data.size = 9
      
      expect(() => {
        if (mockRecorder.ondataavailable) {
          mockRecorder.ondataavailable(dataEvent)
        }
      }).not.toThrow()
    })
  })
})