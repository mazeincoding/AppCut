import type { 
  TimelineExportData, 
  ExportTrack, 
  ExportElement, 
  MediaExportElement, 
  TextExportElement 
} from '../types';

// Import types from the main OpenCut app
// These interfaces match the timeline types from the main app
interface OpenCutTimelineTrack {
  id: string;
  name: string;
  type: 'media' | 'text' | 'audio';
  elements: OpenCutTimelineElement[];
  muted?: boolean;
}

interface OpenCutTimelineElement {
  id: string;
  name: string;
  type: 'media' | 'text';
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
}

interface OpenCutMediaElement extends OpenCutTimelineElement {
  type: 'media';
  mediaId: string;
}

interface OpenCutTextElement extends OpenCutTimelineElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
  x: number;
  y: number;
  rotation: number;
  opacity: number;
}

interface OpenCutMediaItem {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio';
  file?: File;
  url?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export class TimelineDataTransformer {
  
  static transform(
    tracks: OpenCutTimelineTrack[],
    mediaItems: OpenCutMediaItem[],
    projectSettings: {
      width: number;
      height: number;
      fps: number;
    }
  ): TimelineExportData {
    
    const exportTracks: ExportTrack[] = tracks.map(track => 
      this.transformTrack(track, mediaItems)
    );

    const duration = this.calculateTotalDuration(exportTracks);

    return {
      tracks: exportTracks,
      duration,
      settings: projectSettings
    };
  }

  private static transformTrack(
    track: OpenCutTimelineTrack,
    mediaItems: OpenCutMediaItem[]
  ): ExportTrack {
    
    const elements: ExportElement[] = track.elements.map(element => 
      this.transformElement(element, mediaItems)
    ).filter(Boolean) as ExportElement[];

    return {
      id: track.id,
      name: track.name,
      type: track.type,
      elements,
      muted: track.muted || false
    };
  }

  private static transformElement(
    element: OpenCutTimelineElement,
    mediaItems: OpenCutMediaItem[]
  ): ExportElement | null {
    
    if (element.type === 'media') {
      return this.transformMediaElement(element as OpenCutMediaElement, mediaItems);
    } else if (element.type === 'text') {
      return this.transformTextElement(element as OpenCutTextElement);
    }
    
    return null;
  }

  private static transformMediaElement(
    element: OpenCutMediaElement,
    mediaItems: OpenCutMediaItem[]
  ): MediaExportElement | null {
    
    const mediaItem = mediaItems.find(item => item.id === element.mediaId);
    if (!mediaItem) {
      console.warn(`Media item not found for element ${element.id}: ${element.mediaId}`);
      return null;
    }

    return {
      id: element.id,
      name: element.name,
      type: 'media',
      startTime: element.startTime,
      duration: element.duration,
      trimStart: element.trimStart,
      trimEnd: element.trimEnd,
      mediaId: element.mediaId,
      mediaType: mediaItem.type,
      file: mediaItem.file,
      url: mediaItem.url,
      width: mediaItem.width,
      height: mediaItem.height
    };
  }

  private static transformTextElement(
    element: OpenCutTextElement
  ): TextExportElement {
    
    return {
      id: element.id,
      name: element.name,
      type: 'text',
      startTime: element.startTime,
      duration: element.duration,
      trimStart: element.trimStart,
      trimEnd: element.trimEnd,
      content: element.content,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      color: element.color,
      backgroundColor: element.backgroundColor,
      textAlign: element.textAlign,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      textDecoration: element.textDecoration,
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      opacity: element.opacity
    };
  }

  private static calculateTotalDuration(tracks: ExportTrack[]): number {
    let maxDuration = 0;

    for (const track of tracks) {
      for (const element of track.elements) {
        // Calculate the actual end time of the element on the timeline
        // element.duration is the raw duration, but we need to account for trimming
        const actualDuration = element.duration - element.trimStart - element.trimEnd;
        const elementEnd = element.startTime + actualDuration;
        maxDuration = Math.max(maxDuration, elementEnd);
      }
    }

    return maxDuration;
  }

  static validateTimelineData(data: TimelineExportData): string[] {
    const errors: string[] = [];

    if (!data.tracks || data.tracks.length === 0) {
      errors.push('No tracks found in timeline data');
    }

    if (data.duration <= 0) {
      errors.push('Timeline duration must be greater than 0');
    }

    // Check if there are any elements to export
    const totalElements = data.tracks.reduce((sum, track) => sum + track.elements.length, 0);
    if (totalElements === 0) {
      errors.push('No elements found in timeline - add some media or text to export');
    }

    if (!data.settings || !data.settings.width || !data.settings.height) {
      errors.push('Invalid project settings');
    }

    // Validate each track
    for (const track of data.tracks) {
      if (!track.id || !track.name) {
        errors.push(`Invalid track: ${track.id || 'unknown'}`);
      }

      // Validate elements
      for (const element of track.elements) {
        if (!element.id || element.startTime < 0 || element.duration <= 0) {
          errors.push(`Invalid element: ${element.id || 'unknown'} in track ${track.name}`);
        }

        if (element.type === 'media') {
          const mediaElement = element as MediaExportElement;
          if (!mediaElement.mediaId) {
            errors.push(`Media element ${element.id} missing mediaId`);
          }
          if (!mediaElement.file && !mediaElement.url) {
            errors.push(`Media element ${element.id} missing file or URL`);
          }
        }

        if (element.type === 'text') {
          const textElement = element as TextExportElement;
          if (!textElement.content) {
            errors.push(`Text element ${element.id} missing content`);
          }
        }
      }
    }

    return errors;
  }
}