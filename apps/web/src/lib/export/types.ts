import { TimelineTrack } from '@/types/timeline';
import { MediaItem } from '@/stores/media-store';
import { CanvasSize } from '@/types/editor';

export interface ExportSettings {
  canvasSize: CanvasSize;
  fps: number;
  quality: 'low' | 'medium' | 'high';
  format: 'mp4' | 'webm' | 'mov';
  backgroundColor?: string;
}

export interface ExportProject {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  settings: ExportSettings;
  duration: number;
}

export interface ExportProgress {
  phase: 'initializing' | 'processing' | 'rendering' | 'finalizing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  logs: string[];
}

export interface FilterResult {
  videoFilters: string[];
  audioFilters: string[];
  inputCount: number;
  videoLayerCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}