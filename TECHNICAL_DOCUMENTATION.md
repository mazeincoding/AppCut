# OpenCut - Technical Architecture Documentation

## System Architecture Overview

OpenCut implements a client-side video editing engine using modern web technologies. The architecture prioritizes privacy through local processing, performance through efficient state management, and scalability through modular component design.

### Core Technical Principles

- **Zero-server video processing** - All media operations execute in-browser via WebAssembly
- **Immutable state architecture** - Zustand stores with temporal undo/redo capabilities
- **Component composition** - Modular React architecture with clear separation of concerns
- **Type-safe development** - Full TypeScript coverage with strict mode enabled
- **Progressive enhancement** - Graceful degradation for varying client capabilities

## Technical Stack & Implementation

### Runtime Environment

**Next.js 15.2.0** with App Router
- React Server Components for initial page loads
- Client-side hydration for interactive components
- Turbopack for development hot reloading
- Edge Runtime compatibility for API routes

**React 18.2.0** with Concurrent Features
- Suspense boundaries for async media loading
- useTransition for non-blocking UI updates
- useDeferredValue for performance-critical timeline rendering
- Error boundaries with fallback UI components

### State Architecture

**Zustand 5.0.2** - Lightweight, unopinionated state management
```typescript
// Store architecture pattern
interface StoreSlice<T> {
  state: T;
  actions: Record<string, (...args: any[]) => void>;
  computed: Record<string, () => any>;
}

// Temporal state management for undo/redo
interface TemporalStore<T> extends StoreSlice<T> {
  history: T[];
  redoStack: T[];
  undo: () => void;
  redo: () => void;
  saveCheckpoint: () => void;
}
```

**Store Separation by Domain:**
- `timeline-store.ts` - Track/clip operations, selection state, temporal editing
- `media-store.ts` - File management, metadata caching, object URL lifecycle
- `playback-store.ts` - Temporal navigation, playback rate control, seeking
- `project-store.ts` - Project metadata, export settings, user preferences
- `panel-store.ts` - UI layout state, panel dimensions, workspace configuration

### Media Processing Pipeline

**FFmpeg.wasm Integration**
```typescript
// Lazy-loaded FFmpeg instance with SharedArrayBuffer optimization
class FFmpegManager {
  private static instance: FFmpeg | null = null;
  private static initPromise: Promise<FFmpeg> | null = null;
  
  static async getInstance(): Promise<FFmpeg> {
    if (this.instance) return this.instance;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.initializeFFmpeg();
    this.instance = await this.initPromise;
    return this.instance;
  }
  
  private static async initializeFFmpeg(): Promise<FFmpeg> {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
      workerURL: await toBlobURL('/ffmpeg/ffmpeg-worker.js', 'text/javascript'),
    });
    return ffmpeg;
  }
}
```

**Memory Management Strategy**
- Object URL lifecycle management to prevent memory leaks
- Canvas-based thumbnail generation with automatic cleanup
- Progressive video loading with range requests
- File chunking for large media processing operations

## Project Architecture

### Monorepo Structure

```text
OpenCut/
├── apps/web/                    # Main Next.js application
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── (auth)/         # Authentication routes
│   │   │   ├── api/            # API endpoints
│   │   │   ├── editor/         # Video editor application
│   │   │   └── page.tsx        # Landing page
│   │   ├── components/         # React components
│   │   │   ├── editor/         # Editor-specific components
│   │   │   ├── landing/        # Landing page components
│   │   │   └── ui/             # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utility libraries
│   │   ├── stores/             # Zustand state stores
│   │   └── types/              # TypeScript type definitions
│   ├── public/                 # Static assets
│   │   └── ffmpeg/             # FFmpeg WASM files
│   ├── migrations/             # Database migrations
│   └── config files            # Next.js, Tailwind, etc.
├── docker-compose.yaml         # Local development services
├── biome.json                  # Linter/formatter config
└── documentation files
```

## Timeline Engine Implementation

### Data Structures

