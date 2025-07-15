import { ExportSettings } from "@/types/export";
import { TimelineElement } from "@/types/timeline";
import { CanvasRenderer } from "@/lib/canvas-renderer";
import { FrameCaptureService } from "@/lib/frame-capture";
import { VideoRecorder } from "@/lib/video-recorder";
import { AudioMixer, AudioTrackInfo } from "@/lib/audio-mixer";
import { 
  ExportError, 
  MediaRecorderError, 
  AudioMixerError, 
  CanvasRenderError,
  BrowserCompatibilityError,
  MemoryError,
  getUserFriendlyErrorMessage,
  logExportError,
  checkBrowserCompatibility,
  estimateMemoryUsage 
} from "@/lib/export-errors";

export interface ExportEngineOptions {
  canvas: HTMLCanvasElement;
  settings: ExportSettings;
  timelineElements: TimelineElement[];
  duration: number; // in seconds
  fps: number;
  onProgress?: (progress: number, status: string) => void;
  onError?: (error: string) => void;
}

export class ExportEngine {
  private canvas: HTMLCanvasElement;
  private settings: ExportSettings;
  private timelineElements: TimelineElement[];
  private duration: number;
  private fps: number;
  private onProgress?: (progress: number, status: string) => void;
  private onError?: (error: string) => void;
  
  private renderer: CanvasRenderer;
  private captureService: FrameCaptureService;
  private recorder: VideoRecorder;
  private audioMixer: AudioMixer;
  private isExporting = false;
  private shouldCancel = false;

  constructor(options: ExportEngineOptions) {
    this.canvas = options.canvas;
    this.settings = options.settings;
    this.timelineElements = options.timelineElements;
    this.duration = options.duration;
    this.fps = options.fps;
    this.onProgress = options.onProgress;
    this.onError = options.onError;

    // Initialize services
    this.renderer = new CanvasRenderer(this.canvas, this.settings);
    this.captureService = new FrameCaptureService(
      {
        fps: this.fps,
        duration: this.duration,
        width: this.settings.width,
        height: this.settings.height,
      },
      this.settings
    );
    this.recorder = new VideoRecorder({
      canvas: this.canvas,
      settings: this.settings,
      fps: this.fps,
    });
    this.audioMixer = new AudioMixer({
      sampleRate: 44100,
      channels: 2,
      duration: this.duration,
    });
  }

  /**
   * Start the export process
   */
  async startExport(): Promise<Blob> {
    if (this.isExporting) {
      throw new ExportError("Export already in progress", "EXPORT_IN_PROGRESS");
    }

    try {
      // Pre-flight checks
      this.performPreflightChecks();
      
      this.isExporting = true;
      this.shouldCancel = false;
      
      this.onProgress?.(0, "Initializing export...");
      
      // Collect and prepare audio tracks
      await this.prepareAudioTracks();
      
      // Create audio stream from mixed audio
      const audioStream = await this.createAudioStream();
      if (audioStream) {
        this.recorder.setAudioStream(audioStream);
      }
      
      // Start recording
      await this.recorder.startRecording();
      
      // Render frames using requestAnimationFrame loop
      const videoBlob = await this.renderFrames();
      
      this.onProgress?.(100, "Export complete!");
      return videoBlob;
      
    } catch (error) {
      this.handleExportError(error);
      throw error;
    } finally {
      this.cleanupResources();
    }
  }

  /**
   * Cancel the export process
   */
  cancelExport(): void {
    this.shouldCancel = true;
    this.isExporting = false;
    
    // Clean up resources
    try {
      this.recorder.cleanup();
    } catch (error) {
      console.warn("Failed to cleanup recorder:", error);
    }
    
    try {
      this.audioMixer.dispose();
    } catch (error) {
      console.warn("Failed to dispose audio mixer:", error);
    }
  }

