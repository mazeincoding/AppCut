import type { 
  ExportSettings, 
  TimelineExportData, 
  RenderFrame, 
  ExportElement
} from '../types';
import { RenderPipeline } from '../pipeline/pipeline';
import { 
  MediaElementRenderer,
  TextElementRenderer,
  OverlayElementRenderer,
  SubtitleElementRenderer
} from './renderers';
import { debugLogger } from '../utils/debug-logger';

export class FrameRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private settings: ExportSettings;

  // Pipeline for processing frames
  // This allows for modular effects, transitions, etc.
  private pipeline: RenderPipeline;
  
  // Modular element renderers
  private mediaRenderer: MediaElementRenderer;
  private textRenderer: TextElementRenderer;
  private overlayRenderer: OverlayElementRenderer;
  private subtitleRenderer: SubtitleElementRenderer;

  constructor(settings: ExportSettings) {
    this.settings = settings;
    this.pipeline = new RenderPipeline(settings);
    
    // Create offscreen canvas for rendering
    this.canvas = typeof OffscreenCanvas !== 'undefined' ? 
      new OffscreenCanvas(
        Math.round(settings.width * settings.resolution),
        Math.round(settings.height * settings.resolution)
      ) as any :
      document.createElement('canvas');
    
    if (typeof OffscreenCanvas === 'undefined') {
      (this.canvas as HTMLCanvasElement).width = Math.round(settings.width * settings.resolution);
      (this.canvas as HTMLCanvasElement).height = Math.round(settings.height * settings.resolution);
    }

    this.context = this.canvas.getContext('2d')!;
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    
    // Initialize modular renderers
    this.mediaRenderer = new MediaElementRenderer(settings, this.context);
    this.textRenderer = new TextElementRenderer(settings, this.context);
    this.overlayRenderer = new OverlayElementRenderer(settings, this.context);
    this.subtitleRenderer = new SubtitleElementRenderer(settings, this.context);
  }

  async renderFrame(
    timelineData: TimelineExportData, 
    timestamp: number, 
    frameNumber: number
  ): Promise<RenderFrame> {
    // Clear canvas with background color
    this.context.fillStyle = this.settings.backgroundColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Get active elements at this timestamp
    const activeElements = this.getActiveElementsAtTime(timelineData, timestamp);
    
    // Sort by render order - text tracks on top
    const elementsToRender = this.sortElementsByRenderOrder(timelineData, activeElements);

    // Render each element - never fail, just skip problematic ones
    for (const { element, track } of elementsToRender) {
      if (track.muted) continue;

      try {
        switch (element.type) {
          case 'media':
            await this.mediaRenderer.render(element, timestamp);
            break;
          case 'text':
            await this.textRenderer.render(element, timestamp);
            break;
          case 'overlay':
            await this.overlayRenderer.render(element, timestamp);
            break;
          case 'subtitle':
            await this.subtitleRenderer.render(element, timestamp);
            break;
          case 'effect':
            // Effects are handled by the pipeline system
            await this.applyEffectElement(element, timestamp);
            break;
        }
      } catch (error) {
        debugLogger.warn(`Failed to render ${element.type} element ${element.id}:`, error);
      }
    }

    // Apply pipeline effects/transitions
    let pipelineFrame: RenderFrame = {
      frameNumber,
      timestamp,
      canvas: this.canvas,
      context: this.context
    };

    try {
      pipelineFrame = await this.pipeline.processFrame(pipelineFrame, timelineData, timestamp);
    } catch (error) {
      debugLogger.warn(`Pipeline processing failed for frame ${frameNumber}:`, error);
    }

    return pipelineFrame;
  }

  private getActiveElementsAtTime(timelineData: TimelineExportData, timestamp: number) {
    const activeElements: Array<{element: ExportElement, track: any}> = [];

    for (const track of timelineData.tracks) {
      for (const element of track.elements) {
        const elementEndTime = element.startTime + element.duration - element.trimStart - element.trimEnd;
        
        if (timestamp >= element.startTime && timestamp < elementEndTime) {
          activeElements.push({ element, track });
        }
      }
    }

    return activeElements;
  }

  private sortElementsByRenderOrder(
    timelineData: TimelineExportData, 
    elements: Array<{element: ExportElement, track: any}>
  ) {
    // Sort by track order (text tracks on top, then media, then audio)
    return elements.sort((a, b) => {
      const aTrackIndex = timelineData.tracks.indexOf(a.track);
      const bTrackIndex = timelineData.tracks.indexOf(b.track);
      
      // Text tracks render on top
      if (a.track.type === 'text' && b.track.type !== 'text') return 1;
      if (b.track.type === 'text' && a.track.type !== 'text') return -1;
      
      return aTrackIndex - bTrackIndex;
    });
  }

  private async applyEffectElement(element: any, timestamp: number) {
    // Effects are applied through the pipeline system
    // This method could trigger specific pipeline processors based on the effect
    const pipeline = this.getPipeline();
    
    // Check if effect processor exists, if not, create and add it
    if (!pipeline.hasProcessor(element.id)) {
      // This would be extended to create specific effect processors
      // based on element.effectType and element.parameters
      debugLogger.log(`Effect ${element.effectType} applied to element ${element.id}`);
    }
  }

  // Pipeline management methods
  getPipeline(): RenderPipeline {
    return this.pipeline;
  }

  dispose(): void {
    // Clean up pipeline
    this.pipeline.dispose();
    
    // Clean up modular renderers
    this.mediaRenderer.dispose();
    this.textRenderer.dispose();
    this.overlayRenderer.dispose();
    this.subtitleRenderer.dispose();
  }
}