import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg && isLoaded) {
    console.log("✅ FFmpeg already initialized, reusing instance");
    return ffmpeg;
  }

  console.log("🚀 Initializing FFmpeg.wasm...");
  
  try {
    ffmpeg = new FFmpeg();
    
    // Use locally hosted files instead of CDN
    const baseURL = '/ffmpeg';
    
    console.log("📦 Loading FFmpeg core files from:", baseURL);
    
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    
    console.log("🔗 Core URL loaded:", coreURL.substring(0, 50) + "...");
    console.log("🔗 WASM URL loaded:", wasmURL.substring(0, 50) + "...");
    
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });
    
    isLoaded = true;
    
    // Set up logging (if supported)
    try {
      ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });
    } catch (e) {
      console.log('FFmpeg logging not supported');
    }
    
    console.log("✅ FFmpeg.wasm loaded successfully");
    return ffmpeg;
  } catch (error) {
    console.error("❌ Failed to initialize FFmpeg:", error);
    ffmpeg = null; // Reset on failure
    isLoaded = false;
    throw new Error(`FFmpeg initialization failed: ${error}`);
  }
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
  console.log('Writing video file to FFmpeg:', videoFile.name, 'Size:', videoFile.size);
  const fileBuffer = await videoFile.arrayBuffer();
  console.log('File buffer size:', fileBuffer.byteLength);
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
        console.log('FFmpeg log captured:', message);
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

  console.log('FFmpeg output for parsing:', ffmpegOutput);

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

  const format = options.format ?? 'mp4';
  const outputName = `output.${format}`;

  if (options.onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      options.onProgress!(progress * 100);
    });
  }

  // Write frames to the virtual file system
  for (const frame of frames) {
    await ffmpeg.writeFile(frame.name, frame.data);
  }

  const args = [
    '-r', String(options.fps),
    '-i', 'frame-%05d.png',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    outputName,
  ];

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: `video/${format}` });

  // Clean up
  for (const frame of frames) {
    await ffmpeg.deleteFile(frame.name);
  }
  await ffmpeg.deleteFile(outputName);

  return blob;
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
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const objectUrl = URL.createObjectURL(videoFile);
    
    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }
    
    const thumbnails: string[] = [];
    let currentIndex = 0;
    
    const cleanup = () => {
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
      console.log(`🎨 Canvas: Capturing thumbnail ${currentIndex + 1}/${timestamps.length} at ${timestamp}s`);
      
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
          console.log(`✅ Canvas: Thumbnail ${currentIndex + 1} captured successfully`);
        } else {
          console.warn(`⚠️ Canvas: Failed to create thumbnail ${currentIndex + 1}`);
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
      console.log('🎬 Canvas: Video metadata loaded:', {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
      
      // Set first timestamp
      if (timestamps.length > 0) {
        video.currentTime = Math.min(timestamps[0], video.duration - 0.1);
      }
    });
    
    video.addEventListener('seeked', () => {
      captureFrame();
    });
    
    video.addEventListener('error', (e) => {
      cleanup();
      reject(new Error(`Canvas thumbnail generation failed: Video loading error`));
    });
    
    video.src = objectUrl;
    video.load();
    
    // Timeout after 30 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('Canvas thumbnail generation timed out'));
    }, 30000);
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
  console.log('🎬 FFMPEG-UTILS: generateEnhancedThumbnails called with:', {
    fileName: videoFile.name,
    fileSize: videoFile.size,
    options
  });
  
  // Try HTML5 Canvas method first (more reliable for thumbnails)
  try {
    console.log('🎨 Attempting HTML5 Canvas thumbnail generation...');
    return await generateThumbnailsViaCanvas(videoFile, options);
  } catch (canvasError) {
    console.error('❌ Canvas thumbnail generation failed:', canvasError);
    
    // Try FFmpeg as fallback
    try {
      const ffmpeg = await initFFmpeg();
      
      // Ensure FFmpeg is properly loaded
      if (!ffmpeg || !isLoaded) {
        console.error('❌ FFMPEG-UTILS: FFmpeg not properly initialized');
        throw new Error('FFmpeg failed to initialize properly');
      }
      
      console.log('✅ FFMPEG-UTILS: FFmpeg initialized successfully');
      
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
  console.log('Attempting to get video info via HTML5 video element...');
  try {
    videoInfo = await getVideoInfoViaHTML5(videoFile);
    console.log('Video info extracted successfully via HTML5:', videoInfo);
  } catch (html5Error) {
    console.error('HTML5 video info extraction failed:', html5Error);
    
    // Try FFmpeg as fallback
    console.log('Attempting to get video info via FFmpeg...');
    try {
      videoInfo = await getVideoInfo(videoFile);
      console.log('Video info extracted successfully via FFmpeg:', videoInfo);
    } catch (ffmpegError) {
      console.error('FFmpeg video info extraction also failed:', ffmpegError);
      // Final fallback with default values
      console.log('Using default video info values...');
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
  
  console.log('🎬 FFMPEG-UTILS: Starting thumbnail generation loop for', validTimestamps.length, 'timestamps');
  
  for (let i = 0; i < validTimestamps.length; i++) {
    const timestamp = validTimestamps[i];
    const outputName = `thumb_${Math.floor(timestamp * 1000)}.${format}`;
    
    console.log(`🎬 FFMPEG-UTILS: Generating thumbnail ${i + 1}/${validTimestamps.length} at ${timestamp}s`);
    
    try {
      console.log(`🎬 FFMPEG-UTILS: Executing FFmpeg command for thumbnail ${i + 1}`);
      
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', timestamp.toString(),
        '-vframes', '1',
        '-vf', `scale=${width}:${height}`,
        '-q:v', quality === 1 ? '1' : quality === 0.8 ? '2' : '5', // Map quality to FFmpeg q:v
        '-f', format === 'jpeg' ? 'mjpeg' : format, // Use mjpeg for JPEG output
        outputName
      ]);
      
      console.log(`✅ FFMPEG-UTILS: FFmpeg exec completed for thumbnail ${i + 1}`);
      
      // Check if output file exists before reading
      try {
        const thumbData = await ffmpeg.readFile(outputName);
        console.log(`📁 FFMPEG-UTILS: Read thumbnail data:`, thumbData.length, 'bytes');
        
        if (thumbData.length > 0) {
          const blob = new Blob([thumbData], { type: `image/${format}` });
          const objectUrl = URL.createObjectURL(blob);
          thumbnails.push(objectUrl);
          
          console.log(`🔗 FFMPEG-UTILS: Created object URL for thumbnail ${i + 1}:`, objectUrl.substring(0, 50) + '...');
        } else {
          console.warn(`⚠️ FFMPEG-UTILS: Thumbnail ${i + 1} has no data`);
        }
      } catch (readError) {
        console.error(`❌ FFMPEG-UTILS: Failed to read thumbnail file ${outputName}:`, readError);
      }
      
      // Cleanup individual thumbnail file (even if reading failed)
      try {
        await ffmpeg.deleteFile(outputName);
        console.log(`🗑️ FFMPEG-UTILS: Cleaned up thumbnail file ${outputName}`);
      } catch (deleteError) {
        console.warn(`⚠️ FFMPEG-UTILS: Could not delete thumbnail file ${outputName}:`, deleteError);
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
  
  console.log('🎬 FFMPEG-UTILS: Completed thumbnail generation loop. Generated:', thumbnails.length, 'thumbnails');
  
  // Cleanup input file
  await ffmpeg.deleteFile(inputName);
  
  console.log('🎬 FFMPEG-UTILS: Returning enhanced thumbnails result:', {
    thumbnailCount: thumbnails.length,
    videoDuration: videoInfo.duration,
    timestampCount: validTimestamps.length
  });
  
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