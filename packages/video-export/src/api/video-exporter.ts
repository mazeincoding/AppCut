import { VideoExportEngine } from '../core/video-export-engine';
import { ConfigGenerator } from '../core/config-generator';
import { TimelineDataTransformer } from '../utils/timeline-transformer';
import { debugLogger } from '../utils/debug-logger';
import type { ExportSettings, ExportProgress, TimelineExportData } from '../types';
import { formatTime } from '../utils/time-utils';

// Integration API for the main OpenCut app
export interface OpenCutExportOptions {
  /** Output file name */
  fileName?: string;
  
  /** Video resolution multiplier (1 = 1080p, 2 = 4K) */
  resolution?: number;
  
  /** Output framerate */
  fps?: number;
  
  /** Video bitrate in Mbps */
  videoBitrate?: number;
  
  /** Audio bitrate in kbps */
  audioBitrate?: number;
  
  /** Enable hardware acceleration */
  hardwareAcceleration?: boolean;
  
  /** Progress callback */
  onProgress?: (progress: ExportProgress) => void;
  
  /** Completion callback */
  onComplete?: (filePath: string) => void;
  
  /** Error callback */
  onError?: (error: Error) => void;
}

export class VideoExporter {
  private engine?: VideoExportEngine;
  
  /**
   * Export timeline to MP4 video file
   */
  async exportTimeline(
    // Timeline data from OpenCut stores
    timelineTracks: any[],
    mediaItems: any[],
    projectSettings: { width: number; height: number; fps: number },
    options: OpenCutExportOptions = {}
  ): Promise<string> {
    
    try {
      console.log('Starting export with:', {
        timelineTracks: timelineTracks.length,
        mediaItems: mediaItems.length,
        projectSettings
      });

      // Transform OpenCut data to export format
      const timelineData = TimelineDataTransformer.transform(
        timelineTracks,
        mediaItems,
        projectSettings
      );

      console.log('Transformed timeline data:', timelineData);

      // Validate transformed data
      const validationErrors = TimelineDataTransformer.validateTimelineData(timelineData);
      if (validationErrors.length > 0) {
        throw new Error(`Timeline validation failed: ${validationErrors.join(', ')}`);
      }

      // Generate export settings
      const exportSettings = this.generateExportSettings(timelineData, options);

      // Create and configure export engine
      this.engine = new VideoExportEngine(timelineData, exportSettings);

      // Set up event listeners
      if (options.onProgress) {
        this.engine.onProgress(options.onProgress);
      }

      if (options.onError) {
        this.engine.onError(options.onError);
      }

      if (options.onComplete) {
        this.engine.onComplete(options.onComplete);
      }

      // Start export
      const result = await this.engine.export();
      
      return result;

    } catch (error) {
      console.error('Video export failed:', error);
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Abort current export
   */
  async abort(): Promise<void> {
    if (this.engine) {
      await this.engine.abort();
      this.engine = undefined;
    }
  }

  /**
   * Check if WebCodecs is supported in current browser
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'VideoEncoder' in window &&
      'VideoDecoder' in window &&
      'VideoFrame' in window
    );
  }

  /**
   * Get available export presets
   */
  static getPresets(): Record<string, Partial<OpenCutExportOptions>> {
    return {
      '1080p_high': {
        resolution: 1,
        videoBitrate: 10, // 10 Mbps
        audioBitrate: 128,
        fps: 30
      },
      '1080p_medium': {
        resolution: 1,
        videoBitrate: 5, // 5 Mbps
        audioBitrate: 128,
        fps: 30
      },
      '1080p_low': {
        resolution: 1,
        videoBitrate: 2.5, // 2.5 Mbps
        audioBitrate: 96,
        fps: 30
      },
      '720p_high': {
        resolution: 0.67, // 720p
        videoBitrate: 5, // 5 Mbps
        audioBitrate: 128,
        fps: 30
      },
      '720p_medium': {
        resolution: 0.67,
        videoBitrate: 2.5,
        audioBitrate: 96,
        fps: 30
      },
      '4k_high': {
        resolution: 2, // 4K
        videoBitrate: 40, // 40 Mbps
        audioBitrate: 256,
        fps: 30
      },
      '4k_medium': {
        resolution: 2,
        videoBitrate: 20, // 20 Mbps
        audioBitrate: 192,
        fps: 30
      }
    };
  }

  /**
   * Get estimated export time
   */
  static estimateExportTime(
    timelineTracks: any[],
    mediaItems: any[],
    projectSettings: { width: number; height: number; fps: number },
    options: OpenCutExportOptions = {}
  ): { 
    estimatedSeconds: number; 
    formattedTime: string; 
    totalFrames: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    try {
      // Transform data to get timeline duration
      const timelineData = TimelineDataTransformer.transform(
        timelineTracks,
        mediaItems,
        projectSettings
      );

      const duration = timelineData.duration;
      const fps = options.fps || projectSettings.fps;
      const totalFrames = Math.ceil(duration * fps);
      
      // Calculate complexity based on track count and resolution
      const trackCount = timelineData.tracks.length;
      const elementCount = timelineData.tracks.reduce((sum, track) => sum + track.elements.length, 0);
      const resolution = options.resolution || 1;
      
      let complexity: 'low' | 'medium' | 'high' = 'low';
      let baseRenderTime = 0.1; // Base seconds per frame
      
      // Estimate complexity
      if (elementCount > 20 || trackCount > 10 || resolution >= 2) {
        complexity = 'high';
        baseRenderTime = 0.5; // Higher for complex projects
      } else if (elementCount > 10 || trackCount > 5 || resolution > 1) {
        complexity = 'medium';
        baseRenderTime = 0.2;
      }
      
      // Estimate total time (frames * render time per frame + encoding overhead)
      const renderTime = totalFrames * baseRenderTime;
      const encodingOverhead = duration * 0.1; // 10% overhead for encoding
      const estimatedSeconds = renderTime + encodingOverhead;
      
      return {
        estimatedSeconds,
        formattedTime: formatTime(estimatedSeconds),
        totalFrames,
        complexity
      };
    } catch (error) {
      // Fallback estimate if transformation fails
      const duration = projectSettings.width * projectSettings.height > 1920 * 1080 ? 
        60 : 30; // Simple duration estimate
      
      return {
        estimatedSeconds: duration,
        formattedTime: formatTime(duration),
        totalFrames: Math.ceil(duration * (options.fps || projectSettings.fps)),
        complexity: 'medium'
      };
    }
  }

  private generateExportSettings(
    timelineData: TimelineExportData,
    options: OpenCutExportOptions
  ): ExportSettings {
    
    // Detect optimal sample rate from source media
    let optimalSampleRate = 48000; // Default high-quality sample rate
    
    // Check if we have audio elements and try to match their sample rate
    const hasAudioElements = timelineData.tracks.some(track => 
      track.elements.some(el => 
        el.type === 'media' && ((el as any).mediaType === 'audio' || (el as any).mediaType === 'video')
      )
    );
    
    if (hasAudioElements) {
      // For now, use 48000 Hz as it's the most compatible for web
      // In the future, we could detect the source sample rate and use that
      debugLogger.log(`🔊 Using ${optimalSampleRate}Hz sample rate for export`);
    }
    
    const baseSettings: Partial<ExportSettings> = {
      fileName: options.fileName || 'export.mp4',
      resolution: options.resolution || 1,
      fps: options.fps || timelineData.settings.fps,
      videoBitrate: (options.videoBitrate || 10) * 1_000_000, // Convert Mbps to bps
      audioBitrate: (options.audioBitrate || 128) * 1000, // Convert kbps to bps
      hardwareAcceleration: options.hardwareAcceleration !== false,
      width: timelineData.settings.width,
      height: timelineData.settings.height,
      backgroundColor: '#000000', // Default black background
      sampleRate: optimalSampleRate,
      numberOfChannels: 2
    };

    return ConfigGenerator.validateSettings(baseSettings);
  }
}

// Export static methods for convenience
export const {
  isSupported: isWebCodecsSupported,
  getPresets: getExportPresets
} = VideoExporter;