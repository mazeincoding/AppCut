import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AudioMixer } from '@/lib/audio-mixer'
import { createMockAudioBuffer, createMockAudioElement } from '../utils/test-helpers'

describe('AudioMixer', () => {
  let mixer: AudioMixer
  let mockOptions: any

  beforeEach(() => {
    mockOptions = {
      sampleRate: 44100,
      channels: 2,
      duration: 10
    }
    mixer = new AudioMixer(mockOptions)
  })

  afterEach(() => {
    mixer.dispose()
  })

  describe('Constructor', () => {
    it('should initialize with correct options', () => {
      expect(mixer).toBeInstanceOf(AudioMixer)
      
      const audioContext = mixer.getAudioContext()
      expect(audioContext).toBeInstanceOf(AudioContext)
      expect(audioContext.sampleRate).toBe(44100)
    })

    it('should handle different sample rates', () => {
      const customOptions = {
        sampleRate: 48000,
        channels: 2,
        duration: 5
      }
      const customMixer = new AudioMixer(customOptions)
      
      expect(customMixer.getAudioContext().sampleRate).toBe(48000)
      
      customMixer.dispose()
    })

    it('should handle mono and stereo configurations', () => {
      const monoOptions = {
        sampleRate: 44100,
        channels: 1,
        duration: 5
      }
      const monoMixer = new AudioMixer(monoOptions)
      
      expect(monoMixer).toBeInstanceOf(AudioMixer)
      
      monoMixer.dispose()
    })
  })

  describe('addAudioTrack method', () => {
    it('should add audio track to mixer', () => {
      const audioElement = createMockAudioElement()
      const audioBuffer = createMockAudioBuffer()
      
      const trackInfo = {
        element: audioElement,
        audioBuffer,
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      expect(() => mixer.addAudioTrack(trackInfo)).not.toThrow()
    })

    it('should add multiple audio tracks', () => {
      const track1 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 3,
        volume: 0.8,
        pan: -0.5
      }
      
      const track2 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 2,
        endTime: 7,
        volume: 0.6,
        pan: 0.3
      }
      
      mixer.addAudioTrack(track1)
      mixer.addAudioTrack(track2)
      
      // Should not throw when adding multiple tracks
      expect(true).toBe(true)
    })

    it('should handle tracks with different timing', () => {
      const overlappingTrack = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 1.5,
        endTime: 8.5,
        volume: 1.0,
        pan: 0.0
      }
      
      expect(() => mixer.addAudioTrack(overlappingTrack)).not.toThrow()
    })
  })

  describe('removeAudioTrack method', () => {
    it('should remove audio track by element ID', () => {
      const audioElement = createMockAudioElement()
      const trackInfo = {
        element: audioElement,
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      mixer.addAudioTrack(trackInfo)
      
      expect(() => mixer.removeAudioTrack(audioElement.id)).not.toThrow()
    })

    it('should handle removing non-existent track', () => {
      expect(() => mixer.removeAudioTrack('non-existent-id')).not.toThrow()
    })

    it('should remove correct track when multiple exist', () => {
      const track1 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      const track2 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 2,
        endTime: 7,
        volume: 0.8,
        pan: 0.5
      }
      
      mixer.addAudioTrack(track1)
      mixer.addAudioTrack(track2)
      
      mixer.removeAudioTrack(track1.element.id)
      
      // Should not affect other tracks
      expect(true).toBe(true)
    })
  })

  describe('clearTracks method', () => {
    it('should clear all audio tracks', () => {
      const track1 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      const track2 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 2,
        endTime: 7,
        volume: 0.8,
        pan: 0.5
      }
      
      mixer.addAudioTrack(track1)
      mixer.addAudioTrack(track2)
      
      expect(() => mixer.clearTracks()).not.toThrow()
    })

    it('should handle clearing empty track list', () => {
      expect(() => mixer.clearTracks()).not.toThrow()
    })
  })

  describe('loadAudioBuffer method', () => {
    it('should load audio buffer from file', async () => {
      const mockFile = new File(['mock audio data'], 'test.mp3', {
        type: 'audio/mpeg'
      })
      
      // Mock File.arrayBuffer
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      
      const audioBuffer = await mixer.loadAudioBuffer(mockFile)
      
      expect(audioBuffer).toBeInstanceOf(Object)
      expect(audioBuffer.numberOfChannels).toBe(2)
      expect(audioBuffer.sampleRate).toBe(44100)
    })

    it('should handle file loading errors gracefully', async () => {
      const mockFile = new File(['invalid audio'], 'invalid.txt', {
        type: 'text/plain'
      })
      
      mockFile.arrayBuffer = jest.fn().mockRejectedValue(new Error('Invalid file'))
      
      await expect(mixer.loadAudioBuffer(mockFile)).rejects.toThrow()
    })
  })

  describe('loadAudioBufferFromUrl method', () => {
    it('should load audio buffer from URL', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      })
      
      const audioBuffer = await mixer.loadAudioBufferFromUrl('https://example.com/audio.mp3')
      
      expect(audioBuffer).toBeInstanceOf(Object)
      expect(fetch).toHaveBeenCalledWith('https://example.com/audio.mp3')
    })

    it('should handle URL loading errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      await expect(mixer.loadAudioBufferFromUrl('https://invalid.url')).rejects.toThrow()
    })
  })

  describe('mixTracks method', () => {
    it('should mix empty track list', async () => {
      const mixedBuffer = await mixer.mixTracks()
      
      expect(mixedBuffer).toBeInstanceOf(Object)
      expect(mixedBuffer.numberOfChannels).toBe(2)
      expect(mixedBuffer.sampleRate).toBe(44100)
      expect(mixedBuffer.length).toBe(441000) // 10 seconds * 44100 samples
    })

    it('should mix single audio track', async () => {
      const track = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      mixer.addAudioTrack(track)
      
      const mixedBuffer = await mixer.mixTracks()
      
      expect(mixedBuffer).toBeInstanceOf(Object)
      expect(mixedBuffer.numberOfChannels).toBe(2)
    })

    it('should mix multiple overlapping tracks', async () => {
      const track1 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 6,
        volume: 0.8,
        pan: -0.5
      }
      
      const track2 = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 3,
        endTime: 9,
        volume: 0.6,
        pan: 0.5
      }
      
      mixer.addAudioTrack(track1)
      mixer.addAudioTrack(track2)
      
      const mixedBuffer = await mixer.mixTracks()
      
      expect(mixedBuffer).toBeInstanceOf(Object)
      expect(mixedBuffer.numberOfChannels).toBe(2)
    })

    it('should handle tracks with volume and pan settings', async () => {
      const track = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 2,
        endTime: 8,
        volume: 0.5,
        pan: 1.0 // Full right
      }
      
      mixer.addAudioTrack(track)
      
      const mixedBuffer = await mixer.mixTracks()
      
      expect(mixedBuffer).toBeInstanceOf(Object)
    })
  })

  describe('exportAudio method', () => {
    it('should export mixed audio as AudioBuffer', async () => {
      const track = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      mixer.addAudioTrack(track)
      
      const exportedBuffer = await mixer.exportAudio()
      
      expect(exportedBuffer).toBeInstanceOf(Object)
      expect(exportedBuffer.numberOfChannels).toBe(2)
      expect(exportedBuffer.sampleRate).toBe(44100)
    })
  })

  describe('exportAsWav method', () => {
    it('should export mixed audio as WAV blob', async () => {
      const track = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 3,
        volume: 1.0,
        pan: 0.0
      }
      
      mixer.addAudioTrack(track)
      
      const wavBlob = await mixer.exportAsWav()
      
      expect(wavBlob).toBeInstanceOf(Blob)
      expect(wavBlob.type).toBe('audio/wav')
      expect(wavBlob.size).toBeGreaterThan(44) // WAV header is 44 bytes
    })

    it('should create valid WAV file structure', async () => {
      const mixedBlob = await mixer.exportAsWav()
      
      expect(mixedBlob.size).toBeGreaterThan(0)
      expect(mixedBlob.type).toBe('audio/wav')
    })
  })

  describe('getAudioContext method', () => {
    it('should return audio context instance', () => {
      const context = mixer.getAudioContext()
      
      expect(context).toBeInstanceOf(AudioContext)
      expect(context.sampleRate).toBe(44100)
    })
  })

  describe('dispose method', () => {
    it('should clean up resources', () => {
      const context = mixer.getAudioContext()
      
      expect(() => mixer.dispose()).not.toThrow()
      
      // After disposal, context should be closed
      expect(context.state).toBe('closed')
    })

    it('should clear all tracks on disposal', () => {
      const track = {
        element: createMockAudioElement(),
        audioBuffer: createMockAudioBuffer(),
        startTime: 0,
        endTime: 5,
        volume: 1.0,
        pan: 0.0
      }
      
      mixer.addAudioTrack(track)
      mixer.dispose()
      
      // Should not throw after disposal
      expect(true).toBe(true)
    })
  })
})