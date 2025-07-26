import { BaseElementRenderer } from './base-renderer';
import type { SubtitleExportElement } from '../../types';

/**
 * Renderer for subtitle elements
 * Handles professional subtitle rendering with positioning
 */
export class SubtitleElementRenderer extends BaseElementRenderer<SubtitleExportElement> {
  private fontCache = new Set<string>();

  /**
   * Render a subtitle element
   * @param element - Subtitle element to render
   * @param timestamp - Current timeline timestamp
   */
  async render(element: SubtitleExportElement, timestamp: number): Promise<void> {
    if (!this.isElementActive(element, timestamp)) {
      return;
    }

    this.applyElementProperties(element);

    try {
      // Load font if needed
      await this.loadFont(element.fontFamily);

      // Set text properties
      this.setupSubtitleStyle(element);

      // Calculate position based on subtitle position setting
      const { x, y } = this.calculateSubtitlePosition(element);

      // Draw background if specified
      this.drawSubtitleBackground(element, x, y);

      // Draw subtitle text
      this.context.fillText(element.content, x, y);

    } catch (error) {
      console.warn('Failed to render subtitle:', error);
    }

    this.restoreContext();
  }

  /**
   * Setup subtitle text styling
   * @param element - Subtitle element with style properties
   */
  private setupSubtitleStyle(element: SubtitleExportElement): void {
    this.context.font = `${element.fontSize}px ${element.fontFamily}`;
    this.context.fillStyle = element.color;
    this.context.textAlign = element.alignment;
    this.context.textBaseline = 'middle';
  }

  /**
   * Calculate subtitle position based on position preset or custom coordinates
   * @param element - Subtitle element with position data
   */
  private calculateSubtitlePosition(element: SubtitleExportElement): { x: number; y: number } {
    const canvasWidth = this.settings.width;
    const canvasHeight = this.settings.height;
    
    let x: number;
    let y: number;
    
    if (element.position === 'custom' && element.x !== undefined && element.y !== undefined) {
      x = element.x;
      y = element.y;
    } else {
      // Center horizontally for predefined positions
      x = canvasWidth / 2;
      
      switch (element.position) {
        case 'bottom':
          y = canvasHeight - (element.fontSize * 2);
          break;
        case 'top':
          y = element.fontSize * 2;
          break;
        case 'center':
        default:
          y = canvasHeight / 2;
          break;
      }
    }
    
    return { x, y };
  }

  /**
   * Draw subtitle background if specified
   * @param element - Subtitle element with background settings
   * @param x - Text X position
   * @param y - Text Y position
   */
  private drawSubtitleBackground(element: SubtitleExportElement, x: number, y: number): void {
    if (element.backgroundColor === 'transparent') {
      return;
    }

    const metrics = this.context.measureText(element.content);
    const textWidth = metrics.width;
    const textHeight = element.fontSize;
    
    // Calculate background position based on text alignment
    let bgX = x - textWidth / 2;
    
    if (element.alignment === 'left') {
      bgX = x;
    } else if (element.alignment === 'right') {
      bgX = x - textWidth;
    }
    
    // Add padding around text
    const padding = 8;
    
    this.context.fillStyle = element.backgroundColor;
    this.context.fillRect(
      bgX - padding,
      y - textHeight / 2 - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );
    
    // Restore text color
    this.context.fillStyle = element.color;
  }

  /**
   * Load font family (placeholder for future web font loading)
   * @param fontFamily - Font family name
   */
  private async loadFont(fontFamily: string): Promise<void> {
    if (this.fontCache.has(fontFamily)) {
      return;
    }

    // For now, assume fonts are already loaded
    // In the future, we could implement web font loading here
    this.fontCache.add(fontFamily);
  }

  /**
   * Clean up font cache
   */
  dispose(): void {
    this.fontCache.clear();
  }
}