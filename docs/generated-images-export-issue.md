# Generated Images Export Issue

## Issue Summary
Generated images from Text2Image models are successfully added to the media panel and can be dragged to the timeline, but they fail to work properly during video export processing.

## Console Logs Analysis

### **Media Store Processing** ✅ (Working Correctly)
```
🎨 MEDIA-STORE: addGeneratedImages() called with 3 items
🎨 MEDIA-STORE: Current mediaItems count before adding: 3
🎨 MEDIA-STORE: Generated IDs for new items: [
  {id: "uuid-1", name: "Generated: a supermodel walking in the be...", url: "blob:http://localhost:3000/abc123..."},
  {id: "uuid-2", name: "Generated: a supermodel walking in the be...", url: "blob:http://localhost:3000/def456..."},
  {id: "uuid-3", name: "Generated: a supermodel walking in the be...", url: "blob:http://localhost:3000/ghi789..."}
]
🎨 MEDIA-STORE: Updating mediaItems array from 3 to 6 items
✅ MEDIA-STORE: Successfully added 3 generated images to media panel
✅ MEDIA-STORE: New total mediaItems count: 6
🔄 MEDIA-STORE: Starting background URL to File conversion for generated images
🔄 MEDIA-STORE: Converting URL to File for item 1/3: Generated: a supermodel walking in the be...
🔄 MEDIA-STORE: Converting URL to File for item 2/3: Generated: a supermodel walking in the be...
🔄 MEDIA-STORE: Converting URL to File for item 3/3: Generated: a supermodel walking in the be...
📦 MEDIA-STORE: Fetched blob for Generated: a supermodel walking in the be..., size: 916686 type: image/jpeg
✅ MEDIA-STORE: Created File object for Generated: a supermodel walking in the be...: {name: '...', size: 916686, type: 'image/jpeg'}
✅ MEDIA-STORE: Updated media item Generated: a supermodel walking in the be... with File object
📦 MEDIA-STORE: Fetched blob for Generated: a supermodel walking in the be..., size: 161421 type: image/png
✅ MEDIA-STORE: Created File object for Generated: a supermodel walking in the be...: {name: '...', size: 161421, type: 'image/png'}
✅ MEDIA-STORE: Updated media item Generated: a supermodel walking in the be... with File object
📦 MEDIA-STORE: Fetched blob for Generated: a supermodel walking in the be..., size: 1286748 type: image/png
✅ MEDIA-STORE: Created File object for Generated: a supermodel walking in the be...: {name: '...', size: 1286748, type: 'image/png'}
✅ MEDIA-STORE: Updated media item Generated: a supermodel walking in the be... with File object
```

### **Expected Export Error Logs** ❌ (Likely Failure Points)
Based on source code analysis, you should see errors like:
```
🚨 EXPORT-ENGINE: Processing image element {mediaId: "uuid-1", hasFile: true, fileSize: 916686, fileType: "image/jpeg", hasUrl: true, urlValid: false}
❌ CANVAS-RENDERER: Failed to load generated image {src: "blob:http://localhost:3000/...", error: "NetworkError", mediaId: "uuid-1"}
🚨 EXPORT-ENGINE: Image load timeout for generated image: Generated: a supermodel walking in the be...
❌ EXPORT-ENGINE: Failed to render image element {elementId: "timeline-element-1", mediaId: "uuid-1", error: "Failed to load image: blob:http://..."}
```

## Problem Analysis

### 1. **Media Store Integration is Working** ✅
- Generated images are successfully added to media panel
- URL to File conversion is working properly
- File objects are created with correct size and type
- Media items are updated with File objects

### 2. **Potential Export Issues** ❌

#### **A. Blob URL Expiration**
**Root Cause**: Generated images use blob URLs that may expire during export
- **Location**: `apps/web/src/stores/media-store.ts:387+`
- **Issue**: Blob URLs can become invalid over time or during export processing
- **Symptoms**: Images appear in media panel but fail during video rendering

