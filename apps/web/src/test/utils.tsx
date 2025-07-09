import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'

// Mock providers for testing
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test utilities for video editor specific functionality
export const createMockVideoFile = (
  name = 'test-video.mp4',
  size = 1024 * 1024, // 1MB
  type = 'video/mp4'
) => {
  const content = new Array(size).fill('a').join('')
  return new File([content], name, { type })
}

export const createMockAudioFile = (
  name = 'test-audio.mp3',
  size = 512 * 1024, // 512KB
  type = 'audio/mp3'
) => {
  const content = new Array(size).fill('a').join('')
  return new File([content], name, { type })
}

export const createMockImageFile = (
  name = 'test-image.jpg',
  size = 256 * 1024, // 256KB
  type = 'image/jpeg'
) => {
  const content = new Array(size).fill('a').join('')
  return new File([content], name, { type })
}

// Mock timeline data for editor tests
export const createMockTimelineTrack = (id: string, type: 'video' | 'audio') => ({
  id,
  type,
  clips: [],
  muted: false,
  volume: 1,
  locked: false,
})

export const createMockVideoClip = (id: string, startTime = 0, duration = 5) => ({
  id,
  type: 'video' as const,
  startTime,
  duration,
  file: createMockVideoFile(),
  trimStart: 0,
  trimEnd: duration,
})

export const createMockAudioClip = (id: string, startTime = 0, duration = 5) => ({
  id,
  type: 'audio' as const,
  startTime,
  duration,
  file: createMockAudioFile(),
  trimStart: 0,
  trimEnd: duration,
  volume: 1,
})

// Helper to wait for async operations in tests
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock drag and drop events
export const createMockDragEvent = (type: string, dataTransfer?: Partial<DataTransfer>) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as any
  event.dataTransfer = {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [],
    items: [],
    types: [],
    clearData: vi.fn(),
    getData: vi.fn(),
    setData: vi.fn(),
    setDragImage: vi.fn(),
    ...dataTransfer,
  }
  return event
}

// Mock keyboard events for timeline navigation
export const createMockKeyboardEvent = (
  key: string,
  options: Partial<KeyboardEventInit> = {}
) => {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
}

// Helper to mock video element with specific properties
export const createMockVideoElement = (overrides: Partial<HTMLVideoElement> = {}) => {
  const video = document.createElement('video')
  Object.assign(video, {
    duration: 10,
    currentTime: 0,
    paused: true,
    ended: false,
    readyState: 4, // HAVE_ENOUGH_DATA
    videoWidth: 1920,
    videoHeight: 1080,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    ...overrides,
  })
  return video
}

// Helper to mock canvas context for video processing tests
export const createMockCanvasContext = () => ({
  canvas: document.createElement('canvas'),
  drawImage: vi.fn(),
  getImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  }),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
})

// Helper to test error boundaries
export const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Mock local storage for settings tests
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: 0,
    key: vi.fn(),
  }
}
