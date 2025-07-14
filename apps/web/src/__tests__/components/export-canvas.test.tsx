import { describe, it, expect, beforeEach } from '@jest/globals'
import { render } from '@testing-library/react'
import React, { createRef } from 'react'
import { ExportCanvas, ExportCanvasRef } from '@/components/export-canvas'
import { createMockExportSettings } from '../utils/test-helpers'

describe('ExportCanvas', () => {
  let mockSettings: any

  beforeEach(() => {
    mockSettings = createMockExportSettings()
  })

  describe('Canvas ref exposure', () => {
    it('should expose getCanvas method', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      expect(ref.current?.getCanvas).toBeDefined()
      expect(typeof ref.current?.getCanvas).toBe('function')
    })

    it('should expose getContext method', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      expect(ref.current?.getContext).toBeDefined()
      expect(typeof ref.current?.getContext).toBe('function')
    })

    it('should expose clear method', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      expect(ref.current?.clear).toBeDefined()
      expect(typeof ref.current?.clear).toBe('function')
    })

    it('should expose capture method', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      expect(ref.current?.capture).toBeDefined()
      expect(typeof ref.current?.capture).toBe('function')
    })
  })

  describe('Canvas dimensions', () => {
    it('should set canvas dimensions from settings', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      const canvas = ref.current?.getCanvas()
      expect(canvas).toBeInstanceOf(HTMLCanvasElement)
      
      if (canvas) {
        // The canvas width/height will be affected by devicePixelRatio
        const dpr = window.devicePixelRatio || 1
        expect(canvas.width).toBe(mockSettings.width * dpr)
        expect(canvas.height).toBe(mockSettings.height * dpr)
        
        // Style dimensions should match settings exactly
        expect(canvas.style.width).toBe(`${mockSettings.width}px`)
        expect(canvas.style.height).toBe(`${mockSettings.height}px`)
      }
    })

    it('should handle different resolutions', () => {
      const hdSettings = createMockExportSettings({
        width: 1280,
        height: 720
      })
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={hdSettings} />)
      
      const canvas = ref.current?.getCanvas()
      
      if (canvas) {
        expect(canvas.style.width).toBe('1280px')
        expect(canvas.style.height).toBe('720px')
      }
    })

    it('should handle 4K resolution', () => {
      const uhd4kSettings = createMockExportSettings({
        width: 3840,
        height: 2160
      })
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={uhd4kSettings} />)
      
      const canvas = ref.current?.getCanvas()
      
      if (canvas) {
        expect(canvas.style.width).toBe('3840px')
        expect(canvas.style.height).toBe('2160px')
      }
    })
  })

  describe('High-DPI scaling', () => {
    it('should apply devicePixelRatio scaling', () => {
      // Mock devicePixelRatio
      const originalDPR = window.devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        writable: true
      })
      
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      const canvas = ref.current?.getCanvas()
      const ctx = ref.current?.getContext()
      
      if (canvas && ctx) {
        // Canvas should be scaled by DPR
        expect(canvas.width).toBe(mockSettings.width * 2)
        expect(canvas.height).toBe(mockSettings.height * 2)
        
        // Style should remain at original size
        expect(canvas.style.width).toBe(`${mockSettings.width}px`)
        expect(canvas.style.height).toBe(`${mockSettings.height}px`)
      }
      
      // Restore original DPR
      Object.defineProperty(window, 'devicePixelRatio', {
        value: originalDPR,
        writable: true
      })
    })

    it('should handle missing devicePixelRatio', () => {
      // Mock missing devicePixelRatio
      const originalDPR = window.devicePixelRatio
      delete (window as any).devicePixelRatio
      
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      const canvas = ref.current?.getCanvas()
      
      if (canvas) {
        // Should default to 1x scaling
        expect(canvas.width).toBe(mockSettings.width)
        expect(canvas.height).toBe(mockSettings.height)
      }
      
      // Restore original DPR
      Object.defineProperty(window, 'devicePixelRatio', {
        value: originalDPR,
        writable: true
      })
    })
  })

  describe('Context configuration', () => {
    it('should enable image smoothing', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      const ctx = ref.current?.getContext()
      
      if (ctx) {
        expect(ctx.imageSmoothingEnabled).toBe(true)
        expect(ctx.imageSmoothingQuality).toBe('high')
      }
    })

    it('should return valid 2D context', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      const ctx = ref.current?.getContext()
      
      expect(ctx).toBeInstanceOf(CanvasRenderingContext2D)
    })
  })

  describe('Clear method', () => {
    it('should clear canvas content', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      const ctx = ref.current?.getContext()
      const clearRectSpy = jest.spyOn(ctx!, 'clearRect')
      
      ref.current?.clear()
      
      // Should clear the entire canvas
      const canvas = ref.current?.getCanvas()
      if (canvas) {
        expect(clearRectSpy).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
      }
    })

    it('should handle missing context gracefully', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      // Mock null context
      const originalGetContext = (ref.current as any)?.getContext
      if (ref.current) {
        ;(ref.current as any).getContext = () => null
      }
      
      expect(() => ref.current?.clear()).not.toThrow()
      
      // Restore original method
      if (ref.current && originalGetContext) {
        ;(ref.current as any).getContext = originalGetContext
      }
    })
  })

  describe('Capture method', () => {
    it('should capture canvas as data URL', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      const canvas = ref.current?.getCanvas()
      
      if (canvas) {
        // Mock toDataURL
        canvas.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mock')
        
        const dataUrl = ref.current?.capture()
        
        expect(dataUrl).toBe('data:image/png;base64,mock')
        expect(canvas.toDataURL).toHaveBeenCalledWith('image/png')
      }
    })

    it('should return null when canvas is not available', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      // Mock null canvas
      const originalGetCanvas = ref.current?.getCanvas
      if (ref.current) {
        ;(ref.current as any).getCanvas = () => null
      }
      
      const dataUrl = ref.current?.capture()
      
      expect(dataUrl).toBeNull()
      
      // Restore original method
      if (ref.current && originalGetCanvas) {
        ;(ref.current as any).getCanvas = originalGetCanvas
      }
    })
  })

  describe('Canvas element rendering', () => {
    it('should render canvas element', () => {
      const { container } = render(<ExportCanvas settings={mockSettings} />)
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('should apply hidden class', () => {
      const { container } = render(<ExportCanvas settings={mockSettings} />)
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toHaveClass('hidden')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <ExportCanvas settings={mockSettings} className="custom-class" />
      )
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toHaveClass('hidden')
      expect(canvas).toHaveClass('custom-class')
    })

    it('should have correct style attributes', () => {
      const { container } = render(<ExportCanvas settings={mockSettings} />)
      
      const canvas = container.querySelector('canvas')
      
      if (canvas) {
        expect(canvas.style.width).toBe(`${mockSettings.width}px`)
        expect(canvas.style.height).toBe(`${mockSettings.height}px`)
      }
    })
  })

  describe('Settings updates', () => {
    it('should update canvas when settings change', () => {
      const ref = createRef<ExportCanvasRef>()
      
      const { rerender } = render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      // Change settings
      const newSettings = createMockExportSettings({
        width: 1280,
        height: 720
      })
      
      rerender(<ExportCanvas ref={ref} settings={newSettings} />)
      
      const canvas = ref.current?.getCanvas()
      
      if (canvas) {
        expect(canvas.style.width).toBe('1280px')
        expect(canvas.style.height).toBe('720px')
      }
    })

    it('should handle rapid settings changes', () => {
      const ref = createRef<ExportCanvasRef>()
      
      const { rerender } = render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      // Multiple rapid changes
      const settings720p = createMockExportSettings({ width: 1280, height: 720 })
      const settings480p = createMockExportSettings({ width: 854, height: 480 })
      
      rerender(<ExportCanvas ref={ref} settings={settings720p} />)
      rerender(<ExportCanvas ref={ref} settings={settings480p} />)
      
      const canvas = ref.current?.getCanvas()
      
      if (canvas) {
        expect(canvas.style.width).toBe('854px')
        expect(canvas.style.height).toBe('480px')
      }
    })
  })

  describe('Error handling', () => {
    it('should handle canvas creation failure gracefully', () => {
      // Mock document.createElement to return element without getContext
      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') {
          const mockCanvas = originalCreateElement.call(document, tagName)
          mockCanvas.getContext = jest.fn().mockReturnValue(null)
          return mockCanvas
        }
        return originalCreateElement.call(document, tagName)
      })
      
      const ref = createRef<ExportCanvasRef>()
      
      expect(() => {
        render(<ExportCanvas ref={ref} settings={mockSettings} />)
      }).not.toThrow()
      
      // Context should be null
      expect(ref.current?.getContext()).toBeNull()
      
      // Restore original createElement
      document.createElement = originalCreateElement
    })

    it('should handle context operations without canvas', () => {
      const ref = createRef<ExportCanvasRef>()
      
      render(<ExportCanvas ref={ref} settings={mockSettings} />)
      
      // Should not throw even if methods are called without proper setup
      expect(() => ref.current?.clear()).not.toThrow()
      expect(() => ref.current?.capture()).not.toThrow()
    })
  })
})