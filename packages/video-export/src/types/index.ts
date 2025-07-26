// Common type definitions
/** Canvas blend mode operations for compositing elements */
export type BlendMode = 
  | 'source-over'     // Default - new elements drawn on top
  | 'multiply'        // Multiply colors (darker result)
  | 'screen'          // Screen colors (lighter result)
  | 'overlay'         // Overlay blend (high contrast)
  | 'darken'          // Keep darker color
  | 'lighten'         // Keep lighter color
  | 'color-dodge'     // Brighten background to reflect foreground
  | 'color-burn'      // Darken background to reflect foreground
  | 'hard-light'      // Hard light blend
  | 'soft-light'      // Soft light blend
  | 'difference'      // Subtract colors
  | 'exclusion';      // Exclusion blend

/** Available element types in the export system */
export type ElementType = 
  | 'media'           // Video, image, or audio content
  | 'text'            // Text overlays with styling
  | 'effect'          // Visual effects applied to content
  | 'overlay'         // Image/shape overlays
  | 'subtitle';       // Professional subtitle rendering

/** Available track types for timeline organization */
export type TrackType = 
  | 'media'           // Main media content (video/images)
  | 'text'            // Text elements and titles
  | 'audio'           // Audio tracks and music
  | 'effect'          // Effect application tracks
  | 'overlay'         // Overlay element tracks
  | 'subtitle';       // Subtitle and caption tracks

/** Text alignment options */
export type TextAlign = 'left' | 'center' | 'right';

/** Font weight options */
export type FontWeight = 'normal' | 'bold';

/** Font style options */
export type FontStyle = 'normal' | 'italic';

/** Text decoration options */
export type TextDecoration = 'none' | 'underline' | 'line-through';

/** Media types supported by media elements */
export type MediaType = 'video' | 'image' | 'audio';

/** Subtitle position presets */
export type SubtitlePosition = 'bottom' | 'top' | 'center' | 'custom';

/** Overlay content types */
export type OverlayType = 'image' | 'shape' | 'pattern';

export interface ExportSettings {
  /** Output resolution multiplier (1 = 1080p, 2 = 4K, 0.67 = 720p) */
  resolution: number;
  
  /** Output frame rate in frames per second */
  fps: number;
  
  /** Video bitrate in bits per second */
  videoBitrate: number;
  
  /** Audio sample rate in Hz (typically 48000 or 44100) */
  sampleRate: number;
  
  /** Number of audio channels (1 = mono, 2 = stereo) */
  numberOfChannels: number;
  
  /** Audio bitrate in bits per second */
  audioBitrate: number;
  
  /** Canvas width in pixels */
  width: number;
  
  /** Canvas height in pixels */
  height: number;
  
  /** Background color for canvas (hex color) */
  backgroundColor: string;
  
  /** Enable hardware acceleration for encoding */
  hardwareAcceleration: boolean;
  
  /** Output filename with extension */
  fileName: string;
}

export interface ExportProgress {
  /** Current frame being processed */
  currentFrame: number;
  
  /** Total frames to process */
  totalFrames: number;
  
  /** Progress percentage (0-100) */
  percentage: number;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  
  /** Human-readable formatted time remaining (e.g., "2m 45s") */
  formattedTimeRemaining?: string;
  
  /** Current render speed (e.g., "24.5 fps") */
  renderSpeed?: string;
  
  /** Current processing stage */
  stage: 'initializing' | 'processing' | 'finalizing' | 'complete' | 'error';
  
  /** Any error message */
  error?: string;
  
  /** Render performance statistics */
  renderStats?: {
    avgRenderTime: number;
    avgEncodeTime: number;
    currentFps: number;
    totalElapsed: number;
  };
}

export interface TimelineExportData {
  /** Timeline tracks with their elements */
  tracks: ExportTrack[];
  
  /** Total duration in seconds */
  duration: number;
  
  /** Project settings */
  settings: {
    width: number;
    height: number;
    fps: number;
  };
}

/** Timeline track containing elements of the same type */
export interface ExportTrack {
  /** Unique track identifier */
  id: string;
  
  /** Human-readable track name */
  name: string;
  
  /** Track type determining what elements it can contain */
  type: TrackType;
  
  /** Array of elements in this track */
  elements: ExportElement[];
  
  /** Whether this track is muted (not rendered) */
  muted: boolean;
  
