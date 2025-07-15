import { ExportSettings } from "@/types/export";
import { TimelineElement } from "@/types/timeline";
import { MediaItem } from "@/stores/media-store";
import { CanvasRenderer } from "@/lib/canvas-renderer";
import { FrameCaptureService } from "@/lib/frame-capture";
import { VideoRecorder } from "@/lib/video-recorder";
import { FFmpegVideoRecorder, isFFmpegExportEnabled } from "@/lib/ffmpeg-video-recorder";
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
  mediaItems: MediaItem[]; // Add media items for element rendering
  duration: number; // in seconds
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

  constructor(options: ExportEngineOptions) {
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
    if (isFFmpegExportEnabled()) {
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
   * Start the export process
   */
  async startExport(): Promise<Blob> {
    console.log("🚀 startExport called");
    
    if (this.isExporting) {
      throw new ExportError("Export already in progress", "EXPORT_IN_PROGRESS");
    }

    try {
      // Calculate the actual video content duration (not timeline duration)
      const actualVideoDuration = this.calculateActualVideoDuration();
      
      console.log("🎬 Export starting:", {
        timelineElements: this.timelineElements.length,
        calculatedDuration: this.duration,
        actualVideoDuration,
        fps: this.fps
      });
      
      // Use the shorter of timeline duration or actual video duration
      const safeDuration = Math.min(this.duration, actualVideoDuration + 0.1); // Small buffer
      
      if (safeDuration !== this.duration) {
        console.log(`🛠️ Adjusting export duration from ${this.duration}s to ${safeDuration}s`);
        this.duration = safeDuration;
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
      
      // Pre-flight checks
      this.performPreflightChecks();
      console.log("✅ Preflight checks passed");
      
      this.isExporting = true;
      this.shouldCancel = false;
      
      this.onProgress?.(0, "Initializing export...");
      
      // Preload all video elements
      console.log("📹 Starting video preload process...");
      await this.preloadVideos();
      console.log(`📹 Videos preloaded: ${this.preloadedVideos.size} videos ready`);
      
      // Collect and prepare audio tracks
      await this.prepareAudioTracks();
      console.log("🎵 Audio tracks prepared");
      
      // Create audio stream from mixed audio
      const audioStream = await this.createAudioStream();
      if (audioStream) {
        this.recorder.setAudioStream(audioStream);
        console.log("🎤 Audio stream created");
      }
      
      // Start recording
      await this.recorder.startRecording();
      console.log("📹 Recording started");

      console.log("🎬 Starting frame rendering...");
      let videoBlob: Blob;
      if (this.recorder instanceof FFmpegVideoRecorder) {
        videoBlob = await this.renderFramesOffline();
      } else {
        videoBlob = await this.renderFrames();
      }
      
      console.log("✅ Export completed successfully!");
      this.onProgress?.(100, "Export complete!");
      return videoBlob;
      
    } catch (error) {
      console.error("❌ Export failed:", error);
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
   * Render all frames using precise timing control
   */
  private async renderFrames(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const totalFrames = this.captureService.getTotalFrames();
      let currentFrame = 0;
      let lastProgressUpdate = 0;
      const frameInterval = 1000 / this.fps; // Time between frames in milliseconds
      let lastFrameTime = 0;

      console.log("🎬 Starting frame rendering with precise timing:", {
        totalFrames,
        fps: this.fps,
        frameInterval: `${frameInterval}ms`,
        expectedDuration: `${totalFrames / this.fps}s`
      });

      const renderFrame = async (currentTime: number) => {
        if (this.shouldCancel) {
          reject(new Error("Export cancelled"));
          return;
        }

        if (currentFrame >= totalFrames) {
          // All frames rendered, stop recording
          console.log("✅ All frames rendered, stopping recording");
          this.recorder.stopRecording()
            .then(resolve)
            .catch(reject);
          return;
        }

        try {
          // Calculate if it's time for the next frame
          const timeSinceLastFrame = currentTime - lastFrameTime;
          
          if (timeSinceLastFrame >= frameInterval) {
            // Get frame data
            const frameData = this.captureService.getFrameData(currentFrame);
            
            console.log("🎞️ Rendering frame:", {
              frameNumber: currentFrame,
              timestamp: frameData.timestamp,
              timeSinceLastFrame: `${timeSinceLastFrame.toFixed(2)}ms`,
              expectedInterval: `${frameInterval}ms`
            });
            
            // Render frame to canvas
            await this.renderSingleFrame(frameData);
            
            // Update progress
            const progress = Math.floor((currentFrame / totalFrames) * 100);
            if (progress > lastProgressUpdate) {
              lastProgressUpdate = progress;
              this.onProgress?.(progress, `Rendering frame ${currentFrame + 1} of ${totalFrames}`);
            }
            
            currentFrame++;
            lastFrameTime = currentTime;
          }
          
          // Continue with next frame using requestAnimationFrame for timing
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
   * Render frames sequentially and pass each PNG frame to FFmpegVideoRecorder
   */
  private async renderFramesOffline(): Promise<Blob> {
    const totalFrames = this.captureService.getTotalFrames();
    for (let i = 0; i < totalFrames; i++) {
      if (this.shouldCancel) {
        throw new Error("Export cancelled");
      }

      const frameData = this.captureService.getFrameData(i);
      await this.renderSingleFrame(frameData);

      const dataUrl = this.canvas.toDataURL("image/png");
      await (this.recorder as FFmpegVideoRecorder).addFrame(dataUrl, i);

      const progress = Math.floor((i / totalFrames) * 100);
      this.onProgress?.(progress, `Rendering frame ${i + 1} of ${totalFrames}`);
    }

    this.onProgress?.(50, "Encoding video...");
    return this.recorder.stopRecording();
  }

  /**
   * Calculate the actual duration of video content (not timeline gaps)
   */
  private calculateActualVideoDuration(): number {
    let maxVideoDuration = 0;
    
    for (const element of this.timelineElements) {
      if (element.type === 'media') {
        const mediaItem = this.getMediaItem(element.mediaId!);
        if (mediaItem?.type === 'video' && mediaItem.duration) {
          // Calculate the effective end time of this video element
          const trimStart = element.trimStart || 0;
          const trimEnd = element.trimEnd || 0;
          const effectiveDuration = mediaItem.duration - trimStart - trimEnd;
          const elementEndTime = (element.startTime || 0) + effectiveDuration;
          
          maxVideoDuration = Math.max(maxVideoDuration, elementEndTime);
        }
      }
    }
    
    return maxVideoDuration;
  }

  /**
   * Render a single frame to the canvas
   */
  private async renderSingleFrame(frameData: { frameNumber: number; timestamp: number; elements: TimelineElement[] }): Promise<void> {

    if (!frameData || !frameData.elements) {
      throw new CanvasRenderError(
        `Invalid frame data provided`,
        { frameNumber: -1, timestamp: -1, error: new Error("frameData is undefined") }
      );
    }

    try {
      // Clear canvas
      this.renderer.clearFrame(this.getBackgroundColor());
      
      // Use elements from frame data (already filtered for visibility)
      const visibleElements = frameData.elements;
      
      
      // Check for white frames
      if (visibleElements.length === 0 && frameData.timestamp > 0) {
        console.warn("⚠️ White frame at", frameData.timestamp, "s");
      }
      
      // Render each element
      for (const element of visibleElements) {
        try {
            await this.renderElement(element, frameData.timestamp);
        } catch (error) {
          console.warn(`❌ Failed to render element ${element.id}:`, error);
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
  private async renderElement(element: TimelineElement, timestamp: number): Promise<void> {

    const bounds = this.captureService.calculateElementBounds(
      element,
      this.settings.width,
      this.settings.height
    );


    // Save canvas state
    this.renderer.save();

    try {
      switch (element.type) {
        case "media":
          // Get media type from media store
          const mediaItem = this.getMediaItem(element.mediaId);
          
          if (mediaItem) {
            if (mediaItem.type === "video") {
              await this.renderVideoElement(element, bounds, timestamp);
            } else if (mediaItem.type === "image") {
              this.renderImageElement(element, bounds);
            }
            // Audio media doesn't need visual rendering
          }
          break;
        case "text":
          this.renderTextElement(element, bounds);
          break;
        default:
          console.warn(`Unknown element type: ${(element as any).type}`);
      }
    } finally {
      // Restore canvas state
      this.renderer.restore();
    }
  }

  /**
   * Render a video element
   */
  private async renderVideoElement(element: TimelineElement, bounds: any, timestamp: number): Promise<void> {

    if (element.type !== "media") {
      console.warn("❌ Element is not media type:", element.type);
      return;
    }
    
    const mediaItem = this.getMediaItem(element.mediaId);
    if (!mediaItem || mediaItem.type !== "video") {
      console.warn("❌ Media item not found or not video:", mediaItem);
      return;
    }
    
    
    // Calculate the time within the video based on element timing
    const elementTime = timestamp - element.startTime + element.trimStart;
    
    // Only render if within the element's duration
    if (elementTime >= 0 && elementTime <= (element.duration - element.trimStart - element.trimEnd)) {
      try {
        // Use preloaded video if available
        const preloadedVideo = this.preloadedVideos.get(mediaItem.id);
        
        if (preloadedVideo && preloadedVideo.readyState >= 1) {
          console.log("🎬 Using preloaded video", {
            readyState: preloadedVideo.readyState,
            duration: preloadedVideo.duration,
            currentTime: preloadedVideo.currentTime
          });
          
          // Seek to the correct time and wait for it
          await this.seekVideoToTime(preloadedVideo, elementTime);
          
          // Small delay to ensure frame is ready after seeking
          await new Promise(resolve => setTimeout(resolve, 16)); // ~1 frame at 60fps
          
          // Draw the video frame
          this.renderer.drawImage(preloadedVideo, bounds.x, bounds.y, bounds.width, bounds.height);
        } else {
          console.log("⏳ Video not preloaded or not ready", {
            hasPreloadedVideo: !!preloadedVideo,
            readyState: preloadedVideo?.readyState,
            preloadedVideosCount: this.preloadedVideos.size,
            preloadedVideoIds: Array.from(this.preloadedVideos.keys())
          });
          
          // Try to create a new video element as fallback
          console.log("🔄 Attempting fallback video creation...");
          try {
            const fallbackVideo = document.createElement("video");
            fallbackVideo.muted = true;
            fallbackVideo.preload = "auto";
            
            if (mediaItem.url) {
              fallbackVideo.src = mediaItem.url;
            } else if (mediaItem.file) {
              fallbackVideo.src = URL.createObjectURL(mediaItem.file);
            }
            
            // Wait for video to load enough data
            await new Promise<void>((resolve, reject) => {
              let resolved = false;
              
              const onCanPlay = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                console.log(`🎬 Fallback video can play, readyState: ${fallbackVideo.readyState}`);
                resolve();
              };
              
              const onError = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                console.warn("❌ Fallback video load error");
                reject(new Error("Video load failed"));
              };
              
              const onTimeout = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                console.warn("⏰ Fallback video load timeout");
                reject(new Error("Video load timeout"));
              };
              
              const cleanup = () => {
                fallbackVideo.removeEventListener('canplay', onCanPlay);
                fallbackVideo.removeEventListener('error', onError);
                clearTimeout(timeoutId);
              };
              
              fallbackVideo.addEventListener('canplay', onCanPlay);
              fallbackVideo.addEventListener('error', onError);
              
              const timeoutId = setTimeout(onTimeout, 2000); // 2 second timeout
              
              // Start loading
              fallbackVideo.load();
            });
            
            // Now seek to the correct time
            fallbackVideo.currentTime = elementTime;
            
            // Wait for seek to complete
            await new Promise<void>((resolve) => {
              const onSeeked = () => {
                fallbackVideo.removeEventListener('seeked', onSeeked);
                resolve();
              };
              fallbackVideo.addEventListener('seeked', onSeeked);
              
              // If already at correct time, resolve immediately
              if (Math.abs(fallbackVideo.currentTime - elementTime) < 0.1) {
                fallbackVideo.removeEventListener('seeked', onSeeked);
                resolve();
              }
            });
            
            if (fallbackVideo.readyState >= 2) {
              console.log("✅ Fallback video ready, drawing frame");
              this.renderer.drawImage(fallbackVideo, bounds.x, bounds.y, bounds.width, bounds.height);
              return;
            } else {
              console.warn(`⚠️ Fallback video readyState still low: ${fallbackVideo.readyState}`);
            }
          } catch (error) {
            console.warn("❌ Fallback video creation failed:", error);
          }
          
          // Final fallback: draw placeholder
          this.renderer.fillRect(bounds.x, bounds.y, bounds.width, bounds.height, "#666");
          console.log("📦 Drew placeholder rectangle for video");
        }
      } catch (error) {
        console.warn("❌ Failed to draw video frame:", error);
        // Draw a placeholder on error
        this.renderer.fillRect(bounds.x, bounds.y, bounds.width, bounds.height, "#f00");
        console.log("🔴 Drew error placeholder rectangle");
      }
    } else {
      console.log("⏭️ Skipping video render - outside element duration");
    }
  }

  /**
   * Seek video to specific time and wait for completion
   */
  private async seekVideoToTime(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const onSeeked = () => {
        if (resolved) return;
        resolved = true;
        console.log(`✅ Video seeked to ${time}s, actualTime: ${video.currentTime}, diff: ${Math.abs(video.currentTime - time).toFixed(3)}s`);
        cleanup();
        resolve();
      };
      
      const onError = (error: Event) => {
        if (resolved) return;
        resolved = true;
        console.warn(`❌ Video seek error:`, error);
        cleanup();
        reject(error);
      };
      
      const onLoadedData = () => {
        if (resolved) return;
        // Sometimes seeked event doesn't fire, but loadeddata means we have the frame
        if (Math.abs(video.currentTime - time) < 0.05) {
          resolved = true;
          console.log(`✅ Video loaded data at ${time}s (via loadeddata), actualTime: ${video.currentTime}`);
          cleanup();
          resolve();
        }
      };
      
      const onTimeout = () => {
        if (resolved) return;
        resolved = true;
        console.warn(`⏰ Video seek timeout for time ${time}s`);
        cleanup();
        // Don't reject, just resolve to continue
        resolve();
      };
      
      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        video.removeEventListener('loadeddata', onLoadedData);
        clearTimeout(timeoutId);
      };
      
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.addEventListener('loadeddata', onLoadedData);
      
      const timeoutId = setTimeout(onTimeout, 1000); // 1 second timeout
      
      // Set the time - this triggers seeking
      video.currentTime = time;
      
      // Always force seeking for better frame accuracy, don't assume "already at correct time"
      // This ensures we get the exact frame for the timestamp
    });
  }

  /**
   * Render an image element
   */
  private renderImageElement(element: TimelineElement, bounds: any): void {
    console.log("🖼️ renderImageElement called:", {
      elementId: element.id,
      bounds
    });

    if (element.type !== "media") {
      console.warn("❌ Element is not media type:", element.type);
      return;
    }
    
    const mediaItem = this.getMediaItem(element.mediaId);
    if (!mediaItem || mediaItem.type !== "image") {
      console.warn("❌ Media item not found or not image:", mediaItem);
      return;
    }
    
    console.log("🖼️ Image media item:", {
      id: mediaItem.id,
      name: mediaItem.name,
      hasUrl: !!mediaItem.url,
      hasFile: !!mediaItem.file
    });
    
    try {
      // Create image element from media item
      const imageElement = document.createElement("img");
      imageElement.src = mediaItem.url || URL.createObjectURL(mediaItem.file);
      
      console.log("🖼️ Image element created:", {
        src: imageElement.src,
        naturalWidth: imageElement.naturalWidth,
        naturalHeight: imageElement.naturalHeight
      });
      
      // For now, draw the image element even if it's not fully loaded
      // In a production implementation, images should be pre-loaded
      this.renderer.drawImage(imageElement, bounds.x, bounds.y, bounds.width, bounds.height);
      console.log("✅ Image drawn to canvas");
    } catch (error) {
      console.warn("❌ Failed to draw image:", error);
    }
  }

  /**
   * Render a text element
   */
  private renderTextElement(element: TimelineElement, bounds: any): void {
    // TODO: Implement text element rendering
    const textElement = element as any;
    if (textElement.content) {
      this.renderer.drawText(textElement.content, bounds.x, bounds.y, {
        fontSize: textElement.fontSize || 24,
        color: textElement.color || "#000000",
        fontFamily: textElement.fontFamily || "Arial, sans-serif",
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
    return this.timelineElements.filter(element => {
      const elementType = (element as any).type;
      return elementType === "audio" || (elementType === "video" && (element as any).hasAudio);
    });
  }

  /**
   * Create audio track info from timeline element
   */
  private async createAudioTrack(element: TimelineElement): Promise<AudioTrackInfo | null> {
    const audioElement = element as any;
    if (!audioElement.src) {
      return null;
    }

    try {
      // Load audio buffer
      const audioBuffer = await this.audioMixer.loadAudioBufferFromUrl(audioElement.src);
      
      // Calculate timing
      const startTime = audioElement.startTime || 0;
      const endTime = audioElement.endTime || (startTime + (audioElement.duration || 0));
      
      // Get volume and pan settings
      const volume = audioElement.volume !== undefined ? audioElement.volume : 1.0;
      const pan = audioElement.pan !== undefined ? audioElement.pan : 0.0;
      
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
    
    return audioElements.map(element => {
      const audioElement = element as any;
      return {
        elementId: element.id,
        src: audioElement.src || "",
        startTime: audioElement.startTime || 0,
        endTime: audioElement.endTime || (audioElement.startTime || 0) + (audioElement.duration || 0),
        volume: audioElement.volume !== undefined ? audioElement.volume : 1.0,
        pan: audioElement.pan !== undefined ? audioElement.pan : 0.0,
      };
    });
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
    
    // Clean up preloaded videos
    try {
      this.preloadedVideos.forEach((video, id) => {
        console.log(`🧹 Cleaning up preloaded video: ${id}`);
        video.pause();
        video.src = "";
        video.load();
      });
      this.preloadedVideos.clear();
    } catch (error) {
      console.warn("Failed to cleanup preloaded videos:", error);
    }
  }

  /**
   * Check if export is currently in progress
   */
  get isActive(): boolean {
    return this.isExporting;
  }

  /**
   * Preload all video elements for export
   */
  private async preloadVideos(): Promise<void> {
    console.log("📹 Starting video preload...");
    
    // Get unique video media items (avoid duplicates)
    const uniqueVideoIds = new Set<string>();
    this.timelineElements.forEach(element => {
      if (element.type === "media") {
        const mediaItem = this.getMediaItem(element.mediaId);
        if (mediaItem?.type === "video") {
          uniqueVideoIds.add(mediaItem.id);
        }
      }
    });
    
    const videoIds = Array.from(uniqueVideoIds);
    console.log(`📹 Found ${videoIds.length} unique video(s) to preload:`, videoIds);
    
    const preloadPromises = videoIds.map(async (videoId) => {
      const mediaItem = this.getMediaItem(videoId);
      if (!mediaItem || mediaItem.type !== "video") {
        console.warn(`❌ Video media item not found: ${videoId}`);
        return;
      }
      
      console.log(`📹 Preloading video: ${mediaItem.name} (ID: ${videoId})`);
      
      return new Promise<void>((resolve) => {
        const video = document.createElement("video");
        video.muted = true;
        video.crossOrigin = "anonymous";
        video.preload = "auto";
        
        // Set source
        if (mediaItem.url) {
          video.src = mediaItem.url;
        } else if (mediaItem.file) {
          video.src = URL.createObjectURL(mediaItem.file);
        } else {
          console.warn(`❌ No source available for video: ${mediaItem.name}`);
          resolve();
          return;
        }
        
        let resolved = false;
        
        const onCanPlayThrough = () => {
          if (resolved) return;
          resolved = true;
          console.log(`✅ Video fully preloaded: ${mediaItem.name}, readyState: ${video.readyState}, duration: ${video.duration}`);
          this.preloadedVideos.set(mediaItem.id, video);
          cleanup();
          resolve();
        };
        
        const onCanPlay = () => {
          if (resolved) return;
          // Wait a bit more for canplaythrough, but don't wait forever
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.log(`✅ Video ready (canplay): ${mediaItem.name}, readyState: ${video.readyState}`);
              // Only add if readyState is adequate
              if (video.readyState >= 2) {
                this.preloadedVideos.set(mediaItem.id, video);
              } else {
                console.warn(`⚠️ Video readyState too low: ${video.readyState}, not adding to preloaded videos`);
              }
              cleanup();
              resolve();
            }
          }, 1000); // Increased timeout to 1 second
        };
        
        const onLoadedMetadata = () => {
          console.log(`📊 Video metadata loaded: ${mediaItem.name}, duration: ${video.duration}`);
        };
        
        const onError = (error: Event) => {
          if (resolved) return;
          resolved = true;
          console.warn(`❌ Failed to preload video: ${mediaItem.name}`, error);
          cleanup();
          resolve();
        };
        
        const onTimeout = () => {
          if (resolved) return;
          resolved = true;
          console.warn(`⏰ Video preload timeout: ${mediaItem.name}, readyState: ${video.readyState}`);
          // Still add it if we have some data
          if (video.readyState >= 2) {
            this.preloadedVideos.set(mediaItem.id, video);
            console.log(`⚠️ Added partially loaded video: ${mediaItem.name}`);
          }
          cleanup();
          resolve();
        };
        
        const cleanup = () => {
          video.removeEventListener("canplaythrough", onCanPlayThrough);
          video.removeEventListener("canplay", onCanPlay);
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("error", onError);
          clearTimeout(timeoutId);
        };
        
        video.addEventListener("canplaythrough", onCanPlayThrough);
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("error", onError);
        
        // Set a timeout to avoid hanging indefinitely
        const timeoutId = setTimeout(onTimeout, 10000); // 10 second timeout
        
        // Start loading and force initial frame loading
        video.load();
        
        // Try to load the first frame by seeking to 0
        video.addEventListener('loadedmetadata', () => {
          console.log(`📊 Metadata loaded, seeking to start: ${mediaItem.name}`);
          video.currentTime = 0;
        }, { once: true });
      });
    });
    
    await Promise.all(preloadPromises);
    console.log(`✅ Preload complete: ${this.preloadedVideos.size} videos ready`);
    
    // Debug: Log all preloaded videos
    this.preloadedVideos.forEach((video, id) => {
      console.log(`📹 Preloaded video ${id}: readyState=${video.readyState}, duration=${video.duration}`);
    });
  }

  /**
   * Get a media item by its ID
   */
  private getMediaItem(id: string): MediaItem | undefined {
    return this.mediaItems.find(item => item.id === id);
  }
}