#### **B. File Object Compatibility**  
**Root Cause**: Export engine may not handle converted File objects properly
- **Location**: Export engine file processing
- **Issue**: Canvas renderer or FFmpeg may expect direct file paths vs File objects
- **Symptoms**: Rendering fails when processing generated images

#### **C. Cross-Origin Issues**
**Root Cause**: Generated images from external APIs may have CORS restrictions
- **Location**: Canvas rendering during export
- **Issue**: Browser blocks cross-origin image access during canvas operations
- **Symptoms**: Canvas taint errors during export

#### **D. Image Format Compatibility**
**Root Cause**: Different AI models generate different formats (JPEG vs PNG)
- **Location**: Canvas renderer image processing
- **Issue**: Export engine may not handle all formats consistently
- **Symptoms**: Some generated images work, others fail

## Files Involved

### **Primary Export Files**
1. **`apps/web/src/lib/export-engine-optimized.ts`** - Main export engine
   - **Line 464**: `renderImageElementOptimized()` - Handles cached image rendering 
   - **Line 844**: `renderImageElement()` - Fallback image rendering with 5s timeout
   - **Line 856**: Error handling: `Failed to load image: ${mediaItem.url}`
   - **Line 860**: Timeout handling: `Image load timeout` after 5000ms

2. **`apps/web/src/lib/canvas-renderer.ts`** - Canvas-based image rendering
   - **Line 49**: `drawImage()` - Core canvas drawing method
   - **Line 56**: `ctx.drawImage(image, x, y, width, height)` - Actual canvas API call
   - **Line 30**: `imageSmoothingEnabled = true` - High-quality rendering enabled

3. **`apps/web/src/lib/export-errors.ts`** - Error handling system
   - **Line 26**: `CanvasRenderError` class for canvas-related failures
   - **Line 1**: `ExportError` base class for all export failures

### **Image Processing Files**
4. **`apps/web/src/stores/media-store.ts`** - Generated image handling 
   - **Line 361**: `addGeneratedImages()` - Entry point for generated images
   - **Line 372**: Metadata tagging: `source: "text2image"`
   - **Line 397**: Background URL to File conversion process
   - **Line 407**: Blob fetching: `📦 MEDIA-STORE: Fetched blob for...`
   - **Line 415**: File creation: `new File([blob], fileName, { type: blob.type })`
   - **Line 441**: Success logging: `✅ MEDIA-STORE: Updated media item...`

5. **`apps/web/src/lib/frame-capture.ts`** - Frame capture for export
   - **Line 110**: `createImageElement()` - Generic image loading utility
   - **Line 114**: Error handling: `Failed to load image` (generic message)

### **Timeline Integration**
6. **`apps/web/src/components/export-canvas.tsx`** - Export canvas component
7. **`apps/web/src/components/editor/timeline/timeline-element.tsx`** - Timeline element rendering

## Root Cause Investigation

### **Step 1: Add Debug Logging to Export Engine**
Add this debugging code to `apps/web/src/lib/export-engine-optimized.ts`:

