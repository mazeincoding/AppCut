import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// Debug flag - set to false to disable console logs
const DEBUG_FFMPEG = process.env.NODE_ENV === 'development' && false;

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;
let initializationPromise: Promise<FFmpeg> | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg && isLoaded) {
    // console.log("✅ FFmpeg already initialized, reusing instance");
    return ffmpeg;
  }

  // Return existing initialization if in progress
  if (initializationPromise) {
    console.log("⏳ FFmpeg initialization already in progress, waiting...");
    return initializationPromise;
  }

  // console.log("🚀 Initializing FFmpeg.wasm...");
  
  // Start new initialization
  initializationPromise = (async () => {
    try {
      ffmpeg = new FFmpeg();
    
    // Use locally hosted files instead of CDN
    const baseURL = '/ffmpeg';
    
    // console.log("📦 Loading FFmpeg core files from:", baseURL);
    
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    
    // console.log("🔗 Core URL loaded:", coreURL.substring(0, 50) + "...");
    // console.log("🔗 WASM URL loaded:", wasmURL.substring(0, 50) + "...");
    
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });
    
    isLoaded = true;
    
    // Set up logging (if supported) - disabled by default for cleaner console
    try {
      ffmpeg.on('log', ({ message }) => {
        // Filter out excessive logging to prevent memory issues and console noise
        // Only log critical errors, warnings, or specific debug information when needed
        if (message.includes('Error') || message.includes('Warning') || message.includes('Failed')) {
          console.log('FFmpeg:', message);
        }
        // Uncomment below for full FFmpeg logging when debugging:
        // console.log('FFmpeg:', message);
      });
    } catch (e) {
      // console.log('FFmpeg logging not supported');
    }
    
    // console.log("✅ FFmpeg.wasm loaded successfully");
    return ffmpeg;
    } catch (error) {
      console.error("❌ Failed to initialize FFmpeg:", error);
      ffmpeg = null; // Reset on failure
      isLoaded = false;
      initializationPromise = null; // Reset promise on error
      throw new Error(`FFmpeg initialization failed: ${error}`);
    }
  })();
  
  return initializationPromise;
};

export const generateThumbnail = async (
  videoFile: File,
  timeInSeconds: number = 1
): Promise<string> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'thumbnail.jpg';
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  // Generate thumbnail at specific time with memory-efficient settings
  await ffmpeg.exec([
    '-i', inputName,
    '-ss', timeInSeconds.toString(),
    '-vframes', '1',
    '-vf', 'scale=160:120', // Smaller size to reduce memory usage
    '-q:v', '5', // Lower quality to reduce memory usage
    '-update', '1', // Fix for single image output
    outputName
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'image/jpeg' });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return URL.createObjectURL(blob);
};

export const trimVideo = async (
  videoFile: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';
  
  // Set up progress callback
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(progress * 100);
    });
  }
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  const duration = endTime - startTime;
  
  // Trim video
  await ffmpeg.exec([
    '-i', inputName,
    '-ss', startTime.toString(),
    '-t', duration.toString(),
    '-c', 'copy', // Use stream copy for faster processing
    outputName
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'video/mp4' });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return blob;
};

