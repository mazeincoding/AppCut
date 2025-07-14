import { ExportSettings } from "@/types/export";
import { TimelineElement } from "@/types/timeline";
import { CanvasRenderer } from "@/lib/canvas-renderer";
import { FrameCaptureService } from "@/lib/frame-capture";
import { VideoRecorder } from "@/lib/video-recorder";

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
  }

  /**
   * Start the export process
   */
  async startExport(): Promise<Blob> {
    if (this.isExporting) {
      throw new Error("Export already in progress");
    }

    if (!VideoRecorder.isSupported()) {
      throw new Error("Video recording not supported in this browser");
    }

    try {
      this.isExporting = true;
      this.shouldCancel = false;
      
      this.onProgress?.(0, "Initializing export...");
      
      // Start recording
      await this.recorder.startRecording();
      
      // Render frames using requestAnimationFrame loop
      const videoBlob = await this.renderFrames();
      
      this.onProgress?.(100, "Export complete!");
      return videoBlob;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.onError?.(errorMessage);
      throw error;
    } finally {
      this.isExporting = false;
      this.recorder.cleanup();
    }
  }

  /**
   * Cancel the export process
   */
  cancelExport(): void {
    this.shouldCancel = true;
    this.recorder.cleanup();
    this.isExporting = false;
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
    // Clear canvas
    this.renderer.clearFrame(this.getBackgroundColor());
    
    // Get visible elements for this timestamp
    const visibleElements = this.captureService.getVisibleElements(
      this.timelineElements,
      frameData.timestamp
    );
    
    // Render each element
    for (const element of visibleElements) {
      this.renderElement(element, frameData.timestamp);
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
   * Check if export is currently in progress
   */
  get isActive(): boolean {
    return this.isExporting;
  }
}