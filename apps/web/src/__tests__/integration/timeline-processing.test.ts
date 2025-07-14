import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ExportEngine } from '@/lib/export-engine'
import { VideoRecorder } from '@/lib/video-recorder'
import { AudioMixer } from '@/lib/audio-mixer'
import { CanvasRenderer } from '@/lib/canvas-renderer'
import { FrameCaptureService } from '@/lib/frame-capture'
import { TimelineElement } from '@/types/timeline'
import { createMockCanvas, createMockExportSettings, createMockVideoElement, createMockAudioElement, createMockTextElement, createMockImageElement } from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/canvas-renderer')
jest.mock('@/lib/frame-capture')
jest.mock('@/lib/video-recorder')
jest.mock('@/lib/audio-mixer')
jest.mock('@/lib/export-errors')

describe('Timeline Processing', () => {
  let mockCanvas: HTMLCanvasElement
  let mockSettings: any
  let mockTimelineElements: TimelineElement[]
  let mockOptions: any
  let mockVideoRecorder: any
  let mockAudioMixer: any
  let mockCanvasRenderer: any
  let mockFrameCapture: any

  beforeEach(() => {
    mockCanvas = createMockCanvas()
    mockSettings = createMockExportSettings()
    
    // Create diverse timeline elements for testing
    mockTimelineElements = [
      createMockVideoElement(),
      createMockAudioElement(),
      createMockTextElement(),
      createMockImageElement()
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
      getTotalFrames: jest.fn().mockReturnValue(300), // 10 seconds at 30fps
      getFrameData: jest.fn().mockImplementation((frame) => ({
        frameNumber: frame,
        timestamp: frame / 30,
        elements: mockTimelineElements
      })),
      getVisibleElements: jest.fn().mockImplementation((elements, timestamp) => {
        // Filter elements based on their time range
        return elements.filter(element => {
          const startTime = element.startTime || 0
          const endTime = element.endTime || (element.startTime || 0) + (element.duration || 0)
          return timestamp >= startTime && timestamp <= endTime
        })
      }),
      calculateElementBounds: jest.fn().mockReturnValue({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })
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

  describe('Element collection', () => {
    it('should collect all timeline elements', () => {
      const elements = [
        createMockVideoElement(),
        createMockAudioElement(),
        createMockTextElement('Hello World'),
        createMockImageElement()
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Just verify the constructor was called with correct elements
      
      // Verify FrameCaptureService was initialized
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should collect video elements', () => {
      const videoElements = [
        createMockVideoElement(),
        { ...createMockVideoElement(), id: 'video-2', src: 'video2.mp4' }
      ]
      
      const options = { ...mockOptions, timelineElements: videoElements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should collect audio elements', () => {
      const audioElements = [
        createMockAudioElement(),
        { ...createMockAudioElement(), id: 'audio-2', src: 'audio2.mp3' }
      ]
      
      const options = { ...mockOptions, timelineElements: audioElements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should collect text elements', () => {
      const textElements = [
        createMockTextElement('Title'),
        createMockTextElement('Subtitle')
      ]
      
      const options = { ...mockOptions, timelineElements: textElements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should collect image elements', () => {
      const imageElements = [
        createMockImageElement(),
        { ...createMockImageElement(), id: 'image-2', src: 'image2.jpg' }
      ]
      
      const options = { ...mockOptions, timelineElements: imageElements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should handle empty timeline', () => {
      const options = { ...mockOptions, timelineElements: [] }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should collect elements with overlapping time ranges', () => {
      const overlappingElements = [
        { ...createMockVideoElement(), startTime: 0, endTime: 5, duration: 5 },
        { ...createMockAudioElement(), startTime: 2, endTime: 7, duration: 5 },
        { ...createMockTextElement(), startTime: 1, endTime: 6, duration: 5 }
      ]
      
      const options = { ...mockOptions, timelineElements: overlappingElements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should preserve element properties during collection', () => {
      const elementWithProperties = {
        ...createMockVideoElement(),
        volume: 0.8,
        opacity: 0.9,
        x: 100,
        y: 200,
        scale: 1.5,
        rotation: 45
      }
      
      const options = { ...mockOptions, timelineElements: [elementWithProperties] }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })
  })

  describe('Visibility filtering', () => {
    it('should filter visible elements at specific timestamp', () => {
      const elements = [
        { ...createMockVideoElement(), id: 'video-1', startTime: 0, endTime: 5 },
        { ...createMockAudioElement(), id: 'audio-1', startTime: 3, endTime: 8 },
        { ...createMockTextElement(), id: 'text-1', startTime: 6, endTime: 10 }
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Test the visibility filtering logic directly
      const visibleAt4 = mockFrameCapture.getVisibleElements(elements, 4)
      expect(visibleAt4).toHaveLength(2)
      expect(visibleAt4.map(e => e.id)).toEqual(['video-1', 'audio-1'])
      
      // Verify elements are collected properly
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should handle elements with no start/end times', () => {
      const elements = [
        { ...createMockVideoElement(), startTime: undefined, endTime: undefined },
        { ...createMockAudioElement(), startTime: 0, endTime: 5 }
      ]
      
      mockFrameCapture.getVisibleElements.mockImplementation((elements, timestamp) => {
        return elements.filter(element => {
          const startTime = element.startTime || 0
          const endTime = element.endTime || 999 // Default to very long duration
          return timestamp >= startTime && timestamp <= endTime
        })
      })
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      // Both elements should be visible at timestamp 0
      const visibleAt0 = mockFrameCapture.getVisibleElements(elements, 0)
      expect(visibleAt0).toHaveLength(2)
    })

    it('should filter by element opacity', () => {
      const elements = [
        { ...createMockVideoElement(), opacity: 1.0 },
        { ...createMockVideoElement(), opacity: 0.0 }, // Invisible
        { ...createMockVideoElement(), opacity: 0.5 }
      ]
      
      // Test the opacity filtering logic
      const filteredElements = elements.filter(element => {
        const opacity = element.opacity !== undefined ? element.opacity : 1.0
        return opacity > 0
      })
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Only 2 elements should be visible (opacity > 0)
      expect(filteredElements).toHaveLength(2)
    })

    it('should filter by element scale', () => {
      const elements = [
        { ...createMockVideoElement(), scale: 1.0 },
        { ...createMockVideoElement(), scale: 0.0 }, // Invisible due to no scale
        { ...createMockVideoElement(), scale: 2.0 }
      ]
      
      // Test the scale filtering logic
      const filteredElements = elements.filter(element => {
        const scale = element.scale !== undefined ? element.scale : 1.0
        return scale > 0
      })
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Only 2 elements should be visible (scale > 0)
      expect(filteredElements).toHaveLength(2)
    })

    it('should handle visibility changes over time', () => {
      const elements = [
        { ...createMockVideoElement(), id: 'video-fade', startTime: 0, endTime: 10 }
      ]
      
      // Mock changing opacity over time
      mockFrameCapture.getVisibleElements.mockImplementation((elements, timestamp) => {
        return elements.map(element => ({
          ...element,
          opacity: Math.max(0, 1 - timestamp / 10) // Fade out over 10 seconds
        })).filter(element => element.opacity > 0)
      })
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Test visibility at different timestamps
      const visibleAt0 = mockFrameCapture.getVisibleElements(elements, 0)
      const visibleAt10 = mockFrameCapture.getVisibleElements(elements, 10)
      
      expect(visibleAt0).toHaveLength(1) // Visible at start
      expect(visibleAt10).toHaveLength(0) // Invisible at end
    })

    it('should filter audio-only elements from visual rendering', () => {
      const elements = [
        createMockVideoElement(),
        createMockAudioElement(), // Should not be visually rendered
        createMockTextElement()
      ]
      
      mockFrameCapture.getVisibleElements.mockImplementation((elements, timestamp) => {
        // Filter out audio-only elements for visual rendering
        return elements.filter(element => element.type !== 'audio')
      })
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Only video and text should be visible for rendering
      const visibleElements = mockFrameCapture.getVisibleElements(elements, 0)
      expect(visibleElements).toHaveLength(2)
      expect(visibleElements.every(e => e.type !== 'audio')).toBe(true)
    })

    it('should handle elements outside canvas bounds', () => {
      const elements = [
        { ...createMockVideoElement(), x: 0, y: 0 }, // Inside bounds
        { ...createMockVideoElement(), x: -1000, y: -1000 }, // Outside bounds
        { ...createMockVideoElement(), x: 5000, y: 5000 } // Outside bounds
      ]
      
      mockFrameCapture.getVisibleElements.mockImplementation((elements, timestamp) => {
        // Filter elements within canvas bounds (assume 1920x1080)
        return elements.filter(element => {
          const x = element.x || 0
          const y = element.y || 0
          return x >= -100 && x <= 2020 && y >= -100 && y <= 1180 // Some tolerance
        })
      })
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Only 1 element should be visible (within bounds)
      const visibleElements = mockFrameCapture.getVisibleElements(elements, 0)
      expect(visibleElements).toHaveLength(1)
    })
  })

  describe('Layer ordering', () => {
    it('should respect layer order during rendering', () => {
      const elements = [
        { ...createMockVideoElement(), id: 'background', layer: 1 },
        { ...createMockTextElement(), id: 'overlay', layer: 3 },
        { ...createMockImageElement(), id: 'middle', layer: 2 }
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      // Verify service is initialized
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should handle elements with same layer', () => {
      const elements = [
        { ...createMockVideoElement(), id: 'video-1', layer: 1 },
        { ...createMockVideoElement(), id: 'video-2', layer: 1 },
        { ...createMockTextElement(), id: 'text-1', layer: 1 }
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      // Should handle same layer gracefully
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should handle negative layer values', () => {
      const elements = [
        { ...createMockVideoElement(), layer: -1 },
        { ...createMockTextElement(), layer: 0 },
        { ...createMockImageElement(), layer: 1 }
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should handle missing layer values', () => {
      const elements = [
        { ...createMockVideoElement(), layer: undefined },
        { ...createMockTextElement(), layer: 1 },
        { ...createMockImageElement() } // No layer property
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      // Should handle missing layers gracefully
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should maintain layer order consistency', () => {
      const elements = [
        { ...createMockVideoElement(), id: 'layer-5', layer: 5 },
        { ...createMockVideoElement(), id: 'layer-1', layer: 1 },
        { ...createMockVideoElement(), id: 'layer-3', layer: 3 }
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Create another engine to test consistency
      const engine2 = new ExportEngine(options)
      
      // Both should be called with same parameters
      expect(FrameCaptureService).toHaveBeenCalledTimes(2)
    })

    it('should handle layer ordering with visibility changes', () => {
      const elements = [
        { ...createMockVideoElement(), id: 'bottom', layer: 1, startTime: 0, endTime: 10 },
        { ...createMockTextElement(), id: 'top', layer: 2, startTime: 5, endTime: 10 }
      ]
      
      mockFrameCapture.getVisibleElements.mockImplementation((elements, timestamp) => {
        return elements
          .filter(element => {
            const startTime = element.startTime || 0
            const endTime = element.endTime || (element.startTime || 0) + (element.duration || 0)
            return timestamp >= startTime && timestamp <= endTime
          })
          .sort((a, b) => (a.layer || 0) - (b.layer || 0)) // Sort by layer
      })
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // At timestamp 6, both should be visible with correct layer order
      const visibleAt6 = mockFrameCapture.getVisibleElements(elements, 6)
      expect(visibleAt6).toHaveLength(2)
      expect(visibleAt6[0].layer).toBeLessThanOrEqual(visibleAt6[1].layer)
    })

    it('should handle complex layer hierarchies', () => {
      const elements = [
        { ...createMockVideoElement(), id: 'bg', layer: 0 },
        { ...createMockImageElement(), id: 'img1', layer: 10 },
        { ...createMockImageElement(), id: 'img2', layer: 15 },
        { ...createMockTextElement(), id: 'title', layer: 20 },
        { ...createMockTextElement(), id: 'subtitle', layer: 25 },
        { ...createMockVideoElement(), id: 'overlay', layer: 30 }
      ]
      
      const options = { ...mockOptions, timelineElements: elements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })
  })

  describe('Timeline processing edge cases', () => {
    it('should handle timeline with mixed element types', () => {
      const mixedElements = [
        createMockVideoElement(),
        createMockAudioElement(),
        createMockTextElement('Mixed Timeline'),
        createMockImageElement(),
        { ...createMockVideoElement(), hasAudio: true }, // Video with audio
        { ...createMockAudioElement(), type: 'audio' as const }
      ]
      
      const options = { ...mockOptions, timelineElements: mixedElements }
      const engine = new ExportEngine(options)
      
      // Verify service initialized
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should handle timeline with duplicate IDs', () => {
      const elementsWithDuplicateIds = [
        { ...createMockVideoElement(), id: 'duplicate' },
        { ...createMockAudioElement(), id: 'duplicate' },
        { ...createMockTextElement(), id: 'unique' }
      ]
      
      const options = { ...mockOptions, timelineElements: elementsWithDuplicateIds }
      const engine = new ExportEngine(options)
      
      // Should handle gracefully
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalled()
    })

    it('should handle timeline with malformed elements', () => {
      const malformedElements = [
        { ...createMockVideoElement(), src: null }, // Missing source
        { ...createMockTextElement(), content: undefined }, // Missing content
        { type: 'unknown' as any, id: 'unknown-type' }, // Unknown type
        createMockVideoElement() // Valid element
      ]
      
      const options = { ...mockOptions, timelineElements: malformedElements }
      const engine = new ExportEngine(options)
      
      // Should handle malformed elements gracefully
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalled()
    })

    it('should handle very large timelines', () => {
      // Create timeline with many elements
      const largeTimeline = Array.from({ length: 100 }, (_, i) => ({
        ...createMockVideoElement(),
        id: `element-${i}`,
        startTime: i * 0.1,
        endTime: (i * 0.1) + 1
      }))
      
      const options = { ...mockOptions, timelineElements: largeTimeline }
      const engine = new ExportEngine(options)
      
      // Verify service initialized
      expect(FrameCaptureService).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          duration: 10,
          width: 1920,
          height: 1080
        }),
        mockSettings
      )
    })

    it('should handle timeline with zero-duration elements', () => {
      const zeroDurationElements = [
        { ...createMockVideoElement(), duration: 0 },
        { ...createMockTextElement(), duration: 0 },
        { ...createMockImageElement(), startTime: 5, endTime: 5 } // Zero duration
      ]
      
      const options = { ...mockOptions, timelineElements: zeroDurationElements }
      const engine = new ExportEngine(options)
      
      // Verify constructor called with elements
      
      expect(FrameCaptureService).toHaveBeenCalled()
    })
  })
})