  /** Track opacity (0-1, optional, defaults to 1) */
  opacity?: number;
  
  /** Blend mode for compositing this track */
  blendMode?: BlendMode;
  
  /** Array of effect IDs applied to this entire track */
  effects?: string[];
}

/** Base interface for all timeline elements */
export interface BaseExportElement {
  /** Unique element identifier */
  id: string;
  
  /** Human-readable element name */
  name: string;
  
  /** Element type determining its behavior */
  type: ElementType;
  
  /** Start time in seconds on the timeline */
  startTime: number;
  
  /** Duration in seconds */
  duration: number;
  
  /** Time trimmed from the beginning (seconds) */
  trimStart: number;
  
  /** Time trimmed from the end (seconds) */
  trimEnd: number;
  
  /** Element opacity (0-1, optional, defaults to 1) */
  opacity?: number;
  
  /** Blend mode for compositing this element */
  blendMode?: BlendMode;
}

/** Media element for video, image, or audio content */
export interface MediaExportElement extends BaseExportElement {
  type: 'media';
  
  /** Unique identifier for the media asset */
  mediaId: string;
  
  /** Type of media content */
  mediaType: MediaType;
  
  /** File object if media is uploaded */
  file?: File;
  
  /** URL if media is referenced externally */
  url?: string;
  
  /** Media width in pixels (for video/images) */
  width?: number;
  
  /** Media height in pixels (for video/images) */
  height?: number;
}

/** Text element for styled text overlays */
export interface TextExportElement extends BaseExportElement {
  type: 'text';
  
  /** Text content to display */
  content: string;
  
  /** Font size in pixels */
  fontSize: number;
  
  /** Font family name */
  fontFamily: string;
  
  /** Text color (hex, rgb, named color) */
  color: string;
  
  /** Background color ('transparent' for none) */
  backgroundColor: string;
  
  /** Text alignment */
  textAlign: TextAlign;
  
  /** Font weight */
  fontWeight: FontWeight;
  
  /** Font style */
  fontStyle: FontStyle;
  
  /** Text decoration */
  textDecoration: TextDecoration;
  
  /** X position relative to canvas center */
  x: number;
  
  /** Y position relative to canvas center */
  y: number;
  
  /** Rotation in degrees */
  rotation: number;
  
  /** Text opacity (0-1) */
  opacity: number;
}

/** Effect element for applying visual effects */
export interface EffectExportElement extends BaseExportElement {
  type: 'effect';
  
  /** Type of effect (e.g., 'blur', 'brightness', 'colorFilter') */
  effectType: string;
  
  /** Effect-specific parameters */
  parameters: Record<string, any>;
}

/** Overlay element for shapes, images, and patterns */
export interface OverlayExportElement extends BaseExportElement {
  type: 'overlay';
  
  /** Type of overlay content */
  overlayType: OverlayType;
  
  /** Source URL or data for overlay content */
  source?: string;
  
  /** X position in pixels */
  x: number;
  
  /** Y position in pixels */
  y: number;
  
  /** Width in pixels */
  width: number;
  
  /** Height in pixels */
  height: number;
  
  /** Rotation in degrees */
  rotation: number;
}

/** Subtitle element for professional subtitle rendering */
export interface SubtitleExportElement extends BaseExportElement {
  type: 'subtitle';
  
  /** Subtitle text content */
  content: string;
  
  /** Font size in pixels */
  fontSize: number;
  
  /** Font family name */
  fontFamily: string;
  
  /** Text color */
  color: string;
  
  /** Background color ('transparent' for none) */
  backgroundColor: string;
  
  /** Subtitle position preset */
  position: SubtitlePosition;
  
  /** Custom X position (when position is 'custom') */
  x?: number;
  
  /** Custom Y position (when position is 'custom') */
  y?: number;
  
  /** Text alignment */
  alignment: TextAlign;
}

export type ExportElement = MediaExportElement | TextExportElement | EffectExportElement | OverlayExportElement | SubtitleExportElement;

export interface RenderFrame {
  /** Frame number */
  frameNumber: number;
  
  /** Timestamp in seconds */
  timestamp: number;
  
  /** Canvas context for this frame */
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

export interface EncoderConfig {
  video: VideoEncoderConfig;
  audio?: AudioEncoderConfig;
}

export interface ExportEventMap {
  'progress': ExportProgress;
  'complete': string; // file path/url
  'error': Error;
  'abort': void;
}