export const getVideoInfo = async (videoFile: File): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> => {
  const ffmpeg = await initFFmpeg();
  
  // Ensure FFmpeg is properly loaded
  if (!ffmpeg || !isLoaded) {
    throw new Error('FFmpeg failed to initialize properly');
  }

  const inputName = 'input.mp4';

  // Write input file
  const fileBuffer = await videoFile.arrayBuffer();
  await ffmpeg.writeFile(inputName, new Uint8Array(fileBuffer));

  // Capture FFmpeg stderr output with a one-time listener pattern
  let ffmpegOutput = '';
  let listening = true;
  const listener = (event: any) => {
    if (listening) {
      // Handle different log event structures
      const message = event.message || event.data || event;
      if (typeof message === 'string') {
        ffmpegOutput += message + '\n';
      }
    }
  };
  
  try {
    ffmpeg.on('log', listener);
  } catch (e) {
    console.warn('Could not set up FFmpeg log listener:', e);
  }

  // Run ffmpeg to get info (stderr will contain the info)
  // Note: This command is expected to "fail" but will output video info to stderr
  try {
    await ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
  } catch (error) {
    // This is expected - FFmpeg outputs info to stderr and exits with error
    // We continue processing as long as we got output
    console.log('FFmpeg info extraction completed (expected error):', error);
  }

  // Disable listener after exec completes
  listening = false;
  try {
    ffmpeg.off('log', listener);
  } catch (e) {
    console.warn('Could not remove FFmpeg log listener:', e);
  }

  // Cleanup
  await ffmpeg.deleteFile(inputName);

  // Check if we got any output
  if (!ffmpegOutput || ffmpegOutput.trim().length === 0) {
    console.error('No FFmpeg output received');
    throw new Error('Failed to extract video info. The file may be corrupted or in an unsupported format.');
  }


  // Parse output for duration, resolution, and fps
  // Example: Duration: 00:00:10.00, start: 0.000000, bitrate: 1234 kb/s
  // Example: Stream #0:0: Video: h264 (High), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 30 fps, 30 tbr, 90k tbn, 60 tbc

  const durationMatch = ffmpegOutput.match(/Duration: (\d+):(\d+):([\d.]+)/);
  let duration = 0;
  if (durationMatch) {
    const [, h, m, s] = durationMatch;
    duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
  }

  const videoStreamMatch = ffmpegOutput.match(/Video:.* (\d+)x(\d+)[^,]*, ([\d.]+) fps/);
  let width = 0, height = 0, fps = 0;
  if (videoStreamMatch) {
    width = parseInt(videoStreamMatch[1]);
    height = parseInt(videoStreamMatch[2]);
    fps = parseFloat(videoStreamMatch[3]);
  }

  return {
    duration,
    width,
    height,
    fps
  };
};

export const convertToWebM = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'output.webm';
  
  // Set up progress callback
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(progress * 100);
    });
  }
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  // Convert to WebM
  await ffmpeg.exec([
    '-i', inputName,
    '-c:v', 'libvpx-vp9',
    '-crf', '30',
    '-b:v', '0',
    '-c:a', 'libopus',
    outputName
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'video/webm' });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return blob;
};

export const extractAudio = async (
  videoFile: File,
  format: 'mp3' | 'wav' = 'mp3'
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = `output.${format}`;
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  // Extract audio
  await ffmpeg.exec([
    '-i', inputName,
    '-vn', // Disable video
    '-acodec', format === 'mp3' ? 'libmp3lame' : 'pcm_s16le',
    outputName
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: `audio/${format}` });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return blob;
};

export interface EncodeImagesOptions {
  fps: number;
  format?: 'mp4' | 'webm';
  onProgress?: (progress: number) => void;
}

export interface ImageFrame {
  /** Filename written to FFmpeg virtual FS */
  name: string;
  /** Raw PNG data */
  data: Uint8Array;
}

/**
 * Encode a sequence of PNG images into a video using FFmpeg.wasm.
 * Images should be provided in display order with zero padded
 * filenames such as frame-00001.png.
 */
