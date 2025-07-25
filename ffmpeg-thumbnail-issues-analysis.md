# FFmpeg and Thumbnail Generation Issues Analysis

## Problem Summary
The application is experiencing repeated failures with:
1. Canvas thumbnail generation timing out after 15 seconds
2. FFmpeg.wasm being initialized multiple times
3. Potential race conditions in the thumbnail generation pipeline

## Key Observations

### 1. Canvas Thumbnail Generation Timeout
- **Location**: `apps/web/src/lib/ffmpeg-utils.ts:616`
- **Error**: "Canvas thumbnail generation timed out - will try FFmpeg fallback"
- **Timeout**: 15 seconds (line 617)
- **Pattern**: Fails consistently, then falls back to FFmpeg method

### 2. FFmpeg Repeated Initialization
- **Issue**: FFmpeg.wasm is being initialized multiple times despite singleton pattern
- **Evidence**: Multiple "🚀 Initializing FFmpeg.wasm..." logs
- **Location**: `apps/web/src/lib/ffmpeg-utils.ts:13`
- **Singleton Check**: Lines 8-11 check for existing instance

### 3. Fetch Interception
- **Pattern**: All fetch requests are being intercepted and logged
- **Affected URLs**: 
  - `/ffmpeg/ffmpeg-core.js`
  - `/ffmpeg/ffmpeg-core.wasm`
  - `/__nextjs_original-stack-frames`
- **Source**: Unknown debug injection (possibly development tool)

## Root Cause Analysis

### 1. Canvas Method Failure
```javascript
// Line 613-617 in ffmpeg-utils.ts
timeoutId = setTimeout(() => {
  cleanup();
  reject(new Error('Canvas thumbnail generation timed out - will try FFmpeg fallback'));
}, 15000);
```
- Video element may not be loading properly
- Cross-origin issues despite `crossOrigin = 'anonymous'`
- Browser security restrictions in Electron environment

### 2. FFmpeg Singleton Failure
```javascript
// Lines 7-11 in ffmpeg-utils.ts
if (ffmpeg && isLoaded) {
  console.log("✅ FFmpeg already initialized, reusing instance");
  return ffmpeg;
}
```
- The singleton pattern should prevent re-initialization
- `isLoaded` flag is being reset somewhere
- Possible async race conditions

### 3. Multiple Thumbnail Generation Calls
From `media-store.ts`:
- Line 463: `generateEnhancedThumbnails` called for quality changes
- Line 521: Called again for timeline previews
- Multiple calls happening in quick succession

## Potential Solutions

### 1. Fix Canvas Thumbnail Generation
- Reduce timeout to fail faster (5s instead of 15s)
- Add better error handling for video load events
- Check if running in Electron and adjust approach

### 2. Strengthen FFmpeg Singleton
- Add initialization mutex/lock
- Use Promise-based initialization queue
- Prevent concurrent initialization attempts

### 3. Optimize Thumbnail Generation Flow
- Implement request debouncing
- Cache thumbnail generation promises
- Prevent duplicate requests for same media

### 4. Remove or Fix Fetch Interception
- Identify source of fetch interception
- Ensure it's not interfering with FFmpeg loading

## Immediate Actions Needed

1. **Add initialization lock to FFmpeg**
   - Prevent race conditions
   - Queue initialization requests

2. **Improve canvas error handling**
   - Better detection of why video load fails
   - Faster fallback to FFmpeg

3. **Implement thumbnail request debouncing**
   - Prevent multiple simultaneous requests
   - Cache in-progress operations

4. **Add better logging**
   - Track initialization call stack
   - Monitor concurrent requests

## Code Locations to Fix

### 1. FFmpeg Initialization Issues
**File**: `apps/web/src/lib/ffmpeg-utils.ts`
- **Lines 4-5**: Global singleton variables
  ```javascript
  let ffmpeg: FFmpeg | null = null;
  let isLoaded = false;
  ```
- **Lines 7-53**: `initFFmpeg()` function - needs mutex/lock
- **Line 13**: Console log showing repeated initialization
- **Lines 49-51**: Error handling resets singleton state

