# @opencut/video-export

WebCodecs-based video export engine for OpenCut video editor.

Note: Document written by LLM to help agents understand OpenCut's video export system.

## Features

- 🚀 **Hardware-accelerated encoding** using WebCodecs API
- 🎬 **Timeline-based export** supporting media, text, audio, effects, overlays, and subtitles
- 🎨 **Modular pipeline system** for effects, transitions, and custom processors
- 🔧 **Flexible configuration** with quality presets
- 📱 **Browser-native** - no external dependencies except mp4-muxer
- 🎯 **Type-safe** TypeScript implementation
- 📊 **Progress tracking** with detailed export progress
- 🔌 **Extensible architecture** for adding new track types and effects

## Usage

### Basic Export

```typescript
import { VideoExporter } from '@opencut/video-export';

const exporter = new VideoExporter();

// Export timeline to MP4
const result = await exporter.exportTimeline(
  timelineTracks,    // From timeline store
  mediaItems,        // From media store  
  projectSettings,   // Canvas size, fps
  {
    fileName: 'my-video.mp4',
    resolution: 1,     // 1080p
    onProgress: (progress) => {
      console.log(`Export progress: ${progress.percentage}%`);
    }
  }
);

console.log('Export complete:', result);
```

### Using Presets

```typescript
import { VideoExporter, getExportPresets } from '@opencut/video-export';

const presets = getExportPresets();

// Export with 720p medium quality preset
await exporter.exportTimeline(
  timelineTracks,
  mediaItems,
  projectSettings,
  {
    ...presets['720p_medium'],
    fileName: 'output.mp4'
  }
);
```

### Browser Support Check

```typescript
import { isWebCodecsSupported } from '@opencut/video-export';

if (!isWebCodecsSupported()) {
  alert('Your browser does not support WebCodecs-based video export');
}
```

## API Reference

### VideoExporter

Main export class for converting OpenCut timelines to MP4 videos.

#### Methods

- `exportTimeline(tracks, mediaItems, settings, options)` - Export timeline to video
- `abort()` - Cancel current export
- `static isSupported()` - Check WebCodecs support
- `static getPresets()` - Get available quality presets

### Export Options

```typescript
interface OpenCutExportOptions {
  fileName?: string;              // Output filename
  resolution?: number;            // Resolution multiplier (1=1080p, 2=4K)
  fps?: number;                   // Output framerate
  videoBitrate?: number;          // Video bitrate in Mbps
  audioBitrate?: number;          // Audio bitrate in kbps
  hardwareAcceleration?: boolean; // Enable hardware acceleration
  onProgress?: (progress) => void;
  onComplete?: (filePath) => void;
  onError?: (error) => void;
}
```

### Available Presets

- `1080p_high` - 1080p @ 10 Mbps
- `1080p_medium` - 1080p @ 5 Mbps
- `1080p_low` - 1080p @ 2.5 Mbps
- `720p_high` - 720p @ 5 Mbps
- `720p_medium` - 720p @ 2.5 Mbps
- `4k_high` - 4K @ 40 Mbps
- `4k_medium` - 4K @ 20 Mbps

## Architecture Overview

### API Layers

The package provides three levels of API access:

#### 1. High-Level API (`src/api/video-exporter.ts`)
```typescript
import { VideoExporter } from '@opencut/video-export';

// Simple, opinionated export for most use cases
const exporter = new VideoExporter();
await exporter.exportTimeline(tracks, mediaItems, settings, options);
```

#### 2. Core API (`src/core/`)
```typescript
import { 
  VideoExportEngine, 
  FrameRenderer, 
  ConfigGenerator 
} from '@opencut/video-export';

// Direct access to core components for custom workflows
const engine = new VideoExportEngine(timelineData, settings);
await engine.export();
```

#### 3. Component API (`src/core/renderers/`)
```typescript
import { 
  MediaElementRenderer,
  TextElementRenderer,
  BaseElementRenderer 
} from '@opencut/video-export';

// Direct renderer access for custom implementations
const mediaRenderer = new MediaElementRenderer(settings, context);
```

