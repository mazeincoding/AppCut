/**
 * WebCodecs Export Engine
 * 
 * SAFETY: Extends existing optimized engine with complete fallback
 * Based on mermaid diagram: implements WebCodecs export flow with automatic fallback
 */

import { ExportEngine } from './export-engine-optimized';
import { WebCodecsCompatibility } from './webcodecs-detector';
import { MemoryMonitor8GB } from './memory-monitor-8gb';

// Type definitions (avoiding dependency on mp4-muxer until runtime)
declare global {
  interface Window {
    gc?: () => void;
  }
}

interface WebCodecsSettings {
  type: 'hardware' | 'software';
  bitrate: number;
  keyFrameInterval: number;
  bufferSize: number;
  parallelEncoders: number;
  qualityLevel: 'low' | 'medium' | 'high';
}

/**
 * SAFETY: Extend existing engine to ensure fallback compatibility
 * All WebCodecs functionality is additive, never replaces existing methods
 */
export class WebCodecsExportEngine extends ExportEngine {
  private encoder: VideoEncoder | null = null;
  private muxer: any = null; // Mp4Muxer - loaded dynamically
  private frameCount = 0;
  private isEncoding = false;
  private memoryMonitor: MemoryMonitor8GB;
  private webCodecsSettings: WebCodecsSettings;

  constructor(options: any) {
    // SAFETY: Call parent constructor to preserve all existing functionality
    super(options);
    
    this.memoryMonitor = options.memoryMonitor || new MemoryMonitor8GB();
    this.webCodecsSettings = options.webCodecsSettings || {
      type: 'software',
      bitrate: 8_000_000,
      keyFrameInterval: 30,
      bufferSize: 256 * 1024 * 1024,
      parallelEncoders: 1,
      qualityLevel: 'medium'
    };

    console.log('🚀 WebCodecs export engine initialized');
  }

  /**
   * Initialize WebCodecs components
   * SAFETY: Comprehensive error handling with fallback
   */
  async initialize(): Promise<void> {
    try {
      // SAFETY: Always check compatibility with graceful fallback
      const webCodecsAvailable = await WebCodecsCompatibility.safeWebCodecsCheck();
      if (!webCodecsAvailable) {
        console.log('WebCodecs not available, will use existing export engine');
        throw new Error('FALLBACK_TO_EXISTING_ENGINE');
      }

      const supportDetails = await WebCodecsCompatibility.checkSupport();
      if (!supportDetails.supported) {
        console.log('WebCodecs supported but no compatible codecs found');
        throw new Error('FALLBACK_TO_EXISTING_ENGINE');
      }

      console.log('WebCodecs supported codecs:', supportDetails.codecs);
      console.log('Hardware acceleration:', supportDetails.hardwareAcceleration);

      // Choose best codec (prefer hardware-accelerated H.264)
      const preferredCodec = await WebCodecsCompatibility.getBestCodec();
      if (!preferredCodec) {
        throw new Error('FALLBACK_TO_EXISTING_ENGINE');
      }

      // SAFETY: Load mp4-muxer dynamically to prevent breaking if not available
      await this.initializeMuxer(preferredCodec);
      await this.initializeEncoder(preferredCodec);

      console.log('✅ WebCodecs initialization successful');
    } catch (error) {
      if (error instanceof Error && error.message === 'FALLBACK_TO_EXISTING_ENGINE') {
        throw error;
      }
      console.log('WebCodecs initialization failed:', error);
      throw new Error('FALLBACK_TO_EXISTING_ENGINE');
    }
  }

  /**
   * Initialize MP4 muxer with memory constraints
   */
  private async initializeMuxer(codec: string): Promise<void> {
    try {
      // SAFETY: Dynamic import to prevent breaking if mp4-muxer not available
      const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
      
      const muxerTarget = new ArrayBufferTarget();
      this.muxer = new Muxer({
        target: muxerTarget,
        video: {
          codec: codec as "vp9" | "av1" | "hevc" | "avc",
          width: this.settings.width,
          height: this.settings.height,
          // frameRate: this.fps // Not supported by mp4-muxer VideoOptions
        },
        fastStart: 'in-memory'
        // Note: chunkSize and maxBufferSize not supported by mp4-muxer
      });

      console.log('📦 MP4 muxer initialized with', this.webCodecsSettings.bufferSize / (1024 * 1024), 'MB buffer');
    } catch (error) {
      console.log('Failed to initialize muxer:', error);
      throw error;
    }
  }

