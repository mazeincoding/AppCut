import { toast } from "sonner";
import {
  getFileType,
  generateVideoThumbnail,
  getMediaDuration,
  getImageDimensions,
  type MediaItem,
} from "@/stores/media-store";

export interface ProcessedMediaItem extends Omit<MediaItem, "id"> {}

// Constants for video processing
const DEFAULT_VIDEO_FPS = 30;
const SEEK_BUFFER_SECONDS = 0.1;
const JPEG_QUALITY = 0.8;
const CANVAS_BACKGROUND = "#000000";
const VIDEO_METADATA_TIMEOUT_MS = 10_000;

/**
 * Extract video metadata using native HTML5 video element.
 * Uses browser's built-in video decoding capabilities.
 *
 * @param file - Video file to analyze
 * @returns Promise resolving to video metadata
 * @throws Error if video cannot be loaded or processed
 */
const getNativeVideoInfo = async (
  file: File
): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    // Timeout to prevent hanging on problematic videos
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Video metadata loading timeout"));
    }, VIDEO_METADATA_TIMEOUT_MS);

    const handleLoadedMetadata = () => {
      clearTimeout(timeoutId);
      const duration = video.duration,
        width = video.videoWidth,
        height = video.videoHeight,
        fps = DEFAULT_VIDEO_FPS; // HTML5 doesn't expose FPS directly

      cleanup();
      resolve({ duration, width, height, fps });
    };

    const handleError = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error("Failed to load video metadata"));
    };

    // Create object URL for proper cleanup
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
      video.src = "";
      video.load();
      URL.revokeObjectURL(objectUrl); // Prevent memory leaks
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);
    video.src = objectUrl;
  });
};

/**
 * Generate video thumbnail using native HTML5 Canvas.
 * Uses browser's hardware-accelerated video decoding and canvas rendering.
 *
 * @param videoFile - Video file to extract thumbnail from
 * @param timePosition - Time position in seconds (default: 1)
 * @param width - Thumbnail width in pixels (default: 320)
 * @param height - Thumbnail height in pixels (default: 240)
 * @returns Promise resolving to data URL of thumbnail image
 * @throws Error if canvas context unavailable or video loading fails
 */
const generateNativeThumbnail = async (
  videoFile: File,
  timePosition = 1,
  width = 320,
  height = 240
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    canvas.width = width;
    canvas.height = height;
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const handleLoadedMetadata = () => {
      const seekTime = Math.min(
        timePosition,
        video.duration - SEEK_BUFFER_SECONDS
      );
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      try {
        // Calculate aspect ratio and positioning for letterboxing
        const videoAspect = video.videoWidth / video.videoHeight,
          canvasAspect = width / height;

        let drawWidth = width,
          drawHeight = height,
          offsetX = 0,
          offsetY = 0;

        // Maintain aspect ratio with letterboxing
        if (videoAspect > canvasAspect) {
          // Video is wider - fit to width, add top/bottom bars
          drawHeight = width / videoAspect;
          offsetY = (height - drawHeight) / 2;
        } else {
          // Video is taller - fit to height, add left/right bars
          drawWidth = height * videoAspect;
          offsetX = (width - drawWidth) / 2;
        }

        // Clear canvas with black background and draw video frame
        ctx.fillStyle = CANVAS_BACKGROUND;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        // Convert to data URL with specified quality
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        cleanup();
        resolve(dataUrl);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Video loading failed"));
    };

    // Create object URL for proper cleanup
    const objectUrl = URL.createObjectURL(videoFile);

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      video.src = "";
      video.load();
      URL.revokeObjectURL(objectUrl); // Prevent memory leaks
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    video.src = objectUrl;
  });
};

export async function processMediaFiles(
  files: FileList | File[],
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaItem[]> {
  const fileArray = Array.from(files);
  const processedItems: ProcessedMediaItem[] = [];

  const total = fileArray.length;
  let completed = 0;

  for (const file of fileArray) {
    const fileType = getFileType(file);

    if (!fileType) {
      toast.error(`Unsupported file type: ${file.name}`);
      continue;
    }

    const url = URL.createObjectURL(file);
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let fps: number | undefined;

    try {
      if (fileType === "image") {
        // Get image dimensions
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      } else if (fileType === "video") {
        try {
          // Use native HTML5 for video info extraction
          const videoInfo = await getNativeVideoInfo(file);
          duration = videoInfo.duration;
          width = videoInfo.width;
          height = videoInfo.height;
          fps = videoInfo.fps;

          // Generate thumbnail using native HTML5 Canvas
          thumbnailUrl = await generateNativeThumbnail(file, 1, 320, 240);
        } catch (error) {
          console.warn(
            "native video processing failed, falling back to basic processing:",
            error
          );
          // Fallback to existing video processing methods
          const videoResult = await generateVideoThumbnail(file);
          thumbnailUrl = videoResult.thumbnailUrl;
          width = videoResult.width;
          height = videoResult.height;
          duration = await getMediaDuration(file);
          // fps will remain undefined for fallback processing
        }
      } else if (fileType === "audio") {
        // For audio, we don't set width/height/fps (they'll be undefined)
        duration = await getMediaDuration(file);
      }

      processedItems.push({
        name: file.name,
        type: fileType,
        file,
        url,
        thumbnailUrl,
        duration,
        width,
        height,
        fps,
      });

      // Yield back to the event loop to keep the UI responsive
      await new Promise((resolve) => setTimeout(resolve, 0));

      completed += 1;
      if (onProgress) {
        const percent = Math.round((completed / total) * 100);
        onProgress(percent);
      }
    } catch (error) {
      console.error("Error processing file:", file.name, error);
      toast.error(`Failed to process ${file.name}`);
      URL.revokeObjectURL(url); // Clean up on error
    }
  }

  return processedItems;
}
