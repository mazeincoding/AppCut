# Video Export Performance Optimization Plan

## Implementation Strategy: Simple to Complex

This plan is organized from simplest to most complex optimizations, allowing for incremental improvements with quick wins first.

## Current Performance Baseline

- **Test Case**: 60-second 1080p video @ 30fps
- **Current Time**: 60-90 seconds (1-1.5x real-time)
- **Frames**: 1,800 total
- **CPU Usage**: Single core (25% on quad-core)
- **Memory**: 2-4GB peak

## Phase 1: Quick Wins (1-2 days) - 1.5-2x Faster

### 1.1 Remove Console Logging
**Effort**: 30 minutes | **Impact**: 10-20% faster

```typescript
// export-engine.ts
class ExportEngine {
  private enableLogging = process.env.NODE_ENV !== 'production';
  
  private log(...args: any[]) {
    if (this.enableLogging) console.log(...args);
  }
}
```

### 1.2 Optimize Canvas Operations
**Effort**: 2 hours | **Impact**: 15-25% faster

```typescript
// Current: Many save/restore calls
ctx.save();
renderElement();
ctx.restore();

// Optimized: Batch operations
ctx.save();
elements.forEach(el => {
  // Reuse transformation matrix
  ctx.setTransform(el.transform);
  renderElement(el);
});
ctx.restore();
```

### 1.3 Use ImageBitmap for Images
**Effort**: 2 hours | **Impact**: 10-15% faster

```typescript
// Current
const img = new Image();
img.src = url;
ctx.drawImage(img, x, y);

// Optimized
const bitmap = await createImageBitmap(blob);
ctx.drawImage(bitmap, x, y);
bitmap.close(); // Free memory
```

### 1.4 Pre-decode Video Frames
**Effort**: 4 hours | **Impact**: 20-30% faster

```typescript
// Pre-decode video frames during timeline idle time
class VideoPreloader {
  async preloadVideo(element: VideoElement) {
    const frames = [];
    const video = document.createElement('video');
    video.src = element.url;
    
    // Seek and capture key frames
    for (let t = 0; t < video.duration; t += 1) {
      video.currentTime = t;
      await video.decode();
      frames.push(await createImageBitmap(video));
    }
    return frames;
  }
}
```

**Total Phase 1 Impact**: 50-100% faster (30-45 seconds for 60s video)

## Phase 2: Parallel Batch Processing (1 week) - 5-10x Faster

### 2.1 Simple Parallel Rendering
**Effort**: 2 days | **Impact**: 3-5x faster

```typescript
class ParallelExportEngine extends ExportEngine {
  async renderFrames(): Promise<Blob> {
    const BATCH_SIZE = 10;
    const batches = [];
    
    // Create off-screen canvases for parallel rendering
    const canvases = Array(BATCH_SIZE).fill(null).map(() => 
      document.createElement('canvas')
    );
    
    // Render frames in batches
    for (let i = 0; i < totalFrames; i += BATCH_SIZE) {
      const batchPromises = [];
      
      for (let j = 0; j < BATCH_SIZE && i + j < totalFrames; j++) {
        const canvas = canvases[j];
        const frameIndex = i + j;
        batchPromises.push(this.renderFrameToCanvas(canvas, frameIndex));
      }
      
      const renderedFrames = await Promise.all(batchPromises);
      
      // Add frames to video sequentially to maintain order
      for (const frame of renderedFrames) {
        await this.recorder.addFrame(frame);
      }
      
      // Update progress
      this.onProgress?.(Math.floor((i / totalFrames) * 100));
    }
    
    return this.recorder.stopRecording();
  }
}
```

### 2.2 Memory-Efficient Streaming
**Effort**: 1 day | **Impact**: Better memory usage

```typescript
// Don't keep all frames in memory
class StreamingRecorder {
  private writer: WritableStreamDefaultWriter;
  
  async addFrame(frame: ImageData) {
    const encoded = await this.encodeFrame(frame);
    await this.writer.write(encoded);
    // Frame is garbage collected immediately
  }
}
```

**Total Phase 2 Impact**: 5-10x faster (6-12 seconds for 60s video)

## Phase 3: Web Workers (1 week) - Additional 2-3x

### 3.1 Basic Worker Implementation
**Effort**: 3 days | **Impact**: 2x faster

```typescript
// export-worker.ts
self.onmessage = async (e) => {
  const { frameData, canvasSize } = e.data;
  const canvas = new OffscreenCanvas(canvasSize.width, canvasSize.height);
  const ctx = canvas.getContext('2d');
  
  // Render frame
  await renderFrame(ctx, frameData);
  
  // Send back as blob
  const blob = await canvas.convertToBlob();
  self.postMessage({ frameIndex: frameData.index, blob });
};

// Main thread
class WorkerExportEngine {
  private workers: Worker[] = [];
  
  constructor() {
    const workerCount = navigator.hardwareConcurrency || 4;
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new Worker('/export-worker.js'));
    }
  }
  
  async renderWithWorkers() {
    const frameQueue = [...Array(totalFrames).keys()];
    const results = new Map();
    
    // Distribute work to workers
    const workerPromises = this.workers.map(worker => 
      this.processFramesWithWorker(worker, frameQueue, results)
    );
    
    await Promise.all(workerPromises);
    return this.assembleVideo(results);
  }
}
```

