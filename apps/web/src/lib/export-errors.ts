export class ExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = "ExportError";
  }
}

export class MediaRecorderError extends ExportError {
  constructor(message: string, details?: any) {
    super(message, "MEDIARECORDER_ERROR", details);
    this.name = "MediaRecorderError";
  }
}

export class AudioMixerError extends ExportError {
  constructor(message: string, details?: any) {
    super(message, "AUDIO_MIXER_ERROR", details);
    this.name = "AudioMixerError";
  }
}

export class CanvasRenderError extends ExportError {
  constructor(message: string, details?: any) {
    super(message, "CANVAS_RENDER_ERROR", details);
    this.name = "CanvasRenderError";
  }
}

export class TimelineError extends ExportError {
  constructor(message: string, details?: any) {
    super(message, "TIMELINE_ERROR", details);
    this.name = "TimelineError";
  }
}

export class BrowserCompatibilityError extends ExportError {
  constructor(message: string, details?: any) {
    super(message, "BROWSER_COMPATIBILITY_ERROR", details);
    this.name = "BrowserCompatibilityError";
  }
}

export class MemoryError extends ExportError {
  constructor(message: string, details?: any) {
    super(message, "MEMORY_ERROR", details);
    this.name = "MemoryError";
  }
}

export function getUserFriendlyErrorMessage(error: Error): string {
  if (error instanceof ExportError) {
    switch (error.code) {
      case "MEDIARECORDER_ERROR":
        return "Failed to record video. Please check your browser's media recording capabilities.";
      case "AUDIO_MIXER_ERROR":
        return "Failed to process audio tracks. Please check your audio files and try again.";
      case "CANVAS_RENDER_ERROR":
        return "Failed to render video frames. Please check your video elements and try again.";
      case "TIMELINE_ERROR":
        return "Timeline processing error. Please check your project timeline and try again.";
      case "BROWSER_COMPATIBILITY_ERROR":
        return "Your browser doesn't support video export. Please try using a modern Chrome or Firefox browser.";
      case "MEMORY_ERROR":
        return "Insufficient memory to complete export. Please try exporting at a lower quality or shorter duration.";
      default:
        return error.message;
    }
  }
  
  return error.message || "An unknown error occurred during export.";
}

export function logExportError(error: Error, context: string): void {
  const errorInfo = {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
  
  console.error("Export Error:", errorInfo);
  
  // In a real app, you might want to send this to an error tracking service
  // trackError(errorInfo);
}

export function checkBrowserCompatibility(): {
  supported: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check MediaRecorder support
  if (!window.MediaRecorder) {
    issues.push("MediaRecorder API not supported");
  }
  
  // Check canvas.captureStream support
  if (!HTMLCanvasElement.prototype.captureStream) {
    issues.push("Canvas stream capture not supported");
  }
  
  // Check Web Audio API support
  if (!window.AudioContext && !window.webkitAudioContext) {
    issues.push("Web Audio API not supported");
  }
  
  // Check for necessary video codecs
  const testRecorder = new MediaRecorder(new MediaStream());
  const supportedTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/mp4;codecs=h264',
  ];
  
  const hasVideoCodec = supportedTypes.some(type => MediaRecorder.isTypeSupported(type));
  if (!hasVideoCodec) {
    issues.push("No supported video codecs available");
  }
  
  return {
    supported: issues.length === 0,
    issues,
  };
}

export function estimateMemoryUsage(
  width: number,
  height: number,
  duration: number,
  fps: number
): {
  estimatedMB: number;
  warning: string | null;
} {
  // Rough estimation: 4 bytes per pixel (RGBA) * frames
  const pixelsPerFrame = width * height;
  const totalFrames = duration * fps;
  const estimatedBytes = pixelsPerFrame * 4 * totalFrames;
  const estimatedMB = estimatedBytes / (1024 * 1024);
  
  let warning = null;
  
  if (estimatedMB > 1000) {
    warning = "High memory usage expected. Consider reducing quality or duration.";
  } else if (estimatedMB > 2000) {
    warning = "Very high memory usage. Export may fail on low-memory devices.";
  }
  
  return {
    estimatedMB: Math.round(estimatedMB),
    warning,
  };
}