### 2. Canvas Thumbnail Generation
**File**: `apps/web/src/lib/ffmpeg-utils.ts`
- **Lines 543-619**: `generateThumbnailsViaCanvas()` function
- **Lines 563**: Video seeked event handler (takes 1521ms)
- **Lines 606-608**: Video element configuration
  ```javascript
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.preload = 'metadata';
  ```
- **Lines 613-617**: 15-second timeout (should be reduced)
- **Lines 635-649**: `generateEnhancedThumbnails()` - main entry point

### 3. Media Store Thumbnail Calls
**File**: `apps/web/src/stores/media-store.ts`
- **Lines 353-394**: `generateEnhancedThumbnails` store method
- **Lines 455-468**: `setThumbnailQuality()` - triggers regeneration
- **Lines 476-530**: `generateTimelinePreviews()` - causes multiple calls
- **Line 521**: Direct call to `generateEnhancedThumbnails`

### 4. Fetch Interception (ROOT CAUSE)
**File**: `apps/web/src/pages/_document.tsx`
- **Lines 55-79**: Global fetch override in Electron
  ```javascript
  window.fetch = function(input, init) {
    // Logs [FETCH DEBUG] for all requests
    // Blocks .json requests which may affect FFmpeg
  }
  ```
- **Line 61**: Console log that shows in browser console
- **Lines 69-77**: Blocking logic that might interfere with FFmpeg

**Additional Fetch Interceptions**:
- `apps/web/src/components/url-validation-provider.tsx:82-114`
- `apps/web/src/lib/url-validation.ts:263-268`

### 5. Electron-Specific Issues
**File**: `apps/web/src/components/electron-error-boundary.tsx`
- **Line 65**: Error boundary activation log
- May be catching and suppressing actual errors

### 6. Storage Provider Cleanup
**File**: `apps/web/src/components/storage-provider.tsx`
- **Line 188**: Component unmounting during thumbnail generation

## Prioritized Fix Implementation

### Priority 1: Fix FFmpeg Initialization Race Condition
**File**: `apps/web/src/lib/ffmpeg-utils.ts:7-53`

Add initialization promise tracking:
```javascript
let ffmpeg: FFmpeg | null = null;
let isLoaded = false;
let initializationPromise: Promise<FFmpeg> | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg && isLoaded) {
    return ffmpeg;
  }
  
  // Return existing initialization if in progress
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Start new initialization
  initializationPromise = (async () => {
    try {
      // ... existing initialization code ...
      return ffmpeg;
    } catch (error) {
      initializationPromise = null; // Reset on error
      throw error;
    }
  })();
  
  return initializationPromise;
};
```

### Priority 2: Fix Canvas Timeout
**File**: `apps/web/src/lib/ffmpeg-utils.ts:613-617`

Change timeout from 15s to 5s:
```javascript
timeoutId = setTimeout(() => {
  cleanup();
  reject(new Error('Canvas thumbnail generation timed out - will try FFmpeg fallback'));
}, 5000); // Reduced from 15000
```

### Priority 3: Fix Fetch Interception
**File**: `apps/web/src/pages/_document.tsx:55-79`

Exclude FFmpeg files from blocking:
```javascript
// Allow FFmpeg files
if (url && (url.includes('/ffmpeg/') || url.includes('ffmpeg-core'))) {
  console.log('✅ [ELECTRON] Allowing FFmpeg file:', url);
  return originalFetch.apply(this, arguments);
}
```

### Priority 4: Add Thumbnail Request Debouncing
**File**: `apps/web/src/stores/media-store.ts:353`

Add request tracking:
```javascript
const thumbnailRequests = new Map<string, Promise<void>>();

generateEnhancedThumbnails: async (mediaId, options = {}) => {
  // Check for existing request
  const existingRequest = thumbnailRequests.get(mediaId);
  if (existingRequest) {
    return existingRequest;
  }
  
  // Create new request
  const request = (async () => {
    try {
      // ... existing code ...
    } finally {
      thumbnailRequests.delete(mediaId);
    }
  })();
  
  thumbnailRequests.set(mediaId, request);
  return request;
}
```