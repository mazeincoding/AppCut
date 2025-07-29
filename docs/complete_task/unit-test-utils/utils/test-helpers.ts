import { ExportSettings, ExportFormat, ExportQuality } from '@/types/export'
import { TimelineElement } from '@/types/timeline'

/**
 * Create a mock canvas element for testing
 */
export function createMockCanvas(width = 1920, height = 1080): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * Create mock export settings for testing
 */
export function createMockExportSettings(overrides?: Partial<ExportSettings>): ExportSettings {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
  
  return {
    format: ExportFormat.MP4,
    quality: ExportQuality.HIGH,
    filename: `test_export_${timestamp}`,
    width: 1920,
    height: 1080,
    ...overrides
  }
}

/**
 * Create mock timeline elements for testing
 */
export function createMockTimelineElement(overrides?: Partial<TimelineElement>): TimelineElement {
  return {
    id: `element_${Math.random().toString(36).substr(2, 9)}`,
    type: 'video',
    src: 'test-video.mp4',
    startTime: 0,
    endTime: 10,
    duration: 10,
    trackId: 'track1',
    layer: 1,
    volume: 1.0,
    pan: 0.0,
    ...overrides
  }
}

/**
 * Create a video element with timeline elements
 */
export function createMockVideoElement(): TimelineElement {
  return createMockTimelineElement({
    type: 'video',
    src: 'test-video.mp4',
    hasAudio: true
  })
}

/**
 * Create an audio element
 */
export function createMockAudioElement(): TimelineElement {
  return createMockTimelineElement({
    type: 'audio',
    src: 'test-audio.mp3'
  })
}

/**
 * Create a text element
 */
export function createMockTextElement(content = 'Test Text'): TimelineElement {
  return createMockTimelineElement({
    type: 'text',
    content,
    fontSize: 24,
    fontFamily: 'Arial',
    color: '#000000'
  })
}

/**
 * Create an image element
 */
export function createMockImageElement(): TimelineElement {
  return createMockTimelineElement({
    type: 'image',
    src: 'test-image.jpg'
  })
}

/**
 * Create a timeline with multiple elements
 */
export function createMockTimeline(): TimelineElement[] {
  return [
    createMockVideoElement(),
    createMockAudioElement(),
    createMockTextElement(),
    createMockImageElement()
  ]
}

/**
 * Create a mock audio buffer for testing
 */
export function createMockAudioBuffer(
  channels = 2, 
  length = 44100, 
  sampleRate = 44100
): AudioBuffer {
  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (channel: number) => new Float32Array(length),
    copyFromChannel: () => {},
    copyToChannel: () => {}
  } as AudioBuffer
}

/**
 * Create a mock media stream
 */
export function createMockMediaStream(): MediaStream {
  return new MediaStream()
}

/**
 * Create a mock blob for testing
 */
export function createMockBlob(type = 'video/mp4'): Blob {
  return new Blob(['mock video data'], { type })
}

/**
 * Wait for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a mock progress callback for testing
 */
export function createMockProgressCallback(): jest.Mock {
  return jest.fn((progress: number, status: string) => {
    // Mock implementation
  })
}

/**
 * Create a mock error callback for testing
 */
export function createMockErrorCallback(): jest.Mock {
  return jest.fn((error: string) => {
    // Mock implementation
  })
}

/**
 * Assert that a value is approximately equal (for float comparisons)
 */
export function expectApproximately(actual: number, expected: number, tolerance = 0.01): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

/**
 * Create a mock video element
 */
export function createMockVideoElement_DOM(): HTMLVideoElement {
  const video = document.createElement('video')
  
  // Mock video element properties that are read-only
  Object.defineProperty(video, 'videoWidth', {
    value: 1920,
    writable: false
  })
  
  Object.defineProperty(video, 'videoHeight', {
    value: 1080,
    writable: false
  })
  
  Object.defineProperty(video, 'duration', {
    value: 10,
    writable: false
  })
  
  Object.defineProperty(video, 'currentTime', {
    get: () => 0,
    set: () => {}
  })
  
  return video
}

/**
 * Create a mock image element
 */
export function createMockImageElement_DOM(): HTMLImageElement {
  const img = document.createElement('img')
  img.width = 1920
  img.height = 1080
  img.src = 'test-image.jpg'
  return img
}