**Track System Architecture**
```typescript
interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  clips: TimelineClip[];
  muted?: boolean;
  locked?: boolean;
  height: number; // UI rendering height
  zIndex: number; // Compositing order
}

interface TimelineClip {
  id: string;
  mediaId: string; // Reference to MediaStore
  name: string;
  duration: number; // Original media duration
  startTime: number; // Timeline position
  trimStart: number; // Input trimming
  trimEnd: number; // Output trimming
  effects: ClipEffect[]; // Applied effects chain
  transform: ClipTransform; // Position, scale, rotation
}

interface ClipTransform {
  x: number; // Horizontal offset (-1 to 1)
  y: number; // Vertical offset (-1 to 1) 
  scaleX: number; // Horizontal scale factor
  scaleY: number; // Vertical scale factor
  rotation: number; // Rotation in degrees
  opacity: number; // Alpha value (0 to 1)
}
```

### Timeline Rendering System

**Virtualized Timeline Rendering**
- Only visible clips are rendered to DOM for performance
- Canvas-based waveform visualization for audio tracks
- Intersection Observer for lazy-loading clip thumbnails
- RequestAnimationFrame-based smooth scrolling and zooming

**Collision Detection Algorithm**
```typescript
function detectClipOverlap(
  clips: TimelineClip[],
  newClip: TimelineClip,
  excludeClipId?: string
): boolean {
  const newStart = newClip.startTime;
  const newEnd = newClip.startTime + getEffectiveDuration(newClip);
  
  return clips.some(clip => {
    if (clip.id === excludeClipId) return false;
    
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + getEffectiveDuration(clip);
    
    // Check for any temporal overlap
    return newStart < clipEnd && newEnd > clipStart;
  });
}

function getEffectiveDuration(clip: TimelineClip): number {
  return clip.duration - clip.trimStart - clip.trimEnd;
}
```

### Drag & Drop Implementation

**Multi-threaded Drag Calculations**
```typescript
// Web Worker for heavy drag calculations
class DragCalculationWorker {
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker('/workers/drag-calculations.js');
  }
  
  async calculateDropPosition(
    mouseX: number,
    zoomLevel: number,
    snapThreshold: number = 0.1
  ): Promise<{ time: number; snapped: boolean }> {
    return new Promise((resolve) => {
      this.worker.postMessage({ mouseX, zoomLevel, snapThreshold });
      this.worker.onmessage = (e) => resolve(e.data);
    });
  }
}
```

### Playback Engine

**Frame-accurate Seeking**
```typescript
class PlaybackEngine {
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private audioContext: AudioContext;
  private gainNodes: Map<string, GainNode> = new Map();
  
  async seekToTime(time: number): Promise<void> {
    const activeClips = this.getActiveClipsAtTime(time);
    
    await Promise.all(
      activeClips.map(async ({ clip, mediaElement }) => {
        const localTime = this.calculateLocalTime(clip, time);
        mediaElement.currentTime = localTime;
        
        // Wait for seek completion
        return new Promise<void>((resolve) => {
          const onSeeked = () => {
            mediaElement.removeEventListener('seeked', onSeeked);
            resolve();
          };
          mediaElement.addEventListener('seeked', onSeeked);
        });
      })
    );
  }
  
  private calculateLocalTime(clip: TimelineClip, globalTime: number): number {
    const clipOffset = globalTime - clip.startTime;
    return Math.max(0, Math.min(
      clip.duration - clip.trimEnd,
      clip.trimStart + clipOffset
    ));
  }
}
```

## Database Architecture & ORM Implementation

### Schema Design with Row Level Security

```sql
-- Core authentication schema with RLS enabled
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
) ENABLE ROW LEVEL SECURITY;

-- Session management with automatic cleanup
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
) ENABLE ROW LEVEL SECURITY;

-- Optimized indexes for query performance
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX CONCURRENTLY idx_sessions_token_hash ON sessions USING hash(token);
```

### Drizzle ORM Type Safety

```typescript
// Schema definition with runtime validation
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").$defaultFn(() => false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date()).notNull(),
});

// Inferred types for end-to-end type safety
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Query builder with prepared statements
export const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, placeholder("userId")))
  .prepare();
```

## Export Engine Architecture

### Multi-format Export Pipeline

