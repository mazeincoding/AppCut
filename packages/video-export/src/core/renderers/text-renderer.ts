import { BaseElementRenderer } from './base-renderer';
import type { TextExportElement } from '../../types';

/**
 * Renderer for text elements
 * Handles text rendering with fonts, styling, and positioning
 */
export class TextElementRenderer extends BaseElementRenderer<TextExportElement> {
  private fontCache = new Set<string>();

  /**
   * Render a text element
   * @param element - Text element to render
   * @param timestamp - Current timeline timestamp
   */
  async render(element: TextExportElement, timestamp: number): Promise<void> {
    if (!this.isElementActive(element, timestamp)) {
      return;
    }

    this.applyElementProperties(element);

    try {
      // Load font if not cached
      await this.loadFont(element.fontFamily);

      // Set text properties
      this.setupTextStyle(element);

      // Calculate position - convert from OpenCut's coordinate system
      // OpenCut uses canvas center as (0,0), but HTML canvas uses top-left as (0,0)
      const { x, y } = this.calculateTextPosition(element);
      
      this.context.translate(x, y);
      this.context.rotate((element.rotation * Math.PI) / 180);

      // Draw background if specified
      this.drawTextBackground(element);

      // Draw text
      this.context.fillText(element.content, 0, 0);

      // Apply text decoration if needed
      this.applyTextDecoration(element);

    } catch (error) {
      console.warn('Failed to render text:', error);
    }

    this.restoreContext();
  }

  /**
   * Setup text styling properties
   * @param element - Text element with style properties
   */
  private setupTextStyle(element: TextExportElement): void {
    const fontSize = element.fontSize;
    const fontWeight = element.fontWeight;
    const fontStyle = element.fontStyle;
    
    this.context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${element.fontFamily}`;
    this.context.fillStyle = element.color;
    this.context.textAlign = element.textAlign;
    this.context.textBaseline = 'middle';
    this.context.globalAlpha = element.opacity;
  }

  /**
   * Calculate text position on canvas
   * @param element - Text element with position data
   */
  private calculateTextPosition(element: TextExportElement): { x: number; y: number } {
    const canvasWidth = this.settings.width;
    const canvasHeight = this.settings.height;
    
    const x = (canvasWidth / 2) + element.x;
    const y = (canvasHeight / 2) + element.y;
    
    return { x, y };
  }

  /**
   * Draw text background if specified
   * @param element - Text element with background settings
   */
  private drawTextBackground(element: TextExportElement): void {
    if (element.backgroundColor === 'transparent') {
      return;
    }

    const metrics = this.context.measureText(element.content);
    const textWidth = metrics.width;
    const textHeight = element.fontSize;
    
    // Calculate background position based on text alignment
    let bgX = -textWidth / 2;
    
    if (element.textAlign === 'left') {
      bgX = 0;
    } else if (element.textAlign === 'right') {
      bgX = -textWidth;
    }
    
    this.context.fillStyle = element.backgroundColor;
    this.context.fillRect(bgX, -textHeight / 2, textWidth, textHeight);
    this.context.fillStyle = element.color; // Restore text color
  }

  /**
   * Apply text decoration (underline, line-through)
   * @param element - Text element with decoration settings
   */
  private applyTextDecoration(element: TextExportElement): void {
    if (element.textDecoration === 'none') {
      return;
    }

    const metrics = this.context.measureText(element.content);
    const textWidth = metrics.width;
    const fontSize = element.fontSize;
    
    // Calculate line position based on text alignment
    let lineX = -textWidth / 2;
    
    if (element.textAlign === 'left') {
      lineX = 0;
    } else if (element.textAlign === 'right') {
      lineX = -textWidth;
    }

    this.context.strokeStyle = element.color;
    this.context.lineWidth = Math.max(1, fontSize / 20); // Scale line width with font size
    
    this.context.beginPath();
    
    if (element.textDecoration === 'underline') {
      const underlineY = fontSize * 0.15; // Position below baseline
      this.context.moveTo(lineX, underlineY);
      this.context.lineTo(lineX + textWidth, underlineY);
    } else if (element.textDecoration === 'line-through') {
      const strikeY = -fontSize * 0.15; // Position above baseline
      this.context.moveTo(lineX, strikeY);
      this.context.lineTo(lineX + textWidth, strikeY);
    }
    
    this.context.stroke();
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
    // using FontFace API or CSS font loading
    this.fontCache.add(fontFamily);
  }

  /**
   * Clean up font cache
   */
  dispose(): void {
    this.fontCache.clear();
  }
}