**Location: Line 844 - Replace the entire `renderImageElement` function:**
```javascript
private async renderImageElement(element: TimelineElement, bounds: any): Promise<void> {
  const mediaElement = element as any;
  const mediaItem = this.getMediaItem(mediaElement.mediaId);
  
  // DIAGNOSTIC: Log all image processing attempts
  console.log('🖼️ EXPORT-ENGINE: Processing image element', {
    mediaId: element.mediaId,
    elementId: element.id,
    elementType: element.type,
    hasMediaItem: !!mediaItem,
    mediaItemData: mediaItem ? {
      name: mediaItem.name,
      type: mediaItem.type,
      hasFile: !!mediaItem.file,
      fileSize: mediaItem.file?.size,
      fileType: mediaItem.file?.type,
      hasUrl: !!mediaItem.url,
      urlLength: mediaItem.url?.length,
      urlType: mediaItem.url?.startsWith('blob:') ? 'blob' : 
              mediaItem.url?.startsWith('data:') ? 'data' : 'other',
      isGenerated: mediaItem.metadata?.source === 'text2image',
      metadata: mediaItem.metadata
    } : null
  });
  
  if (!mediaItem?.url) {
    console.error('❌ EXPORT-ENGINE: No media item or URL found', {
      mediaId: element.mediaId,
      hasMediaItem: !!mediaItem,
      hasUrl: !!mediaItem?.url
    });
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  // DIAGNOSTIC: Track image loading states
  let loadingStartTime = performance.now();
  console.log('⏱️ EXPORT-ENGINE: Starting image load', {
    mediaId: element.mediaId,
    url: mediaItem.url.substring(0, 100) + (mediaItem.url.length > 100 ? '...' : ''),
    isGenerated: mediaItem.metadata?.source === 'text2image',
    timestamp: new Date().toISOString()
  });
  
  // Wait for image to load
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const loadTime = performance.now() - loadingStartTime;
      console.log('✅ EXPORT-ENGINE: Image loaded successfully', {
        mediaId: element.mediaId,
        loadTimeMs: Math.round(loadTime),
        imageSize: { width: img.naturalWidth, height: img.naturalHeight },
        complete: img.complete,
        src: img.src.substring(0, 100) + '...'
      });
      resolve();
    };
    
    img.onerror = (error) => {
      const loadTime = performance.now() - loadingStartTime;
      console.error('🚨 EXPORT-ENGINE: Image load failed', {
        mediaId: element.mediaId,
        name: mediaItem.name,
        url: mediaItem.url.substring(0, 100) + '...',
        loadTimeMs: Math.round(loadTime),
        error: error,
        errorType: error.type || 'unknown',
        isGenerated: mediaItem.metadata?.source === 'text2image'
      });
      
      // Test if URL is still accessible
      fetch(mediaItem.url)
        .then(response => {
          console.log('🔍 EXPORT-ENGINE: URL fetch test result', {
            mediaId: element.mediaId,
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            ok: response.ok
          });
        })
        .catch(fetchError => {
          console.error('🚨 EXPORT-ENGINE: URL fetch test failed', {
            mediaId: element.mediaId,
            fetchError: fetchError.message
          });
        });
      
      reject(new Error(`Failed to load image: ${mediaItem.url}`));
    };
    
    // Add timeout to prevent hanging
    setTimeout(() => {
      const loadTime = performance.now() - loadingStartTime;
      console.error('⏰ EXPORT-ENGINE: Image load timeout (5s)', {
        mediaId: element.mediaId,
        name: mediaItem.name,
        loadTimeMs: Math.round(loadTime),
        imageState: {
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          readyState: img.readyState || 'unknown'
        }
      });
      reject(new Error('Image load timeout'));
    }, 5000);
    
    // Start loading
    img.src = mediaItem.url || '';
  });
  
  console.log('🎨 EXPORT-ENGINE: About to draw image to canvas', {
    mediaId: element.mediaId,
    bounds: bounds,
    imageReady: img.complete && img.naturalWidth > 0
  });
  
  this.renderer.save();
  this.renderer.drawImage(img, bounds.x, bounds.y, bounds.width, bounds.height);
  this.renderer.restore();
  
  console.log('✅ EXPORT-ENGINE: Successfully drew image to canvas', {
    mediaId: element.mediaId
  });
}
```

### **Step 2: Add Canvas Error Handling**
Add this debugging code to `apps/web/src/lib/canvas-renderer.ts`:

