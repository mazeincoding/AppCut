# AI Video Timeline Preview Fix

## Problem Analysis

Based on the console logs and code analysis, AI-generated videos appear in the media panel but show no timeline previews because:

1. **Media Panel vs Timeline Use Different Thumbnail Systems**
   - Media panel uses `generateEnhancedThumbnails()` and stores results in `mediaItem.thumbnails`
   - Timeline uses `generateTimelinePreviews()` and stores results in `mediaItem.timelinePreviews`

2. **AI Videos Only Generate Media Panel Thumbnails**
   - When AI videos are added via `addMediaItem()`, no timeline previews are automatically generated
   - Timeline component calls `shouldRegenerateTimelinePreviews()` which returns `true` for missing previews
   - Timeline then tries to generate previews but something is failing

## Root Cause

**File**: `apps/web/src/stores/media-store.ts`

The `addMediaItem` function (lines 234-255) only saves the media item but doesn't trigger timeline preview generation:

```typescript
// Current addMediaItem implementation (lines 234-255)
addMediaItem: async (projectId, item) => {
  const newItem: MediaItem = {
    ...item,
    id: generateUUID(),
  };

  // Add to local state immediately for UI responsiveness
  set((state) => ({
    mediaItems: [...state.mediaItems, newItem],
  }));

  // Save to persistent storage in background
  try {
    await storageService.saveMediaItem(projectId, newItem);
  } catch (error) {
    console.error("Failed to save media item:", error);
    // Remove from local state if save failed
    set((state) => ({
      mediaItems: state.mediaItems.filter((media) => media.id !== newItem.id),
    }));
  }
},
```

AI videos are added with:
- ✅ Basic media item properties
- ✅ File object (works for media panel thumbnails)
- ❌ No `timelinePreviews` property (causes timeline to show 0 thumbnails)
- ❌ No automatic timeline preview generation trigger

## Console Log Evidence

```
📭 VideoTimelinePreview: Returning no previews fallback {
  isGenerating: false, 
  previewError: null, 
  mediaId: 'c8e1269f-5a44-49de-bd01-ed715865c87f', 
  elementName: 'AI (Hailuo 02): a supermodel walking...'
}

🔍 Timeline previews found: {
  mediaId: 'c8e1269f-5a44-49de-bd01-ed715865c87f', 
  thumbnailCount: 0,                              ← PROBLEM: 0 thumbnails
  firstThumbnailUrl: 'undefined...', 
  density: 2, 
  zoomLevel: 1
}
```

## Solution Options

### Option 1: Auto-Generate Timeline Previews in addMediaItem (Recommended)
Modify `addMediaItem` to automatically generate timeline previews for video files.

### Option 2: Fix Timeline Preview Generation Errors
Debug why `generateTimelinePreviews` is failing for AI videos.

### Option 3: Unified Thumbnail System
Use the same thumbnail generation system for both media panel and timeline.

## Implementation Plan

### Step 1: Modify addMediaItem to Auto-Generate Timeline Previews

**File**: `apps/web/src/stores/media-store.ts` (lines 234-255)

Add timeline preview generation after successful media item save:

```typescript
addMediaItem: async (projectId, item) => {
  const newItem: MediaItem = {
    ...item,
    id: generateUUID(),
  };

  // Add to local state immediately for UI responsiveness
  set((state) => ({
    mediaItems: [...state.mediaItems, newItem],
  }));

  // Save to persistent storage in background
  try {
    await storageService.saveMediaItem(projectId, newItem);
    
    // ✨ NEW: Auto-generate timeline previews for video files
    if (newItem.type === 'video' && newItem.file) {
      console.log('🎬 Auto-generating timeline previews for new video:', newItem.name);
      
      // Generate timeline previews with default options
      setTimeout(() => {
        get().generateTimelinePreviews(newItem.id, {
          density: 2,
          quality: 'medium',
          zoomLevel: 1,
          elementDuration: newItem.duration || 10
        }).catch(error => {
          console.warn('Failed to auto-generate timeline previews:', error);
        });
      }, 500); // Small delay to ensure file is ready
    }
    
  } catch (error) {
    console.error("Failed to save media item:", error);
    // Remove from local state if save failed
    set((state) => ({
      mediaItems: state.mediaItems.filter((media) => media.id !== newItem.id),
    }));
  }
},
```

### Step 2: Add Better Error Handling in generateTimelinePreviews

**File**: `apps/web/src/stores/media-store.ts` (lines 501-530)

