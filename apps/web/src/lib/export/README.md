# Video Export Service - Modular Architecture

NOTE: Document written by LLM

This directory contains the video export service, broken down into focused, maintainable, and extensible modules.

## Architecture Overview

The video export service is composed of several specialized modules:

### Core Components

#### 1. **VideoExportService** (`video-export-service.ts`)
- **Role**: Main orchestrator and public API
- **Responsibilities**: 
  - Initialize FFmpeg and all components
  - Coordinate the export pipeline
  - Handle progress reporting
  - Manage error handling

#### 2. **ExportLogger** (`logger.ts`)
- **Role**: Centralized logging system
- **Responsibilities**: 
  - Log messages with different levels (log, warn, error, debug)
  - Maintain export history
  - Provide structured logging output

#### 3. **FontManager** (`font-manager.ts`)
- **Role**: Font loading and management
- **Responsibilities**: 
  - Load fonts from local files with fallback
  - Manage font availability for text rendering

#### 4. **FilterValidator** (`filter-validator.ts`)
- **Role**: FFmpeg filter validation and cleaning
- **Responsibilities**: 
  - Validate individual filters
  - Clean malformed filter strings
  - Validate timing parameters
  - Prevent empty filter errors

### Processing Pipeline

#### 5. **MediaProcessor** (`media-processor.ts`)
- **Role**: Process media elements (video, audio, images)
- **Responsibilities**: 
  - Generate video filters for scaling and overlays
  - Create audio filters with timing
  - Handle media element validation

#### 6. **TextProcessor** (`text-processor.ts`)
- **Role**: Process text and subtitle elements
- **Responsibilities**: 
  - Generate text overlay filters
  - Handle subtitle styling
  - Manage text element timing and layering

#### 7. **FFmpegCommandBuilder** (`ffmpeg-builder.ts`)
- **Role**: Build complete FFmpeg commands
- **Responsibilities**: 
  - Assemble all filters into filter complex
  - Add encoding settings
  - Create final command arguments

## Usage

### Basic Usage
```typescript
import { VideoExportService } from '@/lib/export/video-export-service';

const exportService = new VideoExportService();

// Initialize the service
await exportService.initialize((progress) => {
  console.log(`${progress.phase}: ${progress.progress}% - ${progress.message}`);
});

// Export video
const blob = await exportService.exportVideo(project);
```

### Advanced Usage
```typescript
import { 
  VideoExportService, 
  ExportLogger, 
  FilterValidator,
  MediaProcessor 
} from '@/lib/export/video-export-service';

// Access individual components for custom processing
const logger = new ExportLogger();
const validator = new FilterValidator(logger);
const mediaProcessor = new MediaProcessor(logger, validator);
```

## Extension Points

### Adding New Element Types
1. Create a new processor class (e.g., `EffectsProcessor`)
2. Implement the processing logic
3. Add to the main pipeline in `VideoExportService`

### Custom Filters
1. Extend `FilterValidator` with new validation rules
2. Add filter generation logic to appropriate processor
3. Update command builder if needed

### New Export Formats
1. Extend `ExportSettings` type
2. Add format-specific logic to `FFmpegCommandBuilder`
3. Update quality settings as needed

## Error Handling

The architecture provides multiple layers of error handling:
- **Validation**: Prevent invalid filters at creation time
- **Logging**: Detailed error messages with context
- **Graceful degradation**: Skip invalid elements instead of failing
- **Recovery**: Fallback strategies for resource loading

## Performance Considerations

- **Lazy initialization**: Components are created only when needed
- **Efficient filtering**: Multiple validation passes prevent expensive failures
- **Memory management**: Proper cleanup of FFmpeg resources
- **Progress tracking**: Real-time feedback during long operations
