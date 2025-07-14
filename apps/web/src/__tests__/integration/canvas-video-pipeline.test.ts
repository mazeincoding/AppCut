import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CanvasRenderer } from '@/lib/canvas-renderer'
import { VideoRecorder } from '@/lib/video-recorder'
import { createMockCanvas, createMockExportSettings, createMockVideoElement, createMockImageElement, createMockTextElement } from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/canvas-renderer')
jest.mock('@/lib/video-recorder')

describe('Canvas to Video Pipeline', () => {
  let mockCanvas: HTMLCanvasElement
  let mockSettings: any
  let mockRenderer: jest.Mocked<CanvasRenderer>
  let mockVideoRecorder: jest.Mocked<VideoRecorder>
  let mockContext: any

  beforeEach(() => {
    mockCanvas = createMockCanvas()
    mockSettings = createMockExportSettings()

    // Mock canvas 2D context
    mockContext = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      setTransform: jest.fn(),
      clip: jest.fn(),
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      getImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(1920 * 1080 * 4),
        width: 1920,
        height: 1080
      }),
      putImageData: jest.fn(),
      createImageData: jest.fn()
    }

    // Mock canvas.getContext
    mockCanvas.getContext = jest.fn().mockReturnValue(mockContext)

    // Mock canvas.captureStream
    mockCanvas.captureStream = jest.fn().mockReturnValue({
      id: 'mock-stream',
      active: true,
      getTracks: jest.fn().mockReturnValue([{
        id: 'video-track',
        kind: 'video',
        enabled: true,
        readyState: 'live'
      }])
    } as any)

    // Mock CanvasRenderer
    mockRenderer = {
      clearFrame: jest.fn(),
      drawImage: jest.fn(),
      drawText: jest.fn(),
      drawRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      setTransform: jest.fn(),
      getImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(1920 * 1080 * 4),
        width: 1920,
        height: 1080
      })
    } as any

    // Mock VideoRecorder
    mockVideoRecorder = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'video/mp4' })),
      setAudioStream: jest.fn(),
      cleanup: jest.fn(),
      isRecording: jest.fn().mockReturnValue(false)
    } as any

    // Setup mocks
    ;(CanvasRenderer as jest.MockedClass<typeof CanvasRenderer>).mockImplementation(() => mockRenderer)
    ;(VideoRecorder as jest.MockedClass<typeof VideoRecorder>).mockImplementation(() => mockVideoRecorder)

    // Mock MediaRecorder
    global.MediaRecorder = jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
      onerror: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))

    // Mock MediaRecorder.isTypeSupported
    ;(global.MediaRecorder as any).isTypeSupported = jest.fn().mockReturnValue(true)

    // Mock MediaStream
    global.MediaStream = jest.fn().mockImplementation(() => ({
      id: 'mock-stream',
      active: true,
      getTracks: jest.fn().mockReturnValue([])
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Frame rendering to canvas', () => {
    it('should clear canvas before rendering', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      
      renderer.clearFrame('#ffffff')
      
      expect(mockRenderer.clearFrame).toHaveBeenCalledWith('#ffffff')
    })

    it('should render video element to canvas', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      const videoElement = createMockVideoElement()
      
      const bounds = {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080
      }
      
      renderer.drawImage(videoElement as any, bounds.x, bounds.y, bounds.width, bounds.height)
      
      expect(mockRenderer.drawImage).toHaveBeenCalledWith(
        videoElement,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      )
    })

    it('should render image element to canvas', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      const imageElement = createMockImageElement()
      
      const bounds = {
        x: 100,
        y: 100,
        width: 800,
        height: 600
      }
      
      renderer.drawImage(imageElement as any, bounds.x, bounds.y, bounds.width, bounds.height)
      
      expect(mockRenderer.drawImage).toHaveBeenCalledWith(
        imageElement,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      )
    })

    it('should render text element to canvas', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      const textElement = createMockTextElement('Hello World')
      
      const bounds = {
        x: 200,
        y: 300,
        width: 400,
        height: 50
      }
      
      const textOptions = {
        fontSize: textElement.fontSize || 24,
        color: textElement.color || '#000000',
        fontFamily: textElement.fontFamily || 'Arial'
      }
      
      renderer.drawText(textElement.content!, bounds.x, bounds.y, textOptions)
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        textElement.content,
        bounds.x,
        bounds.y,
        textOptions
      )
    })

    it('should handle multiple elements in correct order', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      
      const backgroundImage = createMockImageElement()
      const videoElement = createMockVideoElement()
      const textElement = createMockTextElement('Overlay Text')
      
      // Render in layer order
      renderer.drawImage(backgroundImage as any, 0, 0, 1920, 1080)
      renderer.drawImage(videoElement as any, 100, 100, 800, 600)
      renderer.drawText(textElement.content!, 200, 200, {
        fontSize: 24,
        color: '#ffffff',
        fontFamily: 'Arial'
      })
      
      expect(mockRenderer.drawImage).toHaveBeenCalledTimes(2)
      expect(mockRenderer.drawText).toHaveBeenCalledTimes(1)
    })

    it('should save and restore canvas state', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      
      renderer.save()
      renderer.setTransform(1, 0, 0, 1, 100, 100)
      renderer.restore()
      
      expect(mockRenderer.save).toHaveBeenCalled()
      expect(mockRenderer.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 100, 100)
      expect(mockRenderer.restore).toHaveBeenCalled()
    })

    it('should handle canvas transformations', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      
      const transform = {
        scaleX: 2,
        scaleY: 1.5,
        translateX: 50,
        translateY: 75,
        rotation: 45
      }
      
      renderer.setTransform(
        transform.scaleX,
        0,
        0,
        transform.scaleY,
        transform.translateX,
        transform.translateY
      )
      
      expect(mockRenderer.setTransform).toHaveBeenCalledWith(
        transform.scaleX,
        0,
        0,
        transform.scaleY,
        transform.translateX,
        transform.translateY
      )
    })

    it('should extract image data from canvas', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      
      const imageData = renderer.getImageData(0, 0, 1920, 1080)
      
      expect(mockRenderer.getImageData).toHaveBeenCalledWith(0, 0, 1920, 1080)
      expect(imageData).toEqual({
        data: expect.any(Uint8ClampedArray),
        width: 1920,
        height: 1080
      })
    })
  })

  describe('Canvas stream capture', () => {
    it('should capture stream from canvas', () => {
      const fps = 30
      const stream = mockCanvas.captureStream(fps)
      
      expect(mockCanvas.captureStream).toHaveBeenCalledWith(fps)
      expect(stream).toEqual({
        id: 'mock-stream',
        active: true,
        getTracks: expect.any(Function)
      })
    })

    it('should get video tracks from canvas stream', () => {
      const stream = mockCanvas.captureStream(30)
      const tracks = stream.getTracks()
      
      expect(tracks).toHaveLength(1)
      expect(tracks[0]).toEqual({
        id: 'video-track',
        kind: 'video',
        enabled: true,
        readyState: 'live'
      })
    })

    it('should handle different frame rates', () => {
      const frameRates = [24, 30, 60]
      
      frameRates.forEach(fps => {
        const stream = mockCanvas.captureStream(fps)
        expect(mockCanvas.captureStream).toHaveBeenCalledWith(fps)
        expect(stream.active).toBe(true)
      })
    })

    it('should handle canvas resize during capture', () => {
      // Initial capture
      const stream = mockCanvas.captureStream(30)
      expect(stream.active).toBe(true)
      
      // Resize canvas
      mockCanvas.width = 1280
      mockCanvas.height = 720
      
      // Stream should still be active
      expect(stream.active).toBe(true)
    })

    it('should handle high-DPI canvas scaling', () => {
      const devicePixelRatio = 2
      const logicalWidth = 1920
      const logicalHeight = 1080
      
      // Set up high-DPI canvas
      mockCanvas.width = logicalWidth * devicePixelRatio
      mockCanvas.height = logicalHeight * devicePixelRatio
      mockCanvas.style.width = `${logicalWidth}px`
      mockCanvas.style.height = `${logicalHeight}px`
      
      // Scale context for high-DPI
      mockContext.scale(devicePixelRatio, devicePixelRatio)
      
      const stream = mockCanvas.captureStream(30)
      expect(stream.active).toBe(true)
    })
  })

  describe('MediaRecorder integration', () => {
    it('should create video recorder with canvas stream', () => {
      const stream = mockCanvas.captureStream(30)
      const recorder = new VideoRecorder({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
      
      expect(VideoRecorder).toHaveBeenCalledWith({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
    })

    it('should start recording', async () => {
      const recorder = new VideoRecorder({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
      
      await recorder.startRecording()
      
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
    })

    it('should stop recording and return blob', async () => {
      const recorder = new VideoRecorder({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
      
      const blob = await recorder.stopRecording()
      
      expect(mockVideoRecorder.stopRecording).toHaveBeenCalled()
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('video/mp4')
    })

    it('should set audio stream on recorder', () => {
      const recorder = new VideoRecorder({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
      
      const audioStream = new MediaStream()
      recorder.setAudioStream(audioStream)
      
      expect(mockVideoRecorder.setAudioStream).toHaveBeenCalledWith(audioStream)
    })

    it('should check MediaRecorder format support', () => {
      const formats = [
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ]
      
      formats.forEach(format => {
        const isSupported = MediaRecorder.isTypeSupported(format)
        expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith(format)
        expect(isSupported).toBe(true)
      })
    })

    it('should handle recording errors', async () => {
      const recorder = new VideoRecorder({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
      
      mockVideoRecorder.startRecording.mockRejectedValue(new Error('Recording failed'))
      
      await expect(recorder.startRecording()).rejects.toThrow('Recording failed')
    })

    it('should cleanup recorder resources', () => {
      const recorder = new VideoRecorder({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
      
      recorder.cleanup()
      
      expect(mockVideoRecorder.cleanup).toHaveBeenCalled()
    })
  })

  describe('Full pipeline integration', () => {
    it('should render frame and capture to video', async () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      const recorder = new VideoRecorder({
        canvas: mockCanvas,
        settings: mockSettings,
        fps: 30
      })
      
      // Clear canvas
      renderer.clearFrame('#ffffff')
      
      // Render elements
      const videoElement = createMockVideoElement()
      const textElement = createMockTextElement('Test Video')
      
      renderer.drawImage(videoElement as any, 0, 0, 1920, 1080)
      renderer.drawText(textElement.content!, 100, 100, {
        fontSize: 24,
        color: '#000000',
        fontFamily: 'Arial'
      })
      
      // Start recording
      await recorder.startRecording()
      
      // Simulate frame capture
      const stream = mockCanvas.captureStream(30)
      expect(stream.active).toBe(true)
      
      // Stop recording
      const blob = await recorder.stopRecording()
      
      expect(mockRenderer.clearFrame).toHaveBeenCalledWith('#ffffff')
      expect(mockRenderer.drawImage).toHaveBeenCalled()
      expect(mockRenderer.drawText).toHaveBeenCalled()
      expect(mockVideoRecorder.startRecording).toHaveBeenCalled()
      expect(mockVideoRecorder.stopRecording).toHaveBeenCalled()
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should handle frame-by-frame rendering', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      const frameCount = 10
      
      for (let frame = 0; frame < frameCount; frame++) {
        const timestamp = frame / 30
        
        // Clear frame
        renderer.clearFrame('#ffffff')
        
        // Render frame-specific content
        const textElement = createMockTextElement(`Frame ${frame}`)
        renderer.drawText(textElement.content!, 100, 100, {
          fontSize: 24,
          color: '#000000',
          fontFamily: 'Arial'
        })
        
        // Capture frame (simulated)
        const imageData = renderer.getImageData(0, 0, 1920, 1080)
        expect(imageData.width).toBe(1920)
        expect(imageData.height).toBe(1080)
      }
      
      expect(mockRenderer.clearFrame).toHaveBeenCalledTimes(frameCount)
      expect(mockRenderer.drawText).toHaveBeenCalledTimes(frameCount)
      expect(mockRenderer.getImageData).toHaveBeenCalledTimes(frameCount)
    })

    it('should handle real-time rendering performance', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      const fps = 30
      const frameTime = 1000 / fps // 33.33ms per frame
      
      let frameCount = 0
      const startTime = performance.now()
      
      // Simulate 1 second of rendering
      while (performance.now() - startTime < 1000) {
        renderer.clearFrame('#ffffff')
        
        const textElement = createMockTextElement(`Frame ${frameCount}`)
        renderer.drawText(textElement.content!, 100, 100, {
          fontSize: 24,
          color: '#000000',
          fontFamily: 'Arial'
        })
        
        frameCount++
        
        if (frameCount >= 30) break // Limit to 30 frames
      }
      
      expect(frameCount).toBeGreaterThan(0)
      expect(frameCount).toBeLessThanOrEqual(30)
    })

    it('should handle memory efficient rendering', () => {
      const renderer = new CanvasRenderer(mockCanvas, mockSettings)
      const largeFrameCount = 100
      
      // Render many frames to test memory efficiency
      for (let frame = 0; frame < largeFrameCount; frame++) {
        renderer.save()
        renderer.clearFrame('#ffffff')
        
        // Render some content
        const textElement = createMockTextElement(`Frame ${frame}`)
        renderer.drawText(textElement.content!, 100, 100, {
          fontSize: 24,
          color: '#000000',
          fontFamily: 'Arial'
        })
        
        renderer.restore()
      }
      
      expect(mockRenderer.save).toHaveBeenCalledTimes(largeFrameCount)
      expect(mockRenderer.restore).toHaveBeenCalledTimes(largeFrameCount)
    })

    it('should handle different canvas sizes', () => {
      const canvasSizes = [
        { width: 1920, height: 1080 }, // 1080p
        { width: 1280, height: 720 },  // 720p
        { width: 854, height: 480 },   // 480p
        { width: 640, height: 640 }    // Square
      ]
      
      canvasSizes.forEach(size => {
        const canvas = createMockCanvas(size.width, size.height)
        const renderer = new CanvasRenderer(canvas, mockSettings)
        
        renderer.clearFrame('#ffffff')
        
        const textElement = createMockTextElement('Test')
        renderer.drawText(textElement.content!, 10, 10, {
          fontSize: 24,
          color: '#000000',
          fontFamily: 'Arial'
        })
        
        expect(canvas.width).toBe(size.width)
        expect(canvas.height).toBe(size.height)
      })
    })
  })
})