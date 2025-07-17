import { TextElement, TimelineTrack } from '@/types/timeline';
import { ExportProject } from './types';
import { ExportLogger } from './logger';
import { FilterValidator } from './filter-validator';
import { FontManager } from './font-manager';

export class TextProcessor {
  private logger: ExportLogger;
  private validator: FilterValidator;
  private fontManager: FontManager;

  constructor(logger: ExportLogger, validator: FilterValidator, fontManager: FontManager) {
    this.logger = logger;
    this.validator = validator;
    this.fontManager = fontManager;
  }

  // NOTE: Text elements are always rendered on top of video layers after all media layers

  /**
   * Processes text elements and generates text overlay filters
   */
  async processTextElements(project: ExportProject, startingVideoLayerCount: number): Promise<{
    textFilters: string[];
    finalVideoLayerCount: number;
  }> {
    const { tracks, duration } = project;
    const textFilters: string[] = [];
    let videoLayerCount = startingVideoLayerCount;

    // Collect and sort text elements by start time
    const textElements = this.collectTextElements(tracks);
    textElements.sort((a, b) => a.element.startTime - b.element.startTime);

    // Process each text element
    for (const { element } of textElements) {
      const filter = await this.processTextElement(element, videoLayerCount, duration);
      
      if (filter) {
        textFilters.push(filter);
        videoLayerCount++;
      }
    }

    return {
      textFilters,
      finalVideoLayerCount: videoLayerCount
    };
  }

  private collectTextElements(tracks: TimelineTrack[]): Array<{ element: TextElement; track: TimelineTrack }> {
    const textElements: Array<{ element: TextElement; track: TimelineTrack }> = [];
    
    tracks.forEach((track) => {
      if (track.muted) return;
      
      track.elements.forEach((element) => {
        if (element.type === 'text') {
          textElements.push({ element, track });
        }
      });
    });

    return textElements;
  }

  private async processTextElement(
    element: TextElement,
    videoLayerCount: number,
    duration: number
  ): Promise<string | null> {
    this.logger.log(`Processing text element: "${element.content}"`);

    // Check if font is loaded
    if (!this.fontManager.isFontLoaded()) {
      this.logger.warn(`Skipping text element "${element.content}" - no font loaded`);
      return null;
    }

    // Calculate timing
    const effectiveDuration = element.duration - element.trimStart - element.trimEnd;
    const startTime = element.startTime;
    const endTime = element.startTime + effectiveDuration;

    // Validate timing
    const timingValidation = this.validator.validateTiming(startTime, effectiveDuration, duration);
    if (!timingValidation.isValid) {
      this.logger.error(`Invalid timing for text element "${element.content}": ${timingValidation.errors.join(', ')}`);
      return null;
    }

    // Create text filter
    const textFilter = await this.createTextFilter(element, videoLayerCount, startTime, endTime, duration);
    
    if (textFilter) {
      this.logger.log(`Added text overlay: "${element.content.substring(0, 20)}..." (${TextProcessor.formatTime(startTime)}s - ${TextProcessor.formatTime(Math.min(endTime, duration))}s)`);
    }

    return textFilter;
  }

  private async createTextFilter(
    element: TextElement,
    videoLayerCount: number,
    startTime: number,
    endTime: number,
    duration: number
  ): Promise<string | null> {
    const baseLayer = videoLayerCount === 0 ? '[0:v]' : `[overlay_${videoLayerCount - 1}]`;
    const overlayLabel = `overlay_${videoLayerCount}`;
    
    // Escape text for FFmpeg
    // TODO: Make this more robust
    const escapedText = TextProcessor.escapeForFFmpeg(element.content);

    const formattedStartTime = TextProcessor.formatTime(startTime);
    const formattedEndTime = TextProcessor.formatTime(endTime);

    // Load the specific font for this text element
    const fontFileName = await this.fontManager.loadFont(element.fontFamily);
    
    // Build drawtext parameters with proper font file
    const drawTextParams = [
      `text='${escapedText}'`,
      `fontfile=${fontFileName}`,
      `fontsize=${element.fontSize}`,
      `fontcolor=${element.color}`,
      `x=(w-text_w)/2+${element.x}`,
      `y=(h-text_h)/2+${element.y}`,
      `enable='between(t,${formattedStartTime},${formattedEndTime})'`
    ];
    
    // Add subtitle-specific styling
    // if (element.type === 'subtitle') {
    //   drawTextParams.push(`box=1`);
    //   drawTextParams.push(`boxcolor=black@0.5`);
    //   drawTextParams.push(`boxborderw=8`);
    // }
    
    // Create FFmpeg drawtext filter to overlay text on video
    const textFilter = `${baseLayer}drawtext=${drawTextParams.join(':')}[${overlayLabel}]`;
    
    // Validate filter
    if (!this.validator.validateFilter(textFilter, 'text')) {
      this.logger.error(`Invalid text filter generated for "${element.content}"`);
      return null;
    }
    
    return textFilter;
  }

  /**
   * Escapes text for FFmpeg drawtext filter
   */
  static escapeForFFmpeg(text: string): string {
    return text
      .replace(/\\/g, '')         // Remove backslashes entirely (they cause issues)
      .replace(/'/g, '')          // Remove single quotes
      .replace(/"/g, '')          // Remove double quotes
      .replace(/:/g, ' ')         // Replace colons with spaces
      .replace(/\[/g, '(')        // Replace square brackets with parentheses
      .replace(/\]/g, ')')        // Replace square brackets with parentheses
      .replace(/=/g, ' ')         // Replace equals with spaces
      .replace(/;/g, ' ')         // Replace semicolons with spaces
      .replace(/,/g, ' ')         // Replace commas with spaces
      .replace(/\n/g, ' ')        // Replace newlines with spaces
      .replace(/\r/g, ' ')        // Replace carriage returns with spaces
      .replace(/\t/g, ' ')        // Replace tabs with spaces
      .replace(/[^\w\s.-]/g, '')  // Remove all other special characters except word chars, spaces, dots, hyphens
      .replace(/\s+/g, ' ')       // Collapse multiple spaces
      .trim();                    // Remove leading/trailing spaces
  }

  /**
   * Formats time values for FFmpeg with proper precision
   */
  static formatTime(timeInSeconds: number): string {
    return Math.max(0, timeInSeconds).toFixed(3);
  }
}