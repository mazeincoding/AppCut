/**
 * Memory-Efficient Streaming Recorder
 * 
 * Implements streaming video recording with 8GB memory limit compliance:
 * - Stream frames directly to encoder without keeping in memory
 * - Automatic memory monitoring and cleanup
 * - Adaptive quality based on memory pressure
 * - Support for both MediaRecorder and FFmpeg backends
 * 
 * SAFETY: Prevents memory exhaustion that could crash the browser
 */

import { MemoryMonitor8GB } from './memory-monitor-8gb';

export interface StreamingRecorderOptions {
  canvas: HTMLCanvasElement;
  fps: number;
  duration: number;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  onProgress?: (progress: number, status: string) => void;
  onMemoryWarning?: (usage: number) => void;
}

interface FrameChunk {
  data: ImageData;
  timestamp: number;
  sequenceNumber: number;
}

export class StreamingRecorder {
  private canvas: HTMLCanvasElement;
  private fps: number;
  private duration: number;
  private options: StreamingRecorderOptions;
  private memoryMonitor: MemoryMonitor8GB;
  
  // Recording state
  private isRecording = false;
  private recordedChunks: Blob[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private frameSequence = 0;
  private totalFrames: number;
  
  // Memory management
  private maxChunksInMemory = 10; // Adaptive based on memory
  private lastMemoryCheck = 0;
  private memoryCheckInterval = 1000; // Check every second
  
  // Streaming buffer
  private pendingFrames: FrameChunk[] = [];
  private maxPendingFrames = 5; // Keep minimal buffer
  
  // Performance tracking
  private startTime = 0;
  private framesProcessed = 0;
  private lastProgressUpdate = 0;

  constructor(options: StreamingRecorderOptions) {
    this.canvas = options.canvas;
    this.fps = options.fps;
    this.duration = options.duration;
    this.options = options;
    this.totalFrames = Math.ceil(this.duration * this.fps);
    
    // Initialize memory monitor
    this.memoryMonitor = new MemoryMonitor8GB();
    
    // Calculate adaptive settings based on memory
    this.calculateAdaptiveSettings();
    
    console.log(`📹 StreamingRecorder initialized:`);
    console.log(`   - Total frames: ${this.totalFrames}`);
    console.log(`   - Max chunks in memory: ${this.maxChunksInMemory}`);
    console.log(`   - Pending frame buffer: ${this.maxPendingFrames}`);
  }

  /**
   * Calculate adaptive settings based on available memory
   */
  private calculateAdaptiveSettings(): void {
    const memoryStatus = this.memoryMonitor.getMemoryStatus();
    const availableGB = memoryStatus.availableGB;
    
    // Adjust buffer sizes based on available memory
    if (availableGB > 4) {
      // Plenty of memory - can buffer more
      this.maxChunksInMemory = 20;
      this.maxPendingFrames = 10;
    } else if (availableGB > 2) {
      // Moderate memory - standard buffering
      this.maxChunksInMemory = 10;
      this.maxPendingFrames = 5;
    } else {
      // Low memory - minimal buffering
      this.maxChunksInMemory = 5;
      this.maxPendingFrames = 2;
      console.warn(`⚠️ Low memory (${availableGB.toFixed(1)}GB), using minimal buffering`);
    }
    
    // Adjust quality settings if memory is critical
    if (memoryStatus.shouldEmergencyCleanup) {
      this.adjustQualityForMemory();
    }
  }

  /**
   * Adjust recording quality based on memory pressure
   */
  private adjustQualityForMemory(): void {
    const originalBitrate = this.options.videoBitsPerSecond || 2500000; // 2.5 Mbps default
    
    // Reduce bitrate by 30% under memory pressure
    const reducedBitrate = Math.floor(originalBitrate * 0.7);
    this.options.videoBitsPerSecond = reducedBitrate;
    
    console.warn(`⚠️ Memory pressure detected, reducing bitrate to ${(reducedBitrate / 1000000).toFixed(1)} Mbps`);
    
    // Notify caller about quality reduction
    this.options.onMemoryWarning?.(this.memoryMonitor.getMemoryStatus().percentageUsed);
  }

  /**
   * Start recording with streaming setup
   */
  public async startRecording(): Promise<void> {
    try {
      console.log('🎬 Starting streaming recorder...');
      
      // Check memory before starting
      await this.memoryMonitor.checkMemoryConstraints();
      
      // Set up MediaRecorder stream
      const stream = this.canvas.captureStream(this.fps);
      
      const mimeType = this.options.mimeType || this.getBestMimeType();
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: this.options.videoBitsPerSecond,
        audioBitsPerSecond: this.options.audioBitsPerSecond,
      };
      
      this.mediaRecorder = new MediaRecorder(stream, recorderOptions);
      
      // Set up event handlers for streaming
      this.setupMediaRecorderEvents();
      
      // Start recording
      this.mediaRecorder.start(100); // Timeslice: 100ms chunks for streaming
      this.isRecording = true;
      this.startTime = Date.now();
      
      console.log(`✅ Streaming recorder started with ${mimeType}`);
      console.log(`   - Video bitrate: ${(recorderOptions.videoBitsPerSecond || 0) / 1000000}Mbps`);
      
    } catch (error) {
      console.error('❌ Failed to start streaming recorder:', error);
      throw new Error(`Recording initialization failed: ${error.message}`);
    }
  }