**Location: Line 49 - Replace the entire `drawImage` function:**
```javascript
drawImage(
  image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // DIAGNOSTIC: Log canvas drawing attempts
  console.log('🎨 CANVAS-RENDERER: Attempting to draw image', {
    imageType: image.constructor.name,
    imageSource: image instanceof HTMLImageElement ? image.src?.substring(0, 100) + '...' : 'N/A',
    imageDimensions: {
      natural: {
        width: image instanceof HTMLImageElement ? image.naturalWidth : 
               image instanceof HTMLVideoElement ? image.videoWidth : image.width,
        height: image instanceof HTMLImageElement ? image.naturalHeight :
                image instanceof HTMLVideoElement ? image.videoHeight : image.height
      },
      display: {
        width: image.width || (image as HTMLVideoElement).videoWidth,
        height: image.height || (image as HTMLVideoElement).videoHeight
      }
    },
    imageState: {
      complete: image instanceof HTMLImageElement ? image.complete : true,
      readyState: image instanceof HTMLVideoElement ? image.readyState : 'N/A'
    },
    targetBounds: { x, y, width, height },
    canvasState: {
      width: this.canvas.width,
      height: this.canvas.height,
      contextValid: !!this.ctx
    }
  });
  
  try {
    // Check if image is ready for drawing
    if (image instanceof HTMLImageElement) {
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        console.warn('⚠️ CANVAS-RENDERER: Image not fully loaded', {
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          src: image.src?.substring(0, 100) + '...'
        });
      }
    }
    
    // Check for canvas taint (CORS issues)
    const testData = this.ctx.getImageData(0, 0, 1, 1);
    console.log('✅ CANVAS-RENDERER: Canvas not tainted, proceeding with draw');
    
    // Perform the actual draw
    this.ctx.drawImage(image, x, y, width, height);
    
    console.log('✅ CANVAS-RENDERER: Successfully drew image to canvas', {
      drawnAt: { x, y, width, height },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🚨 CANVAS-RENDERER: Failed to draw image', {
      error: error.message,
      errorName: error.name,
      imageDetails: {
        type: image.constructor.name,
        src: image instanceof HTMLImageElement ? image.src?.substring(0, 100) + '...' : 'N/A',
        complete: image instanceof HTMLImageElement ? image.complete : 'N/A',
        naturalWidth: image instanceof HTMLImageElement ? image.naturalWidth : 'N/A',
        naturalHeight: image instanceof HTMLImageElement ? image.naturalHeight : 'N/A'
      },
      canvasDetails: {
        width: this.canvas.width,
        height: this.canvas.height,
        contextType: this.ctx?.constructor.name
      },
      targetBounds: { x, y, width, height }
    });
    
    // Check if this is a CORS/taint error
    if (error.name === 'SecurityError' || error.message.includes('tainted')) {
      console.error('🔒 CANVAS-RENDERER: CORS/Security error detected', {
        errorType: 'CORS_VIOLATION',
        suggestion: 'Image may be from different origin or blob URL expired'
      });
    }
    
    throw error;
  }
}
```

### **Step 3: Add Pre-Export Validation**
Add this validation code to `apps/web/src/components/export-dialog.tsx`:

