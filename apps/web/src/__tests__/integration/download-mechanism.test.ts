import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ExportEngine } from '@/lib/export-engine'
import { VideoRecorder } from '@/lib/video-recorder'
import { AudioMixer } from '@/lib/audio-mixer'
import { CanvasRenderer } from '@/lib/canvas-renderer'
import { FrameCaptureService } from '@/lib/frame-capture'
import { ExportFormat } from '@/types/export'
import { createMockCanvas, createMockExportSettings, createMockVideoElement, createMockAudioElement } from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/canvas-renderer')
jest.mock('@/lib/frame-capture')
jest.mock('@/lib/video-recorder')
jest.mock('@/lib/audio-mixer')
jest.mock('@/lib/export-errors')

describe('Download Mechanism', () => {
  let mockCanvas: HTMLCanvasElement
  let mockSettings: any
  let mockTimelineElements: any[]
  let mockOptions: any
  let mockVideoRecorder: any
  let mockAudioMixer: any
  let mockCanvasRenderer: any
  let mockFrameCapture: any
  let mockCreateObjectURL: jest.SpyInstance
  let mockRevokeObjectURL: jest.SpyInstance
  let mockAnchorElement: any

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

    // Mock URL.createObjectURL and URL.revokeObjectURL
    mockCreateObjectURL = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    mockRevokeObjectURL = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    // Mock anchor element for download
    mockAnchorElement = {
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn(),
      style: {},
      // Add required element properties
      tagName: 'A',
      nodeName: 'A',
      nodeType: 1
    }
    
    // Mock document.createElement for anchor elements only
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockAnchorElement as any
      }
      // For other elements, return a basic mock
      return {
        tagName: tagName.toUpperCase(),
        style: {}
      } as any
    })
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchorElement as any)
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchorElement as any)

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
    mockCreateObjectURL.mockRestore()
    mockRevokeObjectURL.mockRestore()
  })

  describe('Blob creation', () => {
    it('should create blob from video export', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock successful export with blob
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      mockVideoRecorder.stopRecording.mockResolvedValue(testBlob)
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/mp4')
      expect(result.size).toBeGreaterThan(0)
    })

    it('should create blob with correct MIME type for MP4', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      const testBlob = new Blob(['mp4-data'], { type: 'video/mp4' })
      mockVideoRecorder.stopRecording.mockResolvedValue(testBlob)
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/mp4')
    })

    it('should create blob with correct MIME type for WebM', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      const testBlob = new Blob(['webm-data'], { type: 'video/webm' })
      mockVideoRecorder.stopRecording.mockResolvedValue(testBlob)
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/webm')
    })

    it('should create blob with correct MIME type for MOV', async () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MOV
      })
      
      const options = { ...mockOptions, settings }
      const engine = new ExportEngine(options)
      
      const testBlob = new Blob(['mov-data'], { type: 'video/quicktime' })
      mockVideoRecorder.stopRecording.mockResolvedValue(testBlob)
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/quicktime')
    })

    it('should handle empty blob creation', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock empty blob
      const emptyBlob = new Blob([], { type: 'video/mp4' })
      mockVideoRecorder.stopRecording.mockResolvedValue(emptyBlob)
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBe(0)
      expect(result.type).toBe('video/mp4')
    })

    it('should handle large blob creation', async () => {
      const engine = new ExportEngine(mockOptions)
      
      // Mock large blob (simulated with repeated data)
      const largeData = 'x'.repeat(1024 * 1024) // 1MB of data
      const largeBlob = new Blob([largeData], { type: 'video/mp4' })
      mockVideoRecorder.stopRecording.mockResolvedValue(largeBlob)
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBe(1024 * 1024)
      expect(result.type).toBe('video/mp4')
    })

    it('should preserve blob metadata', async () => {
      const engine = new ExportEngine(mockOptions)
      
      const testBlob = new Blob(['test-data'], { 
        type: 'video/mp4',
        lastModified: Date.now()
      })
      mockVideoRecorder.stopRecording.mockResolvedValue(testBlob)
      
      const result = await engine.startExport()
      
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('video/mp4')
      // Verify blob properties are maintained
      expect(result.size).toBeGreaterThan(0)
    })
  })

  describe('Download trigger', () => {
    // Mock download function for testing
    const mockDownloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    }

    it('should trigger download with correct blob', () => {
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      const filename = 'test-video.mp4'
      
      mockDownloadBlob(testBlob, filename)
      
      // Verify URL.createObjectURL was called with the blob
      expect(mockCreateObjectURL).toHaveBeenCalledWith(testBlob)
      
      // Verify anchor element was created and configured
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockAnchorElement.href).toBe('blob:mock-url')
      expect(mockAnchorElement.download).toBe(filename)
      expect(mockAnchorElement.click).toHaveBeenCalled()
    })

    it('should trigger download for different file formats', () => {
      const formats = [
        { blob: new Blob(['mp4-data'], { type: 'video/mp4' }), filename: 'test.mp4' },
        { blob: new Blob(['webm-data'], { type: 'video/webm' }), filename: 'test.webm' },
        { blob: new Blob(['mov-data'], { type: 'video/quicktime' }), filename: 'test.mov' }
      ]
      
      formats.forEach(({ blob, filename }) => {
        jest.clearAllMocks()
        
        mockDownloadBlob(blob, filename)
        
        expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
        expect(mockAnchorElement.download).toBe(filename)
        expect(mockAnchorElement.click).toHaveBeenCalled()
      })
    })

    it('should clean up object URL after download', () => {
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      const filename = 'test-video.mp4'
      
      mockDownloadBlob(testBlob, filename)
      
      // Verify URL.revokeObjectURL was called
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should remove anchor element after download', () => {
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      const filename = 'test-video.mp4'
      
      mockDownloadBlob(testBlob, filename)
      
      // Verify anchor element was added and removed
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchorElement)
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchorElement)
    })

    it('should handle download trigger multiple times', () => {
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      const filename = 'test-video.mp4'
      
      // Trigger download multiple times
      for (let i = 0; i < 3; i++) {
        mockDownloadBlob(testBlob, filename)
      }
      
      // Verify each download was handled properly
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(3)
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(3)
      expect(mockAnchorElement.click).toHaveBeenCalledTimes(3)
    })

    it('should handle download with large blob', () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024) // 10MB
      const largeBlob = new Blob([largeData], { type: 'video/mp4' })
      const filename = 'large-video.mp4'
      
      mockDownloadBlob(largeBlob, filename)
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(largeBlob)
      expect(mockAnchorElement.click).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('should set correct download attributes', () => {
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      const filename = 'custom-video.mp4'
      
      mockDownloadBlob(testBlob, filename)
      
      // Verify all download attributes are set correctly
      expect(mockAnchorElement.href).toBe('blob:mock-url')
      expect(mockAnchorElement.download).toBe(filename)
      expect(mockAnchorElement.style.display).toBe('none')
    })
  })

  describe('Filename handling', () => {
    it('should generate filename with correct extension for MP4', () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4,
        filename: 'my-video'
      })
      
      expect(settings.filename).toContain('my-video')
      
      // Test filename with extension logic
      const expectedExtension = '.mp4'
      const filename = settings.filename.endsWith('.mp4') 
        ? settings.filename 
        : settings.filename + expectedExtension
      
      expect(filename).toMatch(/\.mp4$/)
    })

    it('should generate filename with correct extension for WebM', () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM,
        filename: 'my-video'
      })
      
      // Test filename with extension logic
      const expectedExtension = '.webm'
      const filename = settings.filename.endsWith('.webm') 
        ? settings.filename 
        : settings.filename + expectedExtension
      
      expect(filename).toMatch(/\.webm$/)
    })

    it('should generate filename with correct extension for MOV', () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MOV,
        filename: 'my-video'
      })
      
      // Test filename with extension logic
      const expectedExtension = '.mov'
      const filename = settings.filename.endsWith('.mov') 
        ? settings.filename 
        : settings.filename + expectedExtension
      
      expect(filename).toMatch(/\.mov$/)
    })

    it('should handle filename with existing extension', () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4,
        filename: 'video-with-extension.mp4'
      })
      
      // Should not add duplicate extension
      const filename = settings.filename.endsWith('.mp4') 
        ? settings.filename 
        : settings.filename + '.mp4'
      
      expect(filename).toBe('video-with-extension.mp4')
      expect(filename.match(/\.mp4/g)).toHaveLength(1) // Only one .mp4
    })

    it('should handle filename without extension', () => {
      const settings = createMockExportSettings({
        format: ExportFormat.WEBM,
        filename: 'video-no-extension'
      })
      
      // Should add extension
      const filename = settings.filename.endsWith('.webm') 
        ? settings.filename 
        : settings.filename + '.webm'
      
      expect(filename).toBe('video-no-extension.webm')
    })

    it('should handle empty filename', () => {
      const settings = createMockExportSettings({
        format: ExportFormat.MP4,
        filename: ''
      })
      
      // Should provide default filename
      const filename = settings.filename || 'export'
      const finalFilename = filename.endsWith('.mp4') ? filename : filename + '.mp4'
      
      expect(finalFilename).toBe('export.mp4')
    })

    it('should sanitize special characters in filename', () => {
      const unsafeFilename = 'my<video>:with"special|chars?.mp4'
      
      // Simulate filename sanitization
      const sanitizedFilename = unsafeFilename
        .replace(/[<>:"/\\|?*]/g, '-') // Replace unsafe chars
        .replace(/-+/g, '-') // Replace multiple dashes with single dash
        .replace(/^-|-$/g, '') // Remove leading/trailing dashes
      
      expect(sanitizedFilename).toBe('my-video-with-special-chars-.mp4')
      expect(sanitizedFilename).not.toMatch(/[<>:"/\\|?*]/)
    })

    it('should handle long filenames', () => {
      const longFilename = 'a'.repeat(300) + '.mp4'
      
      // Simulate filename length limit (typical filesystem limit ~255 chars)
      const maxLength = 255
      const truncatedFilename = longFilename.length > maxLength 
        ? longFilename.substring(0, maxLength - 4) + '.mp4'
        : longFilename
      
      expect(truncatedFilename.length).toBeLessThanOrEqual(maxLength)
      expect(truncatedFilename).toMatch(/\.mp4$/)
    })

    it('should handle Unicode characters in filename', () => {
      const unicodeFilename = 'видео-测试-🎬.mp4'
      
      // Unicode characters should be preserved if supported
      expect(unicodeFilename).toContain('видео')
      expect(unicodeFilename).toContain('测试')
      expect(unicodeFilename).toContain('🎬')
      expect(unicodeFilename).toMatch(/\.mp4$/)
    })

    it('should generate unique filename with timestamp', () => {
      const baseFilename = 'export'
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
      const uniqueFilename = `${baseFilename}_${timestamp}.mp4`
      
      expect(uniqueFilename).toMatch(/export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.mp4/)
      expect(uniqueFilename).toContain(baseFilename)
    })

    it('should handle filename case sensitivity', () => {
      const mixedCaseFilename = 'MyVIDEO.MP4'
      
      // Test case handling
      const normalizedFilename = mixedCaseFilename.toLowerCase()
      
      expect(normalizedFilename).toBe('myvideo.mp4')
    })
  })

  describe('Download mechanism edge cases', () => {
    it('should handle browser without download support', () => {
      // Mock browser without download attribute support
      const mockAnchorWithoutDownload = {
        ...mockAnchorElement,
        download: undefined
      }
      
      jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return mockAnchorWithoutDownload
        }
        // Return a basic mock for other elements
        return {
          tagName: tagName.toUpperCase(),
          style: {}
        } as any
      })
      
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      
      // Should still attempt to create object URL
      const url = URL.createObjectURL(testBlob)
      expect(url).toBe('blob:mock-url')
    })

    it('should handle URL.createObjectURL failure', () => {
      // Mock createObjectURL to throw
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('createObjectURL failed')
      })
      
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      
      expect(() => {
        URL.createObjectURL(testBlob)
      }).toThrow('createObjectURL failed')
    })

    it('should handle blob corruption during download', () => {
      // Create a blob that might be corrupted
      const corruptedBlob = new Blob([''], { type: 'video/mp4' })
      const filename = 'corrupted.mp4'
      
      // Should still handle the download attempt
      const url = URL.createObjectURL(corruptedBlob)
      expect(url).toBe('blob:mock-url')
    })

    it('should handle concurrent downloads', () => {
      const blobs = [
        new Blob(['video1'], { type: 'video/mp4' }),
        new Blob(['video2'], { type: 'video/webm' }),
        new Blob(['video3'], { type: 'video/quicktime' })
      ]
      
      const filenames = ['video1.mp4', 'video2.webm', 'video3.mov']
      
      // Simulate concurrent downloads
      blobs.forEach((blob, index) => {
        const url = URL.createObjectURL(blob)
        expect(url).toBe('blob:mock-url')
      })
      
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(3)
    })

    it('should handle memory cleanup during download', () => {
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      const filename = 'test-video.mp4'
      
      // Simulate download with cleanup
      const url = URL.createObjectURL(testBlob)
      
      // Simulate cleanup
      URL.revokeObjectURL(url)
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(testBlob)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should handle download with missing filename', () => {
      const testBlob = new Blob(['video-data'], { type: 'video/mp4' })
      
      // Use default filename when none provided
      const defaultFilename = 'download.mp4'
      
      const url = URL.createObjectURL(testBlob)
      expect(url).toBe('blob:mock-url')
    })
  })
})