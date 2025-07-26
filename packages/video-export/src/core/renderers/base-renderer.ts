import type { ExportSettings, ExportElement } from '../../types';

/**
 * Base class for all element renderers
 * Provides common functionality for rendering timeline elements
 */
export abstract class BaseElementRenderer<T extends ExportElement = ExportElement> {
  protected settings: ExportSettings;
  protected context: CanvasRenderingContext2D;

  constructor(settings: ExportSettings, context: CanvasRenderingContext2D) {
    this.settings = settings;
    this.context = context;
  }

  /**
   * Render an element at the given timestamp
   * @param element - The element to render
   * @param timestamp - Current timeline timestamp in seconds
   */
  abstract render(element: T, timestamp: number): Promise<void>;

  /**
   * Apply common element properties like opacity and blend mode
   * @param element - Element containing properties to apply
   */
  protected applyElementProperties(element: T): void {
    this.context.save();
    
    // Apply element opacity
    if (element.opacity !== undefined) {
      this.context.globalAlpha = element.opacity;
    }
    
    // Apply blend mode
    if (element.blendMode) {
      this.context.globalCompositeOperation = element.blendMode;
    }
    
    // Scale for resolution
    this.context.scale(this.settings.resolution, this.settings.resolution);
  }

  /**
   * Restore context state after rendering
   */
  protected restoreContext(): void {
    this.context.restore();
  }

  /**
   * Check if element is active at the given timestamp
   * @param element - Element to check
   * @param timestamp - Current timestamp
   */
  protected isElementActive(element: T, timestamp: number): boolean {
    const elementEndTime = element.startTime + element.duration - element.trimStart - element.trimEnd;
    return timestamp >= element.startTime && timestamp < elementEndTime;
  }

  /**
   * Calculate element-relative timestamp
   * @param element - Element to calculate for
   * @param timestamp - Current timeline timestamp
   */
  protected getElementTime(element: T, timestamp: number): number {
    return timestamp - element.startTime + element.trimStart;
  }

  /**
   * Dispose of any resources used by this renderer
   */
  dispose(): void {
    // Override in subclasses if cleanup is needed
  }
}