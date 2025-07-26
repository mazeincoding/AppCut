import { 
  Output, 
  Mp4OutputFormat, 
  BufferTarget, 
  EncodedVideoPacketSource, 
  EncodedAudioPacketSource, 
  EncodedPacket 
} from 'mediabunny';
import type { 
  ExportSettings, 
  ExportProgress, 
  TimelineExportData, 
  ExportEventMap,
  EncoderConfig,
  RenderFrame
} from '../types';
import { FrameRenderer } from './frame-renderer';
import { AudioProcessor } from './audio-processor';
import { ConfigGenerator } from './config-generator';
import { StreamTarget } from './stream-target';
import { debugLogger } from '../utils/debug-logger';
import { formatRenderSpeed, formatTime } from '../utils/time-utils';

export class VideoExportEngine extends EventTarget {
  private settings: ExportSettings;
  private timelineData: TimelineExportData;
  private renderer: FrameRenderer;
  private audioProcessor: AudioProcessor;
  private configGenerator: ConfigGenerator;
  private abortController?: AbortController;
  
  constructor(timelineData: TimelineExportData, settings: ExportSettings) {
    super();
    this.timelineData = timelineData;
    this.settings = settings;
    this.renderer = new FrameRenderer(settings);
    this.audioProcessor = new AudioProcessor(settings);
    this.configGenerator = new ConfigGenerator();
  }

