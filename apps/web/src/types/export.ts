export enum ExportFormat {
  MP4 = "mp4",
  WEBM = "webm",
  MOV = "mov"
}

export enum ExportQuality {
  HIGH = "1080p",
  MEDIUM = "720p",
  LOW = "480p"
}

export interface ExportSettings {
  format: ExportFormat;
  quality: ExportQuality;
  filename: string;
  width: number;
  height: number;
}

export interface ExportProgress {
  isExporting: boolean;
  progress: number; // 0-100
  currentFrame: number;
  totalFrames: number;
  estimatedTimeRemaining: number; // seconds
  status: string;
}

export interface ExportState {
  settings: ExportSettings;
  progress: ExportProgress;
  error: string | null;
}