export const encodeImagesToVideo = async (
  frames: ImageFrame[],
  options: EncodeImagesOptions
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  // Validate input frames
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided for video encoding');
  }

  // Validate each frame
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame.name || !frame.data || frame.data.length === 0) {
      throw new Error(`Invalid frame at index ${i}: missing name or data`);
    }
    
    // Check for reasonable frame size (prevent memory issues)
    if (frame.data.length > 50 * 1024 * 1024) { // 50MB limit per frame
      throw new Error(`Frame ${i} is too large: ${frame.data.length} bytes`);
    }
  }

  console.log(`🎬 Encoding ${frames.length} frames to video (${options.fps} fps)`);

  const format = options.format ?? 'mp4';
  const outputName = `output.${format}`;

  if (options.onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      options.onProgress!(progress * 100);
    });
  }

  try {
    // Write frames to the virtual file system with error handling
    for (const frame of frames) {
      try {
        await ffmpeg.writeFile(frame.name, frame.data);
      } catch (error) {
        console.error(`Failed to write frame ${frame.name}:`, error);
        throw new Error(`Failed to write frame ${frame.name}: ${error}`);
      }
    }

    // Use more conservative encoding settings to avoid memory issues
    const args = [
      '-r', String(options.fps),
      '-i', 'frame-%05d.png',
      '-c:v', 'libx264',
      '-preset', 'ultrafast', // Use fastest preset to reduce memory usage
      '-crf', '23', // Reasonable quality
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', // Optimize for web streaming
      '-max_muxing_queue_size', '1024', // Limit queue size
      outputName,
    ];

    console.log('🔧 FFmpeg command:', args.join(' '));
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    if (!data || data.length === 0) {
      throw new Error('FFmpeg produced empty output file');
    }

    const blob = new Blob([data], { type: `video/${format}` });
    console.log(`✅ Video encoded successfully: ${blob.size} bytes`);

    // Clean up with error handling
    try {
      for (const frame of frames) {
        await ffmpeg.deleteFile(frame.name);
      }
      await ffmpeg.deleteFile(outputName);
    } catch (cleanupError) {
      console.warn('Cleanup warning (non-fatal):', cleanupError);
    }

    return blob;
    
  } catch (error) {
    console.error('❌ Video encoding failed:', error);
    
    // Attempt cleanup on error
    try {
      for (const frame of frames) {
        await ffmpeg.deleteFile(frame.name).catch(() => {});
      }
      await ffmpeg.deleteFile(outputName).catch(() => {});
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }
    
    throw error;
  }
};

// Enhanced thumbnail generation interfaces
export interface EnhancedThumbnailOptions {
  timestamps?: number[]; // Multiple timestamps, default [1]
  resolution?: 'low' | 'medium' | 'high'; // 160x120, 320x240, 480x360
  quality?: number; // JPEG quality 0-1, default 0.8
  format?: 'jpeg' | 'png' | 'webp'; // Output format
  sceneDetection?: boolean; // Smart scene detection for better thumbnails
}

export interface EnhancedThumbnailResult {
  thumbnails: string[];
  metadata: {
    duration: number;
    dimensions: { width: number; height: number };
    fps: number;
    timestamps: number[];
  };
}

// Helper to get video duration using FFmpeg
export const getVideoDuration = async (videoFile: File): Promise<number> => {
  const info = await getVideoInfo(videoFile);
  return info.duration;
};

// Helper to get video dimensions
export const getVideoDimensions = async (videoFile: File): Promise<{ width: number; height: number }> => {
  const info = await getVideoInfo(videoFile);
  return { width: info.width, height: info.height };
};

// Helper to get video FPS
export const getVideoFPS = async (videoFile: File): Promise<number> => {
  const info = await getVideoInfo(videoFile);
  return info.fps;
};

// Fallback function to get video info using HTML5 video element
const getVideoInfoViaHTML5 = async (videoFile: File): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(videoFile);
    
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };
    
    video.addEventListener('loadedmetadata', () => {
      const videoInfo = {
        duration: video.duration || 10,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        fps: 30 // HTML5 video doesn't provide FPS, use default
      };
      
      cleanup();
      resolve(videoInfo);
    });
    
    video.addEventListener('error', (e) => {
      cleanup();
      reject(new Error(`HTML5 video loading failed: ${e}`));
    });
    
    video.src = objectUrl;
    video.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('HTML5 video info extraction timed out'));
    }, 10000);
  });
};

// Simple single-frame thumbnail generation using HTML5 Canvas
const generateSingleThumbnailViaCanvas = async (
  videoFile: File,
  timestamp: number = 1
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context unavailable'));
      return;
    }

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
      canvas.remove();
    };

    video.addEventListener('loadedmetadata', () => {
      canvas.width = 320; // Medium resolution
      canvas.height = (320 * video.videoHeight) / video.videoWidth;
      video.currentTime = Math.min(timestamp, video.duration - 0.1);
    });

    video.addEventListener('seeked', () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      cleanup();
      resolve(thumbnail);
    });

    video.addEventListener('error', () => {
      cleanup();
      reject(new Error('Video decode failed'));
    });

    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
};

