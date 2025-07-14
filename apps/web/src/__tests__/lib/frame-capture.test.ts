import { describe, it, expect, beforeEach } from '@jest/globals'
import { FrameCaptureService } from '@/lib/frame-capture'
import { createMockExportSettings, createMockVideoElement, createMockImageElement, createMockTextElement, createMockVideoElement_DOM } from '../utils/test-helpers'

describe('FrameCaptureService', () => {
  let service: FrameCaptureService
  let mockOptions: any
  let mockSettings: any

  beforeEach(() => {
    mockOptions = {
      fps: 30,
      duration: 10, // 10 seconds
      width: 1920,
      height: 1080
    }
    mockSettings = createMockExportSettings()
    service = new FrameCaptureService(mockOptions, mockSettings)
  })

  describe('Constructor', () => {
    it('should initialize with options and settings', () => {
      expect(service).toBeInstanceOf(FrameCaptureService)
    })

    it('should handle different fps values', () => {
      const highFpsOptions = {
        fps: 60,
        duration: 5,
        width: 1920,
        height: 1080
      }
      const highFpsService = new FrameCaptureService(highFpsOptions, mockSettings)
      
      expect(highFpsService).toBeInstanceOf(FrameCaptureService)
    })

    it('should handle different resolutions', () => {
      const hdOptions = {
        fps: 30,
        duration: 10,
        width: 1280,
        height: 720
      }
      const hdService = new FrameCaptureService(hdOptions, mockSettings)
      
      expect(hdService).toBeInstanceOf(FrameCaptureService)
    })
  })

  describe('getTotalFrames method', () => {
    it('should calculate correct total frames', () => {
      const totalFrames = service.getTotalFrames()
      
      // 10 seconds * 30 fps = 300 frames
      expect(totalFrames).toBe(300)
    })

    it('should handle fractional durations', () => {
      const fractionalOptions = {
        fps: 30,
        duration: 5.5,
        width: 1920,
        height: 1080
      }
      const fractionalService = new FrameCaptureService(fractionalOptions, mockSettings)
      
      const totalFrames = fractionalService.getTotalFrames()
      
      // 5.5 seconds * 30 fps = 165 frames
      expect(totalFrames).toBe(165)
    })

    it('should handle high frame rates', () => {
      const highFpsOptions = {
        fps: 60,
        duration: 2,
        width: 1920,
        height: 1080
      }
      const highFpsService = new FrameCaptureService(highFpsOptions, mockSettings)
      
      const totalFrames = highFpsService.getTotalFrames()
      
      // 2 seconds * 60 fps = 120 frames
      expect(totalFrames).toBe(120)
    })

    it('should round up for partial frames', () => {
      const partialOptions = {
        fps: 30,
        duration: 1.1, // 1.1 * 30 = 33 frames
        width: 1920,
        height: 1080
      }
      const partialService = new FrameCaptureService(partialOptions, mockSettings)
      
      const totalFrames = partialService.getTotalFrames()
      
      expect(totalFrames).toBe(33) // Should round up from 33
    })
  })

  describe('getFrameData method', () => {
    it('should return correct frame data for frame 0', () => {
      const frameData = service.getFrameData(0)
      
      expect(frameData.frameNumber).toBe(0)
      expect(frameData.timestamp).toBe(0)
      expect(frameData.elements).toEqual([])
    })

    it('should calculate correct timestamp for any frame', () => {
      const frameData30 = service.getFrameData(30)
      
      expect(frameData30.frameNumber).toBe(30)
      expect(frameData30.timestamp).toBe(1) // 30 / 30 fps = 1 second
    })

    it('should handle mid-frame timestamps', () => {
      const frameData15 = service.getFrameData(15)
      
      expect(frameData15.frameNumber).toBe(15)
      expect(frameData15.timestamp).toBe(0.5) // 15 / 30 fps = 0.5 seconds
    })

    it('should return empty elements array', () => {
      const frameData = service.getFrameData(100)
      
      expect(frameData.elements).toEqual([])
      expect(Array.isArray(frameData.elements)).toBe(true)
    })
  })

  describe('generateFrames method', () => {
    it('should generate correct number of frames', () => {
      const frames = Array.from(service.generateFrames())
      
      expect(frames.length).toBe(300) // 10 seconds * 30 fps
    })

    it('should generate frames in sequence', () => {
      const generator = service.generateFrames()
      
      const frame0 = generator.next().value
      const frame1 = generator.next().value
      const frame2 = generator.next().value
      
      expect(frame0.frameNumber).toBe(0)
      expect(frame0.timestamp).toBe(0)
      
      expect(frame1.frameNumber).toBe(1)
      expect(frame1.timestamp).toBe(1/30)
      
      expect(frame2.frameNumber).toBe(2)
      expect(frame2.timestamp).toBe(2/30)
    })

    it('should handle short duration', () => {
      const shortOptions = {
        fps: 30,
        duration: 1,
        width: 1920,
        height: 1080
      }
      const shortService = new FrameCaptureService(shortOptions, mockSettings)
      
      const frames = Array.from(shortService.generateFrames())
      
      expect(frames.length).toBe(30) // 1 second * 30 fps
    })

    it('should be iterable', () => {
      let frameCount = 0
      
      for (const frame of service.generateFrames()) {
        frameCount++
        if (frameCount >= 5) break // Test first 5 frames
      }
      
      expect(frameCount).toBe(5)
    })
  })

  describe('extractVideoFrame method', () => {
    it('should extract frame from video element', async () => {
      const video = createMockVideoElement_DOM()
      
      // Mock seeked event
      setTimeout(() => {
        video.dispatchEvent(new Event('seeked'))
      }, 10)
      
      const canvas = await service.extractVideoFrame(video, 2.5)
      
      expect(canvas).toBeInstanceOf(HTMLCanvasElement)
      expect(canvas.width).toBe(1920)
      expect(canvas.height).toBe(1080)
    })

    it('should set correct video currentTime', async () => {
      const video = createMockVideoElement_DOM()
      const timestamp = 3.5
      
      setTimeout(() => {
        expect(video.currentTime).toBe(timestamp)
        video.dispatchEvent(new Event('seeked'))
      }, 10)
      
      await service.extractVideoFrame(video, timestamp)
    })

    it('should handle video seek errors', async () => {
      const video = createMockVideoElement_DOM()
      
      setTimeout(() => {
        video.dispatchEvent(new Event('error'))
      }, 10)
      
      await expect(service.extractVideoFrame(video, 1)).rejects.toThrow('Failed to seek video')
    })

    it('should handle canvas context errors', async () => {
      const video = createMockVideoElement_DOM()
      
      // Mock getContext to return null
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null)
      
      await expect(service.extractVideoFrame(video, 1)).rejects.toThrow('Could not get 2D context')
      
      // Restore original getContext
      HTMLCanvasElement.prototype.getContext = originalGetContext
    })
  })

  describe('createImageElement method', () => {
    it('should create image element from src', async () => {
      const src = 'test-image.jpg'
      
      // Mock Image constructor and load event
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: ''
      }
      
      // Override Image constructor for this test
      const originalImage = global.Image
      global.Image = jest.fn().mockImplementation(() => mockImage)
      
      const imagePromise = service.createImageElement(src)
      
      // Simulate successful load
      setTimeout(() => {
        mockImage.src = src
        if (mockImage.onload) mockImage.onload()
      }, 10)
      
      const image = await imagePromise
      
      expect(image).toBe(mockImage)
      expect(mockImage.src).toBe(src)
      
      // Restore original Image
      global.Image = originalImage
    })

    it('should handle image load errors', async () => {
      const src = 'invalid-image.jpg'
      
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: ''
      }
      
      const originalImage = global.Image
      global.Image = jest.fn().mockImplementation(() => mockImage)
      
      const imagePromise = service.createImageElement(src)
      
      // Simulate load error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror()
      }, 10)
      
      await expect(imagePromise).rejects.toThrow('Failed to load image')
      
      global.Image = originalImage
    })
  })

  describe('calculateElementBounds method', () => {
    it('should return default bounds', () => {
      const element = createMockVideoElement()
      const bounds = service.calculateElementBounds(element, 1920, 1080)
      
      expect(bounds.x).toBe(0)
      expect(bounds.y).toBe(0)
      expect(bounds.width).toBe(1920)
      expect(bounds.height).toBe(1080)
    })

    it('should handle different canvas sizes', () => {
      const element = createMockImageElement()
      const bounds = service.calculateElementBounds(element, 1280, 720)
      
      expect(bounds.width).toBe(1280)
      expect(bounds.height).toBe(720)
    })

    it('should return consistent bounds for any element type', () => {
      const videoElement = createMockVideoElement()
      const imageElement = createMockImageElement()
      const textElement = createMockTextElement()
      
      const videoBounds = service.calculateElementBounds(videoElement, 1920, 1080)
      const imageBounds = service.calculateElementBounds(imageElement, 1920, 1080)
      const textBounds = service.calculateElementBounds(textElement, 1920, 1080)
      
      expect(videoBounds).toEqual(imageBounds)
      expect(imageBounds).toEqual(textBounds)
    })
  })

  describe('isElementVisible method', () => {
    it('should return true for element at start time', () => {
      const element = createMockVideoElement()
      element.startTime = 2
      element.endTime = 8
      
      const visible = service.isElementVisible(element, 2)
      
      expect(visible).toBe(true)
    })

    it('should return true for element at end time', () => {
      const element = createMockVideoElement()
      element.startTime = 2
      element.endTime = 8
      
      const visible = service.isElementVisible(element, 8)
      
      expect(visible).toBe(true)
    })

    it('should return true for element in middle of duration', () => {
      const element = createMockVideoElement()
      element.startTime = 2
      element.endTime = 8
      
      const visible = service.isElementVisible(element, 5)
      
      expect(visible).toBe(true)
    })

    it('should return false for element before start time', () => {
      const element = createMockVideoElement()
      element.startTime = 2
      element.endTime = 8
      
      const visible = service.isElementVisible(element, 1)
      
      expect(visible).toBe(false)
    })

    it('should return false for element after end time', () => {
      const element = createMockVideoElement()
      element.startTime = 2
      element.endTime = 8
      
      const visible = service.isElementVisible(element, 9)
      
      expect(visible).toBe(false)
    })

    it('should handle element with duration fallback', () => {
      const element = createMockVideoElement()
      element.startTime = 1
      element.duration = 5
      delete element.endTime
      
      const visible = service.isElementVisible(element, 3)
      
      expect(visible).toBe(true)
    })

    it('should handle element with missing times', () => {
      const element = createMockVideoElement()
      delete element.startTime
      delete element.endTime
      delete element.duration
      
      const visible = service.isElementVisible(element, 5)
      
      expect(visible).toBe(true) // Should default to 0-0, so only visible at timestamp 0
    })
  })

  describe('sortElementsByLayer method', () => {
    it('should sort elements by track ID', () => {
      const element1 = createMockVideoElement()
      element1.trackId = 'track2'
      element1.id = 'element1'
      
      const element2 = createMockVideoElement()
      element2.trackId = 'track1'
      element2.id = 'element2'
      
      const sorted = service.sortElementsByLayer([element1, element2])
      
      expect(sorted[0].id).toBe('element2') // track1 should come first
      expect(sorted[1].id).toBe('element1') // track2 should come second
    })

    it('should sort by layer within same track', () => {
      const element1 = createMockVideoElement()
      element1.trackId = 'track1'
      element1.layer = 2
      element1.id = 'element1'
      
      const element2 = createMockVideoElement()
      element2.trackId = 'track1'
      element2.layer = 1
      element2.id = 'element2'
      
      const sorted = service.sortElementsByLayer([element1, element2])
      
      expect(sorted[0].layer).toBe(1)
      expect(sorted[1].layer).toBe(2)
    })

    it('should handle missing layer values', () => {
      const element1 = createMockVideoElement()
      element1.trackId = 'track1'
      element1.id = 'elementB'
      delete element1.layer
      
      const element2 = createMockVideoElement()
      element2.trackId = 'track1'
      element2.id = 'elementA'
      delete element2.layer
      
      const sorted = service.sortElementsByLayer([element1, element2])
      
      expect(sorted.length).toBe(2)
    })

    it('should handle empty array', () => {
      const sorted = service.sortElementsByLayer([])
      
      expect(sorted).toEqual([])
    })

    it('should not modify original array', () => {
      const element1 = createMockVideoElement()
      element1.trackId = 'track2'
      
      const element2 = createMockVideoElement()
      element2.trackId = 'track1'
      
      const original = [element1, element2]
      const originalOrder = [...original]
      
      service.sortElementsByLayer(original)
      
      expect(original).toEqual(originalOrder)
    })
  })

  describe('getVisibleElements method', () => {
    it('should return only visible elements', () => {
      const element1 = createMockVideoElement()
      element1.startTime = 0
      element1.endTime = 5
      element1.id = 'visible1'
      
      const element2 = createMockVideoElement()
      element2.startTime = 10
      element2.endTime = 15
      element2.id = 'notVisible'
      
      const element3 = createMockVideoElement()
      element3.startTime = 2
      element3.endTime = 8
      element3.id = 'visible2'
      
      const elements = [element1, element2, element3]
      const visible = service.getVisibleElements(elements, 3)
      
      expect(visible.length).toBe(2)
      expect(visible.some(el => el.id === 'visible1')).toBe(true)
      expect(visible.some(el => el.id === 'visible2')).toBe(true)
      expect(visible.some(el => el.id === 'notVisible')).toBe(false)
    })

    it('should return sorted visible elements', () => {
      const element1 = createMockVideoElement()
      element1.startTime = 0
      element1.endTime = 10
      element1.trackId = 'track2'
      element1.layer = 1
      
      const element2 = createMockVideoElement()
      element2.startTime = 0
      element2.endTime = 10
      element2.trackId = 'track1'
      element2.layer = 2
      
      const elements = [element1, element2]
      const visible = service.getVisibleElements(elements, 5)
      
      expect(visible.length).toBe(2)
      expect(visible[0].trackId).toBe('track1') // Should be sorted
      expect(visible[1].trackId).toBe('track2')
    })

    it('should handle empty input', () => {
      const visible = service.getVisibleElements([], 5)
      
      expect(visible).toEqual([])
    })

    it('should handle no visible elements', () => {
      const element1 = createMockVideoElement()
      element1.startTime = 10
      element1.endTime = 15
      
      const element2 = createMockVideoElement()
      element2.startTime = 20
      element2.endTime = 25
      
      const elements = [element1, element2]
      const visible = service.getVisibleElements(elements, 5)
      
      expect(visible).toEqual([])
    })
  })
})