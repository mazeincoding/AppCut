import { BaseElementRenderer } from './base-renderer';
import type { OverlayExportElement } from '../../types';

/**
 * Renderer for overlay elements
 * Handles shapes, images, and pattern overlays
 */
export class OverlayElementRenderer extends BaseElementRenderer<OverlayExportElement> {
  private imageCache = new Map<string, HTMLImageElement>();

  /**
   * Render an overlay element
   * @param element - Overlay element to render
   * @param timestamp - Current timeline timestamp
   */
  async render(element: OverlayExportElement, timestamp: number): Promise<void> {
    if (!this.isElementActive(element, timestamp)) {
      return;
    }

    this.applyElementProperties(element);

    try {
      // Position and rotate
      this.context.translate(element.x, element.y);
      this.context.rotate((element.rotation * Math.PI) / 180);
      
      switch (element.overlayType) {
        case 'shape':
          this.renderShape(element);
          break;
        case 'image':
          await this.renderImage(element);
          break;
        case 'pattern':
          this.renderPattern(element);
          break;
      }
    } catch (error) {
      console.warn('Failed to render overlay:', error);
    }

    this.restoreContext();
  }

  /**
   * Render a shape overlay
   * @param element - Overlay element with shape configuration
   */
  private renderShape(element: OverlayExportElement): void {
    // Use source as color, default to white
    const color = element.source || '#ffffff';
    
    this.context.fillStyle = color;
    
    // For now, render as rectangle - could be extended for other shapes
    this.context.fillRect(
      -element.width / 2, 
      -element.height / 2, 
      element.width, 
      element.height
    );
  }

  /**
   * Render an image overlay
   * @param element - Overlay element with image source
   */
  private async renderImage(element: OverlayExportElement): Promise<void> {
    if (!element.source) {
      console.warn('Image overlay has no source');
      return;
    }

    try {
      const image = await this.loadImage(element.source, element.id);
      
      this.context.drawImage(
        image,
        -element.width / 2,
        -element.height / 2,
        element.width,
        element.height
      );
    } catch (error) {
      console.warn('Failed to load overlay image:', error);
      
      // Fallback to colored rectangle
      this.context.fillStyle = '#cccccc';
      this.context.fillRect(
        -element.width / 2,
        -element.height / 2,
        element.width,
        element.height
      );
    }
  }

  /**
   * Render a pattern overlay
   * @param element - Overlay element with pattern configuration
   */
  private renderPattern(element: OverlayExportElement): void {
    // Create a simple pattern - could be extended for complex patterns
    const patternType = element.source || 'dots';
    
    this.context.fillStyle = '#000000';
    
    // Draw different patterns based on source
    switch (patternType) {
      case 'dots':
        this.renderDotPattern(element);
        break;
      case 'stripes':
        this.renderStripePattern(element);
        break;
      case 'checkerboard':
        this.renderCheckerboardPattern(element);
        break;
      default:
        // Default to solid fill
        this.context.fillRect(
          -element.width / 2,
          -element.height / 2,
          element.width,
          element.height
        );
    }
  }

  /**
   * Render dot pattern
   * @param element - Overlay element dimensions
   */
  private renderDotPattern(element: OverlayExportElement): void {
    const dotSize = 5;
    const spacing = 15;
    
    const startX = -element.width / 2;
    const startY = -element.height / 2;
    
    for (let x = startX; x < startX + element.width; x += spacing) {
      for (let y = startY; y < startY + element.height; y += spacing) {
        this.context.beginPath();
        this.context.arc(x, y, dotSize, 0, Math.PI * 2);
        this.context.fill();
      }
    }
  }

  /**
   * Render stripe pattern
   * @param element - Overlay element dimensions
   */
  private renderStripePattern(element: OverlayExportElement): void {
    const stripeWidth = 10;
    
    const startX = -element.width / 2;
    const startY = -element.height / 2;
    
    for (let x = startX; x < startX + element.width; x += stripeWidth * 2) {
      this.context.fillRect(x, startY, stripeWidth, element.height);
    }
  }

  /**
   * Render checkerboard pattern
   * @param element - Overlay element dimensions
   */
  private renderCheckerboardPattern(element: OverlayExportElement): void {
    const squareSize = 20;
    
    const startX = -element.width / 2;
    const startY = -element.height / 2;
    
    const cols = Math.ceil(element.width / squareSize);
    const rows = Math.ceil(element.height / squareSize);
    
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        if ((col + row) % 2 === 0) {
          this.context.fillRect(
            startX + col * squareSize,
            startY + row * squareSize,
            squareSize,
            squareSize
          );
        }
      }
    }
  }

  /**
   * Load image with caching
   * @param source - Image source URL
   * @param cacheKey - Cache key for the image
   */
  private async loadImage(source: string, cacheKey: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000);
      
      image.onload = () => {
        clearTimeout(timeout);
        this.imageCache.set(cacheKey, image);
        resolve(image);
      };
      
      image.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load overlay image'));
      };
      
      image.src = source;
    });
  }

  /**
   * Clean up image cache
   */
  dispose(): void {
    this.imageCache.clear();
  }
}