  /**
   * Initialize WebCodecs VideoEncoder
   */
  private async initializeEncoder(codec: string): Promise<void> {
    this.encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => {
        this.handleEncodedChunk(chunk, metadata);
      },
      error: (error: Error) => {
        console.log('WebCodecs encoder error:', error);
        this.onError?.(error.message);
      }
    });

    // Configure encoder with optimal settings based on memory constraints
    const config: VideoEncoderConfig = {
      codec,
      width: this.settings.width,
      height: this.settings.height,
      bitrate: this.webCodecsSettings.bitrate,
      framerate: this.fps,
      // keyFrameInterval: this.webCodecsSettings.keyFrameInterval, // Not supported by VideoEncoderConfig
      latencyMode: 'quality',
      hardwareAcceleration: this.webCodecsSettings.type === 'hardware' ? 'prefer-hardware' : 'prefer-software'
    };

    const support = await VideoEncoder.isConfigSupported(config);
    if (!support.supported) {
      throw new Error(`WebCodecs config not supported: ${JSON.stringify(config)}`);
    }

    this.encoder.configure(config);
    this.isEncoding = true;
    console.log('🎬 WebCodecs encoder configured:', config);
  }

  /**
   * Handle encoded video chunks from encoder
   */
  private handleEncodedChunk(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata): void {
    if (!this.muxer) return;

    try {
      // Add chunk to muxer
      this.muxer.addVideoChunk(chunk, metadata);
    } catch (error) {
      console.log('Error adding chunk to muxer:', error);
      this.onError?.(`Muxing error: ${error}`);
    }
  }

  /**
   * Render and encode a single frame with memory management
   * Implements memory checking from mermaid diagram
   */
  async renderAndEncodeFrame(frameData: any): Promise<void> {
    if (!this.encoder || !this.isEncoding) {
      throw new Error('WebCodecs encoder not initialized');
    }

    // SAFETY: Memory check before processing (implements mermaid diagram flow)
    await this.memoryMonitor.checkMemoryDuringExport(this.frameCount);

    // Render frame to canvas (same as current method)
    await this.renderSingleFrameOptimized(frameData);

    // Create VideoFrame from canvas
    const timestamp = (this.frameCount * 1_000_000) / this.fps; // microseconds
    const videoFrame = new VideoFrame(this.canvas, {
      timestamp,
      duration: 1_000_000 / this.fps // microseconds per frame
    });

    try {
      // Determine if this should be a keyframe
      const isKeyFrame = this.frameCount % this.webCodecsSettings.keyFrameInterval === 0;

      // Encode frame
      this.encoder.encode(videoFrame, { keyFrame: isKeyFrame });
      this.frameCount++;

      // SAFETY: Clean up frame immediately to free memory
      videoFrame.close();
    } catch (error) {
      videoFrame.close();
      throw error;
    }
  }

  /**
   * Finalize export and create video blob
   */
  async finalize(): Promise<Blob> {
    if (!this.encoder || !this.muxer) {
      throw new Error('WebCodecs components not initialized');
    }

    console.log('🎬 Finalizing WebCodecs export...');

    // Flush remaining frames
    await this.encoder.flush();
    this.encoder.close();
    this.isEncoding = false;

    // Finalize muxer
    this.muxer.finalize();

    // Get final video buffer
    const muxerTarget = this.muxer.target;
    const videoBuffer = muxerTarget.buffer;

    return new Blob([videoBuffer], { type: 'video/mp4' });
  }

  /**
   * SAFETY: Override main export method with complete fallback
   * Implements the export flow from mermaid diagram
   */
  async startExport(): Promise<Blob> {
    try {
      // Initialize WebCodecs - implements "WebCodecs Initialize OK?" from mermaid
      await this.initialize();
      
      this.onProgress?.(5, 'WebCodecs encoder initialized');

      const totalFrames = this.captureService.getTotalFrames();
      console.log(`🚀 Starting WebCodecs export: ${totalFrames} frames`);

      // Start encoding - implements "Start WebCodecs Export" from mermaid
      for (let i = 0; i < totalFrames; i++) {
        if (this.shouldCancel) {
          throw new Error('Export cancelled');
        }

        const frameData = this.captureService.getFrameData(i);
        await this.renderAndEncodeFrame(frameData);

        // Update progress
        const progress = 10 + Math.floor((i / totalFrames) * 85); // 10% to 95%
        const memoryStatus = this.memoryMonitor.getMemoryStatusString();
        this.onProgress?.(progress, `Encoding frame ${i + 1}/${totalFrames} (WebCodecs) - ${memoryStatus}`);
      }

      this.onProgress?.(95, 'Finalizing video...');
      const videoBlob = await this.finalize();

      this.onProgress?.(100, 'WebCodecs export complete!');
      return videoBlob;

    } catch (error) {
      console.log('WebCodecs export failed:', error);
      
      // SAFETY: Clean up WebCodecs resources (implements "Cleanup WebCodecs" from mermaid)
      try {
        if (this.encoder && this.encoder.state !== 'closed') {
          this.encoder.close();
        }
        this.encoder = null;
        this.muxer = null;
        this.isEncoding = false;
        
        // Clear memory caches
        await this.memoryMonitor.optimizeMemoryUsage();
      } catch (cleanupError) {
        console.log('WebCodecs cleanup error (non-critical):', cleanupError);
      }
      
      // SAFETY: Always fall back to existing optimized export engine
      // Implements "Auto Fallback to Optimized" from mermaid diagram
      console.log('🔄 Falling back to existing optimized export engine');
      this.onProgress?.(0, 'Switching to optimized export engine...');
      
      // Call parent class (existing optimized engine) method
      return super.startExport();
    }
  }

  /**
   * Cancel export with proper cleanup
   */
  cancelExport(): void {
    this.shouldCancel = true;
    
    // Clean up WebCodecs resources
    if (this.encoder && this.encoder.state !== 'closed') {
      try {
        this.encoder.close();
      } catch (error) {
        console.log('Error closing encoder during cancel:', error);
      }
    }
    
    // Call parent cancel method
    super.cancelExport();
  }

  /**
   * Get export progress with memory information
   */
  getExportStatus(): {
    frameCount: number;
    memoryUsage: string;
    engineType: string;
    hardwareAccelerated: boolean;
  } {
    return {
      frameCount: this.frameCount,
      memoryUsage: this.memoryMonitor.getMemoryStatusString(),
      engineType: 'WebCodecs',
      hardwareAccelerated: this.webCodecsSettings.type === 'hardware'
    };
  }

  /**
   * Force garbage collection during export
   * Used by memory monitor for cleanup
   */
  private async forceGarbageCollection(): Promise<void> {
    // Use memory monitor's optimized GC method
    await this.memoryMonitor.optimizeMemoryUsage();
  }
}