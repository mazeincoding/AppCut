# AI Video No Timeline Preview Analysis

## Issue Summary
AI-generated videos (e.g., "AI (Hailuo 02): a supermodel walking...") appear successfully in the media panel but show no timeline previews, resulting in an infinite loop of "no previews fallback" messages.

## Console Log Analysis

### Key Observations from Logs
```
📭 VideoTimelinePreview: Returning no previews fallback {
  isGenerating: false, 
  previewError: null, 
  mediaId: 'c8e1269f-5a44-49de-bd01-ed715865c87f', 
  elementName: 'AI (Hailuo 02): a supermodel walking...'
}

🔍 Timeline previews found: {
  mediaId: 'c8e1269f-5a44-49de-bd01-ed715865c87f', 
  thumbnailCount: 0, 
  firstThumbnailUrl: 'undefined...', 
  density: 2, 
  zoomLevel: 1
}

📊 Timeline preview strip: {
  selectedCount: 0, 
  totalCount: 0, 
  zoomLevel: 1, 
  step: 1, 
  sampleUrls: Array(0)
}
```

### Media Panel vs Timeline Behavior
- **Media Panel**: Shows `thumbnailsReady: true, fileValid: true` ✅
- **Timeline**: Shows `thumbnailCount: 0, totalCount: 0` ❌

## Root Cause Analysis

### 1. **Thumbnail Generation Mismatch**
The media panel reports `thumbnailsReady: true` but the timeline finds `thumbnailCount: 0`. This suggests:
- Media panel thumbnails and timeline previews use different generation systems
- Timeline preview thumbnails are not being generated despite media panel success

### 2. **Missing Timeline-Specific Thumbnails**
From the logs, we can see the flow:
1. `VideoTimelinePreview` requests thumbnails
2. `media-store.ts:690` finds 0 thumbnails
3. Returns empty array `sampleUrls: Array(0)`
4. Falls back to "no previews" state

### 3. **Infinite Loop Pattern**
The logs show the same sequence repeating indefinitely:
- Timeline element renders
- Requests previews
- Gets 0 thumbnails
- Shows fallback
- Re-renders (causing loop)

## Investigation Points

### File Paths to Check

#### **Timeline Preview Generation**
- `apps/web/src/components/editor/video-timeline-preview.tsx:175`
  - Where thumbnail strip is retrieved
- `apps/web/src/stores/media-store.ts:690-709` 
  - Timeline preview logic that returns 0 thumbnails

#### **Media Panel Thumbnail System**
- `apps/web/src/components/editor/media-panel/views/media.tsx:64-7`
  - Where `generateEnhancedThumbnails` is called for media panel
- Media panel shows `thumbnailsReady: true` but timeline can't access them

#### **Thumbnail Cache/Storage**
- Different thumbnail systems might use different storage mechanisms
- Timeline previews might require specific thumbnail density/format

### Likely Causes

#### **1. Separate Thumbnail Systems**
```typescript
// Media panel might use one system:
generateEnhancedThumbnails(item.id, {
  resolution: 'medium',
  sceneDetection: true
});

// Timeline might require different thumbnails:
getTimelinePreviews(mediaId, zoomLevel, elementDuration)
```

#### **2. Missing Timeline Thumbnail Generation**
The AI video might be added to media store without triggering timeline-specific thumbnail generation:
- Media panel generates thumbnails for preview
- Timeline requires separate thumbnail generation for preview strips
- AI videos bypass the normal timeline thumbnail generation process

#### **3. Thumbnail Cache Key Mismatch**
- Media thumbnails stored with one key format
- Timeline previews look for thumbnails with different key format
- Cache miss results in 0 thumbnails found

#### **4. Video File Accessibility**
While the file shows as `fileValid: true`, it might not be accessible for timeline processing:
- File might be a blob URL that expires
- File might not be properly persisted for timeline use
- MIME type issues (we fixed some, but timeline might have different requirements)

## Debugging Steps

### 1. **Check Thumbnail Generation Triggers**
Look for where timeline thumbnails should be generated when AI videos are added to media store.

### 2. **Compare Thumbnail Storage**
- Media panel thumbnails storage location
- Timeline preview thumbnails storage location
- Check if they use the same cache/storage system

### 3. **Verify File Persistence**
- Check if AI video files remain accessible after generation
- Verify file URLs don't expire or become invalid

### 4. **Timeline Preview Requirements**
- Check what specific thumbnail format/density timeline requires
- Verify if timeline preview generation is triggered for AI videos

## Temporary Fix Suggestions

### 1. **Force Timeline Thumbnail Generation**
When AI video is added to media store, explicitly trigger timeline preview generation:
```typescript
// After addMediaItem for AI video
await generateTimelinePreviews(mediaId, defaultOptions);
```

### 2. **Debug Timeline Preview System**
Add more detailed logging to understand why timeline finds 0 thumbnails when media panel shows thumbnails ready.

### 3. **Unified Thumbnail System**
Consider using the same thumbnail generation system for both media panel and timeline previews.

## Files to Investigate

1. **`apps/web/src/stores/media-store.ts`** (lines 690-709)
   - Timeline preview retrieval logic
   - Why `thumbnailCount: 0` for AI videos

2. **`apps/web/src/components/editor/video-timeline-preview.tsx`** (line 175)
   - Thumbnail strip retrieval
   - Fallback logic

3. **AI video addition workflow**
   - Check if timeline thumbnails are generated when AI videos are added
   - Verify thumbnail cache population

The core issue appears to be that media panel and timeline use different thumbnail systems, and AI videos only populate one of them.