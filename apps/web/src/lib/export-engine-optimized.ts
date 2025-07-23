import { ExportSettings } from "@/types/export";
import { TimelineElement } from "@/types/timeline";
import { MediaItem } from "@/stores/media-store";
import { CanvasRenderer } from "@/lib/canvas-renderer";
import { FrameCaptureService } from "@/lib/frame-capture";
import { VideoRecorder } from "@/lib/video-recorder";
import { FFmpegVideoRecorder, isFFmpegExportEnabled } from "@/lib/ffmpeg-video-recorder";
import { AudioMixer } from "@/lib/audio-mixer";
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
import { memoryMonitor, estimateVideoMemoryUsage } from "@/lib/memory-monitor";

export interface ExportEngineOptions {
  canvas: HTMLCanvasElement;
  settings: ExportSettings;
  timelineElements: TimelineElement[];
  mediaItems: MediaItem[];
  duration: number;
  fps: number;
  onProgress?: (progress: number, status: string) => void;
  onError?: (error: string) => void;
}

export class ExportEngine {
  private canvas: HTMLCanvasElement;
  private settings: ExportSettings;
  private timelineElements: TimelineElement[];
  private mediaItems: MediaItem[];
  private duration: number;
  private fps: number;
  private onProgress?: (progress: number, status: string) => void;
  private onError?: (error: string) => void;

  private renderer: CanvasRenderer;
  private captureService: FrameCaptureService;
  private recorder: VideoRecorder | FFmpegVideoRecorder;
  private audioMixer: AudioMixer;
  private isExporting = false;
  private shouldCancel = false;
  private preloadedVideos: Map<string, HTMLVideoElement> = new Map();
  private memoryMonitoringStarted = false;

  // Phase 1.1: Conditional logging
  private enableLogging = process.env.NODE_ENV !== 'production';
  
  private log(...args: any[]) {
    if (this.enableLogging) console.log(...args);
  }

  // Phase 1.3: Image bitmap cache
  private imageBitmapCache = new Map<string, ImageBitmap>();
  
  // Phase 1.4: Video frame cache
  private videoFrameCache = new Map<string, Map<number, ImageBitmap>>();

  constructor(options: ExportEngineOptions) {
    this.log("🏗️ Export engine initialized");
    
    this.canvas = options.canvas;
    this.settings = options.settings;
    this.timelineElements = options.timelineElements;
    this.mediaItems = options.mediaItems;
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
      this.settings,
      this.timelineElements
    );
    
    const ffmpegEnabled = isFFmpegExportEnabled();
    this.log("FFmpeg export enabled:", ffmpegEnabled);
    
    if (ffmpegEnabled) {
      this.recorder = new FFmpegVideoRecorder({
        settings: this.settings,
        fps: this.fps,
      });
    } else {
      this.recorder = new VideoRecorder({
        canvas: this.canvas,
        settings: this.settings,
        fps: this.fps,
      });
    }
    
