# AI Video Not Showing in Media Panel

## Issue Description
AI-generated videos are being successfully downloaded and processed, but they are not appearing/rendering properly in the media panel UI.

## Console Log Analysis
From the provided logs, we can see the complete workflow is working correctly:

### ✅ **Video Generation Process (Working)**
```
🎬 Generating video with FAL AI: fal-ai/bytedance/seedance/v1/lite/text-to-video
📝 Prompt: a supermodel walk in the beach
✅ FAL Response received: {video: {…}, seed: 1072329258}
⚡ Direct mode: video ready immediately
```

### ✅ **Download Process (Working)**
```
🚀 Started download tracking for Seedance v1 Lite: ./ai-generated-videos/ai-video-seedance-job_juwrix4xs_1753757691958-1753757740863.mp4
📥 Starting video download from: https://v3.fal.media/files/elephant/ZZn8Et9bzLbx_hx1OdZ17_video.mp4
✅ Download complete: 1303770 bytes total
✅ AIVideoOutputManager: Download completed for job_juwrix4xs_1753757691958
```

### ✅ **Media Store Addition (Working)**
```
📥 MEDIA-STORE: addMediaItem called with: {
  projectId: '71ffaf5b-ad23-4c9f-97b4-63265a835cbc', 
  itemName: 'AI (Seedance v1 Lite): a supermodel walk in...', 
  itemType: 'video', 
  hasFile: true, 
  hasUrl: false
}
🆕 MEDIA-STORE: Created new media item: {
  id: '03fdd29c-7bf6-4f0d-aaee-f5a1e696bef9', 
  name: 'AI (Seedance v1 Lite): a supermodel walk in...', 
  hasUrl: false, 
  urlPreview: 'none'
}
```

### 🔍 **Key Observations**
1. **Video successfully generated and downloaded** (1.3MB file)
2. **Video added to media store** with correct metadata
3. **hasUrl: false** - The video item doesn't have a URL for preview
4. **Only image items appear in media panel rendering logs** - No video rendering logs visible

## Potential Root Causes

### 1. **Missing URL Generation for Video Items**
The video item is created with `hasUrl: false` and `urlPreview: 'none'`. The media panel likely needs a URL (blob URL) to display the video.

**Expected Fix Location:** `apps/web/src/stores/media-store.ts` - `addMediaItem` function should create a blob URL for video files.

### 2. **Video Rendering Component Issues**
The media panel shows rendering logs for images but not for videos, suggesting the video preview component might not be rendering or might have errors.

**Expected Fix Location:** `apps/web/src/components/editor/media-panel/views/media.tsx` - Check `renderPreview` function for video handling.

### 3. **Missing Video Preview Generation**
Videos might need thumbnail generation or preview URLs to display properly in the media panel.

**Expected Fix Location:** Video thumbnail generation might be disabled or failing.

## Files to Investigate

### Priority 1: Media Store
- **File**: `apps/web/src/stores/media-store.ts`
- **Focus**: `addMediaItem` function around line 238
- **Check**: Whether blob URLs are created for video files like they are for images

### Priority 2: Media Panel Rendering
- **File**: `apps/web/src/components/editor/media-panel/views/media.tsx`
- **Focus**: `renderPreview` function 
- **Check**: Video preview rendering logic and error handling

### Priority 3: Video Preview Components
- **File**: Look for video preview components referenced in media.tsx
- **Check**: Component functionality and error states

## Expected Behavior
1. Video should appear in media panel grid alongside images
2. Video should have a thumbnail or preview frame
3. Video should be draggable to timeline like images

## Debug Steps
1. **Check media store video handling**: Verify if video files get proper URLs
2. **Check media panel filtering**: Ensure videos aren't being filtered out
3. **Check video preview component**: Look for errors in video rendering
4. **Check console for video-specific errors**: Any errors during video preview attempts

## Similar Working Examples
Images are working correctly with:
- Blob URLs generated (`blob:http://localhost:3000/...`)
- Proper rendering in media panel
- Successful preview display

The video should follow the same pattern but with video-specific handling.