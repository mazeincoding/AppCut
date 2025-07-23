import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) {
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

  const inputName = 'input.mp4';

  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));

  // Capture FFmpeg stderr output with a one-time listener pattern
  let ffmpegOutput = '';
  let listening = true;
  const listener = (data: string) => {
    if (listening) ffmpegOutput += data;
  };
  ffmpeg.on('log', ({ message }) => listener(message));

  // Run ffmpeg to get info (stderr will contain the info)
  try {
    await ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
  } catch (error) {
    listening = false;
    await ffmpeg.deleteFile(inputName);
    console.error('FFmpeg execution failed:', error);
    throw new Error('Failed to extract video info. The file may be corrupted or in an unsupported format.');
  }

  // Disable listener after exec completes
  listening = false;

  // Cleanup
  await ffmpeg.deleteFile(inputName);

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
  const ffmpeg = await initFFmpeg();
  
  // Get video info first
  const videoInfo = await getVideoInfo(videoFile);
  
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
  
  for (const timestamp of validTimestamps) {
    const outputName = `thumb_${Math.floor(timestamp * 1000)}.${format}`;
    
    await ffmpeg.exec([
      '-i', inputName,
      '-ss', timestamp.toString(),
      '-vframes', '1',
      '-vf', `scale=${width}:${height}`,
      '-q:v', quality === 1 ? '1' : quality === 0.8 ? '2' : '5', // Map quality to FFmpeg q:v
      '-f', format === 'jpeg' ? 'mjpeg' : format, // Use mjpeg for JPEG output
      outputName
    ]);
    
    const thumbData = await ffmpeg.readFile(outputName);
    const blob = new Blob([thumbData], { type: `image/${format}` });
    thumbnails.push(URL.createObjectURL(blob));
    
    // Cleanup individual thumbnail file
    await ffmpeg.deleteFile(outputName);
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