// Generate thumbnails using HTML5 Canvas (more reliable than FFmpeg for simple thumbnails)
const generateThumbnailsViaCanvas = async (
  videoFile: File,
  options: EnhancedThumbnailOptions = {}
): Promise<EnhancedThumbnailResult> => {
  const {
    timestamps = [1],
    resolution = 'medium',
    quality = 0.8,
    format = 'jpeg'
  } = options;
  
  // Resolution mapping
  const resolutions = {
    low: { width: 160, height: 120 },
    medium: { width: 320, height: 240 },
    high: { width: 480, height: 360 }
  };
  
  const { width: targetWidth, height: targetHeight } = resolutions[resolution];
  
  return new Promise((resolve, reject) => {
    // Validate input file
    if (!videoFile || !(videoFile instanceof File)) {
      reject(new Error('Invalid video file provided for thumbnail generation'));
      return;
    }
    
    // Allow files with missing MIME types - they'll be inferred later
    if (videoFile.type && !videoFile.type.startsWith('video/')) {
      reject(new Error(`Invalid file type for thumbnail generation: ${videoFile.type}`));
      return;
    }
    
    // Check if file size is reasonable (not 0 bytes, not too large)
    if (videoFile.size === 0) {
      reject(new Error('Video file is empty (0 bytes)'));
      return;
    }
    
    if (videoFile.size > 500 * 1024 * 1024) { // 500MB limit
      console.warn('Large video file detected:', videoFile.size, 'bytes. This may cause performance issues.');
    }
    
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let objectUrl: string;
    try {
      objectUrl = URL.createObjectURL(videoFile);
    } catch (urlError) {
      reject(new Error(`Failed to create object URL: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`));
      return;
    }
    
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to create canvas context'));
      return;
    }
    
    const thumbnails: string[] = [];
    let currentIndex = 0;
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      URL.revokeObjectURL(objectUrl);
      video.remove();
      canvas.remove();
    };
    
    const captureFrame = () => {
      if (currentIndex >= timestamps.length) {
        // All thumbnails captured
        cleanup();
        resolve({
          thumbnails,
          metadata: {
            duration: video.duration,
            dimensions: { width: video.videoWidth, height: video.videoHeight },
            fps: 30,
            timestamps
          }
        });
        return;
      }
      
      const timestamp = timestamps[currentIndex];
      
      // Set canvas size
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = targetWidth;
      canvas.height = targetWidth / aspectRatio;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob/data URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          thumbnails.push(url);
        }
        
        currentIndex++;
        
        // Capture next frame
        if (currentIndex < timestamps.length) {
          video.currentTime = Math.min(timestamps[currentIndex], video.duration - 0.1);
        } else {
          captureFrame(); // Finish up
        }
      }, `image/${format}`, quality);
    };
    
    video.addEventListener('loadedmetadata', () => {
      if (DEBUG_FFMPEG) {
        console.log('✅ Video metadata loaded successfully', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });
      }
      
      // Set first timestamp
      if (timestamps.length > 0) {
        video.currentTime = Math.min(timestamps[0], video.duration - 0.1);
      }
    });
    
    video.addEventListener('seeked', () => {
      captureFrame();
    });
    
    video.addEventListener('error', (e) => {
      console.error('Video loading error details:', e);
      console.error('Video error state:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src,
        fileType: videoFile.type,
        fileSize: videoFile.size
      });
      cleanup();
      
      // Check for specific error types and provide helpful messages
      let errorMessage = 'Unknown error';
      if (video.error) {
        switch (video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback was aborted';
            break;
          case video.error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video';
            break;
          case video.error.MEDIA_ERR_DECODE:
            errorMessage = 'Browser cannot decode this video format (normal for some H.264 files)';
            break;
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported by browser';
            break;
          default:
            errorMessage = video.error.message || 'Unknown video error';
        }
      }
      
      reject(new Error(`Canvas thumbnail generation failed: Video loading error - ${errorMessage}`));
    });
    
    // Configure video element for thumbnail generation
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    if (DEBUG_FFMPEG) {
      console.log('🎬 Starting video load for canvas thumbnails', {
        fileType: videoFile.type,
        fileSize: videoFile.size,
        objectUrl: objectUrl.substring(0, 50) + '...'
      });
    }
    
    video.src = objectUrl;
    video.load();
    
    // Timeout after 3 seconds for faster fallback to FFmpeg
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Canvas thumbnail generation timed out - will try FFmpeg fallback'));
    }, 3000);
  });
};