  async export(): Promise<string> {
    try {
      debugLogger.clear();
      debugLogger.log('Starting video export...');
      
      this.abortController = new AbortController();
      
      this.emitProgress({
        currentFrame: 0,
        totalFrames: 0,
        percentage: 0,
        stage: 'initializing'
      });

      // Validate WebCodecs support
      if (!this.isWebCodecsSupported()) {
        debugLogger.error('WebCodecs is not supported in this browser');
        throw new Error('WebCodecs is not supported in this browser');
      }
      debugLogger.log('✅ WebCodecs support validated');

      // Generate encoder configurations
      debugLogger.log('🔧 Generating encoder configurations...');
      const config = await this.configGenerator.generateConfig(this.settings);
      debugLogger.log('✅ Encoder config generated:', config);
      
      // Calculate total frames
      const totalFrames = Math.ceil(this.timelineData.duration * this.settings.fps);
      debugLogger.log(`📊 Timeline duration: ${this.timelineData.duration}s, FPS: ${this.settings.fps}, Total frames: ${totalFrames}`);
      
      // Create output stream
      debugLogger.log('📁 Creating output stream...');
      const streamTarget = new StreamTarget(this.settings.fileName);
      const stream = await streamTarget.create();
      debugLogger.log('✅ Output stream created');

      // Initialize mediabunny output
      debugLogger.log('🎬 Initializing mediabunny output...');
      const output = new Output({
        format: new Mp4OutputFormat({
          fastStart: stream.fastStart,
        }),
        target: new BufferTarget(),
      });

      // Set up video track
      debugLogger.log('📹 Setting up video track...');
      const videoSource = new EncodedVideoPacketSource('avc');
      output.addVideoTrack(videoSource, {
        frameRate: this.settings.fps,
      });
      debugLogger.log('✅ Video track configured');

      // Set up audio track if needed
      let audioSource: EncodedAudioPacketSource | undefined;
      if (config.audio && this.hasAudioTracks()) {
        debugLogger.log('🔊 Setting up audio track...');
        audioSource = new EncodedAudioPacketSource('aac');
        output.addAudioTrack(audioSource);
        debugLogger.log('✅ Audio track configured');
      } else {
        debugLogger.log('🔇 Skipping audio track (no audio config or tracks)');
      }

      await output.start();
      debugLogger.log('▶️ Output started, beginning processing...');

      // Process video
      debugLogger.log('🎥 Starting video processing...');
      await this.processVideo(output, videoSource, config.video, totalFrames);
      debugLogger.log('✅ Video processing completed');
      
      // Process audio if enabled
      if (config.audio && this.hasAudioTracks() && audioSource) {
        debugLogger.log('🔊 Starting audio processing...');
        await this.processAudio(output, audioSource, config.audio);
        debugLogger.log('✅ Audio processing completed');
      }

      // Finalize export
      debugLogger.log('📝 Finalizing export...');
      this.emitProgress({
        currentFrame: totalFrames,
        totalFrames,
        percentage: 100,
        stage: 'finalizing'
      });

      await output.finalize();
      debugLogger.log('✅ Output finalized');
      
      // Get the buffer from the target and save it
      debugLogger.log('💾 Getting output buffer...');
      const buffer = (output.target as BufferTarget).buffer;
      if (!buffer) {
        debugLogger.error('Failed to get output buffer');
        throw new Error('Failed to get output buffer');
      }
      debugLogger.log(`📦 Buffer obtained: ${buffer.byteLength} bytes`);
      
      debugLogger.log('💾 Saving file...');
      const result = await stream.saveBuffer(buffer);
      debugLogger.log('✅ File saved:', result);

      this.emitProgress({
        currentFrame: totalFrames,
        totalFrames,
        percentage: 100,
        stage: 'complete'
      });

      debugLogger.log('🎉 Export completed successfully!');
      this.dispatchEvent(new CustomEvent('complete', { detail: result }));
      return result;

    } catch (error) {
      debugLogger.error('💥 Export failed:', error);
      this.emitProgress({
        currentFrame: 0,
        totalFrames: 0,
        percentage: 0,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  async abort(): Promise<void> {
    debugLogger.log('⏹️ Aborting export...');
    this.abortController?.abort();
    this.dispatchEvent(new CustomEvent('abort'));
  }

  private async processVideo(
    output: Output, 
    videoSource: EncodedVideoPacketSource,
    videoConfig: VideoEncoderConfig, 
    totalFrames: number
  ): Promise<void> {
    const startTime = new Date().getTime();
    const gpuBatchSize = 5;
    let encodedChunks = 0;

    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (meta) {
          try {
            const packet = EncodedPacket.fromEncodedChunk(chunk);
            videoSource.add(packet, meta);
            encodedChunks++;
          } catch (error) {
            debugLogger.error('Video packet error:', error);
          }
        }
      },
      error: (error) => {
        debugLogger.error('Video encoding error:', error);
        throw error;
      }
    });

    encoder.configure(videoConfig);
    const now = performance.now();

    try {
      // NEVER SKIP FRAMES
      for (let frame = 0; frame <= totalFrames; frame++) {
        if (this.abortController?.signal.aborted) {
          throw new DOMException('User aborted rendering');
        }

        // Queue management
        while (encoder.encodeQueueSize > gpuBatchSize) {
          await new Promise((resolve) => {
            const onDequeue = () => {
              encoder.removeEventListener('dequeue', onDequeue);
              resolve(null);
            };
            encoder.addEventListener('dequeue', onDequeue);
          });
        }

        // Render frame
        const renderStart = performance.now();
        const timestamp = frame / this.settings.fps;
        let canvas: HTMLCanvasElement;
        
        try {
          const renderedFrame = await this.renderer.renderFrame(this.timelineData, timestamp, frame);
          canvas = renderedFrame?.canvas || this.createFallbackCanvas();
        } catch (error) {
          canvas = this.createFallbackCanvas();
          console.warn(`Frame ${frame} render failed, using fallback:`, error);
        }
        
        const renderTime = performance.now() - renderStart;
        
        // Encode frame
        const encodeStart = performance.now();
        const videoFrame = new VideoFrame(canvas, {
          timestamp: Math.floor((frame / this.settings.fps) * 1e6),
          duration: Math.floor(1e6 / this.settings.fps),
        });
        
        const isKeyFrame = frame % (3 * this.settings.fps) === 0;
        encoder.encode(videoFrame, { keyFrame: isKeyFrame });
        videoFrame.close();
        
        const encodeTime = performance.now() - encodeStart;
        
        // Simple frame log every 100 frames
        if (frame % 100 === 0 || frame === totalFrames) {
          const currentFps = frame > 0 ? (frame / ((performance.now() - now) / 1000)).toFixed(1) : '0.0';
          debugLogger.log(`Frame ${frame}/${totalFrames} | ${currentFps}fps | Render: ${renderTime.toFixed(1)}ms | Encode: ${encodeTime.toFixed(1)}ms`);
        }
        
        // Progress reporting
        if (frame % 10 === 0 || frame === totalFrames) {
          this.emitRenderProgress(frame, totalFrames, startTime);
        }
      }

      // Final summary
      const totalDuration = (performance.now() - now) / 1000;
      const actualFps = (totalFrames + 1) / totalDuration;
      
      debugLogger.log(`✅ Export complete: ${totalFrames + 1} frames in ${formatTime(totalDuration)} (${actualFps.toFixed(1)} fps)`);

      await encoder.flush();
      
      if (encodedChunks < totalFrames + 1) {
        debugLogger.error(`❌ Frame mismatch: Expected ${totalFrames + 1}, got ${encodedChunks}`);
      }
      
      encoder.close();
    } catch (error) {
      debugLogger.error('❌ Video processing failed:', error);
      try {
        encoder.close();
      } catch (cleanupError) {
        debugLogger.error('Encoder cleanup error:', cleanupError);
      }
      throw error;
    }
  }

  private async processAudio(output: Output, audioSource: EncodedAudioPacketSource, audioConfig: AudioEncoderConfig): Promise<void> {
    return this.audioProcessor.processAudio(this.timelineData, output, audioSource, audioConfig);
  }

  private hasAudioTracks(): boolean {
    return this.timelineData.tracks.some(track => 
      track.type === 'audio' || 
      (track.type === 'media' && track.elements.some(el => 
        el.type === 'media' && ((el as any).mediaType === 'audio' || (el as any).mediaType === 'video')
      ))
    );
  }

  private isWebCodecsSupported(): boolean {
    return 'VideoEncoder' in window && 'VideoDecoder' in window;
  }

  private emitProgress(progress: ExportProgress): void {
    this.dispatchEvent(new CustomEvent('progress', { detail: progress }));
  }

  private emitRenderProgress(frame: number, totalFrames: number, startTime: number): void {
    // Create render progress detail with improved time formatting
    const duration = new Date().getTime() - startTime;
    const estimatedTimeRemaining = frame > 0 ? (duration / frame) * (totalFrames - frame) / 1000 : 0;
    const renderSpeed = duration > 0 ? (frame / (duration / 1000)) : 0;
    
    // Emit progress with formatted time information
    this.emitProgress({
      currentFrame: frame,
      totalFrames,
      percentage: (frame / totalFrames) * 100,
      stage: 'processing',
      estimatedTimeRemaining,
      formattedTimeRemaining: formatTime(estimatedTimeRemaining),
      renderSpeed: formatRenderSpeed(frame, duration / 1000)
    });
  }

  private createFallbackCanvas(): HTMLCanvasElement {
    // Create fallback canvas when frame rendering fails
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(this.settings.width * this.settings.resolution);
    canvas.height = Math.round(this.settings.height * this.settings.resolution);
    
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = this.settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return canvas;
  }

  // Custom typed event methods
  onProgress(callback: (progress: ExportProgress) => void): void {
    this.addEventListener('progress', (event: any) => callback(event.detail));
  }

  onComplete(callback: (filePath: string) => void): void {
    this.addEventListener('complete', (event: any) => callback(event.detail));
  }

  onError(callback: (error: Error) => void): void {
    this.addEventListener('error', (event: any) => callback(event.detail));
  }
}