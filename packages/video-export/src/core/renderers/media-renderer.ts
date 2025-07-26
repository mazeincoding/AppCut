import { BaseElementRenderer } from './base-renderer';
import type { MediaExportElement } from '../../types';

/**
 * Renderer for media elements (video, image, audio)
 * Handles loading and rendering of media content
 */
export class MediaElementRenderer extends BaseElementRenderer<MediaExportElement> {
  private mediaCache = new Map<string, HTMLImageElement | HTMLVideoElement>();
  
  /**
   * Render a media element
   * @param element - Media element to render
   * @param timestamp - Current timeline timestamp
   */
  async render(element: MediaExportElement, timestamp: number): Promise<void> {
    // Early return if not active - but don't fail
    if (!this.isElementActive(element, timestamp)) {
      return;
    }

    try {
      const media = await this.loadMedia(element);
      if (!media) {
        return; // Silent fail
      }

      this.applyElementProperties(element);

      const elementTime = this.getElementTime(element, timestamp);
      
      if (media instanceof HTMLVideoElement) {
        await this.renderVideoFrame(media, element, elementTime);
      } else if (media instanceof HTMLImageElement) {
        this.renderImage(media, element);
      }

      this.restoreContext();
    } catch (error) {
      // Silent fail - don't break the render frame
    }
  }

  /**
   * Render a video frame at specific time
   * @param video - Video element
   * @param element - Media element configuration
   * @param elementTime - Time within the element
   */
  private async renderVideoFrame(
    video: HTMLVideoElement, 
    element: MediaExportElement, 
    elementTime: number
  ): Promise<void> {
    // Proper seeking - wait for seek completion
    await this.seekVideo(video, elementTime);
    
    // Render the exact frame
    this.renderVideoToCanvas(video);
  }

  /**
   * Seek video to exact time and wait for completion
   * @param video - Video element to seek
   * @param time - Time to seek to
   */
  private async seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // If already at the right time (within tolerance), don't seek
      const tolerance = 1 / 60; // 1 frame at 60fps
      const timeDiff = Math.abs(video.currentTime - time);
      
      if (timeDiff < tolerance) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Video seek timeout'));
      }, 1000);

      const onSeeked = () => {
        clearTimeout(timeout);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Video seek failed'));
      };

      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', onError, { once: true });
      
      // Pause first to ensure precise seeking
      video.pause();
      video.currentTime = time;
    });
  }

  /**
   * Render video to canvas
   * @param video - Video element to render
   */
  private renderVideoToCanvas(video: HTMLVideoElement): void {
    // Simple direct rendering`
    const canvasWidth = this.settings.width * this.settings.resolution;
    const canvasHeight = this.settings.height * this.settings.resolution;
    
    this.context.drawImage(video, 0, 0, canvasWidth, canvasHeight);
  }

  /**
   * Render an image element - simplified
   * @param image - Image element
   * @param element - Media element configuration
   */
  private renderImage(image: HTMLImageElement, element: MediaExportElement): void {
    // Simple direct rendering - let canvas handle scaling
    const canvasWidth = this.settings.width * this.settings.resolution;
    const canvasHeight = this.settings.height * this.settings.resolution;
    this.context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
  }

  /**
   * Load media element with caching
   * @param element - Media element to load
   */
  private async loadMedia(element: MediaExportElement): Promise<HTMLImageElement | HTMLVideoElement | null> {
    const cacheKey = element.mediaId;
    
    if (this.mediaCache.has(cacheKey)) {
      return this.mediaCache.get(cacheKey)!;
    }

    if (!element.file && !element.url) {
      console.warn('Media element has no file or URL');
      return null;
    }

    try {
      if (element.mediaType === 'video') {
        const video = await this.loadVideo(element);
        this.mediaCache.set(cacheKey, video);
        return video;
      } else if (element.mediaType === 'image') {
        const image = await this.loadImage(element);
        this.mediaCache.set(cacheKey, image);
        return image;
      }
    } catch (error) {
      console.error('Failed to load media:', error);
    }

    return null;
  }

  /**
   * Load video element
   * @param element - Media element with video
   */
  private async loadVideo(element: MediaExportElement): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata'; // Start with metadata first for faster loading
    video.playsInline = true;
    video.disablePictureInPicture = true;
    video.controls = false;
    video.autoplay = false;
    video.loop = false;
    
    const src = element.url || URL.createObjectURL(element.file!);
    video.src = src;
    
    return new Promise<HTMLVideoElement>((resolve, reject) => {
      const timeout = setTimeout(() => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onError);
        reject(new Error('Video load timeout'));
      }, 15000);
      
      const onReady = async () => {
        clearTimeout(timeout);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onError);
        
        try {
          // Ensure video is properly seekable by seeking to the first frame
          video.currentTime = 0;
          
          // Wait for seek completion to ensure video is ready for frame-perfect seeking
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            
            // If already at time 0, resolve immediately
            setTimeout(() => {
              if (video.currentTime === 0) {
                video.removeEventListener('seeked', onSeeked);
                seekResolve();
              }
            }, 100);
          });
          
          resolve(video);
        } catch (error) {
          reject(error);
        }
      };
      
      const onError = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onError);
        reject(new Error('Failed to load video'));
      };
      
      video.addEventListener('loadeddata', onReady, { once: true });
      video.addEventListener('error', onError, { once: true });
      
      video.load();
    });
  }

  /**
   * Load image element
   * @param element - Media element with image
   */
  private async loadImage(element: MediaExportElement): Promise<HTMLImageElement> {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    const src = element.url || URL.createObjectURL(element.file!);
    
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000);
      
      image.onload = () => {
        clearTimeout(timeout);
        resolve(image);
      };
      
      image.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };
      
      image.src = src;
    });
  }

  /**
   * Clean up media cache
   */
  dispose(): void {
    for (const media of this.mediaCache.values()) {
      if (media instanceof HTMLVideoElement) {
        media.src = '';
        media.load();
      }
    }
    this.mediaCache.clear();
  }
}