
# Manual Video Export Test Instructions

## Prerequisites
- OpenCut running at http://localhost:3000
- Test video: `apps/web/e2e/fixtures/test-video.mp4` (place your test video here)

## Test Steps

### 1. Basic Export Test
1. Open http://localhost:3000 in Chrome
2. Click "Start Creating" or go to editor
3. Upload the test video from `apps/web/e2e/fixtures/test-video.mp4`
4. Drag video to timeline
5. Click "Export" button
6. Select format: MP4, quality: 720p
7. Click "Start Export"
8. Monitor console logs for:
   - ✅ Video preloading messages
   - 🎬 Frame rendering progress
   - ✅ Export completion

### 2. Expected Console Output
Look for these log patterns:
```
📹 Starting video preload process...
📹 Found 1 unique video(s) to preload
✅ Video fully preloaded: generated_4a2ba290.mp4, readyState: 4
🎬 Using preloaded video {readyState: 1, duration: X.XX}
🎯 Seeking video to X.XXs, readyState: 1
✅ Video seeked to X.XXs, actualTime: X.XXs, diff: 0.XXXs
✅ Preloaded video drawn to canvas at X.XXs
✅ Export completed successfully!
```

### 3. Success Criteria
- [ ] Video uploads successfully
- [ ] Timeline shows video element
- [ ] Export dialog opens
- [ ] Export progress shows frame rendering
- [ ] Console shows video frame drawing (not placeholders)
- [ ] Export completes without errors
- [ ] Downloaded video plays correctly
- [ ] Video shows actual content (not gray frames)

### 4. Debugging Failed Frames
If you see placeholder rectangles:
- Check for "📦 Drew placeholder rectangle" in console
- Look for video readyState issues
- Verify seeking accuracy logs
- Check for timing differences > 0.1s

### 5. Performance Test
- Monitor export speed (should be near real-time)
- Check memory usage during export
- Verify no memory leaks after export

## Test Video Info
- Path: `apps/web/e2e/fixtures/test-video.mp4` (relative to project root)
- Expected to be MP4 format
- Should contain actual video content for frame testing
- **Note**: Place your test video in the fixtures directory before running tests
