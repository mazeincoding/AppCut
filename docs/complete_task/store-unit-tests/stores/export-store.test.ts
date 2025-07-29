import { describe, it, expect, beforeEach } from '@jest/globals'
import { useExportStore } from '@/stores/export-store'
import { ExportFormat, ExportQuality } from '@/types/export'
import { act, renderHook } from '@testing-library/react'

describe('Export Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useExportStore())
    act(() => {
      result.current.resetExport()
    })
  })

  describe('Initial State', () => {
    it('should have correct default settings', () => {
      const { result } = renderHook(() => useExportStore())
      
      expect(result.current.settings.format).toBe(ExportFormat.MP4)
      expect(result.current.settings.quality).toBe(ExportQuality.HIGH)
      expect(result.current.settings.width).toBe(1920)
      expect(result.current.settings.height).toBe(1080)
      expect(result.current.settings.filename).toMatch(/export_/)
    })

    it('should have correct default progress', () => {
      const { result } = renderHook(() => useExportStore())
      
      expect(result.current.progress.isExporting).toBe(false)
      expect(result.current.progress.progress).toBe(0)
      expect(result.current.progress.currentFrame).toBe(0)
      expect(result.current.progress.totalFrames).toBe(0)
      expect(result.current.progress.estimatedTimeRemaining).toBe(0)
      expect(result.current.progress.status).toBe('')
    })

    it('should have no error initially', () => {
      const { result } = renderHook(() => useExportStore())
      
      expect(result.current.error).toBeNull()
    })
  })

  describe('updateSettings action', () => {
    it('should update format setting', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.updateSettings({ format: ExportFormat.WEBM })
      })
      
      expect(result.current.settings.format).toBe(ExportFormat.WEBM)
    })

    it('should update quality setting', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.updateSettings({ quality: ExportQuality.MEDIUM })
      })
      
      expect(result.current.settings.quality).toBe(ExportQuality.MEDIUM)
    })

    it('should update filename setting', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.updateSettings({ filename: 'custom-export' })
      })
      
      expect(result.current.settings.filename).toBe('custom-export')
    })

    it('should update multiple settings at once', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.updateSettings({
          format: ExportFormat.WEBM,
          quality: ExportQuality.LOW,
          filename: 'multi-update',
          width: 1280,
          height: 720
        })
      })
      
      expect(result.current.settings.format).toBe(ExportFormat.WEBM)
      expect(result.current.settings.quality).toBe(ExportQuality.LOW)
      expect(result.current.settings.filename).toBe('multi-update')
      expect(result.current.settings.width).toBe(1280)
      expect(result.current.settings.height).toBe(720)
    })

    it('should preserve existing settings when updating partial', () => {
      const { result } = renderHook(() => useExportStore())
      const originalFilename = result.current.settings.filename
      
      act(() => {
        result.current.updateSettings({ format: ExportFormat.WEBM })
      })
      
      expect(result.current.settings.format).toBe(ExportFormat.WEBM)
      expect(result.current.settings.filename).toBe(originalFilename)
      expect(result.current.settings.quality).toBe(ExportQuality.HIGH)
    })
  })

  describe('updateProgress action', () => {
    it('should update export progress', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.updateProgress({
          isExporting: true,
          progress: 50,
          status: 'Rendering frames...'
        })
      })
      
      expect(result.current.progress.isExporting).toBe(true)
      expect(result.current.progress.progress).toBe(50)
      expect(result.current.progress.status).toBe('Rendering frames...')
    })

    it('should update frame counts', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.updateProgress({
          currentFrame: 750,
          totalFrames: 1500
        })
      })
      
      expect(result.current.progress.currentFrame).toBe(750)
      expect(result.current.progress.totalFrames).toBe(1500)
    })

    it('should update time estimation', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.updateProgress({
          estimatedTimeRemaining: 30
        })
      })
      
      expect(result.current.progress.estimatedTimeRemaining).toBe(30)
    })

    it('should preserve existing progress when updating partial', () => {
      const { result } = renderHook(() => useExportStore())
      
      // Set initial progress
      act(() => {
        result.current.updateProgress({
          isExporting: true,
          totalFrames: 1500
        })
      })
      
      // Update only current frame
      act(() => {
        result.current.updateProgress({
          currentFrame: 750
        })
      })
      
      expect(result.current.progress.isExporting).toBe(true)
      expect(result.current.progress.totalFrames).toBe(1500)
      expect(result.current.progress.currentFrame).toBe(750)
    })
  })

  describe('setError action', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useExportStore())
      
      act(() => {
        result.current.setError('Test error message')
      })
      
      expect(result.current.error).toBe('Test error message')
    })

    it('should clear error message', () => {
      const { result } = renderHook(() => useExportStore())
      
      // Set error first
      act(() => {
        result.current.setError('Test error')
      })
      
      expect(result.current.error).toBe('Test error')
      
      // Clear error
      act(() => {
        result.current.setError(null)
      })
      
      expect(result.current.error).toBeNull()
    })
  })

  describe('resetExport action', () => {
    it('should reset all state to defaults', () => {
      const { result } = renderHook(() => useExportStore())
      
      // Modify state
      act(() => {
        result.current.updateSettings({
          format: ExportFormat.WEBM,
          filename: 'modified'
        })
        result.current.updateProgress({
          isExporting: true,
          progress: 75
        })
        result.current.setError('Test error')
      })
      
      // Verify state was modified
      expect(result.current.settings.format).toBe(ExportFormat.WEBM)
      expect(result.current.progress.isExporting).toBe(true)
      expect(result.current.error).toBe('Test error')
      
      // Reset
      act(() => {
        result.current.resetExport()
      })
      
      // Verify reset to defaults
      expect(result.current.settings.format).toBe(ExportFormat.MP4)
      expect(result.current.settings.quality).toBe(ExportQuality.HIGH)
      expect(result.current.progress.isExporting).toBe(false)
      expect(result.current.progress.progress).toBe(0)
      expect(result.current.error).toBeNull()
    })

    it('should generate new filename on reset', () => {
      const { result } = renderHook(() => useExportStore())
      const originalFilename = result.current.settings.filename
      
      // Wait a moment to ensure timestamp difference
      setTimeout(() => {
        act(() => {
          result.current.resetExport()
        })
        
        expect(result.current.settings.filename).not.toBe(originalFilename)
        expect(result.current.settings.filename).toMatch(/export_/)
      }, 10)
    })
  })
})