**Current implementation** (lines 501-530):
```typescript
generateTimelinePreviews: async (mediaId, options) => {
  const item = get().mediaItems.find(item => item.id === mediaId);
  if (!item || !item.file || item.type !== 'video') {
    console.warn('Cannot generate timeline previews: invalid media item', { mediaId, type: item?.type });
    return;
  }

  // Create a unique key for this request based on mediaId and options
  const requestKey = `${mediaId}-${options.zoomLevel || 1}-${options.quality || 'medium'}`;
  
  // Check for existing request
  const existingRequest = timelinePreviewRequests.get(requestKey);
  if (existingRequest) {
    console.log(`⏳ Timeline preview generation already in progress for ${requestKey}, waiting...`);
    return existingRequest;
  }

  // Store file reference to ensure type safety
  const videoFile = item.file;

  // Add file readiness validation
  if (!videoFile || videoFile.size === 0) {
    console.warn('MEDIA-STORE: File not ready for timeline preview generation - empty or invalid file');
    return;
  }

  // Check if file appears to be downloading or processing
  if (item.processingStage?.includes('downloading')) {
    console.warn('MEDIA-STORE: File still downloading, skipping timeline preview generation');
    return;
  }
  // ... continues
}
```

Enhance error logging to understand why timeline preview generation fails:

```typescript
generateTimelinePreviews: async (mediaId, options) => {
  const item = get().mediaItems.find(item => item.id === mediaId);
  if (!item || !item.file || item.type !== 'video') {
    console.warn('Cannot generate timeline previews: invalid media item', { 
      mediaId, 
      type: item?.type,
      hasFile: !!item?.file,
      fileName: item?.file?.name 
    });
    return;
  }

  // ✨ ENHANCED: Better file validation for AI videos
  const videoFile = item.file;
  
  // Validate MIME type (important for AI videos)
  if (!videoFile.type || !videoFile.type.startsWith('video/')) {
    const fileName = videoFile.name.toLowerCase();
    let inferredType = '';
    
    if (fileName.endsWith('.mp4')) {
      inferredType = 'video/mp4';
    } else if (fileName.endsWith('.webm')) {
      inferredType = 'video/webm';
    }
    
    if (inferredType) {
      console.warn('TIMELINE-PREVIEWS: Missing MIME type, inferred:', inferredType);
      // Create new file with correct MIME type
      const correctedFile = new File([videoFile], videoFile.name, { 
        type: inferredType 
      });
      
      // Update the media item with corrected file
      set((state) => ({
        mediaItems: state.mediaItems.map(existing => 
          existing.id === mediaId 
            ? { ...existing, file: correctedFile }
            : existing
        )
      }));
    } else {
      console.error('TIMELINE-PREVIEWS: Invalid file type for AI video:', videoFile.type);
      return;
    }
  }
  
  // Continue with existing logic...
}
```

### Step 3: Debug Timeline Preview Component

**File**: `apps/web/src/components/editor/video-timeline-preview.tsx` (lines 80-104)

**Current implementation** (lines 80-104):
```typescript
const mediaElement = element as MediaElement;
const elementDuration = element.duration;

console.log('🔍 VideoTimelinePreview useEffect checking:', {
  mediaId: mediaElement.mediaId,
  needsRegeneration: shouldRegenerateTimelinePreviews(
    mediaElement.mediaId, 
    zoomLevel, 
    elementDuration
  ),
  isGenerating,
  hasFile: !!mediaItem.file
});

// Check if we need to generate/regenerate previews
const needsRegeneration = shouldRegenerateTimelinePreviews(
  mediaElement.mediaId, 
  zoomLevel, 
  elementDuration
);

if (needsRegeneration && !isGenerating) {
  setIsGenerating(true);
  setPreviewError(null);
  // ... continues with generation logic
}
```

Add more detailed logging to understand the generation flow:

```typescript
// Check if we need to generate/regenerate previews
const needsRegeneration = shouldRegenerateTimelinePreviews(
  mediaElement.mediaId, 
  zoomLevel, 
  elementDuration
);

console.log('🔧 TIMELINE-PREVIEW-DEBUG:', {
  mediaId: mediaElement.mediaId,
  elementName: element.name,
  needsRegeneration,
  isGenerating,
  hasFile: !!mediaItem.file,
  fileType: mediaItem.file?.type,
  fileName: mediaItem.file?.name,
  currentTimelinePreviews: !!mediaItem.timelinePreviews,
  thumbnailCount: mediaItem.timelinePreviews?.thumbnails?.length || 0
});
```