  /**
   * Render all frames using requestAnimationFrame loop
   */
  private async renderFrames(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const totalFrames = this.captureService.getTotalFrames();
      let currentFrame = 0;
      let lastProgressUpdate = 0;

      const renderFrame = () => {
        if (this.shouldCancel) {
          reject(new Error("Export cancelled"));
          return;
        }

        if (currentFrame >= totalFrames) {
          // All frames rendered, stop recording
          this.recorder.stopRecording()
            .then(resolve)
            .catch(reject);
          return;
        }

        try {
          // Get frame data
          const frameData = this.captureService.getFrameData(currentFrame);
          
          // Render frame to canvas
          this.renderSingleFrame(frameData);
          
          // Update progress
          const progress = Math.floor((currentFrame / totalFrames) * 100);
          if (progress > lastProgressUpdate) {
            lastProgressUpdate = progress;
            this.onProgress?.(progress, `Rendering frame ${currentFrame + 1} of ${totalFrames}`);
          }
          
          currentFrame++;
          
          // Continue with next frame
          requestAnimationFrame(renderFrame);
          
        } catch (error) {
          reject(error);
        }
      };

      // Start rendering
      requestAnimationFrame(renderFrame);
    });
  }

  /**
   * Render a single frame to the canvas
   */
  private renderSingleFrame(frameData: { frameNumber: number; timestamp: number; elements: TimelineElement[] }): void {
    if (!frameData) {
      throw new CanvasRenderError(
        `Invalid frame data provided`,
        { frameNumber: -1, timestamp: -1, error: new Error("frameData is undefined") }
      );
    }

    try {
      // Clear canvas
      this.renderer.clearFrame(this.getBackgroundColor());
      
      // Get visible elements for this timestamp
      const visibleElements = this.captureService.getVisibleElements(
        this.timelineElements,
        frameData.timestamp
      );
      
      // Render each element
      for (const element of visibleElements) {
        try {
          this.renderElement(element, frameData.timestamp);
        } catch (error) {
          console.warn(`Failed to render element ${element.id}:`, error);
          // Continue rendering other elements
        }
      }
    } catch (error) {
      throw new CanvasRenderError(
        `Failed to render frame ${frameData.frameNumber}`,
        { frameNumber: frameData.frameNumber, timestamp: frameData.timestamp, error }
      );
    }
  }

  /**
   * Render a single timeline element
   */
  private renderElement(element: TimelineElement, timestamp: number): void {
    const bounds = this.captureService.calculateElementBounds(
      element,
      this.settings.width,
      this.settings.height
    );

    // Save canvas state
    this.renderer.save();

    try {
      switch (element.type) {
        case "video":
          this.renderVideoElement(element, bounds, timestamp);
          break;
        case "image":
          this.renderImageElement(element, bounds);
          break;
        case "text":
          this.renderTextElement(element, bounds);
          break;
        case "audio":
          // Audio elements don't need visual rendering
          break;
        default:
          console.warn(`Unknown element type: ${element.type}`);
      }
    } finally {
      // Restore canvas state
      this.renderer.restore();
    }
  }

  /**
   * Render a video element
   */
  private renderVideoElement(element: TimelineElement, bounds: any, timestamp: number): void {
    // TODO: Implement video element rendering
    // This would involve seeking to the correct time and drawing the video frame
    console.log("Rendering video element:", element.id, "at", timestamp);
  }

  /**
   * Render an image element
   */
  private renderImageElement(element: TimelineElement, bounds: any): void {
    // TODO: Implement image element rendering
    console.log("Rendering image element:", element.id);
  }

  /**
   * Render a text element
   */
  private renderTextElement(element: TimelineElement, bounds: any): void {
    // TODO: Implement text element rendering
    if (element.content) {
      this.renderer.drawText(element.content, bounds.x, bounds.y, {
        fontSize: element.fontSize || 24,
        color: element.color || "#000000",
        fontFamily: element.fontFamily || "Arial, sans-serif",
      });
    }
  }

  /**
   * Get background color for the canvas
   */
  private getBackgroundColor(): string {
    // TODO: Get from project settings
    return "#ffffff";
  }

  /**
   * Create download link for the exported video
   */
  static createDownloadLink(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Prepare audio tracks for export
   */
  private async prepareAudioTracks(): Promise<void> {
    try {
      this.onProgress?.(5, "Preparing audio tracks...");
      
      // Clear existing tracks
      this.audioMixer.clearTracks();
      
      // Collect audio elements from timeline
      const audioElements = this.getAudioElements();
      
      // Load and add each audio track
      for (const element of audioElements) {
        try {
          const audioTrack = await this.createAudioTrack(element);
          if (audioTrack) {
            this.audioMixer.addAudioTrack(audioTrack);
          }
        } catch (error) {
          console.warn(`Failed to load audio track ${element.id}:`, error);
        }
      }
    } catch (error) {
      throw new AudioMixerError(
        "Failed to prepare audio tracks",
        { error, elementCount: this.timelineElements.length }
      );
    }
  }

  /**
   * Get all audio elements from timeline
   */
  private getAudioElements(): TimelineElement[] {
    return this.timelineElements.filter(element => 
      element.type === "audio" || (element.type === "video" && element.hasAudio)
    );
  }

  /**
   * Create audio track info from timeline element
   */
  private async createAudioTrack(element: TimelineElement): Promise<AudioTrackInfo | null> {
    if (!element.src) {
      return null;
    }

    try {
      // Load audio buffer
      const audioBuffer = await this.audioMixer.loadAudioBufferFromUrl(element.src);
      
      // Calculate timing
      const startTime = element.startTime || 0;
      const endTime = element.endTime || (startTime + (element.duration || 0));
      
      // Get volume and pan settings
      const volume = element.volume !== undefined ? element.volume : 1.0;
      const pan = element.pan !== undefined ? element.pan : 0.0;
      
      return {
        element,
        audioBuffer,
        startTime,
        endTime,
        volume,
        pan,
      };
    } catch (error) {
      console.error(`Failed to create audio track for ${element.id}:`, error);
      return null;
    }
  }

  /**
   * Get audio sources and timestamps for all tracks
   */
  getAudioSources(): Array<{
    elementId: string;
    src: string;
    startTime: number;
    endTime: number;
    volume: number;
    pan: number;
  }> {
    const audioElements = this.getAudioElements();
    
    return audioElements.map(element => ({
      elementId: element.id,
      src: element.src || "",
      startTime: element.startTime || 0,
      endTime: element.endTime || (element.startTime || 0) + (element.duration || 0),
      volume: element.volume !== undefined ? element.volume : 1.0,
      pan: element.pan !== undefined ? element.pan : 0.0,
    }));
  }

  /**
   * Create audio stream from mixed audio tracks
   */
  private async createAudioStream(): Promise<MediaStream | null> {
    try {
      this.onProgress?.(10, "Mixing audio tracks...");
      
      // Mix all audio tracks
      const mixedAudioBuffer = await this.audioMixer.mixTracks();
      
      // Create audio stream from buffer
      const audioContext = this.audioMixer.getAudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = mixedAudioBuffer;
      
      // Create MediaStreamDestination
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Start playback (this will stream the audio)
      source.start();
      
      return destination.stream;
    } catch (error) {
      console.warn("Failed to create audio stream:", error);
      return null;
    }
  }

  /**
   * Perform pre-flight checks before starting export
   */
  private performPreflightChecks(): void {
    // Check browser compatibility
    const compatibility = checkBrowserCompatibility();
    if (!compatibility.supported) {
      throw new BrowserCompatibilityError(
        `Browser not compatible: ${compatibility.issues.join(", ")}`,
        compatibility.issues
      );
    }

    // Check memory usage
    const memoryEstimate = estimateMemoryUsage(
      this.settings.width,
      this.settings.height,
      this.duration,
      this.fps
    );
    
    if (memoryEstimate.estimatedMB > 3000) {
      throw new MemoryError(
        `Export may exceed available memory (${memoryEstimate.estimatedMB}MB estimated)`,
        memoryEstimate
      );
    }

    // Check canvas availability
    if (!this.canvas) {
      throw new CanvasRenderError("Canvas not available for export");
    }

    // Check if timeline has elements
    if (!this.timelineElements || this.timelineElements.length === 0) {
      throw new ExportError("No timeline elements to export", "NO_CONTENT");
    }
  }

  /**
   * Handle export errors with proper logging and user-friendly messages
   */
  private handleExportError(error: unknown): void {
    // Create a proper error object with more debugging info
    let exportError: Error;
    
    if (error instanceof Error) {
      exportError = error;
    } else if (typeof error === 'string') {
      exportError = new Error(error);
    } else if (error && typeof error === 'object') {
      // Handle objects that might have a message property
      const errorObj = error as any;
      const message = errorObj.message || errorObj.toString() || "Unknown error object";
      exportError = new Error(message);
      // Preserve additional properties
      Object.assign(exportError, errorObj);
    } else {
      exportError = new Error(`Unknown error type: ${typeof error}, value: ${JSON.stringify(error)}`);
    }
    
    // Log error for debugging
    logExportError(exportError, "ExportEngine.startExport");
    
    // Provide user-friendly error message
    const userMessage = getUserFriendlyErrorMessage(exportError);
    this.onError?.(userMessage);
  }

  /**
   * Clean up resources after export
   */
  private cleanupResources(): void {
    this.isExporting = false;
    
    try {
      this.recorder.cleanup();
    } catch (error) {
      console.warn("Failed to cleanup recorder:", error);
    }
    
    try {
      this.audioMixer.dispose();
    } catch (error) {
      console.warn("Failed to dispose audio mixer:", error);
    }
  }

  /**
   * Check if export is currently in progress
   */
  get isActive(): boolean {
    return this.isExporting;
  }
}