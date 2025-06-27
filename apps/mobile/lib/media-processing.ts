import { Alert, Image } from 'react-native';

import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';

export interface ProcessedMediaItem {
  name: string;
  type: 'video' | 'audio' | 'image';
  uri: string;
  thumbnailUrl?: string;
  duration?: number;
  aspectRatio: number;
  width?: number;
  height?: number;
}

export function getFileType(uri: string): 'video' | 'audio' | 'image' | null {
  const extension = uri.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
    return 'image';
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) {
    return 'video';
  }
  if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(extension || '')) {
    return 'audio';
  }
  
  return null;
}

export async function getImageDimensions(uri: string): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        resolve({
          width,
          height,
          aspectRatio: width / height,
        });
      },
      (error) => {
        console.warn('Failed to get image dimensions:', error);
        reject(new Error('Failed to load image dimensions'));
      }
    );
  });
}

export async function getVideoDuration(uri: string): Promise<number> {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    const status = await sound.getStatusAsync();
    await sound.unloadAsync();
    
    if (status.isLoaded && status.durationMillis) {
      return status.durationMillis / 1000; // Convert to seconds
    }
    return 5; // Default fallback
  } catch (error) {
    console.warn('Failed to get video duration:', error);
    return 5; // Default fallback
  }
}

export async function getAudioDuration(uri: string): Promise<number> {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    const status = await sound.getStatusAsync();
    await sound.unloadAsync();
    
    if (status.isLoaded && status.durationMillis) {
      return status.durationMillis / 1000; // Convert to seconds
    }
    return 30; // Default fallback for audio
  } catch (error) {
    console.warn('Failed to get audio duration:', error);
    return 30; // Default fallback
  }
}

export async function generateVideoThumbnail(uri: string): Promise<{ thumbnailUrl: string; aspectRatio: number }> {
  try {
    const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 1000, // 1 second
      quality: 0.7,
    });
    
    // Get video dimensions for aspect ratio
    const dimensions = await getImageDimensions(thumbnailUri);
    
    return {
      thumbnailUrl: thumbnailUri,
      aspectRatio: dimensions.aspectRatio,
    };
  } catch (error) {
    console.warn('Failed to generate video thumbnail:', error);
    return {
      thumbnailUrl: '',
      aspectRatio: 16 / 9, // Default aspect ratio
    };
  }
}

export async function processMediaFiles(
  assets: ImagePicker.ImagePickerAsset[],
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaItem[]> {
  const processedItems: ProcessedMediaItem[] = [];
  
  const total = assets.length;
  let completed = 0;

  for (const asset of assets) {
    const fileType = getFileType(asset.uri);

    if (!fileType) {
      Alert.alert('Error', `Unsupported file type: ${asset.uri}`);
      continue;
    }

    let thumbnailUrl: string | undefined;
    let duration: number | undefined;
    let aspectRatio: number = 16 / 9; // Default fallback
    let width: number | undefined;
    let height: number | undefined;

    try {
      if (fileType === 'image') {
        const dimensions = await getImageDimensions(asset.uri);
        aspectRatio = dimensions.aspectRatio;
        width = dimensions.width;
        height = dimensions.height;
      } else if (fileType === 'video') {
        const videoResult = await generateVideoThumbnail(asset.uri);
        thumbnailUrl = videoResult.thumbnailUrl;
        aspectRatio = videoResult.aspectRatio;
        duration = await getVideoDuration(asset.uri);
        
        // Get video dimensions if available from asset
        if (asset.width && asset.height) {
          width = asset.width;
          height = asset.height;
          aspectRatio = asset.width / asset.height;
        }
      } else if (fileType === 'audio') {
        duration = await getAudioDuration(asset.uri);
        aspectRatio = 1; // Square for audio
      }

      const fileName = asset.uri.split('/').pop() || `${fileType}_${Date.now()}`;

      processedItems.push({
        name: fileName,
        type: fileType,
        uri: asset.uri,
        thumbnailUrl,
        duration,
        aspectRatio,
        width,
        height,
      });

      completed += 1;
      if (onProgress) {
        const percent = Math.round((completed / total) * 100);
        onProgress(percent);
      }
    } catch (error) {
      console.error('Error processing file:', asset.uri, error);
      Alert.alert('Error', `Failed to process ${asset.uri}`);
    }
  }

  return processedItems;
}

// Native video trimming placeholder (would need native module)
export async function trimVideo(
  uri: string,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<string> {
  // For now, return original URI
  // In a real implementation, you'd use a native module like react-native-ffmpeg
  console.warn('Video trimming not implemented - would need native module');
  return uri;
}

// Save processed media to device storage
export async function saveMediaToLibrary(uri: string, type: 'video' | 'photo'): Promise<string> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission denied');
    }

    const asset = await MediaLibrary.createAssetAsync(uri);
    return asset.uri;
  } catch (error) {
    console.error('Failed to save media to library:', error);
    throw error;
  }
}