// Smart scene detection helper
const detectSceneChanges = async (
  ffmpeg: FFmpeg,
  videoFile: File,
  targetCount: number = 5
): Promise<number[]> => {
  // For now, return evenly distributed timestamps
  // TODO: Implement actual scene detection using FFmpeg scene filter
  const duration = await getVideoDuration(videoFile);
  return Array.from({ length: targetCount }, (_, i) => 
    (duration / (targetCount + 1)) * (i + 1)
  );
};

// Enhanced thumbnail generation with multiple timestamps and options
export const generateEnhancedThumbnails = async (
  videoFile: File,
  options: EnhancedThumbnailOptions = {}
): Promise<EnhancedThumbnailResult> => {
  
  // Add file validation at function start
  if (!videoFile || videoFile.size === 0) {
    throw new Error('Invalid or empty video file provided for thumbnail generation');
  }

  // Validate file type - handle cases where MIME type might be missing
  if (!videoFile || !videoFile.type) {
    console.error(`Invalid file for thumbnail generation: file or MIME type is missing`, {
      fileName: videoFile?.name,
      fileType: videoFile?.type,
      fileSize: videoFile?.size
    });
    return {
      thumbnails: [],
      metadata: {
        duration: 0,
        dimensions: { width: 0, height: 0 },
        fps: 0,
        timestamps: [],
      }
    };
  }
  
  // If MIME type is empty or doesn't start with 'video/', try to infer from filename
  let fileType = videoFile.type;
  if (!fileType || !fileType.startsWith('video/')) {
    const fileName = videoFile.name.toLowerCase();
    if (fileName.endsWith('.mp4')) {
      fileType = 'video/mp4';
      // console.warn(`Missing MIME type for ${videoFile.name}, inferred as video/mp4`);
    } else if (fileName.endsWith('.webm')) {
      fileType = 'video/webm';
      // console.warn(`Missing MIME type for ${videoFile.name}, inferred as video/webm`);
    } else if (fileName.endsWith('.mov')) {
      fileType = 'video/quicktime';
      // console.warn(`Missing MIME type for ${videoFile.name}, inferred as video/quicktime`);
    } else {
      throw new Error(`Invalid file type for thumbnail generation: ${videoFile.type || 'unknown'} (filename: ${videoFile.name})`);
    }
  }

  // Always try canvas method first, fallback to FFmpeg if it fails
  const skipCanvas = false;
  
  if (!skipCanvas) {
    // Try HTML5 Canvas method first (fallback to FFmpeg if it fails)
    try {
      // Create a new File object with the correct MIME type if it was inferred
      let fileForCanvas = videoFile;
      if (fileType !== videoFile.type) {
        fileForCanvas = new File([videoFile], videoFile.name, {
          type: fileType,
          lastModified: videoFile.lastModified
        });
      }
      return await generateThumbnailsViaCanvas(fileForCanvas, options);
    } catch (canvasError) {
      console.log('⚠️ Canvas method failed, using FFmpeg fallback:', canvasError instanceof Error ? canvasError.message : String(canvasError));
    }
  } else {
    console.log('⏭️ Skipping canvas method for this video format, using FFmpeg directly');
  }
    
  // Use FFmpeg method (either as fallback or directly)
  try {
    const ffmpeg = await initFFmpeg();
    
    // Ensure FFmpeg is properly loaded
    if (!ffmpeg || !isLoaded) {
      console.error('❌ FFMPEG-UTILS: FFmpeg not properly initialized');
      throw new Error('FFmpeg failed to initialize properly');
    }
    
    // Add file accessibility test in FFmpeg section
    try {
      const testBuffer = await videoFile.arrayBuffer();
      if (testBuffer.byteLength === 0) {
        throw new Error('Video file appears to be empty');
      }
    } catch (error) {
      throw new Error('Video file is not accessible or corrupted');
    }
    
    return await generateThumbnailsInternal(ffmpeg, videoFile, options);
    
  } catch (error) {
    console.error('❌ FFMPEG-UTILS: generateEnhancedThumbnails failed:', error);
    
    // Return a safe fallback instead of crashing
    return {
      thumbnails: [],
      metadata: {
        duration: 10,
        dimensions: { width: 1920, height: 1080 },
        fps: 30,
        timestamps: []
      }
    };
  }
};