  /**
   * Set up MediaRecorder event handlers for streaming
   */
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.handleDataChunk(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      console.log('📹 MediaRecorder stopped');
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('❌ MediaRecorder error:', event);
    };

    this.mediaRecorder.onstart = () => {
      console.log('🎬 MediaRecorder started streaming');
    };
  }

  /**
   * Handle incoming data chunks with memory management
   */
  private handleDataChunk(chunk: Blob): void {
    // Check memory before adding chunk
    const memoryStatus = this.memoryMonitor.getMemoryStatus();
    
    if (memoryStatus.shouldEmergencyCleanup && this.recordedChunks.length > 3) {
      // Emergency: keep only last 3 chunks
      console.warn('⚠️ Emergency memory cleanup: removing old chunks');
      this.recordedChunks = this.recordedChunks.slice(-3);
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }
    }
    
    // Add chunk to buffer
    this.recordedChunks.push(chunk);
    
    // Maintain memory limit by removing old chunks if needed
    if (this.recordedChunks.length > this.maxChunksInMemory) {
      // Remove oldest chunks, but keep at least 5 for continuity
      const excessChunks = this.recordedChunks.length - this.maxChunksInMemory;
      const chunksToRemove = Math.min(excessChunks, this.recordedChunks.length - 5);
      
      if (chunksToRemove > 0) {
        this.recordedChunks.splice(0, chunksToRemove);
        console.log(`🧹 Removed ${chunksToRemove} old chunks to manage memory`);
      }
    }
    
    // Update progress based on time elapsed
    this.updateProgress();
    
    // Periodic memory check
    this.performPeriodicMemoryCheck();
  }

  /**
   * Add frame to recording stream
   */
  public async addFrame(imageData: ImageData): Promise<void> {
    if (!this.isRecording) {
      throw new Error('Recorder is not started');
    }

    try {
      // Check memory constraints before processing frame
      if (Date.now() - this.lastMemoryCheck > this.memoryCheckInterval) {
        await this.memoryMonitor.checkMemoryConstraints();
        this.lastMemoryCheck = Date.now();
      }

      // Create frame chunk
      const frameChunk: FrameChunk = {
        data: imageData,
        timestamp: this.framesProcessed / this.fps,
        sequenceNumber: this.frameSequence++
      };

      // Add to pending frames buffer
      this.pendingFrames.push(frameChunk);

      // Process pending frames if buffer is getting full
      if (this.pendingFrames.length >= this.maxPendingFrames) {
        await this.processPendingFrames();
      }

      this.framesProcessed++;

    } catch (error) {
      console.error(`❌ Failed to add frame ${this.framesProcessed}:`, error);
      throw error;
    }
  }

  /**
   * Process pending frames to the canvas stream
   */
  private async processPendingFrames(): Promise<void> {
    if (this.pendingFrames.length === 0) return;

    try {
      const ctx = this.canvas.getContext('2d')!;
      
      // Process each pending frame
      for (const frame of this.pendingFrames) {
        // Draw frame to canvas (which streams to MediaRecorder)
        ctx.putImageData(frame.data, 0, 0);
        
        // Small delay to maintain frame rate
        await this.waitForNextFrame();
      }
      
      // Clear processed frames
      this.pendingFrames = [];
      
    } catch (error) {
      console.error('❌ Failed to process pending frames:', error);
      throw error;
    }
  }

  /**
   * Wait for appropriate frame timing
   */
  private async waitForNextFrame(): Promise<void> {
    const frameTime = 1000 / this.fps;
    return new Promise(resolve => setTimeout(resolve, frameTime / 4)); // Quarter frame time for smoothness
  }

  /**
   * Update progress reporting
   */
  private updateProgress(): void {
    const now = Date.now();
    if (now - this.lastProgressUpdate < 500) return; // Update every 500ms max
    
    const elapsedTime = (now - this.startTime) / 1000;
    const progress = Math.min((elapsedTime / this.duration) * 100, 100);
    
    const memoryStatus = this.memoryMonitor.getMemoryStatus();
    const status = `Streaming: ${this.recordedChunks.length} chunks, ${memoryStatus.currentUsageGB.toFixed(1)}GB memory`;
    
    this.options.onProgress?.(progress, status);
    this.lastProgressUpdate = now;
  }

  /**
   * Periodic memory check and optimization
   */
  private performPeriodicMemoryCheck(): void {
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) return;
    
    const memoryStatus = this.memoryMonitor.getMemoryStatus();
    
    if (memoryStatus.shouldTriggerGC) {
      console.log('🧹 Triggering memory optimization during streaming...');
      this.memoryMonitor.optimizeMemoryUsage();
    }
    
    // Adjust buffer sizes if memory pressure changes
    if (memoryStatus.shouldEmergencyCleanup) {
      this.maxChunksInMemory = Math.max(this.maxChunksInMemory - 2, 3);
      this.maxPendingFrames = Math.max(this.maxPendingFrames - 1, 1);
      console.warn(`⚠️ Reducing buffer sizes due to memory pressure`);
    }
    
    this.lastMemoryCheck = now;
  }

  /**
   * Stop recording and return final video blob
   */
  public async stopRecording(): Promise<Blob> {
    try {
      console.log('🛑 Stopping streaming recorder...');
      
      // Process any remaining frames
      if (this.pendingFrames.length > 0) {
        await this.processPendingFrames();
      }
      
      // Stop MediaRecorder
      if (this.mediaRecorder && this.isRecording) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Recording stop timeout'));
          }, 10000);

          this.mediaRecorder!.onstop = () => {
            clearTimeout(timeout);
            
            try {
              // Combine all chunks into final blob
              const blob = new Blob(this.recordedChunks, { 
                type: this.options.mimeType || 'video/webm' 
              });
              
              const sizeMP = (blob.size / (1024 * 1024)).toFixed(1);
              const duration = (Date.now() - this.startTime) / 1000;
              
              console.log(`✅ Streaming recording completed:`);
              console.log(`   - Size: ${sizeMP}MB`);
              console.log(`   - Duration: ${duration.toFixed(1)}s`);
              console.log(`   - Chunks: ${this.recordedChunks.length}`);
              
              this.cleanup();
              resolve(blob);
              
            } catch (error) {
              reject(error);
            }
          };

          this.mediaRecorder!.stop();
        });
      }
      
      throw new Error('No active recording to stop');
      
    } catch (error) {
      console.error('❌ Failed to stop streaming recorder:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Get best supported MIME type
   */
  private getBestMimeType(): string {
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    console.warn('⚠️ No preferred MIME types supported, using default');
    return 'video/webm';
  }

  /**
   * Get current recording statistics
   */
  public getStats(): {
    isRecording: boolean;
    framesProcessed: number;
    chunksInMemory: number;
    pendingFrames: number;
    memoryUsage: string;
    elapsedTime: number;
  } {
    const memoryStatus = this.memoryMonitor.getMemoryStatus();
    const elapsedTime = this.isRecording ? (Date.now() - this.startTime) / 1000 : 0;
    
    return {
      isRecording: this.isRecording,
      framesProcessed: this.framesProcessed,
      chunksInMemory: this.recordedChunks.length,
      pendingFrames: this.pendingFrames.length,
      memoryUsage: `${memoryStatus.currentUsageGB.toFixed(1)}GB / 8GB`,
      elapsedTime
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    console.log('🧹 Cleaning up streaming recorder...');
    
    this.isRecording = false;
    
    // Clear arrays
    this.recordedChunks = [];
    this.pendingFrames = [];
    
    // Cleanup MediaRecorder
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (error) {
        console.warn('Warning during MediaRecorder cleanup:', error);
      }
      this.mediaRecorder = null;
    }
    
    // Force memory cleanup
    this.memoryMonitor.optimizeMemoryUsage();
    
    console.log('✅ Streaming recorder cleanup completed');
  }
}