**Location: Line 164 - Add at the beginning of `handleExport` function:**
```javascript
const handleExport = async () => {
  if (!canvasRef.current?.getCanvas() || isExporting) return;

  try {
    updateProgress({ isExporting: true, progress: 0, status: "Initializing export..." });
    
    // DIAGNOSTIC: Validate all generated images before export starts
    console.log('🔍 EXPORT-DIALOG: Starting pre-export validation');
    
    const timelineElements = tracks.flatMap(track => track.elements);
    const allMediaElements = timelineElements.filter(el => el.type === 'media');
    const generatedElements = allMediaElements.filter(el => {
      const mediaItem = mediaItems.find(m => m.id === (el as any).mediaId);
      return mediaItem?.metadata?.source === 'text2image';
    });
    
    console.log('🔍 EXPORT-DIALOG: Media elements analysis', {
      totalTimelineElements: timelineElements.length,
      mediaElements: allMediaElements.length,
      generatedImageElements: generatedElements.length,
      regularImageElements: allMediaElements.length - generatedElements.length
    });
    
    // Test each generated image
    for (let i = 0; i < generatedElements.length; i++) {
      const element = generatedElements[i];
      const mediaItem = mediaItems.find(m => m.id === (element as any).mediaId);
      
      if (!mediaItem) {
        console.error('❌ EXPORT-DIALOG: Media item not found for element', {
          elementId: element.id,
          mediaId: (element as any).mediaId
        });
        continue;
      }
      
      console.log(`🔍 EXPORT-DIALOG: Validating generated image ${i + 1}/${generatedElements.length}`, {
        mediaId: mediaItem.id,
        name: mediaItem.name,
        fileInfo: {
          hasFile: !!mediaItem.file,
          fileSize: mediaItem.file?.size,
          fileType: mediaItem.file?.type,
          fileName: mediaItem.file?.name
        },
        urlInfo: {
          hasUrl: !!mediaItem.url,
          urlLength: mediaItem.url?.length,
          urlType: mediaItem.url?.startsWith('blob:') ? 'blob' : 
                  mediaItem.url?.startsWith('data:') ? 'data' : 'other',
          urlPreview: mediaItem.url?.substring(0, 100) + '...'
        },
        metadata: mediaItem.metadata,
        elementInfo: {
          elementId: element.id,
          startTime: element.startTime,
          duration: element.duration
        }
      });
      
      // Test URL accessibility
      if (mediaItem.url) {
        try {
          const startTime = performance.now();
          const response = await fetch(mediaItem.url);
          const fetchTime = performance.now() - startTime;
          
          if (!response.ok) {
            console.error('🚨 EXPORT-DIALOG: Generated image URL not accessible', {
              mediaId: mediaItem.id,
              status: response.status,
              statusText: response.statusText,
              fetchTimeMs: Math.round(fetchTime)
            });
          } else {
            const contentLength = response.headers.get('content-length');
            const contentType = response.headers.get('content-type');
            
            console.log('✅ EXPORT-DIALOG: Generated image URL accessible', {
              mediaId: mediaItem.id,
              fetchTimeMs: Math.round(fetchTime),
              contentType: contentType,
              contentLength: contentLength,
              responseOk: response.ok
            });
          }
        } catch (fetchError) {
          console.error('🚨 EXPORT-DIALOG: Generated image URL fetch failed', {
            mediaId: mediaItem.id,
            fetchError: fetchError.message,
            errorName: fetchError.name
          });
        }
      }
      
      // Test image loading capability
      if (mediaItem.url) {
        try {
          const testImg = new Image();
          testImg.crossOrigin = 'anonymous';
          
          const loadTest = new Promise((resolve, reject) => {
            const startTime = performance.now();
            
            testImg.onload = () => {
              const loadTime = performance.now() - startTime;
              console.log('✅ EXPORT-DIALOG: Generated image loads successfully', {
                mediaId: mediaItem.id,
                loadTimeMs: Math.round(loadTime),
                dimensions: { width: testImg.naturalWidth, height: testImg.naturalHeight },
                complete: testImg.complete
              });
              resolve(true);
            };
            
            testImg.onerror = (error) => {
              const loadTime = performance.now() - startTime;
              console.error('🚨 EXPORT-DIALOG: Generated image load test failed', {
                mediaId: mediaItem.id,
                loadTimeMs: Math.round(loadTime),
                error: error
              });
              reject(error);
            };
            
            // 3 second timeout for test
            setTimeout(() => {
              console.warn('⏰ EXPORT-DIALOG: Generated image load test timeout', {
                mediaId: mediaItem.id
              });
              reject(new Error('Load test timeout'));
            }, 3000);
            
            testImg.src = mediaItem.url;
          });
          
          await loadTest;
          
        } catch (loadError) {
          console.error('🚨 EXPORT-DIALOG: Generated image pre-load test failed', {
            mediaId: mediaItem.id,
            error: loadError.message
          });
        }
      }
    }
    
    console.log('✅ EXPORT-DIALOG: Pre-export validation completed');
    
    // Continue with original export logic...
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) {
      throw new Error("Canvas not available");
    }
    
    // ... rest of handleExport function remains the same
```

### **Step 4: Enable Media Store Debug Logging**
Temporarily enable debug logging to see the media store processing:

