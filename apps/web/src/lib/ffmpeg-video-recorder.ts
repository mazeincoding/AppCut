import { ExportSettings } from "@/types/export";
import { encodeImagesToVideo, ImageFrame } from "@/lib/ffmpeg-utils";

export interface FFmpegVideoRecorderOptions {
  fps: number;
  settings: ExportSettings;
}

/**
 * Offline video recorder that collects PNG frames and encodes
 * them into a video using FFmpeg.wasm.
 */
export class FFmpegVideoRecorder {
  private fps: number;
  private settings: ExportSettings;
  private frames: ImageFrame[] = [];

  constructor(options: FFmpegVideoRecorderOptions) {
    this.fps = options.fps;
    this.settings = options.settings;
  }

  async startRecording(): Promise<void> {
    // FFmpeg initialization is handled by encodeImagesToVideo
    this.frames = [];
  }

  async addFrame(dataUrl: string, index: number): Promise<void> {
    const base64 = dataUrl.split(",", 2)[1];
    const data = new Uint8Array(Buffer.from(base64, "base64"));
    const name = `frame-${String(index).padStart(5, "0")}.png`;
    this.frames.push({ name, data });
  }

  async stopRecording(): Promise<Blob> {
    const blob = await encodeImagesToVideo(this.frames, {
      fps: this.fps,
      format: this.settings.format,
    });
    this.frames = [];
    return blob;
  }

  setAudioStream(_stream: MediaStream | null): void {
    // Audio not yet supported for FFmpeg path
  }

  cleanup(): void {
    this.frames = [];
  }
}

export const isFFmpegExportEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_OFFLINE_EXPORT === "true";
};
