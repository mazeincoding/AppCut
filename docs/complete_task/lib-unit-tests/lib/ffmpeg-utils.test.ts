import { describe, it, expect } from '@jest/globals'
import { encodeImagesToVideo } from '@/lib/ffmpeg-utils'

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAF/gO+6KdFMwAAAABJRU5ErkJggg=='

const pngBytes = new Uint8Array(Buffer.from(tinyPngBase64, 'base64'))

// Simple smoke test to ensure FFmpeg encoding pipeline executes
// without throwing and returns a Blob instance.
describe('encodeImagesToVideo', () => {
  it('should encode small PNG frames into a video blob', async () => {
    const frames = [
      { name: 'frame-00000.png', data: pngBytes },
      { name: 'frame-00001.png', data: pngBytes },
      { name: 'frame-00002.png', data: pngBytes },
    ]

    const blob = await encodeImagesToVideo(frames, { fps: 1 })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('video/')
  })
})
