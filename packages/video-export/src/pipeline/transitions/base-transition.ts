import type { TransitionProcessor } from '../pipeline';
import type { ExportSettings, RenderFrame } from '../../types';

export abstract class BaseTransition implements TransitionProcessor {
  readonly type = 'transition' as const;
  
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly duration: number,
    public progress: number = 0
  ) {}

  abstract process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame>;

  updateProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(1, progress));
  }

  dispose(): void {
    // Override in subclasses if cleanup is needed
  }
}

// Example fade transition
export class FadeTransition extends BaseTransition {
  private fadeType: 'in' | 'out' | 'cross';

  constructor(id: string, duration: number, fadeType: 'in' | 'out' | 'cross' = 'cross') {
    super(id, 'Fade Transition', duration);
    this.fadeType = fadeType;
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    let alpha = 1.0;

    switch (this.fadeType) {
      case 'in':
        alpha = this.progress; // 0 to 1
        break;
      case 'out':
        alpha = 1 - this.progress; // 1 to 0
        break;
      case 'cross':
        // For cross-fade, this would need two frames to blend
        alpha = this.progress < 0.5 ? (1 - this.progress * 2) : (this.progress - 0.5) * 2;
        break;
    }

    if (alpha !== 1.0) {
      frame.context.save();
      frame.context.globalAlpha = alpha;
      
      // Create a temporary canvas with the current frame
      const tempCanvas = frame.canvas.cloneNode() as HTMLCanvasElement;
      const tempContext = tempCanvas.getContext('2d')!;
      tempContext.drawImage(frame.canvas, 0, 0);
      
      // Clear and redraw with alpha
      frame.context.clearRect(0, 0, frame.canvas.width, frame.canvas.height);
      if (this.fadeType === 'out' || alpha > 0) {
        frame.context.drawImage(tempCanvas, 0, 0);
      }
      
      frame.context.restore();
    }

    return frame;
  }
}

// Example slide transition
export class SlideTransition extends BaseTransition {
  private direction: 'left' | 'right' | 'up' | 'down';

  constructor(id: string, duration: number, direction: 'left' | 'right' | 'up' | 'down' = 'left') {
    super(id, 'Slide Transition', duration);
    this.direction = direction;
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    if (this.progress === 0) {
      return frame; // No transition yet
    }

    const width = frame.canvas.width;
    const height = frame.canvas.height;
    
    // Calculate offset based on direction and progress
    let offsetX = 0;
    let offsetY = 0;

    switch (this.direction) {
      case 'left':
        offsetX = -width * this.progress;
        break;
      case 'right':
        offsetX = width * this.progress;
        break;
      case 'up':
        offsetY = -height * this.progress;
        break;
      case 'down':
        offsetY = height * this.progress;
        break;
    }

    // Create a temporary canvas with the current frame
    const tempCanvas = frame.canvas.cloneNode() as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d')!;
    tempContext.drawImage(frame.canvas, 0, 0);
    
    // Clear and redraw with offset
    frame.context.clearRect(0, 0, width, height);
    frame.context.drawImage(tempCanvas, offsetX, offsetY);

    return frame;
  }
}

// Example wipe transition
export class WipeTransition extends BaseTransition {
  private direction: 'horizontal' | 'vertical';

  constructor(id: string, duration: number, direction: 'horizontal' | 'vertical' = 'horizontal') {
    super(id, 'Wipe Transition', duration);
    this.direction = direction;
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    if (this.progress === 0) {
      return frame; // No transition yet
    }

    const width = frame.canvas.width;
    const height = frame.canvas.height;
    
    // Create a temporary canvas with the current frame
    const tempCanvas = frame.canvas.cloneNode() as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d')!;
    tempContext.drawImage(frame.canvas, 0, 0);
    
    // Clear the frame
    frame.context.clearRect(0, 0, width, height);
    
    // Create clipping mask for wipe effect
    frame.context.save();
    frame.context.beginPath();
    
    if (this.direction === 'horizontal') {
      const wipeWidth = width * (1 - this.progress);
      frame.context.rect(0, 0, wipeWidth, height);
    } else {
      const wipeHeight = height * (1 - this.progress);
      frame.context.rect(0, 0, width, wipeHeight);
    }
    
    frame.context.clip();
    frame.context.drawImage(tempCanvas, 0, 0);
    frame.context.restore();

    return frame;
  }
}