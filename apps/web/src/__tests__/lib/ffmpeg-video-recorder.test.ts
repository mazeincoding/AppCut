import { describe, it, expect } from '@jest/globals'
import { FFmpegVideoRecorder } from '@/lib/ffmpeg-video-recorder'
import { createMockExportSettings } from '../utils/test-helpers'

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAF/gO+6KdFMwAAAABJRU5ErkJggg=='

const dataUrl = `data:image/png;base64,${tinyPngBase64}`

describe('FFmpegVideoRecorder', () => {
  it('should encode added frames into a video', async () => {
    const settings = createMockExportSettings()
    const recorder = new FFmpegVideoRecorder({ fps: 1, settings })

    await recorder.startRecording()
    await recorder.addFrame(dataUrl, 0)
    await recorder.addFrame(dataUrl, 1)
    const blob = await recorder.stopRecording()

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('video/')
  })
})