```typescript
interface ExportConfiguration {
  format: 'mp4' | 'webm' | 'gif' | 'wav' | 'mp3';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  resolution: VideoResolution;
  frameRate: number;
  bitrate?: number;
  audioCodec?: 'aac' | 'mp3' | 'opus';
  videoCodec?: 'h264' | 'vp9' | 'av1';
}

class ExportEngine {
  private ffmpeg: FFmpeg;
  private progressCallback?: (progress: number) => void;
  
  async exportProject(
    timeline: TimelineTrack[],
    config: ExportConfiguration
  ): Promise<Blob> {
    const composition = await this.buildComposition(timeline);
    const outputPath = `output.${config.format}`;
    
    // Build FFmpeg command with optimized encoding settings
    const command = this.buildFFmpegCommand(composition, config, outputPath);
    
    // Execute with progress tracking
    await this.executeWithProgress(command, this.calculateDuration(timeline));
    
    const output = await this.ffmpeg.readFile(outputPath);
    return new Blob([output], { type: this.getMimeType(config.format) });
  }
  
  private buildFFmpegCommand(
    composition: CompositionLayer[],
    config: ExportConfiguration,
    output: string
  ): string[] {
    const cmd = ['-y']; // Overwrite output
    
    // Input files
    composition.forEach((layer, index) => {
      cmd.push('-i', `input_${index}.${layer.format}`);
    });
    
    // Video encoding parameters
    if (config.videoCodec) {
      cmd.push('-c:v', config.videoCodec);
      cmd.push('-preset', this.getPresetForQuality(config.quality));
      
      if (config.bitrate) {
        cmd.push('-b:v', `${config.bitrate}k`);
      }
    }
    
    // Audio encoding parameters
    if (config.audioCodec) {
      cmd.push('-c:a', config.audioCodec);
      cmd.push('-ar', '48000'); // Sample rate
    }
    
    // Output resolution
    cmd.push('-s', `${config.resolution.width}x${config.resolution.height}`);
    cmd.push('-r', config.frameRate.toString());
    
    cmd.push(output);
    return cmd;
  }
}
```

## Performance Optimization Strategies

### Memory Management

```typescript
class MediaMemoryManager {
  private static readonly MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
  private cache = new Map<string, CachedMedia>();
  private cacheSize = 0;
  
  async loadMedia(mediaItem: MediaItem): Promise<HTMLVideoElement | HTMLImageElement> {
    const cached = this.cache.get(mediaItem.id);
    if (cached) {
      this.updateAccessTime(cached);
      return cached.element;
    }
    
    const element = await this.createMediaElement(mediaItem);
    this.addToCache(mediaItem.id, element, mediaItem.file.size);
    
    return element;
  }
  
  private addToCache(id: string, element: HTMLVideoElement | HTMLImageElement, size: number): void {
    // Evict least recently used items if cache is full
    while (this.cacheSize + size > MediaMemoryManager.MAX_CACHE_SIZE && this.cache.size > 0) {
      this.evictLRU();
    }
    
    this.cache.set(id, {
      element,
      size,
      accessTime: Date.now(),
    });
    this.cacheSize += size;
  }
  
  private evictLRU(): void {
    let oldestTime = Infinity;
    let oldestKey = '';
    
    for (const [key, cached] of this.cache) {
      if (cached.accessTime < oldestTime) {
        oldestTime = cached.accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const cached = this.cache.get(oldestKey)!;
      this.cleanupMediaElement(cached.element);
      this.cache.delete(oldestKey);
      this.cacheSize -= cached.size;
    }
  }
}
```

### Virtualization Implementation

```typescript
// Virtual scrolling for timeline with thousands of clips
class VirtualTimelineRenderer {
  private container: HTMLElement;
  private itemHeight = 60; // Track height
  private overscan = 5; // Render extra items for smooth scrolling
  
  render(tracks: TimelineTrack[], scrollTop: number, containerHeight: number): VirtualRenderResult {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      tracks.length - 1,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight)
    );
    
    const visibleTracks = tracks.slice(
      Math.max(0, startIndex - this.overscan),
      Math.min(tracks.length, endIndex + this.overscan)
    );
    
    return {
      visibleTracks,
      offsetY: startIndex * this.itemHeight,
      totalHeight: tracks.length * this.itemHeight,
    };
  }
}
```

