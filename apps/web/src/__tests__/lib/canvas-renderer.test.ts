import { describe, it, expect, beforeEach } from '@jest/globals'
import { CanvasRenderer } from '@/lib/canvas-renderer'
import { createMockCanvas, createMockExportSettings, createMockImageElement_DOM, createMockVideoElement_DOM } from '../utils/test-helpers'

describe('CanvasRenderer', () => {
  let canvas: HTMLCanvasElement
  let renderer: CanvasRenderer
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = createMockCanvas()
    const settings = createMockExportSettings()
    renderer = new CanvasRenderer(canvas, settings)
    ctx = (renderer as any).ctx  // Get the actual context from renderer
  })

  describe('Constructor', () => {
    it('should initialize with canvas and settings', () => {
      expect(renderer).toBeInstanceOf(CanvasRenderer)
      expect(canvas.width).toBe(1920)
      expect(canvas.height).toBe(1080)
    })

    it('should throw error if canvas context is not available', () => {
      const mockCanvas = {
        getContext: () => null
      } as unknown as HTMLCanvasElement

      expect(() => {
        new CanvasRenderer(mockCanvas, createMockExportSettings())
      }).toThrow('Could not get 2D context from canvas')
    })

    it('should set canvas dimensions from settings', () => {
      const settings = createMockExportSettings({
        width: 1280,
        height: 720
      })
      const testCanvas = createMockCanvas()
      new CanvasRenderer(testCanvas, settings)
      
      expect(testCanvas.width).toBe(1280)
      expect(testCanvas.height).toBe(720)
    })
  })

  describe('clearFrame method', () => {
    it('should clear canvas without background color', () => {
      // Test that clearFrame works - the method should complete without error
      expect(() => renderer.clearFrame()).not.toThrow()
      
      // Since our mock context has spies built-in, we can verify calls
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
    })

    it('should clear canvas with background color', () => {
      renderer.clearFrame('#ff0000')
      
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
      expect(ctx.fillStyle).toBe('#ff0000')
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
    })

    it('should handle transparent background', () => {
      renderer.clearFrame('transparent')
      
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
      expect(ctx.fillStyle).toBe('transparent')
    })
  })

  describe('drawImage method', () => {
    it('should draw image to canvas', () => {
      const image = createMockImageElement_DOM()
      
      renderer.drawImage(image, 100, 200, 800, 600)
      
      expect(ctx.drawImage).toHaveBeenCalledWith(image, 100, 200, 800, 600)
    })

    it('should handle video element', () => {
      const video = createMockVideoElement_DOM()
      
      renderer.drawImage(video, 0, 0, 1920, 1080)
      
      expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 1920, 1080)
    })

    it('should handle canvas element', () => {
      const sourceCanvas = createMockCanvas(800, 600)
      
      renderer.drawImage(sourceCanvas, 50, 100, 800, 600)
      
      expect(ctx.drawImage).toHaveBeenCalledWith(sourceCanvas, 50, 100, 800, 600)
    })
  })

  describe('drawText method', () => {
    it('should draw text with default options', () => {
      renderer.drawText('Hello World', 100, 200)
      
      expect(ctx.font).toBe('24px Arial, sans-serif')
      expect(ctx.fillStyle).toBe('#000000')
      expect(ctx.textAlign).toBe('left')
      expect(ctx.textBaseline).toBe('top')
      expect(ctx.fillText).toHaveBeenCalledWith('Hello World', 100, 200)
    })

    it('should draw text with custom options', () => {
      renderer.drawText('Custom Text', 150, 250, {
        fontSize: 36,
        fontFamily: 'Helvetica',
        color: '#ff0000',
        textAlign: 'center',
        textBaseline: 'middle'
      })
      
      expect(ctx.font).toBe('36px Helvetica')
      expect(ctx.fillStyle).toBe('#ff0000')
      expect(ctx.textAlign).toBe('center')
      expect(ctx.textBaseline).toBe('middle')
      expect(ctx.fillText).toHaveBeenCalledWith('Custom Text', 150, 250)
    })

    it('should respect maxWidth option', () => {
      renderer.drawText('Long text that should be constrained', 100, 200, {
        maxWidth: 400
      })
      
      expect(ctx.fillText).toHaveBeenCalledWith(
        'Long text that should be constrained',
        100,
        200,
        400
      )
    })

    it('should handle empty text', () => {
      renderer.drawText('', 100, 200)
      
      expect(ctx.fillText).toHaveBeenCalledWith('', 100, 200)
    })
  })

  describe('Filter methods', () => {
    it('should apply blur filter', () => {
      renderer.applyBlur(5)
      
      expect(ctx.filter).toBe('blur(5px)')
    })

    it('should reset filters', () => {
      renderer.applyBlur(10)
      expect(ctx.filter).toBe('blur(10px)')
      
      renderer.resetFilters()
      expect(ctx.filter).toBe('none')
    })

    it('should handle zero blur radius', () => {
      renderer.applyBlur(0)
      
      expect(ctx.filter).toBe('blur(0px)')
    })
  })

  describe('Context state methods', () => {
    it('should save context state', () => {
      renderer.save()
      
      expect(ctx.save).toHaveBeenCalled()
    })

    it('should restore context state', () => {
      renderer.restore()
      
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should handle save/restore pairs', () => {
      renderer.save()
      renderer.restore()
      
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })
  })

  describe('Utility methods', () => {
    it('should get canvas data URL', () => {
      // Mock toDataURL
      canvas.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mockdata')
      
      const dataUrl = renderer.toDataURL()
      
      expect(dataUrl).toBe('data:image/png;base64,mockdata')
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/png', undefined)
    })

    it('should get canvas data URL with format and quality', () => {
      canvas.toDataURL = jest.fn().mockReturnValue('data:image/jpeg;base64,mockdata')
      
      const dataUrl = renderer.toDataURL('image/jpeg', 0.8)
      
      expect(dataUrl).toBe('data:image/jpeg;base64,mockdata')
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8)
    })

    it('should get canvas dimensions', () => {
      const dimensions = renderer.getDimensions()
      
      expect(dimensions.width).toBe(1920)
      expect(dimensions.height).toBe(1080)
    })

    it('should get updated dimensions after resize', () => {
      canvas.width = 1280
      canvas.height = 720
      
      const dimensions = renderer.getDimensions()
      
      expect(dimensions.width).toBe(1280)
      expect(dimensions.height).toBe(720)
    })
  })
})