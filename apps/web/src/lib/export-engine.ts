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
import { memoryMonitor, estimateVideoMemoryUsage } from "@/lib/memory-monitor";

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
  private memoryMonitoringStarted = false;

  constructor(options: ExportEngineOptions) {
    console.log("🏗️ EXPORT ENGINE CONSTRUCTOR CALLED");
    console.log("🏗️ Constructor duration:", options.duration);
    console.log("🏗️ Timeline elements count:", options.timelineElements.length);
    console.log("🏗️ Constructor options:", { 
      duration: options.duration, 
      fps: options.fps,
      timelineElementsCount: options.timelineElements.length 
    });
    
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
    console.log("🎥 FFmpeg export enabled:", ffmpegEnabled, "env value:", process.env.NEXT_PUBLIC_OFFLINE_EXPORT);
    
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
   * Start the export process
   */
  async startExport(): Promise<Blob> {
    console.log("🔥🔥🔥 START_EXPORT METHOD CALLED - ENTRY POINT CONFIRMED 🔥🔥🔥");
    console.log("🔥 Timestamp:", new Date().toISOString());
    console.log("🔥 Export engine state:", { isExporting: this.isExporting, duration: this.duration });
    
    if (this.isExporting) {
      console.log("🔥 Export already in progress - throwing error");
      throw new ExportError("Export already in progress", "EXPORT_IN_PROGRESS");
    }

    try {
      // DEBUG: Initial export state before any calculations
      console.log("🚀 EXPORT INITIALIZATION DEBUG:");
      console.log("1️⃣ Initial export duration (this.duration):", this.duration);
      console.log("2️⃣ Timeline elements count:", this.timelineElements.length);
      console.log("3️⃣ FPS setting:", this.fps);
      
      // Calculate the actual video content duration (not timeline duration)
      const actualVideoDuration = this.calculateActualVideoDuration();
      
      console.log("🎬 Export starting:", {
        timelineElements: this.timelineElements.length,
        calculatedDuration: this.duration,
        actualVideoDuration,
        fps: this.fps
      });

      // Log detailed timeline element information
      console.log("📊 DETAILED TIMELINE ELEMENTS ANALYSIS:");
      this.timelineElements.forEach((el, index) => {
        const trimStart = el.trimStart || 0;
        const trimEnd = el.trimEnd || 0;
        const effectiveDuration = el.duration - trimStart - trimEnd;
        const elementEndTime = (el.startTime || 0) + el.duration - trimStart - trimEnd;
        
        console.log(`  Element ${index + 1}:`, {
          id: el.id,
          type: el.type,
          startTime: el.startTime,
          duration: el.duration,
          trimStart: trimStart,
          trimEnd: trimEnd,
          effectiveDuration: effectiveDuration,
          elementEndTime: elementEndTime,
          mediaId: el.type === 'media' ? el.mediaId : 'N/A (text element)'
        });
        
        // CRITICAL: Check if trim values are causing the issue
        if (trimEnd > 0) {
          console.log(`  🚨 TRIM END DETECTED: ${trimEnd}s - This may be causing duration reduction!`);
        }
        if (effectiveDuration !== el.duration) {
          console.log(`  🚨 EFFECTIVE DURATION DIFFERS: ${effectiveDuration}s vs original ${el.duration}s`);
        }
      });

      // Log media items duration comparison
      console.log("🎥 MEDIA ITEMS DURATION ANALYSIS:");
      const mediaAnalysis = this.timelineElements
        .filter(el => el.type === 'media')
        .map((el, index) => {
          const mediaEl = el as any; // Type assertion since we filtered for media
          const mediaItem = this.getMediaItem(mediaEl.mediaId);
          const analysis = {
            elementId: el.id,
            mediaId: mediaEl.mediaId,
            mediaType: mediaItem?.type,
            sourceDuration: mediaItem?.duration,
            timelineElementDuration: el.duration,
            durationMismatch: mediaItem?.duration && Math.abs(mediaItem.duration - el.duration) > 0.1
          };
          console.log(`  Media ${index + 1}:`, analysis);
          return analysis;
        });
      
      // Calculate duration comparison
      console.log("⏱️ DURATION COMPARISON:");
      const durationComparison = {
        timelineDuration: this.duration,
        actualVideoDuration,
        finalExportDuration: Math.min(this.duration, actualVideoDuration + 0.1),
        hasSignificantMismatch: Math.abs(this.duration - actualVideoDuration) > 0.5
      };
      console.log("  Timeline duration:", this.duration);
      console.log("  Calculated video duration:", actualVideoDuration);
      console.log("  Final export duration:", Math.min(this.duration, actualVideoDuration + 0.1));
      console.log("  Has significant mismatch:", Math.abs(this.duration - actualVideoDuration) > 0.5);
      
      // Use the shorter of timeline duration or actual video duration
      const safeDuration = Math.min(this.duration, actualVideoDuration + 0.1); // Small buffer
      
      if (safeDuration !== this.duration) {
        console.log(`🛠️ DURATION ADJUSTMENT DETECTED!`);
        console.log(`   Original duration: ${this.duration}s`);
        console.log(`   Safe duration: ${safeDuration}s`);
        console.log(`   Difference: ${this.duration - safeDuration}s`);
        this.duration = safeDuration;
        console.log(`✅ Export duration updated to: ${this.duration}s`);
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
      } else {
        console.log(`✅ No duration adjustment needed - using: ${this.duration}s`);
      }
      
      // Pre-flight checks including memory monitoring
      this.performPreflightChecks();
      console.log("✅ Preflight checks passed");
      
      // Start memory monitoring
      this.startMemoryMonitoring();
      
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
    
    // Stop memory monitoring
    this.stopMemoryMonitoring();
    
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

        // Check memory status periodically
        if (currentFrame % 30 === 0) { // Check every 30 frames
          try {
            this.checkMemoryStatus();
          } catch (error) {
            reject(error);
            return;
          }
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
          // Get frame data
          const frameData = this.captureService.getFrameData(currentFrame);
          
          console.log("🎞️ Rendering frame:", {
            frameNumber: currentFrame,
            timestamp: frameData.timestamp,
            targetInterval: `${frameInterval}ms`
          });
          
          // Render frame to canvas
          await this.renderSingleFrame(frameData);
          
          // Update progress
          const progress = Math.floor((currentFrame / totalFrames) * 100);
          if (progress > lastProgressUpdate) {
            lastProgressUpdate = progress;
            const memSummary = memoryMonitor.getMemorySummary();
            this.onProgress?.(progress, `Rendering frame ${currentFrame + 1} of ${totalFrames} (${memSummary})`);
          }
          
          currentFrame++;
          
          // Schedule next frame at exact interval for consistent timing
          setTimeout(() => {
            renderFrame(performance.now());
          }, frameInterval);
          
        } catch (error) {
          reject(error);
        }
      };

      // Start rendering with initial timestamp
      renderFrame(performance.now());
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

      // Check memory status periodically
      if (i % 30 === 0) { // Check every 30 frames
        try {
          this.checkMemoryStatus();
        } catch (error) {
          throw error;
        }
      }

      const frameData = this.captureService.getFrameData(i);
      await this.renderSingleFrame(frameData);

      const dataUrl = this.canvas.toDataURL("image/png");
      await (this.recorder as FFmpegVideoRecorder).addFrame(dataUrl, i);

      const progress = Math.floor((i / totalFrames) * 100);
      const memSummary = memoryMonitor.getMemorySummary();
      this.onProgress?.(progress, `Rendering frame ${i + 1} of ${totalFrames} (${memSummary})`);
    }

    this.onProgress?.(50, "Encoding video...");
    return this.recorder.stopRecording();
  }

  /**
   * Calculate the actual duration of video content (not timeline gaps)
   */
  private calculateActualVideoDuration(): number {
    // Use the timeline duration that was passed from the timeline store
    // This already accounts for all trims, splits, and element positioning
    console.log("🎯 Using timeline duration instead of recalculating:", this.duration);
    return this.duration;
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
        })
        
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (error) {
        // Fall back to traditional download if user cancels or API unavailable
      }
    }

    // Safe iframe-based download to prevent navigation bug
    const url = URL.createObjectURL(blob)
    
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (iframeDoc) {
      const link = iframeDoc.createElement('a')
      link.href = url
      link.download = filename
      iframeDoc.body.appendChild(link)
      link.click()
      iframeDoc.body.removeChild(link)
    }
    
    // Cleanup with delay for video files
    setTimeout(() => {
      document.body.removeChild(iframe)
      URL.revokeObjectURL(url)
    }, 1000)
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
   * Start memory monitoring for export
   */
  private startMemoryMonitoring(): void {
    if (this.memoryMonitoringStarted) {
      return;
    }
    
    this.memoryMonitoringStarted = true;
    
    // Clear previous warnings
    memoryMonitor.clearWarnings();
    
    // Check file safety first
    const totalFileSize = this.estimateProcessingSize();
    const fileSafetyWarning = memoryMonitor.checkFileSafety(totalFileSize);
    
    if (fileSafetyWarning) {
      console.warn(`💾 File safety warning: ${fileSafetyWarning.message}`);
      
      if (!fileSafetyWarning.canContinue) {
        throw new MemoryError(
          fileSafetyWarning.message,
          { estimatedMB: totalFileSize / 1024 / 1024 }
        );
      }
      
      // Show warning to user via progress callback
      this.onProgress?.(0, `⚠️ ${fileSafetyWarning.message}`);
    }
    
    // Start continuous monitoring
    memoryMonitor.startMonitoring(2000); // Check every 2 seconds
    
    console.log(`🔍 Memory monitoring started - ${memoryMonitor.getMemorySummary()}`);
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (!this.memoryMonitoringStarted) {
      return;
    }
    
    this.memoryMonitoringStarted = false;
    memoryMonitor.stopMonitoring();
    
    console.log(`🔍 Memory monitoring stopped - ${memoryMonitor.getMemorySummary()}`);
  }

  /**
   * Estimate total processing size for memory calculations
   */
  private estimateProcessingSize(): number {
    const videoMemory = estimateVideoMemoryUsage(
      this.settings.width,
      this.settings.height,
      this.duration,
      this.fps
    );
    
    // Add estimated audio memory (rough calculation)
    const audioMemory = this.duration * 44100 * 2 * 2; // 16-bit stereo
    
    return videoMemory + audioMemory;
  }

  /**
   * Check memory status and warn if needed
   */
  private checkMemoryStatus(): void {
    const memInfo = memoryMonitor.getMemoryInfo();
    if (!memInfo) {
      return;
    }
    
    const recentWarnings = memoryMonitor.getRecentWarnings(1);
    if (recentWarnings.length > 0) {
      const warning = recentWarnings[0];
      
      if (warning.level === 'error' && !warning.canContinue) {
        throw new MemoryError(
          warning.message,
          { 
            usedPercent: memInfo.usedPercent,
            recommendation: warning.recommendation
          }
        );
      }
      
      if (warning.level === 'critical' || warning.level === 'warning') {
        // Show warning via progress callback
        this.onProgress?.(
          -1, // Special value to indicate warning
          `💾 ${warning.message} - ${warning.recommendation}`
        );
      }
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

    // Check memory usage with new monitor
    const memoryEstimate = estimateMemoryUsage(
      this.settings.width,
      this.settings.height,
      this.duration,
      this.fps
    );
    
    // Use memory monitor for more accurate checking
    if (!memoryMonitor.canPerformOperation(memoryEstimate.estimatedMB)) {
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
    
    // Stop memory monitoring
    this.stopMemoryMonitoring();
    
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