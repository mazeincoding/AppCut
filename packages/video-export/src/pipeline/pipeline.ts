import type { ExportSettings, TimelineExportData, RenderFrame } from '../types';

export interface PipelineProcessor {
  id: string;
  name: string;
  process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame>;
  dispose?(): void;
}

export interface EffectProcessor extends PipelineProcessor {
  type: 'effect';
  parameters: Record<string, any>;
}

export interface TransitionProcessor extends PipelineProcessor {
  type: 'transition';
  duration: number;
  progress: number; // 0 to 1
}

export class RenderPipeline {
  private processors: PipelineProcessor[] = [];
  private settings: ExportSettings;

  constructor(settings: ExportSettings) {
    this.settings = settings;
  }

  addProcessor(processor: PipelineProcessor): void {
    this.processors.push(processor);
  }

  removeProcessor(id: string): void {
    const index = this.processors.findIndex(p => p.id === id);
    if (index !== -1) {
      const processor = this.processors[index];
      processor.dispose?.();
      this.processors.splice(index, 1);
    }
  }

  getProcessor(id: string): PipelineProcessor | undefined {
    return this.processors.find(p => p.id === id);
  }

  async processFrame(
    frame: RenderFrame, 
    timelineData: TimelineExportData,
    timestamp: number
  ): Promise<RenderFrame> {
    let currentFrame = frame;

    // Process frame through all processors in order
    for (const processor of this.processors) {
      try {
        currentFrame = await processor.process(currentFrame, this.settings, timestamp);
      } catch (error) {
        console.warn(`Pipeline processor ${processor.id} failed:`, error);
        // Continue with unprocessed frame
      }
    }

    return currentFrame;
  }

  dispose(): void {
    for (const processor of this.processors) {
      processor.dispose?.();
    }
    this.processors.length = 0;
  }

  // Helper methods for common operations
  hasProcessor(id: string): boolean {
    return this.processors.some(p => p.id === id);
  }

  getProcessorsByType(type: string): PipelineProcessor[] {
    return this.processors.filter(p => (p as any).type === type);
  }

  reorderProcessor(id: string, newIndex: number): void {
    const currentIndex = this.processors.findIndex(p => p.id === id);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= this.processors.length) {
      return;
    }

    const processor = this.processors.splice(currentIndex, 1)[0];
    this.processors.splice(newIndex, 0, processor);
  }
}