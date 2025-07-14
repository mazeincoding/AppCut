import { ExportSettings, ExportFormat } from "@/types/export";

export interface VideoRecorderOptions {
  canvas: HTMLCanvasElement;
  settings: ExportSettings;
  fps: number;
  audioStream?: MediaStream;
}

export class VideoRecorder {
  private canvas: HTMLCanvasElement;
  private settings: ExportSettings;
  private fps: number;
  private audioStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(options: VideoRecorderOptions) {
    this.canvas = options.canvas;
    this.settings = options.settings;
    this.fps = options.fps;
    this.audioStream = options.audioStream || null;
  }

  /**
   * Initialize MediaRecorder with appropriate codec settings
   */
  private setupMediaRecorder(): void {
    if (!this.canvas) {
      throw new Error("Canvas not available for recording");
    }

    // Get canvas stream
    const canvasStream = this.canvas.captureStream(this.fps);
    
    if (!canvasStream) {
      throw new Error("Could not capture canvas stream");
    }

    // Combine video and audio streams
    this.stream = new MediaStream();
    
    // Add video tracks
    canvasStream.getVideoTracks().forEach(track => {
      this.stream!.addTrack(track);
    });
    
    // Add audio tracks if available
    if (this.audioStream) {
      this.audioStream.getAudioTracks().forEach(track => {
        this.stream!.addTrack(track);
      });
    }

    // Determine MIME type based on format and browser support
    const mimeType = this.getSupportedMimeType();
    
    // Create MediaRecorder with optimized settings
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: this.getVideoBitrate(),
    });

    // Handle recorded data
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Handle recording errors
    this.mediaRecorder.onerror = (event) => {
      console.error("MediaRecorder error:", event);
      throw new Error("MediaRecorder error occurred");
    };
  }

  /**
   * Get supported MIME type based on format and browser capabilities
   */
  private getSupportedMimeType(): string {
    const { format } = this.settings;
    
    // Priority order of MIME types to try
    const mimeTypes = {
      [ExportFormat.MP4]: [
        "video/mp4; codecs=h264",
        "video/mp4",
        "video/webm; codecs=vp9",
        "video/webm",
      ],
      [ExportFormat.WEBM]: [
        "video/webm; codecs=vp9",
        "video/webm; codecs=vp8",
        "video/webm",
      ],
      [ExportFormat.MOV]: [
        "video/mp4; codecs=h264", // Fallback to MP4 for MOV
        "video/mp4",
        "video/webm; codecs=vp9",
        "video/webm",
      ],
    };

    const candidates = mimeTypes[format] || mimeTypes[ExportFormat.MP4];
    
    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Fallback to basic WebM if nothing else works
    return "video/webm";
  }

  /**
   * Calculate video bitrate based on quality settings
   */
  private getVideoBitrate(): number {
    const { width, height } = this.settings;
    const pixelCount = width * height;
    
    // Base bitrate calculation (bits per pixel per second)
    const baseBitrate = pixelCount * this.fps * 0.1; // 0.1 bits per pixel
    
    // Clamp to reasonable ranges
    return Math.max(1000000, Math.min(10000000, baseBitrate)); // 1-10 Mbps
  }

  /**
   * Set audio stream for recording
   */
  setAudioStream(audioStream: MediaStream | null): void {
    this.audioStream = audioStream;
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    this.recordedChunks = [];
    this.setupMediaRecorder();
    
    if (!this.mediaRecorder) {
      throw new Error("MediaRecorder not initialized");
    }

    this.mediaRecorder.start(100); // Request data every 100ms
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Stop recording and return video blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder not initialized"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(this.recordedChunks, {
          type: this.getSupportedMimeType(),
        });
        resolve(videoBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    if (!this.mediaRecorder) {
      return RecordingState.INACTIVE;
    }

    switch (this.mediaRecorder.state) {
      case "recording":
        return RecordingState.RECORDING;
      case "paused":
        return RecordingState.PAUSED;
      case "inactive":
        return RecordingState.INACTIVE;
      default:
        return RecordingState.INACTIVE;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.recordedChunks = [];
  }

  /**
   * Check if MediaRecorder is supported
   */
  static isSupported(): boolean {
    return typeof MediaRecorder !== "undefined" && 
           typeof HTMLCanvasElement.prototype.captureStream !== "undefined";
  }
}

export enum RecordingState {
  INACTIVE = "inactive",
  RECORDING = "recording", 
  PAUSED = "paused",
}