import { describe, it, expect } from '@jest/globals'
import { ExportFormat, ExportQuality, ExportSettings, ExportProgress, ExportState } from '@/types/export'

describe('Export Types', () => {
  describe('ExportFormat enum', () => {
    it('should have correct MP4 value', () => {
      expect(ExportFormat.MP4).toBe('mp4')
    })

    it('should have correct WEBM value', () => {
      expect(ExportFormat.WEBM).toBe('webm')
    })

    it('should have correct MOV value', () => {
      expect(ExportFormat.MOV).toBe('mov')
    })

    it('should contain all expected formats', () => {
      const formats = Object.values(ExportFormat)
      expect(formats).toContain('mp4')
      expect(formats).toContain('webm')
      expect(formats).toContain('mov')
      expect(formats).toHaveLength(3)
    })
  })

  describe('ExportQuality enum', () => {
    it('should have correct HIGH value', () => {
      expect(ExportQuality.HIGH).toBe('1080p')
    })

    it('should have correct MEDIUM value', () => {
      expect(ExportQuality.MEDIUM).toBe('720p')
    })

    it('should have correct LOW value', () => {
      expect(ExportQuality.LOW).toBe('480p')
    })

    it('should contain all expected qualities', () => {
      const qualities = Object.values(ExportQuality)
      expect(qualities).toContain('1080p')
      expect(qualities).toContain('720p')
      expect(qualities).toContain('480p')
      expect(qualities).toHaveLength(3)
    })
  })

  describe('ExportSettings interface', () => {
    it('should accept valid export settings', () => {
      const settings: ExportSettings = {
        format: ExportFormat.MP4,
        quality: ExportQuality.HIGH,
        filename: 'test-export',
        width: 1920,
        height: 1080
      }

      expect(settings.format).toBe(ExportFormat.MP4)
      expect(settings.quality).toBe(ExportQuality.HIGH)
      expect(settings.filename).toBe('test-export')
      expect(settings.width).toBe(1920)
      expect(settings.height).toBe(1080)
    })

    it('should work with different format combinations', () => {
      const webmSettings: ExportSettings = {
        format: ExportFormat.WEBM,
        quality: ExportQuality.MEDIUM,
        filename: 'webm-export',
        width: 1280,
        height: 720
      }

      expect(webmSettings.format).toBe('webm')
      expect(webmSettings.quality).toBe('720p')
    })
  })

  describe('ExportProgress interface', () => {
    it('should accept valid progress data', () => {
      const progress: ExportProgress = {
        isExporting: true,
        progress: 50,
        currentFrame: 750,
        totalFrames: 1500,
        estimatedTimeRemaining: 30,
        status: 'Rendering frames...'
      }

      expect(progress.isExporting).toBe(true)
      expect(progress.progress).toBe(50)
      expect(progress.currentFrame).toBe(750)
      expect(progress.totalFrames).toBe(1500)
      expect(progress.estimatedTimeRemaining).toBe(30)
      expect(progress.status).toBe('Rendering frames...')
    })

    it('should handle completed export state', () => {
      const progress: ExportProgress = {
        isExporting: false,
        progress: 100,
        currentFrame: 1500,
        totalFrames: 1500,
        estimatedTimeRemaining: 0,
        status: 'Export complete!'
      }

      expect(progress.isExporting).toBe(false)
      expect(progress.progress).toBe(100)
    })
  })

  describe('ExportState interface', () => {
    it('should accept complete export state', () => {
      const state: ExportState = {
        settings: {
          format: ExportFormat.MP4,
          quality: ExportQuality.HIGH,
          filename: 'test-export',
          width: 1920,
          height: 1080
        },
        progress: {
          isExporting: false,
          progress: 0,
          currentFrame: 0,
          totalFrames: 0,
          estimatedTimeRemaining: 0,
          status: ''
        },
        error: null
      }

      expect(state.settings).toBeDefined()
      expect(state.progress).toBeDefined()
      expect(state.error).toBeNull()
    })

    it('should handle error state', () => {
      const state: ExportState = {
        settings: {
          format: ExportFormat.MP4,
          quality: ExportQuality.HIGH,
          filename: 'test-export',
          width: 1920,
          height: 1080
        },
        progress: {
          isExporting: false,
          progress: 25,
          currentFrame: 375,
          totalFrames: 1500,
          estimatedTimeRemaining: 0,
          status: 'Export failed'
        },
        error: 'MediaRecorder not supported'
      }

      expect(state.error).toBe('MediaRecorder not supported')
      expect(state.progress.isExporting).toBe(false)
      expect(state.progress.status).toBe('Export failed')
    })
  })
})