### Modular Renderer System

The export framework uses a modular renderer architecture where each element type has its own dedicated renderer:

```typescript
// Built-in renderers in src/core/renderers/
import { 
  BaseElementRenderer,     // Abstract base class
  MediaElementRenderer,    // Handles video, image, and audio
  TextElementRenderer,     // Handles styled text overlays  
  OverlayElementRenderer,  // Handles shapes, images, patterns
  SubtitleElementRenderer  // Handles professional subtitles
} from '@opencut/video-export';
```

### BaseElementRenderer API

Located in `src/core/renderers/base-renderer.ts`, provides:

```typescript
abstract class BaseElementRenderer<T extends ExportElement> {
  // Abstract method each renderer must implement
  abstract render(element: T, timestamp: number): Promise<void>;
  
  // Helper methods available to all renderers
  protected applyElementProperties(element: T): void;
  protected restoreContext(): void;
  protected isElementActive(element: T, timestamp: number): boolean;
  protected getElementTime(element: T, timestamp: number): number;
  
  // Cleanup method
  dispose(): void;
}
```

### Type System

Located in `src/types/index.ts`, provides comprehensive TypeScript definitions:

```typescript
// Common types with detailed documentation
export type BlendMode = 'source-over' | 'multiply' | 'screen' | ...;
export type ElementType = 'media' | 'text' | 'effect' | 'overlay' | 'subtitle';
export type TrackType = 'media' | 'text' | 'audio' | 'effect' | 'overlay' | 'subtitle';

// Well-documented interfaces
export interface ExportSettings { /* ... */ }
export interface ExportTrack { /* ... */ }
export interface BaseExportElement { /* ... */ }
```

### Core Classes

#### VideoExportEngine (`src/core/video-export-engine.ts`)
Main export orchestrator that handles:
- WebCodecs encoder initialization and configuration
- Frame processing loop with precise timing
- Audio processing coordination
- Progress tracking and event emission

#### FrameRenderer (`src/core/frame-renderer.ts`) 
Manages frame composition by:
- Coordinating multiple element renderers
- Managing the rendering pipeline for effects/transitions
- Handling element sorting and active time calculations
- Providing canvas context to renderers

#### ConfigGenerator (`src/core/config-generator.ts`)
Handles codec configuration by:
- Testing browser support for different codecs
- Providing fallback codec options
- Optimizing encoder settings for performance
- Validating export settings

#### StreamTarget (`src/core/stream-target.ts`)
Manages output file creation with:
- File System Access API support
- Download fallback for unsupported browsers
- mp4-muxer Target integration
- File handling and cleanup

## Pipeline System

The video export framework features a modular pipeline system (`src/pipeline/`) that allows you to add effects, transitions, and custom processors to the rendering process.

### Using the Pipeline

```typescript
import { 
  VideoExporter, 
  BlurEffect, 
  FadeTransition,
  RenderPipeline 
} from '@opencut/video-export';

const exporter = new VideoExporter();

// Access the pipeline through the frame renderer
await exporter.exportTimeline(tracks, mediaItems, settings, {
  fileName: 'output.mp4',
  onProgress: (progress) => {
    // Get pipeline access during export if needed
    console.log('Export progress:', progress);
  }
});
```

### Built-in Effects (TODO: Add to Editor UI)

#### Blur Effect
```typescript
import { BlurEffect } from '@opencut/video-export';

const blurEffect = new BlurEffect('blur-1', 5); // 5px blur radius
// Effect will be applied through the pipeline system
```

#### Brightness Effect
```typescript
import { BrightnessEffect } from '@opencut/video-export';

const brightnessEffect = new BrightnessEffect('brightness-1', 1.2); // 20% brighter
```

#### Color Filter Effect
```typescript
import { ColorFilterEffect } from '@opencut/video-export';

const colorEffect = new ColorFilterEffect('color-1', 30, 1.2, 1.1); 
// 30° hue shift, 20% more saturation, 10% brighter
```

### Built-in Transitions (TODO: Add to Editor UI)