**Location: `apps/web/src/stores/media-store.ts` - Line 5:**
```javascript
// Change this line from:
const DEBUG_MEDIA_STORE = process.env.NODE_ENV === 'development' && false;

// To this (temporarily enable):
const DEBUG_MEDIA_STORE = process.env.NODE_ENV === 'development' && true;
```

This will show the blob-to-file conversion process and help identify if the issue occurs during media processing or export.

## Expected Console Output When Testing

### **If Blob URLs Expire (Most Likely Issue):**
```
🔍 EXPORT-DIALOG: Starting pre-export validation
🔍 EXPORT-DIALOG: Found 3 generated images in timeline
✅ EXPORT-DIALOG: Generated image URL accessible {fetchTimeMs: 5}
✅ EXPORT-DIALOG: Generated image loads successfully {loadTimeMs: 12}
🖼️ EXPORT-ENGINE: Processing image element {isGenerated: true, urlType: "blob"}
⏱️ EXPORT-ENGINE: Starting image load {isGenerated: true}
🚨 EXPORT-ENGINE: Image load failed {loadTimeMs: 2500}
🚨 EXPORT-ENGINE: URL fetch test failed {fetchError: "NetworkError"}
```

### **If CORS/Security Issues:**
```
🖼️ EXPORT-ENGINE: Processing image element {isGenerated: true}
⏱️ EXPORT-ENGINE: Starting image load
🚨 EXPORT-ENGINE: Image load failed {loadTimeMs: 1200}
🎨 CANVAS-RENDERER: Attempting to draw image
🚨 CANVAS-RENDERER: Failed to draw image
🔒 CANVAS-RENDERER: CORS/Security error detected {errorType: "CORS_VIOLATION"}
```

### **If File Conversion Issues:**
```
🔍 EXPORT-DIALOG: Validating generated image {hasFile: false, urlType: "blob"}
❌ EXPORT-DIALOG: Media item not found for element
🖼️ EXPORT-ENGINE: No media item or URL found
```

## Potential Solutions

### **Solution 1: Convert to Data URLs** (Recommended)
Convert blob URLs to data URLs for persistence during export.

**Implementation** - Update `media-store.ts:441` after File creation:
```javascript
// After line 441: if (DEBUG_MEDIA_STORE) console.log(`✅ MEDIA-STORE: Updated media item...`)
// Convert the File to data URL for export stability
const reader = new FileReader();
reader.onload = () => {
  const dataUrl = reader.result as string;
  console.log('🔄 MEDIA-STORE: Converting to data URL for export stability', {
    mediaId: item.id,
    originalSize: blob.size,
    dataUrlSize: dataUrl.length,
    mimeType: blob.type
  });
  
  // Update with data URL instead of blob URL
  set((state) => ({
    mediaItems: state.mediaItems.map(mediaItem =>
      mediaItem.id === item.id
        ? { 
            ...mediaItem, 
            url: dataUrl, // Replace blob URL with data URL
            metadata: {
              ...mediaItem.metadata,
              originalBlobSize: blob.size,
              convertedAt: Date.now()
            }
          }
        : mediaItem
    )
  }));
  
  console.log('✅ MEDIA-STORE: Replaced blob URL with data URL for', item.name);
};
reader.readAsDataURL(blob);
```

**Benefits**:
- **Data URLs never expire** - Persist through entire export process
- **No cross-origin issues** - Embedded directly in string
- **Export engine compatibility** - Works with both `Image.src` and canvas
- **Browser cache independent** - No network requests during export

### **Solution 2: Improved Error Handling**
Add comprehensive error handling in export pipeline.

**Implementation**:
```javascript
// In export-engine-optimized.ts
const renderImageElement = async (element, bounds) => {
  try {
    const mediaItem = this.getMediaItem(element.mediaId);
    
    if (!mediaItem) {
      throw new Error(`Media item not found: ${element.mediaId}`);
    }
    
    if (mediaItem.metadata?.source === 'text2image') {
      console.log('🎨 EXPORT: Processing generated image', mediaItem.name);
      // Special handling for generated images
      return await this.renderGeneratedImage(mediaItem, bounds);
    }
    
    return await this.renderRegularImage(mediaItem, bounds);
  } catch (error) {
    console.error('🚨 EXPORT: Failed to render image element', {
      elementId: element.id,
      mediaId: element.mediaId,
      error: error.message
    });
    // Return placeholder or skip element
    return this.renderPlaceholderImage(bounds);
  }
};
```