## Advanced Development Patterns

### Error Boundaries & Resilience

```typescript
// Granular error boundaries for editor stability
class TimelineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorInfo: {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      },
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send telemetry data (client-side only)
    this.reportError({
      error: error.message,
      componentStack: errorInfo.componentStack,
      timeline: this.props.timelineSnapshot,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <FallbackTimeline 
          onRecover={() => this.setState({ hasError: false })}
          errorInfo={this.state.errorInfo}
        />
      );
    }
    
    return this.props.children;
  }
}
```

### Custom Hook Patterns

```typescript
// Optimized timeline selection hook with debouncing
export function useTimelineSelection() {
  const { selectedClips, selectClip, deselectClip, clearSelectedClips } = useTimelineStore();
  const [marqueeState, setMarqueeState] = useState<MarqueeState | null>(null);
  
  const debouncedMarqueeUpdate = useMemo(
    () => debounce((rect: DOMRect, additive: boolean) => {
      const selectedItems = calculateMarqueeSelection(rect);
      if (additive) {
        selectedItems.forEach(item => selectClip(item.trackId, item.clipId, true));
      } else {
        clearSelectedClips();
        selectedItems.forEach(item => selectClip(item.trackId, item.clipId, false));
      }
    }, 16), // 60fps throttling
    [selectClip, deselectClip, clearSelectedClips]
  );
  
  const handleMarqueeUpdate = useCallback((rect: DOMRect, additive: boolean) => {
    debouncedMarqueeUpdate(rect, additive);
  }, [debouncedMarqueeUpdate]);
  
  return {
    selectedClips,
    marqueeState,
    setMarqueeState,
    handleMarqueeUpdate,
    selectClip: useCallback((trackId: string, clipId: string, multi = false) => {
      selectClip(trackId, clipId, multi);
    }, [selectClip]),
  };
}
```

### WebWorker Integration

```typescript
// Dedicated workers for CPU-intensive operations
class WorkerPool {
  private workers: Worker[] = [];
  private available: Worker[] = [];
  private readonly maxWorkers = navigator.hardwareConcurrency || 4;
  
  constructor(private workerScript: string) {
    this.initializePool();
  }
  
  async execute<T, R>(data: T): Promise<R> {
    const worker = await this.getAvailableWorker();
    
    return new Promise<R>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Worker timeout'));
      }, 30000);
      
      worker.onmessage = (event) => {
        clearTimeout(timeoutId);
        this.releaseWorker(worker);
        resolve(event.data);
      };
      
      worker.onerror = (error) => {
        clearTimeout(timeoutId);
        this.releaseWorker(worker);
        reject(error);
      };
      
      worker.postMessage(data);
    });
  }
  
  private async getAvailableWorker(): Promise<Worker> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    
    if (this.workers.length < this.maxWorkers) {
      const worker = new Worker(this.workerScript);
      this.workers.push(worker);
      return worker;
    }
    
    // Wait for worker to become available
    return new Promise((resolve) => {
      const checkForWorker = () => {
        if (this.available.length > 0) {
          resolve(this.available.pop()!);
        } else {
          setTimeout(checkForWorker, 10);
        }
      };
      checkForWorker();
    });
  }
}

// Usage for thumbnail generation
const thumbnailWorkerPool = new WorkerPool('/workers/thumbnail-generator.js');

async function generateThumbnailsInBackground(videoFiles: File[]): Promise<string[]> {
  const thumbnailPromises = videoFiles.map(file => 
    thumbnailWorkerPool.execute<{ file: File; timestamp: number }, string>({
      file,
      timestamp: 1.0,
    })
  );
  
  return Promise.all(thumbnailPromises);
}
```

## Testing Architecture

### Component Testing Strategy

