import '@testing-library/jest-dom'

// Mock MediaRecorder
global.MediaRecorder = class MockMediaRecorder {
  constructor() {
    this.state = 'inactive'
    this.ondataavailable = null
    this.onstop = null
    this.onerror = null
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) {
      this.onstop()
    }
  }

  pause() {
    this.state = 'paused'
  }

  resume() {
    this.state = 'recording'
  }

  static isTypeSupported(mimeType) {
    return ['video/webm', 'video/mp4'].includes(mimeType)
  }
}

// Mock AudioContext
global.AudioContext = class MockAudioContext {
  constructor() {
    this.sampleRate = 44100
    this.destination = {}
  }

  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length)
    }
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {}
    }
  }

  createMediaStreamDestination() {
    return {
      stream: new MediaStream()
    }
  }

  decodeAudioData() {
    return Promise.resolve(this.createBuffer(2, 44100, 44100))
  }

  close() {
    return Promise.resolve()
  }
}

// Mock HTMLCanvasElement.captureStream
HTMLCanvasElement.prototype.captureStream = function() {
  return new MediaStream()
}

// Mock HTMLCanvasElement.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function(contextType, options) {
  if (contextType === '2d') {
    const mockContext = {
      canvas: this,
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      fillText: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      _fillStyle: '#000000',
      _font: '10px sans-serif',
      _textAlign: 'start',
      _textBaseline: 'alphabetic',
      _filter: 'none',
      _imageSmoothingEnabled: true,
      _imageSmoothingQuality: 'low',
      get fillStyle() { return this._fillStyle },
      set fillStyle(value) { this._fillStyle = value },
      get font() { return this._font },
      set font(value) { this._font = value },
      get textAlign() { return this._textAlign },
      set textAlign(value) { this._textAlign = value },
      get textBaseline() { return this._textBaseline },
      set textBaseline(value) { this._textBaseline = value },
      get filter() { return this._filter },
      set filter(value) { this._filter = value },
      get imageSmoothingEnabled() { return this._imageSmoothingEnabled },
      set imageSmoothingEnabled(value) { this._imageSmoothingEnabled = value },
      get imageSmoothingQuality() { return this._imageSmoothingQuality },
      set imageSmoothingQuality(value) { this._imageSmoothingQuality = value }
    }
    return mockContext
  }
  return originalGetContext.call(this, contextType, options)
}

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})