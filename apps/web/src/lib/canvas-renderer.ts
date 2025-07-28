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
    // DIAGNOSTIC: Log canvas drawing attempts
    console.log('🎨 CANVAS-RENDERER: Attempting to draw image', {
      imageType: image.constructor.name,
      imageSource: image instanceof HTMLImageElement ? image.src?.substring(0, 100) + '...' : 'N/A',
      imageDimensions: {
        natural: {
          width: image instanceof HTMLImageElement ? image.naturalWidth : 
                 image instanceof HTMLVideoElement ? image.videoWidth : image.width,
          height: image instanceof HTMLImageElement ? image.naturalHeight :
                  image instanceof HTMLVideoElement ? image.videoHeight : image.height
        },
        display: {
          width: image.width || (image as HTMLVideoElement).videoWidth,
          height: image.height || (image as HTMLVideoElement).videoHeight
        }
      },
      imageState: {
        complete: image instanceof HTMLImageElement ? image.complete : true,
        readyState: image instanceof HTMLVideoElement ? image.readyState : 'N/A'
      },
      targetBounds: { x, y, width, height },
      canvasState: {
        width: this.canvas.width,
        height: this.canvas.height,
        contextValid: !!this.ctx
      }
    });
    
    try {
      // Check if image is ready for drawing
      if (image instanceof HTMLImageElement) {
        if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
          console.warn('⚠️ CANVAS-RENDERER: Image not fully loaded', {
            complete: image.complete,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            src: image.src?.substring(0, 100) + '...'
          });
        }
      }
      
      // Perform the actual draw
      this.ctx.drawImage(image, x, y, width, height);
      
      console.log('✅ CANVAS-RENDERER: Successfully drew image to canvas', {
        drawnAt: { x, y, width, height },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('🚨 CANVAS-RENDERER: Failed to draw image', {
        error: (error as Error).message,
        errorName: (error as Error).name,
        imageDetails: {
          type: image.constructor.name,
          src: image instanceof HTMLImageElement ? image.src?.substring(0, 100) + '...' : 'N/A',
          complete: image instanceof HTMLImageElement ? image.complete : 'N/A',
          naturalWidth: image instanceof HTMLImageElement ? image.naturalWidth : 'N/A',
          naturalHeight: image instanceof HTMLImageElement ? image.naturalHeight : 'N/A'
        },
        canvasDetails: {
          width: this.canvas.width,
          height: this.canvas.height,
          contextType: this.ctx?.constructor.name
        },
        targetBounds: { x, y, width, height }
      });
      
      // Check if this is a CORS/taint error
      if ((error as Error).name === 'SecurityError' || (error as Error).message.includes('tainted')) {
        console.error('🔒 CANVAS-RENDERER: CORS/Security error detected', {
          errorType: 'CORS_VIOLATION',
          suggestion: 'Image may be from different origin or blob URL expired'
        });
      }
      
      throw error;
    }
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
   * Fill a rectangle on the canvas
   */
  fillRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw a rectangle with border on the canvas
   */
  drawRect(x: number, y: number, width: number, height: number, fillColor?: string, strokeColor?: string, lineWidth: number = 1): void {
    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(x, y, width, height);
    }
    
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeRect(x, y, width, height);
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
   * Set canvas transformation matrix
   */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.ctx.setTransform(a, b, c, d, e, f);
  }

  /**
   * Get the canvas as a data URL
   */
  toDataURL(format: string = "image/png", quality?: number): string {
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Get image data from the canvas
   */
  getImageData(x: number, y: number, width: number, height: number): ImageData {
    return this.ctx.getImageData(x, y, width, height);
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