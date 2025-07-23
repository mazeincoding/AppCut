/**
 * Image utility functions for the adjustment panel
 */

export interface ImageInfo {
  width: number;
  height: number;
  size: number;
  type: string;
  aspectRatio: number;
}

/**
 * Get image information from a File
 */
export async function getImageInfo(file: File): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const info: ImageInfo = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type,
        aspectRatio: img.naturalWidth / img.naturalHeight
      };
      URL.revokeObjectURL(url);
      resolve(info);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please use JPEG, PNG, or WebP.'
    };
  }
  
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 50MB.'
    };
  }
  
  return { valid: true };
}

/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 */
export async function resizeImage(
  file: File, 
  maxWidth: number, 
  maxHeight: number, 
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      // Set canvas size and draw image
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert image to data URL
 */
export function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Download image from URL
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    
    // Use setTimeout to ensure proper download without navigation
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 100);
    }, 10);
  } catch (error) {
    throw new Error(`Failed to download image: ${error}`);
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get optimal image dimensions for display
 */
export function getDisplayDimensions(
  originalWidth: number, 
  originalHeight: number, 
  containerWidth: number, 
  containerHeight: number
): { width: number; height: number } {
  const ratio = originalWidth / originalHeight;
  const containerRatio = containerWidth / containerHeight;
  
  let width: number, height: number;
  
  if (ratio > containerRatio) {
    // Image is wider than container
    width = containerWidth;
    height = containerWidth / ratio;
  } else {
    // Image is taller than container
    height = containerHeight;
    width = containerHeight * ratio;
  }
  
  return { width, height };
}