```typescript
// Timeline component integration tests
describe('Timeline Component', () => {
  let mockTimelineStore: ReturnType<typeof createMockTimelineStore>;
  let mockMediaStore: ReturnType<typeof createMockMediaStore>;
  
  beforeEach(() => {
    mockTimelineStore = createMockTimelineStore();
    mockMediaStore = createMockMediaStore();
  });
  
  test('should handle clip drag and drop correctly', async () => {
    const { getByTestId, findByTestId } = render(
      <Timeline />,
      { wrapper: createTestWrapper([mockTimelineStore, mockMediaStore]) }
    );
    
    const mediaItem = screen.getByTestId('media-item-video1');
    const dropZone = screen.getByTestId('timeline-track-1');
    
    // Simulate drag start
    fireEvent.dragStart(mediaItem, {
      dataTransfer: createDataTransfer({
        'application/x-media-item': JSON.stringify({
          id: 'video1',
          type: 'video',
        }),
      }),
    });
    
    // Simulate drop
    fireEvent.drop(dropZone, {
      clientX: 150, // 3 seconds at default zoom
      dataTransfer: createDataTransfer({
        'application/x-media-item': JSON.stringify({
          id: 'video1',
          type: 'video',
        }),
      }),
    });
    
    // Verify clip was added to timeline
    await waitFor(() => {
      expect(mockTimelineStore.addClipToTrack).toHaveBeenCalledWith(
        'track-1',
        expect.objectContaining({
          mediaId: 'video1',
          startTime: 3,
        })
      );
    });
  });
});
```

### Performance Testing

```typescript
// Performance benchmarks for timeline operations
describe('Timeline Performance', () => {
  test('should handle 1000 clips without performance degradation', async () => {
    const startTime = performance.now();
    
    // Generate large dataset
    const tracks = generateMockTracks(10);
    const clips = generateMockClips(1000);
    
    // Distribute clips across tracks
    clips.forEach((clip, index) => {
      const trackIndex = index % tracks.length;
      tracks[trackIndex].clips.push(clip);
    });
    
    // Render timeline with large dataset
    const { rerender } = render(
      <Timeline tracks={tracks} />,
      { wrapper: PerformanceTestWrapper }
    );
    
    const renderTime = performance.now() - startTime;
    
    // Assert render time is reasonable
    expect(renderTime).toBeLessThan(100); // 100ms threshold
    
    // Test scroll performance
    const scrollStartTime = performance.now();
    
    const timelineContainer = screen.getByTestId('timeline-container');
    fireEvent.scroll(timelineContainer, { target: { scrollLeft: 5000 } });
    
    await waitFor(() => {
      const scrollTime = performance.now() - scrollStartTime;
      expect(scrollTime).toBeLessThan(16); // 60fps threshold
    });
  });
});
```

## Security Considerations

### Client-side Security Measures

```typescript
// Content Security Policy configuration
const cspConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for FFmpeg WASM
    'blob:', // Worker scripts
  ],
  'worker-src': ["'self'", 'blob:'],
  'wasm-unsafe-eval': ["'self'"], // WebAssembly execution
  'media-src': ["'self'", 'blob:', 'data:'],
  'img-src': ["'self'", 'blob:', 'data:'],
  'connect-src': ["'self'", 'wss:', 'ws:'], // WebSocket connections
};

// File validation and sanitization
class SecureFileProcessor {
  private static readonly ALLOWED_MIME_TYPES = new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);
  
  private static readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  
  static validateFile(file: File): ValidationResult {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large' };
    }
    
    // Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.has(file.type)) {
      return { valid: false, error: 'Unsupported file type' };
    }
    
    // Additional validation for file headers
    return this.validateFileHeader(file);
  }
  
  private static async validateFileHeader(file: File): Promise<ValidationResult> {
    const buffer = await file.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check for common file signatures
    const signatures = {
      mp4: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
      webm: [0x1A, 0x45, 0xDF, 0xA3],
      png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      jpeg: [0xFF, 0xD8, 0xFF],
    };
    
    for (const [format, signature] of Object.entries(signatures)) {
      if (this.matchesSignature(bytes, signature)) {
        return { valid: true };
      }
    }
    
    return { valid: false, error: 'Invalid file header' };
  }
}
```

## Deployment & DevOps

### Docker Production Configuration

```dockerfile
# Multi-stage production build
FROM node:18-alpine AS base
RUN corepack enable bun

FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Run as non-root user
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

---

This technical documentation provides deep implementation details for developers working on OpenCut's core architecture. For basic setup and contribution guidelines, refer to the main [README.md](README.md) and [CONTRIBUTING.md](.github/CONTRIBUTING.md).
