# AI Video Timeline Drag Issue Analysis

## Problem Description

When dragging AI-generated videos from the media panel to the timeline, the application encounters an error after FFmpeg thumbnail generation completes. The video appears successfully in the media panel but fails during the drag-to-timeline operation.

## Current Behavior

1. ✅ AI video generation works successfully
2. ✅ Video is added to media panel
3. ✅ Canvas thumbnail generation fails (expected due to CORS/decode issues)
4. ✅ FFmpeg fallback thumbnail generation works successfully
5. ❌ Dragging video to timeline causes an error/bug

## FFmpeg Processing Evidence

From the logs, FFmpeg is processing the video correctly:
```
🎬 FFMPEG-UTILS: Generating thumbnail 5/12 at 2s
FFmpeg: Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'input.mp4':
  Duration: 00:00:06.04, start: 0.000000, bitrate: 6772 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1088 [SAR 1:1 DAR 30:17], 6770 kb/s, 24 fps, 24 tbr, 90k tbn (default)
```

## Timeline Drag and Drop Architecture

### Key Files Involved

1. **Timeline Component** (`apps/web/src/components/editor/timeline.tsx`)
   - Main drop handler: Lines 346-478 (`handleDrop` function)
   - Error handling on lines 421-422 and 472

2. **Timeline Track Component** (`apps/web/src/components/editor/timeline-track.tsx`)
   - Track-specific drop handling: Lines 499-879 (`handleTrackDrop` function)
   - Error handling on line 876

3. **Media Panel View** (`apps/web/src/components/editor/media-panel/views/media.tsx`)
   - Source of draggable items: Lines 469-483
   - Enhanced thumbnail generation: Lines 259-271

4. **Draggable Item Component** (`apps/web/src/components/ui/draggable-item.tsx`)
   - Drag initiation: Lines 55-73 (`handleDragStart`)

### Drag and Drop Flow

1. **Media Processing** → Files processed and basic thumbnails generated
2. **Enhanced Thumbnail Generation** → FFmpeg generates proper thumbnails (async)
3. **Drag Initiation** → User drags from media panel with media item data
4. **Drop Handling** → Timeline receives drop and looks up media item by ID
5. **Timeline Element Creation** → New clip added to timeline track

## Potential Root Causes

### 1. Timing Issues
- Enhanced thumbnail generation happens asynchronously after media item is added
- Drag/drop might occur before thumbnail generation completes
- Media item state might be inconsistent during thumbnail processing

### 2. Media Item ID Resolution
```typescript
const mediaItem = mediaItems.find((item) => item.id === dragData.id);
if (!mediaItem) {
  toast.error("Media item not found");
  return;
}
```
- Media item might not be properly indexed after AI generation
- ID mismatch between drag data and media store

### 3. Duration/Metadata Issues
```typescript
duration: mediaItem.duration || 5,
```
- AI-generated videos might have missing or incorrect duration metadata
- FFmpeg processing might not properly update media item metadata

### 4. File/Blob Reference Issues
- AI videos use local File blobs created from external URLs
- Blob URLs might become invalid between media panel addition and timeline drag
- File references might be corrupted during async thumbnail generation

## Error Handling Locations

The codebase has three main error catching points:

1. **Timeline Drop Errors** (timeline.tsx:421):
   ```typescript
   console.error("Error parsing dropped item data:", error);
   ```

2. **File Drop Errors** (timeline.tsx:472):
   ```typescript
   toast.error("Failed to process dropped files");
   ```

3. **Track Drop Errors** (timeline-track.tsx:876):
   ```typescript
   console.error("Error handling drop:", error);
   ```

## Debugging Steps

### 1. Check Console Errors
Look for any of the three error messages above in browser console when drag fails.

### 2. Verify Media Item State
```javascript
// Check if media item exists and has correct properties
console.log('Media items:', mediaItems);
console.log('Drag data:', dragData);
console.log('Found item:', mediaItems.find(item => item.id === dragData.id));
```

### 3. Monitor Thumbnail Generation Status
```javascript
// Check thumbnail generation state
console.log('Thumbnail generation complete:', item.thumbnails?.length > 0);
console.log('Media item duration:', item.duration);
```

### 4. Validate File/Blob References
```javascript
// Check if file blob is still valid
console.log('File valid:', item.file instanceof File);
console.log('File size:', item.file?.size);
```

## Potential Solutions

### 1. Add Timeline Drag State Checking
```typescript
// Prevent drag until thumbnail generation completes
const canDrag = mediaItem.thumbnails && mediaItem.thumbnails.length > 0;
```

### 2. Improve Error Handling
Add specific error handling for AI-generated videos in timeline drop handlers.

### 3. Ensure Metadata Consistency
Verify that AI video metadata (duration, dimensions) is properly set before allowing drag operations.

### 4. Add Loading States
Show loading indicator on media items until they're fully processed and ready for timeline use.

## Current Workaround

Until the issue is resolved, users can:
1. Wait for thumbnail generation to complete before dragging
2. Check browser console for specific error messages
3. Refresh media panel if items appear corrupted

## Next Steps

1. Add console logging to identify which specific error is occurring
2. Implement proper loading states for AI-generated videos
3. Add validation checks before allowing drag operations
4. Consider adding a "processing" indicator for videos undergoing thumbnail generation

---

**Status**: Under Investigation  
**Priority**: High  
**Affected Component**: AI Video Generation → Timeline Integration  
**FFmpeg Fallback**: Working ✅  
**Media Panel Display**: Working ✅  
**Timeline Drag**: Failing ❌