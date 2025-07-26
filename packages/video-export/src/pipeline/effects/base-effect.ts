import type { EffectProcessor } from '../pipeline';
import type { ExportSettings, RenderFrame } from '../../types';

export abstract class BaseEffect implements EffectProcessor {
  readonly type = 'effect' as const;
  
  constructor(
    public readonly id: string,
    public readonly name: string,
    public parameters: Record<string, any> = {}
  ) {}

  abstract process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame>;

  updateParameters(newParams: Record<string, any>): void {
    this.parameters = { ...this.parameters, ...newParams };
  }

  getParameter(key: string, defaultValue?: any): any {
    return this.parameters[key] ?? defaultValue;
  }

  setParameter(key: string, value: any): void {
    this.parameters[key] = value;
  }

  dispose(): void {
    // Override in subclasses if cleanup is needed
  }
}

// Example blur effect
export class BlurEffect extends BaseEffect {
  constructor(id: string, blurRadius: number = 5) {
    super(id, 'Blur Effect', { blurRadius });
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    const blurRadius = this.getParameter('blurRadius', 5);
    
    if (blurRadius <= 0) {
      return frame; // No blur needed
    }

    frame.context.save();
    frame.context.filter = `blur(${blurRadius}px)`;
    
    // Create a temporary canvas to apply blur
    const tempCanvas = frame.canvas.cloneNode() as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d')!;
    tempContext.drawImage(frame.canvas, 0, 0);
    
    // Clear original and draw blurred version
    frame.context.clearRect(0, 0, frame.canvas.width, frame.canvas.height);
    frame.context.drawImage(tempCanvas, 0, 0);
    frame.context.restore();

    return frame;
  }
}

// Example brightness effect
export class BrightnessEffect extends BaseEffect {
  constructor(id: string, brightness: number = 1.0) {
    super(id, 'Brightness Effect', { brightness });
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    const brightness = this.getParameter('brightness', 1.0);
    
    if (brightness === 1.0) {
      return frame; // No change needed
    }

    frame.context.save();
    frame.context.filter = `brightness(${brightness})`;
    
    // Create a temporary canvas to apply brightness
    const tempCanvas = frame.canvas.cloneNode() as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d')!;
    tempContext.drawImage(frame.canvas, 0, 0);
    
    // Clear original and draw modified version
    frame.context.clearRect(0, 0, frame.canvas.width, frame.canvas.height);
    frame.context.drawImage(tempCanvas, 0, 0);
    frame.context.restore();

    return frame;
  }
}

// Example color filter effect
export class ColorFilterEffect extends BaseEffect {
  constructor(id: string, hue: number = 0, saturation: number = 1, brightness: number = 1) {
    super(id, 'Color Filter Effect', { hue, saturation, brightness });
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    const hue = this.getParameter('hue', 0);
    const saturation = this.getParameter('saturation', 1);
    const brightness = this.getParameter('brightness', 1);
    
    if (hue === 0 && saturation === 1 && brightness === 1) {
      return frame; // No changes needed
    }

    frame.context.save();
    frame.context.filter = `hue-rotate(${hue}deg) saturate(${saturation}) brightness(${brightness})`;
    
    // Create a temporary canvas to apply filters
    const tempCanvas = frame.canvas.cloneNode() as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d')!;
    tempContext.drawImage(frame.canvas, 0, 0);
    
    // Clear original and draw filtered version
    frame.context.clearRect(0, 0, frame.canvas.width, frame.canvas.height);
    frame.context.drawImage(tempCanvas, 0, 0);
    frame.context.restore();

    return frame;
  }
}