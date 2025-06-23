import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  // Use locally hosted files instead of CDN
  const baseURL = '/ffmpeg';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
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
  
  // Generate thumbnail at specific time
  await ffmpeg.exec([
    '-i', inputName,
    '-ss', timeInSeconds.toString(),
    '-vframes', '1',
    '-vf', 'scale=320:240',
    '-q:v', '2',
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
  bitrate?: number;
  codec?: string;
}> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  
  try {
    // Write input file
    await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
    
    // Get video info using ffprobe-like functionality
    let output = '';
    ffmpeg.on('log', ({ message }) => {
      output += message + '\n';
    });
    
    // Run ffmpeg with probe-like options to get video information
    await ffmpeg.exec([
      '-i', inputName,
      '-f', 'null', 
      '-'
    ]);
    
    // Parse the output for video information
    const videoInfoMatch = output.match(/Stream #\d+:\d+.*Video: (.+?), (\d+)x(\d+).*?(\d+(?:\.\d+)?) fps/);
    const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
    
    let width = 1920, height = 1080, fps = 30, duration = 0;
    let codec = '', bitrate = 0;
    
    if (videoInfoMatch) {
      codec = videoInfoMatch[1].split(',')[0].trim();
      width = parseInt(videoInfoMatch[2]);
      height = parseInt(videoInfoMatch[3]);
      fps = parseFloat(videoInfoMatch[4]);
    }
    
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }
    
    if (bitrateMatch) {
      bitrate = parseInt(bitrateMatch[1]);
    }
    
    // Cleanup
    await ffmpeg.deleteFile(inputName);
    
    return {
      duration,
      width,
      height,
      fps,
      bitrate,
      codec,
    };
  } catch (error) {
    // Cleanup on error
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // Ignore cleanup errors
    }
    
    // Return fallback values if FFmpeg fails
    console.warn('FFmpeg video info extraction failed, using HTML5 video element as fallback');
    
    // Fallback to HTML5 video element for basic info
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.addEventListener('loadedmetadata', () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fps: 30, // Default fps when not available
        });
        video.remove();
      });
      
      video.addEventListener('error', () => {
        reject(new Error('Could not extract video info'));
        video.remove();
      });
      
      video.src = URL.createObjectURL(videoFile);
      video.load();
    });
  }
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