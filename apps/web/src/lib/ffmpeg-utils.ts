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
      // This is expected - FFmpeg will error when trying to output to null
      // The important part is that we captured the log output
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

    // Enhanced parsing for additional metadata
    const bitrateMatch = ffmpegOutput.match(/bitrate: (\d+) kb\/s/);
    const codecMatch = ffmpegOutput.match(/Video: ([^,\(]+)/);
    
    let bitrate = undefined;
    let codec = undefined;
    
    if (bitrateMatch) {
      bitrate = parseInt(bitrateMatch[1]);
    }
    
    if (codecMatch) {
      codec = codecMatch[1].trim();
    }

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