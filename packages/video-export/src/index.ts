// Main API exports
export { VideoExporter, isWebCodecsSupported, getExportPresets } from './api/video-exporter';

// Core engine exports
export { VideoExportEngine } from './core/video-export-engine';
export { FrameRenderer } from './core/frame-renderer';
export { AudioProcessor } from './core/audio-processor';
export { ConfigGenerator } from './core/config-generator';
export { StreamTarget } from './core/stream-target';

// Utilities
export { TimelineDataTransformer } from './utils/timeline-transformer';
export { debugLogger } from './utils/debug-logger';

// Types
export type {
  ExportSettings,
  ExportProgress,
  TimelineExportData,
  ExportTrack,
  ExportElement,
  MediaExportElement,
  TextExportElement,
  RenderFrame,
  EncoderConfig,
  ExportEventMap
} from './types';

export type { OpenCutExportOptions } from './api/video-exporter';

// Pipeline system exports
export { RenderPipeline } from './pipeline/pipeline';
export type { PipelineProcessor, EffectProcessor, TransitionProcessor } from './pipeline/pipeline';
export { BaseEffect, BlurEffect, BrightnessEffect, ColorFilterEffect } from './pipeline/effects/base-effect';
export { BaseTransition, FadeTransition, SlideTransition, WipeTransition } from './pipeline/transitions/base-transition';