## Expected Results

After implementing this fix:

1. ✅ AI videos will automatically have timeline previews generated when added
2. ✅ Timeline will show thumbnail strips for AI videos
3. ✅ No more infinite "no previews fallback" loops
4. ✅ Both media panel and timeline will work for AI videos

## Testing Plan

1. **Generate AI Video**
   - Create new AI video using any model
   - Verify it appears in media panel ✅ (already working)
   - Verify it shows timeline previews ✅ (should work after fix)

2. **Timeline Interaction**
   - Drag AI video to timeline
   - Verify thumbnail strip shows along timeline
   - Verify hover preview works

3. **Console Logs**
   - Should see: `🎬 Auto-generating timeline previews for new video`
   - Should see: `✅ Timeline previews generated successfully`
   - Should NOT see: `📭 VideoTimelinePreview: Returning no previews fallback`

## Alternative: Quick Fix

If the above is too complex, a simpler fix is to modify the AI video download logic to explicitly call `generateTimelinePreviews`:

**File**: `apps/web/src/components/editor/media-panel/views/ai.tsx`

**Current AI video addition locations**:

1. **Lines 363-371** (Direct fetch method):
```typescript
await addMediaItem(activeProject.id, {
  name: `AI: ${newVideo.prompt.substring(0, 30)}...`,
  type: "video",
  file: file,
  url: newVideo.videoUrl,
  duration: newVideo.duration || 5,
  width: 1920,
  height: 1080,
});
```

2. **Lines 517-524** (Downloaded file method):
```typescript
await addMediaItem(activeProject.id, {
  name: `AI (${modelName}): ${newVideo.prompt.substring(0, 20)}...`,
  type: "video",
  file: file,
  duration: newVideo.duration || 5,
  width: 1920,
  height: 1080,
});
```

**Proposed fix** - modify both locations:

```typescript
// ✨ MODIFY addMediaItem to return the media ID first
// In media-store.ts addMediaItem function, add return statement:
return newItem.id; // Add this line at the end of addMediaItem

// Then in ai.tsx, capture the media ID and generate timeline previews:
const mediaId = await addMediaItem(activeProject.id, {
  name: `AI (${modelName}): ${newVideo.prompt.substring(0, 20)}...`,
  type: "video",
  file: file,
  duration: newVideo.duration || 5,
  width: 1920,
  height: 1080,
});

// ✨ NEW: Generate timeline previews immediately for AI videos
console.log('🎬 Generating timeline previews for AI video:', mediaId);
generateTimelinePreviews(mediaId, {
  density: 2,
  quality: 'medium', 
  zoomLevel: 1,
  elementDuration: newVideo.duration || 5
}).catch(error => {
  console.warn('Failed to generate timeline previews for AI video:', error);
});
```

This requires:
1. **Modifying `addMediaItem`** in `media-store.ts:255` to `return newItem.id;`
2. **Adding timeline preview generation** after both `addMediaItem` calls in `ai.tsx`
3. **Importing `generateTimelinePreviews`** in `ai.tsx`

## Files to Modify

### Primary Implementation (Recommended)

1. **`apps/web/src/stores/media-store.ts`**
   - **Lines 234-255**: Modify `addMediaItem` to auto-generate timeline previews
   - **Lines 501-530**: Enhance `generateTimelinePreviews` error handling
   - **Line 255**: Add `return newItem.id;` to return media ID

2. **`apps/web/src/components/editor/video-timeline-preview.tsx`**
   - **Lines 80-104**: Add debug logging to understand failure points

### Alternative Implementation (Quick Fix)

3. **`apps/web/src/components/editor/media-panel/views/ai.tsx`**
   - **Line 184**: Import `generateTimelinePreviews` from `useMediaStore`
   - **Lines 363-371**: Add timeline preview generation after first `addMediaItem`
   - **Lines 517-524**: Add timeline preview generation after second `addMediaItem`

### File Structure Summary
```
apps/web/src/
├── stores/
│   └── media-store.ts                    # Main timeline preview logic
├── components/
│   └── editor/
│       ├── video-timeline-preview.tsx    # Timeline component
│       └── media-panel/
│           └── views/
│               └── ai.tsx                # AI video generation
```

## Priority

**High Priority** - This affects core functionality where AI videos appear "broken" in the timeline view, which is confusing for users.