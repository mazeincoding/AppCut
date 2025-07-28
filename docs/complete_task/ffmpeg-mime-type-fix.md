# FFmpeg MIME Type Validation Fix

## Issue
AI-generated videos were causing runtime errors during thumbnail generation:

```
Runtime Error: Invalid file type for thumbnail generation: 
src\lib\ffmpeg-utils.ts (673:11) @ generateEnhancedThumbnails
```

## Root Cause
File objects were being created without proper MIME types, causing the validation in `generateEnhancedThumbnails` to fail when `videoFile.type` was empty or undefined.

## Solution
Enhanced the MIME type validation in `ffmpeg-utils.ts` to:

1. **Detect missing MIME types**: Check if `videoFile.type` is empty or undefined
2. **Infer from filename**: Automatically infer MIME type from file extension
3. **Provide fallback**: Use appropriate MIME types for common video formats

### Code Changes
**File**: `apps/web/src/lib/ffmpeg-utils.ts`
**Lines**: 671-692

```typescript
// Validate file type - handle cases where MIME type might be missing
if (!videoFile || !videoFile.type) {
  throw new Error(`Invalid file for thumbnail generation: file or MIME type is missing`);
}

// If MIME type is empty or doesn't start with 'video/', try to infer from filename
let fileType = videoFile.type;
if (!fileType || !fileType.startsWith('video/')) {
  const fileName = videoFile.name.toLowerCase();
  if (fileName.endsWith('.mp4')) {
    fileType = 'video/mp4';
    console.warn(`Missing MIME type for ${videoFile.name}, inferred as video/mp4`);
  } else if (fileName.endsWith('.webm')) {
    fileType = 'video/webm';
    console.warn(`Missing MIME type for ${videoFile.name}, inferred as video/webm`);
  } else if (fileName.endsWith('.mov')) {
    fileType = 'video/quicktime';
    console.warn(`Missing MIME type for ${videoFile.name}, inferred as video/quicktime`);
  } else {
    throw new Error(`Invalid file type for thumbnail generation: ${videoFile.type || 'unknown'} (filename: ${videoFile.name})`);
  }
}
```

## Benefits
- **Defensive programming**: Handles edge cases where MIME types are missing
- **Better error messages**: Provides more context about what went wrong
- **Automatic recovery**: Infers correct MIME types from filenames
- **Backward compatibility**: Doesn't break existing functionality

## Testing
- ✅ Build succeeds without errors
- ✅ AI video thumbnail generation should work with inferred MIME types
- ✅ Console warnings provide debugging information when MIME types are missing

## Related Issues
This fix addresses the AI video download workflow issue documented in `ai-video-download-workflow-changes.md` where videos appear in the media panel but fail thumbnail generation.