### 3.2 Worker Pool Pattern
**Effort**: 2 days | **Impact**: Better CPU utilization

```typescript
class WorkerPool {
  private idle: Worker[] = [];
  private busy = new Map<Worker, Promise<any>>();
  
  async execute(task: FrameTask): Promise<Blob> {
    const worker = await this.getWorker();
    
    const promise = new Promise((resolve) => {
      worker.onmessage = (e) => {
        resolve(e.data);
        this.releaseWorker(worker);
      };
    });
    
    this.busy.set(worker, promise);
    worker.postMessage(task);
    
    return promise;
  }
}
```

**Total Phase 3 Impact**: 10-20x faster (3-6 seconds for 60s video)

## Phase 4: WebCodecs API (2 weeks) - Native Performance

### 4.1 Basic WebCodecs Integration
**Effort**: 1 week | **Impact**: 3-5x encoding speed

```typescript
class WebCodecsExporter {
  private encoder: VideoEncoder;
  private muxer: Mp4Muxer; // Use mp4-muxer library
  
  async initialize() {
    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        this.muxer.addVideoChunk(chunk, metadata);
      },
      error: console.error
    });
    
    await this.encoder.configure({
      codec: 'avc1.42001E', // H.264 baseline
      width: this.settings.width,
      height: this.settings.height,
      bitrate: 10_000_000,
      framerate: this.fps,
      latencyMode: 'quality'
    });
  }
  
  async encodeFrame(canvas: HTMLCanvasElement, timestamp: number) {
    const frame = new VideoFrame(canvas, {
      timestamp: timestamp * 1_000_000 // microseconds
    });
    
    const keyFrame = timestamp % 1000000 === 0; // Every second
    this.encoder.encode(frame, { keyFrame });
    frame.close();
  }
}
```

### 4.2 Hardware Acceleration
**Effort**: 3 days | **Impact**: GPU encoding when available

```typescript
// Check for hardware acceleration
const support = await VideoEncoder.isConfigSupported({
  codec: 'avc1.42001E',
  width: 1920,
  height: 1080,
  hardwareAcceleration: 'prefer-hardware'
});

if (support.supported && support.config?.hardwareAcceleration) {
  console.log('GPU encoding available!');
}
```

**Total Phase 4 Impact**: 20-40x faster (1.5-3 seconds for 60s video)

## Phase 5: WebGL Rendering (4 weeks) - Ultimate Performance

### 5.1 Basic WebGL Setup
**Effort**: 2 weeks | **Impact**: 5-10x rendering speed

```typescript
class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private shaders: Map<string, WebGLProgram> = new Map();
  
  async renderFrame(elements: TimelineElement[]) {
    // Use GPU for:
    // - Video texture decoding
    // - Image transformations
    // - Text rendering (with MSDF fonts)
    // - Real-time effects
  }
}
```

### 5.2 GPU Pipeline
**Effort**: 2 weeks | **Impact**: Maximum performance

```typescript
// Full GPU pipeline
Canvas2D → WebGL → GPU Shaders → WebCodecs → GPU Encoding
```

**Total Phase 5 Impact**: 30-50x faster (1-2 seconds for 60s video)

## Implementation Roadmap

### Week 1: Quick Wins
- Day 1: Remove logging, optimize canvas
- Day 2: ImageBitmap, video pre-decoding
- Day 3-5: Parallel batch rendering

**Result**: 5-10x faster

### Week 2: Workers
- Day 1-3: Basic worker implementation
- Day 4-5: Worker pool, testing

**Result**: 10-20x faster

### Week 3-4: WebCodecs
- Week 3: Basic integration
- Week 4: Hardware acceleration

**Result**: 20-40x faster

### Month 2: WebGL (Optional)
- Week 1-2: WebGL renderer
- Week 3-4: Full GPU pipeline

**Result**: 30-50x faster

## Testing Each Phase

```typescript
// Benchmark each optimization
class ExportBenchmark {
  async run() {
    const testCases = [
      { duration: 10, resolution: '720p' },
      { duration: 60, resolution: '1080p' },
      { duration: 120, resolution: '4K' }
    ];
    
    for (const test of testCases) {
      console.log(`Testing ${test.duration}s @ ${test.resolution}`);
      
      const start = performance.now();
      await exporter.export(test);
      const time = performance.now() - start;
      
      console.log(`Time: ${time}ms, Speed: ${test.duration / (time/1000)}x`);
    }
  }
}
```

## Browser Compatibility Strategy

```typescript
class ExportEngineFactory {
  static create(): ExportEngine {
    if ('VideoEncoder' in window) {
      return new WebCodecsExporter(); // Fastest
    } else if ('OffscreenCanvas' in window) {
      return new WorkerExporter(); // Fast
    } else {
      return new ParallelExporter(); // Good
    }
  }
}
```

## Expected Results Summary

| Phase | Time for 60s Video | Speed vs Current | Implementation Time |
|-------|-------------------|------------------|---------------------|
| Current | 60-90s | 1x | - |
| Quick Wins | 30-45s | 2x | 1-2 days |
| Parallel | 6-12s | 5-10x | 1 week |
| Workers | 3-6s | 10-20x | 1 week |
| WebCodecs | 1.5-3s | 20-40x | 2 weeks |
| WebGL | 1-2s | 30-50x | 4 weeks |

Start with Phase 1 for immediate improvements, then progress through each phase based on your needs and timeline!