// Internal function to handle the actual thumbnail generation
const generateThumbnailsInternal = async (
  ffmpeg: FFmpeg,
  videoFile: File,
  options: EnhancedThumbnailOptions = {}
): Promise<EnhancedThumbnailResult> => {
  
  // Get video info - prioritize HTML5 method for reliability
  let videoInfo;
  
  // Try HTML5 video element first (more reliable)
  try {
    videoInfo = await getVideoInfoViaHTML5(videoFile);
  } catch (html5Error) {
    console.error('HTML5 video info extraction failed:', html5Error);
    
    // Try FFmpeg as fallback
    try {
      videoInfo = await getVideoInfo(videoFile);
    } catch (ffmpegError) {
      console.error('FFmpeg video info extraction also failed:', ffmpegError);
      // Final fallback with default values
      videoInfo = {
        duration: 10, // Default 10 seconds
        width: 1920,  // Default HD resolution
        height: 1080,
        fps: 30       // Default 30fps
      };
    }
  }
  
  // Use existing FFmpeg pipeline but generate multiple thumbnails
  const {
    timestamps = [1],
    resolution = 'medium',
    format = 'jpeg',
    sceneDetection = false,
    quality = 0.8
  } = options;
  
  // Resolution mapping
  const resolutions = {
    low: { width: 160, height: 120 },
    medium: { width: 320, height: 240 },
    high: { width: 480, height: 360 }
  };
  
  const { width, height } = resolutions[resolution];
  
  // Scene detection logic using FFmpeg scene detection
  const finalTimestamps = sceneDetection 
    ? await detectSceneChanges(ffmpeg, videoFile, timestamps.length)
    : timestamps;
  
  // Filter timestamps to be within video duration
  const validTimestamps = finalTimestamps.filter(t => t < videoInfo.duration);
  
  const inputName = 'input.mp4';
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  // Generate multiple thumbnails
  const thumbnails: string[] = [];
  
  
  for (let i = 0; i < validTimestamps.length; i++) {
    const timestamp = validTimestamps[i];
    const outputName = `thumb_${Math.floor(timestamp * 1000)}.${format}`;
    
    try {
      
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', timestamp.toString(),
        '-vframes', '1',
        '-vf', `scale=${width}:${height}`,
        '-q:v', quality === 1 ? '1' : quality === 0.8 ? '2' : '5', // Map quality to FFmpeg q:v
        '-f', format === 'jpeg' ? 'mjpeg' : format, // Use mjpeg for JPEG output
        outputName
      ]);
      
      // Check if output file exists before reading
      try {
        const thumbData = await ffmpeg.readFile(outputName);
        
        if (thumbData.length > 0) {
          const blob = new Blob([thumbData], { type: `image/${format}` });
          const objectUrl = URL.createObjectURL(blob);
          thumbnails.push(objectUrl);
        }
      } catch (readError) {
        console.error(`❌ FFMPEG-UTILS: Failed to read thumbnail file ${outputName}:`, readError);
      }
      
      // Cleanup individual thumbnail file (even if reading failed)
      try {
        await ffmpeg.deleteFile(outputName);
      } catch (deleteError) {
        console.warn(`Could not delete thumbnail file ${outputName}:`, deleteError);
      }
      
    } catch (error) {
      console.error(`❌ FFMPEG-UTILS: FFmpeg exec failed for thumbnail ${i + 1}:`, error);
      
      // Check if this is the FFmpeg abort error
      if (error && error.toString().includes('Aborted')) {
        console.error('💥 FFMPEG-UTILS: FFmpeg aborted - this might cause app instability');
        // Try to continue but break out of loop to prevent more aborts
        break;
      }
      
      // Continue with other thumbnails for other errors
      continue;
    }
  }
  
  
  // Cleanup input file
  await ffmpeg.deleteFile(inputName);
  
  
  return {
    thumbnails,
    metadata: {
      duration: videoInfo.duration,
      dimensions: { width: videoInfo.width, height: videoInfo.height },
      fps: videoInfo.fps,
      timestamps: validTimestamps
    }
  };
};

// Export the simple single-frame function for basic thumbnail needs
export const generateSimpleThumbnail = generateSingleThumbnailViaCanvas;