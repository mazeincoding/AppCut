import { ExportProject } from './types';
import { ExportLogger } from './logger';
import { FilterValidator } from './filter-validator';
import { TextProcessor } from './text-processor';

export class FFmpegCommandBuilder {
  private logger: ExportLogger;
  private validator: FilterValidator;

  constructor(logger: ExportLogger, validator: FilterValidator) {
    this.logger = logger;
    this.validator = validator;
  }

  /**
   * Builds the complete FFmpeg command arguments
   */
  buildCommand(
    project: ExportProject,
    videoFilters: string[],
    audioFilters: string[],
    inputArgs: string[],
    videoLayerCount: number
  ): string[] {
    const { settings, duration } = project;
    const args: string[] = [];

    // Add background video
    this.addBackgroundVideo(args, settings, duration);

    // Add input arguments
    args.push(...inputArgs);

    // Build and add filter complex
    this.addFilterComplex(args, videoFilters, audioFilters);

    // Add output mapping
    this.addOutputMapping(args, videoLayerCount, audioFilters.length > 0, settings);

    // Add encoding settings
    this.addEncodingSettings(args, settings, audioFilters.length > 0);

    // Add output settings
    this.addOutputSettings(args, duration);

    return args;
  }

  private addBackgroundVideo(args: string[], settings: any, duration: number): void {
    const formattedDuration = TextProcessor.formatTime(Math.max(duration, 0.1));
    
    // Get background color, default to black if not specified
    const backgroundColor = settings.backgroundColor || '#000000';
    
    // Remove # prefix if present for FFmpeg color format
    const colorValue = backgroundColor.startsWith('#') ? backgroundColor.slice(1) : backgroundColor;
    
    // Create solid color background video input
    args.push(
      '-f', 'lavfi', // Input format
      '-i', `color=c=${colorValue}:size=${settings.canvasSize.width}x${settings.canvasSize.height}:duration=${formattedDuration}:rate=${settings.fps}`
    );
    
    this.logger.log(`Background video: ${settings.canvasSize.width}x${settings.canvasSize.height}, duration: ${formattedDuration}s, fps: ${settings.fps}, color: ${backgroundColor}`);
  }

  private addFilterComplex(args: string[], videoFilters: string[], audioFilters: string[]): void {
    const allFilters: string[] = [];

    // Add video filters
    this.logger.log(`Processing ${videoFilters.length} video filters`);
    videoFilters.forEach((filter, index) => {
      if (this.validator.validateFilter(filter, 'video')) {
        allFilters.push(filter);
        this.logger.debug(`Added video filter ${index}: ${filter.substring(0, 50)}...`);
      } else {
        this.logger.warn(`Skipped invalid video filter ${index}: "${filter}"`);
      }
    });

    // Add audio filters
    if (audioFilters.length > 0) {
      this.logger.log(`Processing ${audioFilters.length} audio filters`);
      
      audioFilters.forEach((filter, index) => {
        if (this.validator.validateFilter(filter, 'audio')) {
          allFilters.push(filter);
          this.logger.debug(`Added audio filter ${index}: ${filter.substring(0, 50)}...`);
        } else {
          this.logger.warn(`Skipped invalid audio filter ${index}: "${filter}"`);
        }
      });

      // Add audio mixing filter
      // Create audio mixing filter to combine multiple audio streams
      const audioMixFilter = this.createAudioMixFilter(audioFilters.length);
      if (audioMixFilter && this.validator.validateFilter(audioMixFilter, 'audio-mix')) {
        allFilters.push(audioMixFilter);
        this.logger.log(`Added audio mix filter: ${audioMixFilter}`);
      }
    }

    // Add filter complex if we have valid filters
    if (allFilters.length > 0) {
      const cleanedFilters = allFilters.filter(filter => 
        this.validator.validateFilter(filter, 'final')
      );

      if (cleanedFilters.length > 0) {
        const filterComplexStr = this.validator.cleanFilterComplex(cleanedFilters.join(';'));
        
        if (filterComplexStr) {
          args.push('-filter_complex', filterComplexStr);
          this.logger.log(`Filter complex: ${filterComplexStr}`);
          this.logger.log(`Total filters: ${cleanedFilters.length}`);
        } else {
          this.logger.warn('Empty filter complex after cleaning');
        }
      }
    }
  }

  private createAudioMixFilter(audioInputCount: number): string {
    // Mix multiple audio streams into single output (use longest duration)
    const audioLabels = Array.from({ length: audioInputCount }, (_, i) => `[audio_${i + 1}]`).join('');
    return `${audioLabels}amix=inputs=${audioInputCount}:duration=longest[audio_out]`;
  }

  private addOutputMapping(args: string[], videoLayerCount: number, hasAudio: boolean, settings: any): void {
    // Map video output
    const finalVideoLayer = videoLayerCount > 0 ? `[overlay_${videoLayerCount - 1}]` : '0:v';
    args.push('-map', finalVideoLayer);

    // Map audio output if present
    if (hasAudio) {
      args.push('-map', '[audio_out]');
    }
  }

  private addEncodingSettings(args: string[], settings: any, hasAudio: boolean): void {
    // Video encoding with H.264 codec
    args.push('-c:v', 'libx264');
    
    // Audio encoding with AAC codec
    if (hasAudio) {
      args.push('-c:a', 'aac');
    }
    
    // Pixel format for maximum compatibility
    args.push('-pix_fmt', 'yuv420p');
    
    // Quality settings based on user selection
    const qualityOptions = this.getQualityOptions(settings.quality);
    args.push(...qualityOptions);
  }

  private addOutputSettings(args: string[], duration: number): void {
    // Set output duration and overwrite existing file
    const formattedDuration = TextProcessor.formatTime(duration);
    args.push('-t', formattedDuration, '-y', 'output.mp4');
  }

  private getQualityOptions(quality: 'low' | 'medium' | 'high'): string[] {
    switch (quality) {
      case 'low':
        return ['-crf', '28', '-preset', 'fast'];
      case 'medium':
        return ['-crf', '23', '-preset', 'medium'];
      case 'high':
        return ['-crf', '18', '-preset', 'slower'];
      default:
        return ['-crf', '23', '-preset', 'medium'];
    }
  }
}