### **Solution 3: Pre-Export Validation**
Validate all generated images before starting export.

**Implementation**:
```javascript
// In export-dialog.tsx, add validation before export
const validateGeneratedImages = async () => {
  const timelineElements = tracks.flatMap(track => track.elements);
  const imageElements = timelineElements.filter(el => 
    el.type === 'media' && 
    mediaItems.find(m => m.id === el.mediaId)?.metadata?.source === 'text2image'
  );
  
  for (const element of imageElements) {
    const mediaItem = mediaItems.find(m => m.id === element.mediaId);
    if (!mediaItem?.file || !mediaItem?.url) {
      throw new Error(`Generated image not ready for export: ${mediaItem?.name}`);
    }
  }
};

// Call before starting export
await validateGeneratedImages();
```

### **Solution 4: Fallback Image Loading**
Implement fallback mechanisms for failed image loads.

**Implementation**:
```javascript
// In canvas-renderer.ts
const loadImageWithFallback = async (mediaItem) => {
  const loadAttempts = [
    () => loadFromFile(mediaItem.file),
    () => loadFromUrl(mediaItem.url),
    () => loadFromDataUrl(mediaItem.dataUrl),
    () => loadPlaceholderImage()
  ];
  
  for (const attempt of loadAttempts) {
    try {
      const image = await attempt();
      if (image) return image;
    } catch (error) {
      console.warn('🔄 CANVAS: Load attempt failed, trying fallback', error);
    }
  }
  
  throw new Error('All image loading attempts failed');
};
```

## Expected Export Behavior

### **Before Fix (Current Issue)**
1. Generate images successfully ✅
2. Images appear in media panel ✅  
3. Images can be dragged to timeline ✅
4. Export starts but fails on generated images ❌
5. Export completes with missing/broken images ❌

### **After Fix (Expected)**
1. Generate images successfully ✅
2. Images appear in media panel ✅
3. Images can be dragged to timeline ✅
4. Pre-export validation checks image validity ✅
5. Export processes generated images correctly ✅
6. Final video includes all generated images ✅

## Debugging Steps

### **Step 1: Enable Export Debugging**
Add debug logging to export engine:
```javascript
// In export-engine-optimized.ts
const DEBUG_EXPORT = true;
if (DEBUG_EXPORT) console.log('Export debug info here...');
```

### **Step 2: Test Generated Image Export**
1. Generate 1-2 test images
2. Add them to timeline
3. Start export with console open
4. Look for specific error messages related to image processing

### **Step 3: Compare with Regular Images**
1. Export timeline with only regular uploaded images (should work)
2. Export timeline with only generated images (likely fails)
3. Export timeline with mixed images (identify which fail)

## Quick Test Cases

### **Test Case 1: Single Generated Image**
- **Input**: Generate one image, add to timeline, export
- **Expected**: Export succeeds with generated image in video
- **Failure**: Export fails or video has missing image

### **Test Case 2: Mixed Content**  
- **Input**: Upload one regular image + generate one image, add both to timeline, export
- **Expected**: Export succeeds with both images in video
- **Failure**: Only regular image works, generated image missing

### **Test Case 3: Multiple Generated Images**
- **Input**: Generate 3 images, add all to timeline, export
- **Expected**: Export succeeds with all 3 generated images
- **Failure**: Export fails or some images missing

## Priority: High
Generated images are a core Text2Image feature and export functionality is essential for video creation workflow.

## Recommended Implementation Order
1. **Immediate**: Add debug logging to export pipeline
2. **Short-term**: Implement data URL conversion (Solution 1)
3. **Medium-term**: Add comprehensive error handling (Solution 2)
4. **Long-term**: Implement pre-export validation and fallback mechanisms