#### Fade Transition
```typescript
import { FadeTransition } from '@opencut/video-export';

const fadeIn = new FadeTransition('fade-in', 1.0, 'in'); // 1 second fade in
const fadeOut = new FadeTransition('fade-out', 1.0, 'out'); // 1 second fade out
```

#### Slide Transition
```typescript
import { SlideTransition } from '@opencut/video-export';

const slideLeft = new SlideTransition('slide-1', 0.5, 'left'); // 0.5s slide left
```

#### Wipe Transition
```typescript
import { WipeTransition } from '@opencut/video-export';

const wipeHorizontal = new WipeTransition('wipe-1', 1.0, 'horizontal');
```

## Creating Custom Effects

### Custom Effect Class

```typescript
import { BaseEffect } from '@opencut/video-export';
import type { RenderFrame, ExportSettings } from '@opencut/video-export';

export class GrayscaleEffect extends BaseEffect {
  constructor(id: string) {
    super(id, 'Grayscale Effect');
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    // Apply grayscale filter
    frame.context.save();
    frame.context.filter = 'grayscale(100%)';
    
    // Create temporary canvas for filter application
    const tempCanvas = frame.canvas.cloneNode() as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d')!;
    tempContext.drawImage(frame.canvas, 0, 0);
    
    // Clear and redraw with filter
    frame.context.clearRect(0, 0, frame.canvas.width, frame.canvas.height);
    frame.context.drawImage(tempCanvas, 0, 0);
    frame.context.restore();

    return frame;
  }
}
```

### Custom Transition Class

```typescript
import { BaseTransition } from '@opencut/video-export';
import type { RenderFrame, ExportSettings } from '@opencut/video-export';

export class CircleWipeTransition extends BaseTransition {
  constructor(id: string, duration: number) {
    super(id, 'Circle Wipe Transition', duration);
  }

  async process(frame: RenderFrame, settings: ExportSettings, timestamp: number): Promise<RenderFrame> {
    if (this.progress === 0) return frame;

    const centerX = frame.canvas.width / 2;
    const centerY = frame.canvas.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const currentRadius = maxRadius * (1 - this.progress);

    // Create circular mask
    frame.context.save();
    frame.context.beginPath();
    frame.context.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    frame.context.clip();
    
    // Only the area inside the circle will be drawn
    // Content outside will be clipped
    frame.context.restore();

    return frame;
  }
}
```

## Adding New Track Types

### Define New Element Type

```typescript
// In your types extension
export interface CustomExportElement extends BaseExportElement {
  type: 'custom';
  customProperty: string;
  customData: any;
}

// Extend the main ExportElement union
export type ExtendedExportElement = ExportElement | CustomExportElement;
```

### Extend Track Types

```typescript
import type { ExportTrack, TrackType } from '@opencut/video-export';

// Extend track types to support your custom track
export interface ExtendedExportTrack extends ExportTrack {
  type: TrackType | 'custom';
  customSettings?: {
    // Your custom track properties
    specialMode?: boolean;
    customParameter?: number;
  };
}
```

### Add Custom Element Renderer

The modular renderer system (`src/core/renderers/`) makes it easy to add new element types:

```typescript
// Import the base renderer class
import { BaseElementRenderer } from '@opencut/video-export';
import type { ExportSettings, BaseExportElement } from '@opencut/video-export';

// Define your custom element type
export interface CustomExportElement extends BaseExportElement {
  type: 'custom';
  customProperty: string;
  customData: any;
}

// Create a custom renderer
export class CustomElementRenderer extends BaseElementRenderer<CustomExportElement> {
  async render(element: CustomExportElement, timestamp: number): Promise<void> {
    if (!this.isElementActive(element, timestamp)) {
      return;
    }

    this.applyElementProperties(element);

    try {
      // Your custom rendering logic here
      this.context.fillStyle = 'purple';
      this.context.fillRect(
        element.x - 50, 
        element.y - 25, 
        100, 
        50
      );
      
      // Add text or other custom content
      this.context.fillStyle = 'white';
      this.context.font = '16px Arial';
      this.context.textAlign = 'center';
      this.context.fillText(
        element.customProperty, 
        element.x, 
        element.y
      );
    } catch (error) {
      console.warn('Failed to render custom element:', error);
    }

    this.restoreContext();
  }
}
```

