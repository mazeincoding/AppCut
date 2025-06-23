import { toast } from "sonner";
import {
  getFileType,
  generateVideoThumbnail,
  getMediaDuration,
  getImageDimensions,
  type MediaItem,
} from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
// import { generateThumbnail, getVideoInfo } from "./ffmpeg-utils"; // Temporarily disabled

export interface ProcessedMediaItem extends Omit<MediaItem, "id"> {}

export async function processMediaFiles(
  files: FileList | File[]
): Promise<ProcessedMediaItem[]> {
  const fileArray = Array.from(files);
  const processedItems: ProcessedMediaItem[] = [];

  for (const file of fileArray) {
    const fileType = getFileType(file);

    if (!fileType) {
      toast.error(`Unsupported file type: ${file.name}`);
      continue;
    }

    const url = URL.createObjectURL(file);
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;
    let aspectRatio: number = 16 / 9; // Default fallback
    let width: number | undefined;
    let height: number | undefined;
    let resolution: string | undefined;

    try {
      if (fileType === "image") {
        // Get full image dimensions and resolution info
        const imageData = await getImageDimensions(file);
        aspectRatio = imageData.aspectRatio;
        width = imageData.width;
        height = imageData.height;
        resolution = imageData.resolution;
      } else if (fileType === "video") {
        // Get full video metadata including resolution
        const videoResult = await generateVideoThumbnail(file);
        thumbnailUrl = videoResult.thumbnailUrl;
        aspectRatio = videoResult.aspectRatio;
        width = videoResult.width;
        height = videoResult.height;
        resolution = videoResult.resolution;

        // Auto-detect project resolution from first video
        autoSetProjectResolution(width, height, resolution);
      } else if (fileType === "audio") {
        // For audio, use a square aspect ratio
        aspectRatio = 1;
      }

      // Get duration for videos and audio (if not already set by FFmpeg)
      if ((fileType === "video" || fileType === "audio") && !duration) {
        duration = await getMediaDuration(file);
      }

      processedItems.push({
        name: file.name,
        type: fileType,
        file,
        url,
        thumbnailUrl,
        duration,
        aspectRatio,
        width,
        height,
        resolution,
      });

      // Show success message with resolution info for videos and images
      if (resolution && (fileType === "video" || fileType === "image")) {
        toast.success(`Added ${file.name} (${resolution})`);
      }
    } catch (error) {
      console.error("Error processing file:", file.name, error);
      toast.error(`Failed to process ${file.name}`);
      URL.revokeObjectURL(url); // Clean up on error
    }
  }

  return processedItems;
}

// Helper function to automatically set project resolution from first video
function autoSetProjectResolution(width: number, height: number, resolutionLabel: string) {
  const projectStore = useProjectStore.getState();
  const { activeProject, setProjectResolution } = projectStore;

  // Only set if there's an active project and no resolution is set yet
  if (activeProject && !activeProject.resolution) {
    setProjectResolution(width, height, resolutionLabel, true);
  }
}