    this.audioMixer = new AudioMixer({
      sampleRate: 44100,
      channels: 2,
      duration: this.duration,
    });
  }

  /**
   * Phase 1.3: Pre-load and convert images to ImageBitmap
   */
  private async preloadImages(): Promise<void> {
    const imageElements = this.timelineElements.filter(el => {
      if (el.type !== 'media') return false;
      const mediaElement = el as any; // Type assertion for media element
      const mediaItem = this.mediaItems.find(m => m.id === mediaElement.mediaId);
      return mediaItem?.type === 'image';
    });

    this.log(`Pre-loading ${imageElements.length} images as ImageBitmap`);

    await Promise.all(imageElements.map(async (element) => {
      const mediaElement = element as any; // Type assertion for media element
      const mediaItem = this.mediaItems.find(m => m.id === mediaElement.mediaId);
      if (!mediaItem) return;

      try {
        if (!mediaItem.url) {
          this.log('No URL for media item:', mediaElement.mediaId);
          return;
        }
        const response = await fetch(mediaItem.url);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        this.imageBitmapCache.set(mediaElement.mediaId, bitmap);
      } catch (error) {
        this.log('Failed to preload image:', mediaElement.mediaId, error);
      }
    }));
  }

  /**
   * Phase 1.4: Pre-decode video frames
   */
  private async preloadVideoFrames(): Promise<void> {
    const videoElements = this.timelineElements.filter(el => {
      if (el.type !== 'media') return false;
      const mediaElement = el as any; // Type assertion for media element
      const mediaItem = this.mediaItems.find(m => m.id === mediaElement.mediaId);
      return mediaItem?.type === 'video';
    });

    this.log(`Pre-decoding frames for ${videoElements.length} videos`);

    // Only preload key frames to save memory
    const KEYFRAME_INTERVAL = 1; // Every 1 second

    await Promise.all(videoElements.map(async (element) => {
      const mediaElement = element as any; // Type assertion for media element
      const mediaItem = this.mediaItems.find(m => m.id === mediaElement.mediaId);
      if (!mediaItem || !mediaItem.duration) return;

      const video = document.createElement('video');
      video.src = mediaItem.url || '';
      video.crossOrigin = "anonymous";
      
      const frameCache = new Map<number, ImageBitmap>();
      
      try {
        await video.load();
        
        // Decode key frames
        for (let time = 0; time < mediaItem.duration; time += KEYFRAME_INTERVAL) {
          video.currentTime = time;
          await new Promise(resolve => {
            video.onseeked = resolve;
          });
          
          const bitmap = await createImageBitmap(video);
          frameCache.set(Math.floor(time), bitmap);
        }
        
        this.videoFrameCache.set(mediaElement.mediaId, frameCache);
      } catch (error) {
        this.log('Failed to preload video frames:', mediaElement.mediaId, error);
      }
    }));
  }

  /**
   * Start the export process with optimizations
   */
  async startExport(): Promise<Blob> {
    this.log("Starting optimized export");
    
    if (this.isExporting) {
      throw new ExportError("Export already in progress", "EXPORT_IN_PROGRESS");
    }

    try {
      this.isExporting = true;
      
      // Check browser compatibility
      const compatibility = checkBrowserCompatibility();
      if (!compatibility.supported) {
        throw new BrowserCompatibilityError(
          `Browser not supported: ${compatibility.issues.join(", ")}`,
          compatibility.issues
        );
      }

      // Start memory monitoring
      this.startMemoryMonitoring();

      // Calculate duration
      const actualVideoDuration = this.calculateActualVideoDuration();
      const safeDuration = Math.min(this.duration, actualVideoDuration + 0.1);
      
      if (safeDuration !== this.duration) {
        this.log(`Adjusting export duration from ${this.duration}s to ${safeDuration}s`);
        this.duration = safeDuration;
        // Re-initialize capture service with new duration
        this.captureService = new FrameCaptureService(
          {
            fps: this.fps,
            duration: safeDuration,
            width: this.settings.width,
            height: this.settings.height,
          },
          this.settings,
          this.timelineElements
        );
      }

      this.onProgress?.(5, "Pre-loading media assets...");
      
      // Phase 1 optimizations: Preload assets
      await Promise.all([
        this.preloadImages(),
        this.preloadVideoFrames(),
        this.preloadMediaElements()
      ]);

      this.onProgress?.(10, "Initializing video encoder...");
      
      // Initialize recorder
      await this.recorder.startRecording();

      // Initialize audio tracks
      await this.initializeAudioTracks();

      this.onProgress?.(15, "Rendering video frames...");

      // Render frames with optimizations
      const videoBlob = isFFmpegExportEnabled() 
        ? await this.renderFramesOfflineOptimized()
        : await this.renderFramesOptimized();

      this.onProgress?.(90, "Finalizing export...");

      // Mix audio if available
      // TODO: Implement audio mixing when AudioMixer is ready
      this.log("Audio mixing skipped - not implemented in optimized version");

      this.onProgress?.(100, "Export complete!");
      
      return videoBlob;

    } catch (error) {
      const err = error as Error;
      logExportError(err, 'ExportEngine.startExport');
      const userMessage = getUserFriendlyErrorMessage(err);
      this.onError?.(userMessage);
      throw error;
    } finally {
      this.isExporting = false;
      this.stopMemoryMonitoring();
      this.cleanup();
    }
  }

  /**
   * Phase 1.2: Optimized frame rendering with batched canvas operations
   */
  private async renderFramesOptimized(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const totalFrames = this.captureService.getTotalFrames();
      let currentFrame = 0;
      let lastProgressUpdate = 0;
      const frameInterval = 1000 / this.fps;

      this.log(`Starting optimized frame rendering: ${totalFrames} frames`);

      const renderFrame = async (currentTime: number) => {
        if (this.shouldCancel) {
          reject(new Error("Export cancelled"));
          return;
        }

        // Check memory less frequently
        if (currentFrame % 60 === 0) { // Every 2 seconds at 30fps
          try {
            this.checkMemoryStatus();
          } catch (error) {
            reject(error);
            return;
          }
        }

        if (currentFrame >= totalFrames) {
          this.log("All frames rendered");
          this.recorder.stopRecording()
            .then(resolve)
            .catch(reject);
          return;
        }

        try {
          const frameData = this.captureService.getFrameData(currentFrame);
          
          // Render with optimizations
          await this.renderSingleFrameOptimized(frameData);
          
          // Update progress less frequently
          const progress = Math.floor((currentFrame / totalFrames) * 100);
          if (progress > lastProgressUpdate + 5) { // Update every 5%
            lastProgressUpdate = progress;
            const memSummary = memoryMonitor.getMemorySummary();
            this.onProgress?.(progress, `Rendering: ${progress}% (${memSummary})`);
          }
          
          currentFrame++;
          
          // Schedule next frame
          setTimeout(() => {
            renderFrame(performance.now());
          }, frameInterval);
          
        } catch (error) {
          reject(error);
        }
      };

      renderFrame(performance.now());
    });
  }

  /**
   * Phase 1.2: Optimized single frame rendering
   */
  private async renderSingleFrameOptimized(frameData: { 
    frameNumber: number; 
    timestamp: number; 
    elements: TimelineElement[] 
  }): Promise<void> {
    if (!frameData || !frameData.elements) {
      throw new CanvasRenderError(
        `Invalid frame data provided`,
        { frameNumber: -1, timestamp: -1, error: new Error("frameData is undefined") }
      );
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    try {
      // Clear canvas
      this.renderer.clearFrame(this.getBackgroundColor());
      
      const visibleElements = frameData.elements;
      
      // Phase 1.2: Batch canvas operations
      ctx.save();
      
      // Group elements by type for efficient rendering
      const elementsByType = this.groupElementsByType(visibleElements);
      
      // Render images first (usually backgrounds)
      for (const element of elementsByType.images) {
        await this.renderImageElementOptimized(element, frameData.timestamp);
      }
      
      // Render videos
      for (const element of elementsByType.videos) {
        await this.renderVideoElementOptimized(element, frameData.timestamp);
      }
      
      // Render text last (usually overlays)
      for (const element of elementsByType.text) {
        this.renderTextElement(element, this.calculateBounds(element));
      }
      
      ctx.restore();
      
    } catch (error) {
      throw new CanvasRenderError(
        `Failed to render frame ${frameData.frameNumber}`,
        { frameNumber: frameData.frameNumber, timestamp: frameData.timestamp, error }
      );
    }
  }

  /**
   * Phase 1.3: Optimized image rendering with ImageBitmap
   */
  private async renderImageElementOptimized(element: TimelineElement, timestamp: number): Promise<void> {
    const mediaElement = element as any; // Type assertion for media element
    const mediaItem = this.mediaItems.find(m => m.id === mediaElement.mediaId);
    if (!mediaItem) return;

    const bitmap = this.imageBitmapCache.get(mediaElement.mediaId);
    if (!bitmap) {
      this.log('ImageBitmap not found in cache, falling back to regular rendering');
      return this.renderImageElement(element, this.calculateBounds(element));
    }

    const bounds = this.calculateBounds(element);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Apply transformations
    ctx.save();
    
    // MediaElement doesn't have rotation property, only TextElement does
    
    // Draw bitmap (much faster than Image element)
    ctx.drawImage(bitmap, bounds.x, bounds.y, bounds.width, bounds.height);
    
    ctx.restore();
  }

  /**
   * Phase 1.4: Optimized video rendering with pre-decoded frames
   */
  private async renderVideoElementOptimized(element: TimelineElement, timestamp: number): Promise<void> {
    const mediaElement = element as any; // Type assertion for media element
    const frameCache = this.videoFrameCache.get(mediaElement.mediaId);
    
    if (!frameCache || frameCache.size === 0) {
      // Fallback to regular video rendering
      return this.renderVideoElement(
        element, 
        this.calculateBounds(element), 
        timestamp
      );
    }

    // Calculate video time
    const elementTime = timestamp - (element.startTime || 0);
    const trimmedTime = elementTime + (element.trimStart || 0);
    
    // Find nearest cached frame
    const nearestSecond = Math.floor(trimmedTime);
    const cachedFrame = frameCache.get(nearestSecond);
    
    if (cachedFrame) {
      const bounds = this.calculateBounds(element);
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      
      // MediaElement doesn't have rotation property
      
      ctx.drawImage(cachedFrame, bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.restore();
    } else {
      // Fallback for frames between keyframes
      return this.renderVideoElement(
        element, 
        this.calculateBounds(element), 
        timestamp
      );
    }
  }

  /**
   * Helper: Group elements by type for efficient rendering
   */
  private groupElementsByType(elements: TimelineElement[]) {
    const groups = {
      images: [] as TimelineElement[],
      videos: [] as TimelineElement[],
      text: [] as TimelineElement[]
    };

    for (const element of elements) {
      if (element.type === 'text') {
        groups.text.push(element);
      } else if (element.type === 'media') {
        const mediaElement = element as any; // Type assertion for media element
        const mediaItem = this.mediaItems.find(m => m.id === mediaElement.mediaId);
        if (mediaItem?.type === 'image') {
          groups.images.push(element);
        } else if (mediaItem?.type === 'video') {
          groups.videos.push(element);
        }
      }
    }

    return groups;
  }

  /**
   * Helper: Calculate element bounds
   */
  private calculateBounds(element: TimelineElement) {
    return this.captureService.calculateElementBounds(
      element,
      this.settings.width,
      this.settings.height
    );
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Clean up ImageBitmaps
    for (const bitmap of this.imageBitmapCache.values()) {
      bitmap.close();
    }
    this.imageBitmapCache.clear();

    // Clean up video frame cache
    for (const frameCache of this.videoFrameCache.values()) {
      for (const bitmap of frameCache.values()) {
        bitmap.close();
      }
    }
    this.videoFrameCache.clear();

    // Clean up preloaded videos
    this.preloadedVideos.clear();
  }

  // ... Include other necessary methods from original ExportEngine ...
  // (I'll include the essential ones that are referenced)

  private async renderFramesOfflineOptimized(): Promise<Blob> {
    const totalFrames = this.captureService.getTotalFrames();
    
    for (let i = 0; i < totalFrames; i++) {
      if (this.shouldCancel) {
        throw new Error("Export cancelled");
      }

      if (i % 60 === 0) { // Check every 2 seconds
        try {
          this.checkMemoryStatus();
        } catch (error) {
          throw error;
        }
      }

      const frameData = this.captureService.getFrameData(i);
      await this.renderSingleFrameOptimized(frameData);

      const dataUrl = this.canvas.toDataURL("image/png");
      await (this.recorder as FFmpegVideoRecorder).addFrame(dataUrl, i);

      const progress = Math.floor((i / totalFrames) * 100);
      if (progress % 5 === 0) { // Update every 5%
        const memSummary = memoryMonitor.getMemorySummary();
        this.onProgress?.(progress, `Rendering: ${progress}% (${memSummary})`);
      }
    }

    this.onProgress?.(50, "Encoding video...");
    return this.recorder.stopRecording();
  }

  private calculateActualVideoDuration(): number {
    this.log("Using timeline duration:", this.duration);
    return this.duration;
  }

  private getBackgroundColor(): string {
    return "#000000";
  }

  private async preloadMediaElements(): Promise<void> {
    // Existing preload logic from original
    const videoElements = this.timelineElements.filter((el) => {
      if (el.type !== "media") return false;
      const mediaElement = el as any;
      return this.getMediaItem(mediaElement.mediaId)?.type === "video";
    });

    for (const element of videoElements) {
      const mediaElement = element as any;
      const mediaItem = this.getMediaItem(mediaElement.mediaId);
      if (!mediaItem) continue;

      const video = document.createElement("video");
      video.src = mediaItem.url || '';
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error(`Failed to load video: ${mediaItem.url}`));
      });

      this.preloadedVideos.set(mediaElement.mediaId, video);
    }
  }

  private getMediaItem(mediaId: string): MediaItem | undefined {
    return this.mediaItems.find((item) => item.id === mediaId);
  }

  private startMemoryMonitoring(): void {
    if (this.memoryMonitoringStarted) return;
    
    memoryMonitor.startMonitoring(1000);
    this.memoryMonitoringStarted = true;
  }

  private stopMemoryMonitoring(): void {
    if (!this.memoryMonitoringStarted) return;
    
    memoryMonitor.stopMonitoring();
    this.memoryMonitoringStarted = false;
  }

  private checkMemoryStatus(): void {
    const estimatedBytes = estimateVideoMemoryUsage(
      this.settings.width,
      this.settings.height,
      this.duration,
      this.fps
    );
    
    const warning = memoryMonitor.checkFileSafety(estimatedBytes);
    
    if (warning && (warning.level === 'critical' || warning.level === 'error')) {
      throw new MemoryError(
        warning.message,
        {
          estimatedBytes,
          level: warning.level
        }
      );
    }
    
    if (warning && warning.level === 'warning') {
      this.onProgress?.(
        this.lastProgress || 0,
        `⚠️ ${warning.message}`
      );
    }
  }

  private lastProgress = 0;

  private async initializeAudioTracks(): Promise<void> {
    // TODO: Implement audio track initialization when AudioMixer API is updated
    this.log("Audio track initialization skipped - not implemented in optimized version");
  }

  // Include the remaining methods from original ExportEngine that are still needed...
  private async renderVideoElement(element: TimelineElement, bounds: any, timestamp: number): Promise<void> {
    // Original video rendering logic
    const mediaElement = element as any;
    const video = this.preloadedVideos.get(mediaElement.mediaId);
    if (!video) return;

    const elementTime = timestamp - (element.startTime || 0);
    const trimmedTime = elementTime + (element.trimStart || 0);

    if (trimmedTime < 0 || trimmedTime > element.duration) return;

    video.currentTime = trimmedTime;
    await video.play();
    
    this.renderer.save();
    
    // MediaElement doesn't have rotation property
    
    this.renderer.drawImage(video, bounds.x, bounds.y, bounds.width, bounds.height);
    this.renderer.restore();
    
    video.pause();
  }

  private renderImageElement(element: TimelineElement, bounds: any): void {
    const mediaElement = element as any;
    const mediaItem = this.getMediaItem(mediaElement.mediaId);
    if (!mediaItem) return;

    const img = new Image();
    img.src = mediaItem.url || '';
    
    this.renderer.save();
    
    // MediaElement doesn't have rotation property
    
    this.renderer.drawImage(img, bounds.x, bounds.y, bounds.width, bounds.height);
    this.renderer.restore();
  }

  private renderTextElement(element: TimelineElement, bounds: any): void {
    if (element.type !== "text") return;
    
    const textElement = element as any; // Type assertion for text element

    this.renderer.save();
    
    // TODO: Implement rotation when CanvasRenderer supports it
    
    this.renderer.drawText(textElement.content || '', bounds.x, bounds.y, {
      fontSize: textElement.fontSize || 24,
      fontFamily: textElement.fontFamily || 'Arial',
      color: textElement.color || '#FFFFFF',
      textAlign: textElement.textAlign || 'left'
    });
    this.renderer.restore();
  }

  /**
   * Cancel the export
   */
  cancelExport(): void {
    this.shouldCancel = true;
    // TODO: Implement cancel recording when recorder supports it
  }

  /**
   * Safe download method to prevent navigation bugs
   */
  static async createDownloadLink(blob: Blob, filename: string): Promise<void> {
    // Use modern File System Access API if available
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Video files',
            accept: { 
              'video/mp4': ['.mp4'],
              'video/webm': ['.webm'],
              'video/quicktime': ['.mov']
            }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (error) {
        // User cancelled or API not supported
        if ((error as Error).name === 'AbortError') {
          return; // User cancelled
        }
      }
    }

    // Safe iframe-based download to prevent navigation
    const url = URL.createObjectURL(blob);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      const link = iframeDoc.createElement('a');
      link.href = url;
      link.download = filename;
      iframeDoc.body.appendChild(link);
      link.click();
      iframeDoc.body.removeChild(link);
    }
    
    // Cleanup with delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}