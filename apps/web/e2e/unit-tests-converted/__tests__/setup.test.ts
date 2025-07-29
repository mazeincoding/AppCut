import { describe, it, expect } from '@jest/globals'
import { createMockCanvas, createMockExportSettings } from './utils/test-helpers'
import { ExportFormat, ExportQuality } from '@/types/export'

describe('Test Environment Setup', () => {
  it('should create mock canvas element', () => {
    const canvas = createMockCanvas()
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(canvas.width).toBe(1920)
    expect(canvas.height).toBe(1080)
  })

  it('should create mock export settings', () => {
    const settings = createMockExportSettings()
    expect(settings.format).toBe(ExportFormat.MP4)
    expect(settings.quality).toBe(ExportQuality.HIGH)
    expect(settings.width).toBe(1920)
    expect(settings.height).toBe(1080)
    expect(settings.filename).toMatch(/test_export_/)
  })

  it('should have MediaRecorder mock', () => {
    expect(global.MediaRecorder).toBeDefined()
    expect(MediaRecorder.isTypeSupported('video/webm')).toBe(true)
  })

  it('should have AudioContext mock', () => {
    const audioContext = new AudioContext()
    expect(audioContext.sampleRate).toBe(44100)
    expect(audioContext.createBuffer).toBeDefined()
  })

  it('should have canvas 2D context mock', () => {
    const canvas = createMockCanvas()
    const ctx = canvas.getContext('2d')
    expect(ctx).toBeDefined()
    expect(ctx?.fillRect).toBeDefined()
    expect(ctx?.drawImage).toBeDefined()
  })
})