import { MediaElement } from '@/types/timeline';
import { MediaItem } from '@/stores/media-store';
import { ExportProject } from './types';
import { ExportLogger } from './logger';
import { FilterValidator } from './filter-validator';
import { TextProcessor } from './text-processor';

export class MediaProcessor {
  private logger: ExportLogger;
  private validator: FilterValidator;

  constructor(logger: ExportLogger, validator: FilterValidator) {
    this.logger = logger;
    this.validator = validator;
  }

  /**
   * Processes media elements and generates video filters
   */
  processMediaElements(project: ExportProject): {
    videoFilters: string[];
    audioFilters: string[];
    inputArgs: string[];
    videoLayerCount: number;
  } {
    const { tracks, settings, duration, mediaItems } = project;
    const videoFilters: string[] = [];
    const audioFilters: string[] = [];
    const inputArgs: string[] = [];
    const audioInputIndices: number[] = [];
    
    let inputIndex = 0;
    let videoLayerCount = 0;
    
    // Process all media elements first
    tracks.forEach((track) => {
      if (track.muted) return;
      
      track.elements.forEach((element) => {
        if (element.type === 'media') {
          const mediaElement = element;
          const mediaItem = mediaItems.find(m => m.id === mediaElement.mediaId);
          
          if (!mediaItem || !mediaItem.file) {
            this.logger.warn(`Media item not found for element: ${mediaElement.name}`);
            return;
          }
          
          inputIndex++;
          inputArgs.push('-i', `media_${mediaElement.mediaId}`);
          
          const result = this.processMediaElement(
            mediaElement, 
            mediaItem, 
            inputIndex, 
            videoLayerCount, 
            settings, 
            duration
          );
          
          if (result.videoFilter) {
            videoFilters.push(...result.videoFilter);
            videoLayerCount++;
          }
          
          if (result.audioFilter) {
            audioFilters.push(result.audioFilter);
            audioInputIndices.push(inputIndex);
          }
        }
      });
    });

    return {
      videoFilters,
      audioFilters,
      inputArgs,
      videoLayerCount
    };
  }

  private processMediaElement(
    element: MediaElement,
    mediaItem: MediaItem,
    inputIndex: number,
    videoLayerCount: number,
    settings: any,
    duration: number
  ): { videoFilter?: string[]; audioFilter?: string } {
    const effectiveDuration = element.duration - element.trimStart - element.trimEnd;
    const startTime = element.startTime;
    const endTime = element.startTime + effectiveDuration;

    // Validate timing
    const timingValidation = this.validator.validateTiming(startTime, effectiveDuration, duration);
    if (!timingValidation.isValid) {
      this.logger.error(`Invalid timing for media element "${element.name}": ${timingValidation.errors.join(', ')}`);
      return {};
    }

    const result: { videoFilter?: string[]; audioFilter?: string } = {};

    // Process video/image
    if (mediaItem.type === 'video' || mediaItem.type === 'image') {
      const videoFilter = this.createVideoFilter(
        element,
        inputIndex,
        videoLayerCount,
        settings,
        startTime,
        endTime,
        effectiveDuration
      );
      
      if (videoFilter) {
        result.videoFilter = videoFilter;
      }
    }

    // Process audio - only if media item has audio
    if (mediaItem.type === 'audio' || (mediaItem.type === 'video' && mediaItem.hasAudio)) {
      const audioFilter = this.createAudioFilter(element, inputIndex, startTime, effectiveDuration);
      
      if (audioFilter) {
        result.audioFilter = audioFilter;
      }
    }

    return result;
  }

  private createVideoFilter(
    element: MediaElement,
    inputIndex: number,
    videoLayerCount: number,
    settings: any,
    startTime: number,
    endTime: number,
    effectiveDuration: number
  ): string[] | null {
    let filterChain = `[${inputIndex}:v]`;
    
    // Apply trimming if needed (trim video and reset timestamps)
    if (element.trimStart > 0 || element.trimEnd > 0) {
      const trimEnd = element.duration - element.trimEnd;
      filterChain += `trim=start=${element.trimStart}:end=${trimEnd},setpts=PTS-STARTPTS,`;
    }
    
    // Scale and pad to canvas size (maintain aspect ratio, center with black bars)
    filterChain += `scale=${settings.canvasSize.width}:${settings.canvasSize.height}:force_original_aspect_ratio=decrease,pad=${settings.canvasSize.width}:${settings.canvasSize.height}:(ow-iw)/2:(oh-ih)/2:black`;
    
    const scaledLabel = `scaled_${videoLayerCount}`;
    const scaleFilter = `${filterChain}[${scaledLabel}]`;
    
    // Create overlay filter
    const baseLayer = videoLayerCount === 0 ? '[0:v]' : `[overlay_${videoLayerCount - 1}]`;
    
    const overlayLabel = `overlay_${videoLayerCount}`;
    const formattedStartTime = TextProcessor.formatTime(startTime);
    const formattedEndTime = TextProcessor.formatTime(endTime);
    
    // Overlay scaled video on base layer at position (0,0) with time-based visibility
    const overlayFilter = `${baseLayer}[${scaledLabel}]overlay=0:0:enable='between(t,${formattedStartTime},${formattedEndTime})'[${overlayLabel}]`;
    
    // Validate filters
    if (!this.validator.validateFilter(scaleFilter, 'video-scale') || 
        !this.validator.validateFilter(overlayFilter, 'video-overlay')) {
      this.logger.error(`Invalid video filter generated for "${element.name}"`);
      return null;
    }
    
    this.logger.log(`Added media overlay: "${element.name}" (${formattedStartTime}s - ${formattedEndTime}s)`);
    
    return [scaleFilter, overlayFilter];
  }

  private createAudioFilter(
    element: MediaElement,
    inputIndex: number,
    startTime: number,
    effectiveDuration: number
  ): string | null {
    let audioFilter = `[${inputIndex}:a]`;
    
    // Apply audio trimming if needed (trim audio and reset timestamps)
    if (element.trimStart > 0 || element.trimEnd > 0) {
      const trimEnd = element.duration - element.trimEnd;
      audioFilter += `atrim=start=${element.trimStart}:end=${trimEnd},asetpts=PTS-STARTPTS,`;
    }
    
    // Add delay to sync with video start time (delay in milliseconds for both channels)
    if (startTime > 0) {
      audioFilter += `adelay=${Math.round(startTime * 1000)}|${Math.round(startTime * 1000)},`;
    }
    
    // Remove trailing comma and add label
    audioFilter = audioFilter.replace(/,$/, '');
    const audioLabel = `[audio_${inputIndex}]`;
    const fullAudioFilter = `${audioFilter}${audioLabel}`;
    
    // Validate filter
    if (!this.validator.validateFilter(fullAudioFilter, 'audio')) {
      this.logger.error(`Invalid audio filter generated for "${element.name}"`);
      return null;
    }
    
    this.logger.log(`Added audio filter: ${fullAudioFilter}`);
    return fullAudioFilter;
  }

}