### Integrate Custom Renderer

Extend the main FrameRenderer (`src/core/frame-renderer.ts`) to use your custom renderer:

```typescript
import { FrameRenderer } from '@opencut/video-export';
import type { TimelineExportData } from '@opencut/video-export';

// Extend the main FrameRenderer to use your custom renderer
class ExtendedFrameRenderer extends FrameRenderer {
  private customRenderer: CustomElementRenderer;

  constructor(settings: ExportSettings) {
    super(settings);
    this.customRenderer = new CustomElementRenderer(settings, this.context);
  }

  async renderFrame(timelineData: TimelineExportData, timestamp: number, frameNumber: number) {
    // Call parent render first
    const frame = await super.renderFrame(timelineData, timestamp, frameNumber);
    
    // Then render custom elements
    for (const track of timelineData.tracks) {
      if (track.type === 'custom') {
        for (const element of track.elements) {
          if (element.type === 'custom') {
            await this.customRenderer.render(element as CustomExportElement, timestamp);
          }
        }
      }
    }

    return frame;
  }

  dispose() {
    super.dispose();
    this.customRenderer.dispose();
  }
}
```

## Supported Elements

### Media Elements
- ✅ Video files (H.264, WebM)
- ✅ Image files (JPEG, PNG, GIF)
- ✅ Audio files (MP3, WAV, AAC)

### Text Elements
- ✅ Custom fonts and sizes
- ✅ Colors and backgrounds
- ✅ Positioning and rotation
- ✅ Opacity and styling

### Effect Elements
- ✅ Blur, brightness, color filters
- ✅ Custom effect processors
- ✅ Timeline-based effect application

### Overlay Elements
- ✅ Image overlays
- ✅ Shape overlays
- ✅ Pattern overlays
- ✅ Positioning and blending

### Subtitle Elements
- ✅ Professional subtitle rendering
- ✅ Predefined and custom positioning
- ✅ Background support
- ✅ Typography controls

### Track Features
- ✅ Multi-track timeline
- ✅ Track muting and opacity
- ✅ Blend modes support
- ✅ Element trimming
- ✅ Precise timing
- ✅ Effect application per track

## Browser Compatibility

Requires browsers with WebCodecs support:

- ✅ Chrome 94+
- ✅ Edge 94+
- ❌ Firefox (not yet supported)
- ❌ Safari (not yet supported)

## Performance

The export engine is optimized for performance:

- Hardware-accelerated encoding when available
- Efficient canvas rendering
- Progressive processing with queue management
- Memory-efficient audio mixing

## Potential Improvements
- Improve video seeking performance in media elements by using an efficient MP4 demuxer instead of relying on the browser's video element.

## Integration with OpenCut

This package is designed to integrate seamlessly with OpenCut's timeline system:

```typescript
// In your OpenCut component
import { VideoExporter } from '@opencut/video-export';
import { useTimelineStore } from '@/stores/timeline-store';
import { useMediaStore } from '@/stores/media-store';
import { useProjectStore } from '@/stores/project-store';

function ExportButton() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  
  const handleExport = async () => {
    const exporter = new VideoExporter();
    
    await exporter.exportTimeline(
      tracks,
      mediaItems,
      {
        width: activeProject.canvasSize.width,
        height: activeProject.canvasSize.height,
        fps: activeProject.fps
      },
      {
        fileName: `${activeProject.name}.mp4`,
        resolution: 1,
        onProgress: (progress) => {
          // Update UI with progress
        }
      }
    );
  };
  
  return <button onClick={handleExport}>Export Video</button>;
}
```

## Error Handling

The export engine provides detailed error information:

```typescript
try {
  await exporter.exportTimeline(/* ... */);
} catch (error) {
  if (error.message.includes('WebCodecs')) {
    // Browser doesn't support WebCodecs
  } else if (error.message.includes('validation')) {
    // Timeline data validation failed
  } else {
    // Other export error
  }
}
```
