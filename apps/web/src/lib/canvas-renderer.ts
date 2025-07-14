import { ExportSettings } from "@/types/export";

export interface RenderOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundBlur?: boolean;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: ExportSettings;

  constructor(canvas: HTMLCanvasElement, settings: ExportSettings) {
    this.canvas = canvas;
    this.settings = settings;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D context from canvas");
    }
    this.ctx = ctx;
    
    // Configure canvas
    this.canvas.width = settings.width;
    this.canvas.height = settings.height;
    
    // Enable high-quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  }

  /**
   * Clear the canvas with optional background color
   */
  clearFrame(backgroundColor?: string): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (backgroundColor) {
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Draw an image to the canvas with position and size
   */
  drawImage(
    image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.ctx.drawImage(image, x, y, width, height);
  }

  /**
   * Draw text to the canvas with styling
   */
  drawText(
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      fontFamily?: string;
      color?: string;
      textAlign?: CanvasTextAlign;
      textBaseline?: CanvasTextBaseline;
      maxWidth?: number;
    } = {}
  ): void {
    const {
      fontSize = 24,
      fontFamily = "Arial, sans-serif",
      color = "#000000",
      textAlign = "left",
      textBaseline = "top",
      maxWidth,
    } = options;

    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = textBaseline;

    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  /**
   * Apply blur effect to the canvas
   */
  applyBlur(radius: number): void {
    this.ctx.filter = `blur(${radius}px)`;
  }

  /**
   * Reset canvas filters
   */
  resetFilters(): void {
    this.ctx.filter = "none";
  }

  /**
   * Save canvas context state
   */
  save(): void {
    this.ctx.save();
  }

  /**
   * Restore canvas context state
   */
  restore(): void {
    this.ctx.restore();
  }

  /**
   * Get the canvas as a data URL
   */
  toDataURL(format: string = "image/png", quality?: number): string {
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Get the current canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }
}