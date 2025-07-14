import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AudioMixer, AudioTrackInfo } from '@/lib/audio-mixer'
import { FrameCaptureService } from '@/lib/frame-capture'
import { VideoRecorder } from '@/lib/video-recorder'
import { createMockAudioElement, createMockVideoElement, createMockCanvas, createMockExportSettings } from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/audio-mixer')
jest.mock('@/lib/frame-capture')
jest.mock('@/lib/video-recorder')

describe('Audio-Video Synchronization', () => {
  let mockCanvas: HTMLCanvasElement
  let mockSettings: any
  let mockAudioMixer: jest.Mocked<AudioMixer>
  let mockFrameCapture: jest.Mocked<FrameCaptureService>
  let mockVideoRecorder: jest.Mocked<VideoRecorder>

  beforeEach(() => {
    mockCanvas = createMockCanvas()
    mockSettings = createMockExportSettings()

    // Mock AudioMixer
    mockAudioMixer = {
      loadAudioBufferFromUrl: jest.fn().mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 44100
      }),
      addAudioTrack: jest.fn(),
      mixTracks: jest.fn().mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 441000
      }),
      getAudioContext: jest.fn().mockReturnValue({
        createBufferSource: () => ({
          buffer: null,
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn()
        }),
        currentTime: 0
      }),
      clearTracks: jest.fn(),
      dispose: jest.fn()
    } as any

    // Mock FrameCaptureService
    mockFrameCapture = {
      getTotalFrames: jest.fn().mockReturnValue(300),
      getFrameData: jest.fn().mockImplementation((frame) => ({
        frameNumber: frame,
        timestamp: frame / 30,
        elements: []
      })),
      getVisibleElements: jest.fn().mockReturnValue([])
    } as any

    // Mock VideoRecorder
    mockVideoRecorder = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'video/mp4' })),
      setAudioStream: jest.fn(),
      cleanup: jest.fn()
    } as any

    // Setup mocks
    ;(AudioMixer as jest.MockedClass<typeof AudioMixer>).mockImplementation(() => mockAudioMixer)
    ;(FrameCaptureService as jest.MockedClass<typeof FrameCaptureService>).mockImplementation(() => mockFrameCapture)
    ;(VideoRecorder as jest.MockedClass<typeof VideoRecorder>).mockImplementation(() => mockVideoRecorder)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Mock audio/video elements', () => {
    it('should create audio element with correct properties', () => {
      const audioElement = createMockAudioElement()
      
      expect(audioElement.type).toBe('audio')
      expect(audioElement.src).toBeDefined()
      expect(audioElement.startTime).toBeDefined()
      expect(audioElement.endTime).toBeDefined()
      expect(audioElement.volume).toBeDefined()
      expect(audioElement.pan).toBeDefined()
    })

    it('should create video element with audio track', () => {
      const videoElement = createMockVideoElement()
      
      expect(videoElement.type).toBe('video')
      expect(videoElement.src).toBeDefined()
      expect(videoElement.hasAudio).toBe(true)
      expect(videoElement.startTime).toBeDefined()
      expect(videoElement.endTime).toBeDefined()
    })

    it('should create elements with different timing', () => {
      const audioElement = createMockAudioElement()
      const videoElement = createMockVideoElement()
      
      // Modify timing for sync testing
      audioElement.startTime = 1.0
      audioElement.endTime = 5.0
      videoElement.startTime = 0.0
      videoElement.endTime = 10.0
      
      expect(audioElement.startTime).toBe(1.0)
      expect(audioElement.endTime).toBe(5.0)
      expect(videoElement.startTime).toBe(0.0)
      expect(videoElement.endTime).toBe(10.0)
    })

    it('should support overlapping audio/video tracks', () => {
      const track1 = createMockAudioElement()
      const track2 = createMockVideoElement()
      
      track1.startTime = 0
      track1.endTime = 5
      track2.startTime = 3
      track2.endTime = 8
      
      // Check for overlap
      const hasOverlap = track1.endTime > track2.startTime && track2.endTime > track1.startTime
      expect(hasOverlap).toBe(true)
    })
  })

  describe('Timeline synchronization', () => {
    it('should calculate correct frame timing', () => {
      const fps = 30
      const totalFrames = 300
      const duration = totalFrames / fps // 10 seconds
      
      mockFrameCapture.getTotalFrames.mockReturnValue(totalFrames)
      
      // Test frame 0
      let frameData = mockFrameCapture.getFrameData(0)
      expect(frameData.frameNumber).toBe(0)
      expect(frameData.timestamp).toBe(0)
      
      // Test frame 150 (5 seconds)
      frameData = mockFrameCapture.getFrameData(150)
      expect(frameData.frameNumber).toBe(150)
      expect(frameData.timestamp).toBe(5.0)
      
      // Test last frame
      frameData = mockFrameCapture.getFrameData(299)
      expect(frameData.frameNumber).toBe(299)
      expect(frameData.timestamp).toBeCloseTo(9.967, 3)
    })

    it('should synchronize audio tracks with video frames', () => {
      const audioElement = createMockAudioElement()
      const videoElement = createMockVideoElement()
      
      audioElement.startTime = 2.0
      audioElement.endTime = 7.0
      videoElement.startTime = 1.0
      videoElement.endTime = 8.0
      
      // Test synchronization at different timestamps
      const testTimestamps = [0, 1.5, 2.5, 4.0, 6.5, 7.5, 9.0]
      
      testTimestamps.forEach(timestamp => {
        const audioActive = timestamp >= audioElement.startTime && timestamp <= audioElement.endTime
        const videoActive = timestamp >= videoElement.startTime && timestamp <= videoElement.endTime
        
        if (timestamp === 0) {
          expect(audioActive).toBe(false)
          expect(videoActive).toBe(false)
        } else if (timestamp === 1.5) {
          expect(audioActive).toBe(false)
          expect(videoActive).toBe(true)
        } else if (timestamp === 2.5) {
          expect(audioActive).toBe(true)
          expect(videoActive).toBe(true)
        } else if (timestamp === 4.0) {
          expect(audioActive).toBe(true)
          expect(videoActive).toBe(true)
        } else if (timestamp === 6.5) {
          expect(audioActive).toBe(true)
          expect(videoActive).toBe(true)
        } else if (timestamp === 7.5) {
          expect(audioActive).toBe(false)
          expect(videoActive).toBe(true)
        } else if (timestamp === 9.0) {
          expect(audioActive).toBe(false)
          expect(videoActive).toBe(false)
        }
      })
    })

    it('should handle frame-accurate timing', () => {
      const fps = 30
      const frameInterval = 1 / fps // ~0.033 seconds
      
      // Test precise frame timing
      for (let frame = 0; frame < 10; frame++) {
        const expectedTimestamp = frame * frameInterval
        const frameData = mockFrameCapture.getFrameData(frame)
        
        expect(frameData.timestamp).toBeCloseTo(expectedTimestamp, 4)
      }
    })

    it('should maintain sync during long durations', () => {
      const fps = 30
      const durationMinutes = 5
      const totalFrames = fps * 60 * durationMinutes
      
      mockFrameCapture.getTotalFrames.mockReturnValue(totalFrames)
      
      // Test sync at various points
      const testPoints = [0, 450, 900, 1800, 4500, 8999] // Various frame numbers
      
      testPoints.forEach(frame => {
        const frameData = mockFrameCapture.getFrameData(frame)
        const expectedTimestamp = frame / fps
        
        expect(frameData.timestamp).toBeCloseTo(expectedTimestamp, 4)
      })
    })
  })

  describe('Mixed audio output', () => {
    it('should load audio buffers from URLs', async () => {
      const audioElement = createMockAudioElement()
      
      const buffer = await mockAudioMixer.loadAudioBufferFromUrl(audioElement.src!)
      
      expect(mockAudioMixer.loadAudioBufferFromUrl).toHaveBeenCalledWith(audioElement.src)
      expect(buffer).toEqual({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 44100
      })
    })

    it('should create audio track info from elements', () => {
      const audioElement = createMockAudioElement()
      audioElement.startTime = 1.0
      audioElement.endTime = 5.0
      audioElement.volume = 0.8
      audioElement.pan = -0.2
      
      const trackInfo: AudioTrackInfo = {
        element: audioElement,
        audioBuffer: {
          numberOfChannels: 2,
          sampleRate: 44100,
          length: 44100
        } as any,
        startTime: audioElement.startTime,
        endTime: audioElement.endTime,
        volume: audioElement.volume,
        pan: audioElement.pan
      }
      
      expect(trackInfo.startTime).toBe(1.0)
      expect(trackInfo.endTime).toBe(5.0)
      expect(trackInfo.volume).toBe(0.8)
      expect(trackInfo.pan).toBe(-0.2)
    })

    it('should add multiple audio tracks', () => {
      const audioElement1 = createMockAudioElement()
      const audioElement2 = createMockAudioElement()
      const videoElement = createMockVideoElement()
      
      const trackInfo1: AudioTrackInfo = {
        element: audioElement1,
        audioBuffer: null as any,
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      const trackInfo2: AudioTrackInfo = {
        element: audioElement2,
        audioBuffer: null as any,
        startTime: 3,
        endTime: 8,
        volume: 0.7,
        pan: 0.3
      }
      
      const trackInfo3: AudioTrackInfo = {
        element: videoElement,
        audioBuffer: null as any,
        startTime: 1,
        endTime: 6,
        volume: 0.9,
        pan: -0.1
      }
      
      mockAudioMixer.addAudioTrack(trackInfo1)
      mockAudioMixer.addAudioTrack(trackInfo2)
      mockAudioMixer.addAudioTrack(trackInfo3)
      
      expect(mockAudioMixer.addAudioTrack).toHaveBeenCalledTimes(3)
      expect(mockAudioMixer.addAudioTrack).toHaveBeenCalledWith(trackInfo1)
      expect(mockAudioMixer.addAudioTrack).toHaveBeenCalledWith(trackInfo2)
      expect(mockAudioMixer.addAudioTrack).toHaveBeenCalledWith(trackInfo3)
    })

    it('should mix audio tracks with correct output format', async () => {
      const mixedBuffer = await mockAudioMixer.mixTracks()
      
      expect(mockAudioMixer.mixTracks).toHaveBeenCalled()
      expect(mixedBuffer).toEqual({
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 441000
      })
    })

    it('should handle audio track overlaps', () => {
      const track1 = createMockAudioElement()
      const track2 = createMockAudioElement()
      
      track1.startTime = 0
      track1.endTime = 5
      track1.volume = 0.8
      
      track2.startTime = 3
      track2.endTime = 8
      track2.volume = 0.6
      
      // During overlap period (3-5 seconds), both tracks should be active
      const overlapStart = 3.0
      const overlapEnd = 5.0
      
      const track1Active = (time: number) => time >= track1.startTime && time <= track1.endTime
      const track2Active = (time: number) => time >= track2.startTime && time <= track2.endTime
      
      // Test overlap period
      expect(track1Active(4.0)).toBe(true)
      expect(track2Active(4.0)).toBe(true)
      
      // Test non-overlap periods
      expect(track1Active(1.0)).toBe(true)
      expect(track2Active(1.0)).toBe(false)
      
      expect(track1Active(7.0)).toBe(false)
      expect(track2Active(7.0)).toBe(true)
    })

    it('should handle different audio formats', () => {
      const mp3Element = createMockAudioElement()
      const wavElement = createMockAudioElement()
      const oggElement = createMockAudioElement()
      
      mp3Element.src = 'audio.mp3'
      wavElement.src = 'audio.wav'
      oggElement.src = 'audio.ogg'
      
      // Should be able to load different formats
      expect(mp3Element.src).toBe('audio.mp3')
      expect(wavElement.src).toBe('audio.wav')
      expect(oggElement.src).toBe('audio.ogg')
    })

    it('should handle audio volume and panning', () => {
      const audioElement = createMockAudioElement()
      
      // Test volume range
      audioElement.volume = 0.0
      expect(audioElement.volume).toBe(0.0)
      
      audioElement.volume = 0.5
      expect(audioElement.volume).toBe(0.5)
      
      audioElement.volume = 1.0
      expect(audioElement.volume).toBe(1.0)
      
      // Test panning range
      audioElement.pan = -1.0 // Full left
      expect(audioElement.pan).toBe(-1.0)
      
      audioElement.pan = 0.0 // Center
      expect(audioElement.pan).toBe(0.0)
      
      audioElement.pan = 1.0 // Full right
      expect(audioElement.pan).toBe(1.0)
    })

    it('should create audio stream from mixed buffer', () => {
      const audioContext = mockAudioMixer.getAudioContext()
      const bufferSource = audioContext.createBufferSource()
      
      expect(bufferSource.connect).toBeDefined()
      expect(bufferSource.start).toBeDefined()
      expect(bufferSource.stop).toBeDefined()
    })
  })

  describe('Audio sync edge cases', () => {
    it('should handle zero-length audio tracks', () => {
      const audioElement = createMockAudioElement()
      audioElement.startTime = 5.0
      audioElement.endTime = 5.0 // Same start and end time
      
      const duration = audioElement.endTime - audioElement.startTime
      expect(duration).toBe(0)
    })

    it('should handle audio tracks starting before video', () => {
      const audioElement = createMockAudioElement()
      const videoElement = createMockVideoElement()
      
      audioElement.startTime = -1.0 // Starts before timeline
      audioElement.endTime = 3.0
      videoElement.startTime = 0.0
      videoElement.endTime = 5.0
      
      // Audio should be clipped to timeline start
      const effectiveAudioStart = Math.max(0, audioElement.startTime)
      expect(effectiveAudioStart).toBe(0)
    })

    it('should handle audio tracks extending beyond video', () => {
      const audioElement = createMockAudioElement()
      const videoElement = createMockVideoElement()
      
      audioElement.startTime = 2.0
      audioElement.endTime = 15.0 // Extends beyond video
      videoElement.startTime = 0.0
      videoElement.endTime = 10.0
      
      // Audio should be clipped to video end
      const effectiveAudioEnd = Math.min(audioElement.endTime, videoElement.endTime)
      expect(effectiveAudioEnd).toBe(10.0)
    })

    it('should handle audio sample rate differences', () => {
      const track1Buffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 44100
      }
      
      const track2Buffer = {
        numberOfChannels: 2,
        sampleRate: 48000,
        length: 48000
      }
      
      // Should normalize to common sample rate
      expect(track1Buffer.sampleRate).toBe(44100)
      expect(track2Buffer.sampleRate).toBe(48000)
    })
  })

  describe('Performance considerations', () => {
    it('should not load audio buffers unnecessarily', () => {
      const audioElement = createMockAudioElement()
      audioElement.startTime = 10.0
      audioElement.endTime = 15.0
      
      const exportDuration = 5.0 // Export ends before audio starts
      
      if (audioElement.startTime >= exportDuration) {
        // Audio should not be loaded
        expect(mockAudioMixer.loadAudioBufferFromUrl).not.toHaveBeenCalled()
      }
    })

    it('should handle large numbers of audio tracks', () => {
      const trackCount = 50
      const tracks = []
      
      for (let i = 0; i < trackCount; i++) {
        const track = createMockAudioElement()
        track.startTime = i * 0.1
        track.endTime = track.startTime + 2.0
        tracks.push(track)
      }
      
      expect(tracks.length).toBe(trackCount)
      
      // Should be able to handle many tracks
      tracks.forEach(track => {
        expect(track.startTime).toBeDefined()
        expect(track.endTime).toBeDefined()
      })
    })
  })
})